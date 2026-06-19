import assert from 'node:assert/strict';
import test from 'node:test';
import { handleDraftNotesRequest } from './draft-notes-core.mjs';

class FakeD1 {
  constructor(seed = []) {
    this.rows = seed.map((row, index) => ({
      id: row.id ?? index + 1,
      post_id: row.post_id,
      reviewer: row.reviewer,
      note: row.note,
      created_at: row.created_at ?? `2026-06-18T12:00:0${index}.000Z`,
    }));
    this.nextId = this.rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...args) {
        return {
          async all() {
            if (!sql.includes('FROM draft_notes')) throw new Error(`Unexpected all SQL: ${sql}`);
            const [postId] = args;
            return {
              results: db.rows
                .filter((row) => row.post_id === postId)
                .sort((a, b) => b.created_at.localeCompare(a.created_at)),
            };
          },
          async first() {
            if (!sql.includes('FROM draft_notes')) throw new Error(`Unexpected first SQL: ${sql}`);
            const [id] = args;
            return db.rows.find((row) => row.id === id) ?? null;
          },
          async run() {
            if (!sql.includes('INSERT INTO draft_notes')) throw new Error(`Unexpected run SQL: ${sql}`);
            const [postId, reviewer, note, createdAt] = args;
            const row = { id: db.nextId++, post_id: postId, reviewer, note, created_at: createdAt };
            db.rows.push(row);
            return { meta: { last_row_id: row.id } };
          },
        };
      },
    };
  }
}

const REVIEW_SECRET = 'review-room';

async function json(response) {
  return response.json();
}

function envWithDb(db) {
  return { DRAFT_NOTES_DB: db, DRAFT_REVIEW_SECRET: REVIEW_SECRET };
}

function authedRequest(url, options = {}) {
  return new Request(url, {
    ...options,
    headers: {
      authorization: `Bearer ${REVIEW_SECRET}`,
      ...(options.headers || {}),
    },
  });
}

test('GET returns notes for one post newest-first without leaking other posts', async () => {
  const env = envWithDb(new FakeD1([
    { id: 1, post_id: 'er-001', reviewer: 'Alex', note: 'Older note', created_at: '2026-06-18T12:00:00.000Z' },
    { id: 2, post_id: 'er-002', reviewer: 'Morgan', note: 'Wrong post', created_at: '2026-06-18T12:01:00.000Z' },
    { id: 3, post_id: 'er-001', reviewer: 'Anna', note: 'Newest note', created_at: '2026-06-18T12:02:00.000Z' },
  ]));

  const response = await handleDraftNotesRequest(
    authedRequest('https://example.com/api/draft-notes?post_id=er-001'),
    env
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), {
    post_id: 'er-001',
    notes: [
      { id: 3, post_id: 'er-001', reviewer: 'Anna', note: 'Newest note', created_at: '2026-06-18T12:02:00.000Z' },
      { id: 1, post_id: 'er-001', reviewer: 'Alex', note: 'Older note', created_at: '2026-06-18T12:00:00.000Z' },
    ],
  });
});

test('POST stores a raw reviewer note and returns the created note', async () => {
  const db = new FakeD1();
  const response = await handleDraftNotesRequest(
    authedRequest('https://example.com/api/draft-notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ post_id: 'er-003', reviewer: 'Sarah', note: 'This hook is strong, but I want a softer CTA.\nMaybe ask people to DM first.' }),
    }),
    envWithDb(db)
  );

  assert.equal(response.status, 201);
  const body = await json(response);
  assert.equal(body.note.post_id, 'er-003');
  assert.equal(body.note.reviewer, 'Sarah');
  assert.equal(body.note.note, 'This hook is strong, but I want a softer CTA.\nMaybe ask people to DM first.');
  assert.match(body.note.created_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(db.rows.length, 1);
});

test('validates post id, reviewer, and note text before writing', async () => {
  const db = new FakeD1();
  const response = await handleDraftNotesRequest(
    authedRequest('https://example.com/api/draft-notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ post_id: '../secret', reviewer: '', note: '' }),
    }),
    envWithDb(db)
  );

  assert.equal(response.status, 400);
  assert.deepEqual((await json(response)).errors, [
    'post_id must look like er-001',
    'reviewer is required',
    'note is required',
  ]);
  assert.equal(db.rows.length, 0);
});

test('requires a bearer review key when DRAFT_REVIEW_SECRET is configured', async () => {
  const env = envWithDb(new FakeD1());

  const denied = await handleDraftNotesRequest(
    new Request('https://example.com/api/draft-notes?post_id=er-001'),
    env
  );
  assert.equal(denied.status, 401);

  const allowed = await handleDraftNotesRequest(
    authedRequest('https://example.com/api/draft-notes?post_id=er-001'),
    env
  );
  assert.equal(allowed.status, 200);
});

test('fails closed when DRAFT_REVIEW_SECRET is missing', async () => {
  const response = await handleDraftNotesRequest(
    new Request('https://example.com/api/draft-notes?post_id=er-001'),
    { DRAFT_NOTES_DB: new FakeD1() }
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await json(response), { error: 'DRAFT_REVIEW_SECRET binding is not configured' });
});

test('OPTIONS returns CORS preflight headers', async () => {
  const response = await handleDraftNotesRequest(
    new Request('https://example.com/api/draft-notes', { method: 'OPTIONS' }),
    { DRAFT_NOTES_DB: new FakeD1() }
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
});
