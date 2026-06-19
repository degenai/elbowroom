const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const POST_ID_PATTERN = /^er-\d{3}$/;
const MAX_REVIEWER_LENGTH = 80;
const MAX_NOTE_LENGTH = 4000;

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-draft-review-key',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request) },
  });
}

function emptyResponse(request, status = 204) {
  return new Response(null, { status, headers: corsHeaders(request) });
}

function reviewSecret(env) {
  return String(env?.DRAFT_REVIEW_SECRET || '').trim();
}

function authorize(request, secret) {
  const bearer = request.headers.get('authorization') || '';
  const headerKey = request.headers.get('x-draft-review-key') || '';
  return bearer === `Bearer ${secret}` || headerKey === secret;
}

function validatePostId(postId, errors) {
  if (!POST_ID_PATTERN.test(postId || '')) errors.push('post_id must look like er-001');
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function normalizePayload(payload) {
  return {
    post_id: String(payload?.post_id ?? '').trim(),
    reviewer: String(payload?.reviewer ?? '').trim(),
    note: String(payload?.note ?? '').trim(),
  };
}

function validateNotePayload(payload) {
  const errors = [];
  validatePostId(payload.post_id, errors);
  if (!payload.reviewer) errors.push('reviewer is required');
  if (payload.reviewer.length > MAX_REVIEWER_LENGTH) errors.push(`reviewer must be ${MAX_REVIEWER_LENGTH} characters or fewer`);
  if (!payload.note) errors.push('note is required');
  if (payload.note.length > MAX_NOTE_LENGTH) errors.push(`note must be ${MAX_NOTE_LENGTH} characters or fewer`);
  return errors;
}

function notesDb(env) {
  return env?.DRAFT_NOTES_DB || env?.DB;
}

async function listNotes(db, postId) {
  const result = await db
    .prepare(
      `SELECT id, post_id, reviewer, note, created_at, digested_at
       FROM draft_notes
       WHERE post_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .bind(postId)
    .all();
  return result.results || [];
}

async function createNote(db, payload) {
  const createdAt = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO draft_notes (post_id, reviewer, note, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(payload.post_id, payload.reviewer, payload.note, createdAt)
    .run();

  const id = result.meta?.last_row_id;
  if (!id) {
    return { id: null, ...payload, created_at: createdAt, digested_at: null };
  }

  return db
    .prepare(
      `SELECT id, post_id, reviewer, note, created_at, digested_at
       FROM draft_notes
       WHERE id = ?`
    )
    .bind(id)
    .first();
}

function normalizeDigestPayload(payload) {
  return {
    id: Number(payload?.id),
    digested: payload?.digested === true,
  };
}

function validateDigestPayload(payload) {
  const errors = [];
  if (!Number.isInteger(payload.id) || payload.id < 1) errors.push('id must be a positive note id');
  if (!payload.digested) errors.push('digested must be true');
  return errors;
}

async function markNoteDigested(db, id) {
  const digestedAt = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE draft_notes
       SET digested_at = ?
       WHERE id = ?`
    )
    .bind(digestedAt, id)
    .run();

  if ((result.meta?.changes ?? 0) < 1) return null;

  return db
    .prepare(
      `SELECT id, post_id, reviewer, note, created_at, digested_at
       FROM draft_notes
       WHERE id = ?`
    )
    .bind(id)
    .first();
}

export async function handleDraftNotesRequest(request, env = {}) {
  if (request.method === 'OPTIONS') return emptyResponse(request);

  const secret = reviewSecret(env);
  if (!secret) {
    return jsonResponse(request, { error: 'DRAFT_REVIEW_SECRET binding is not configured' }, 500);
  }

  if (!authorize(request, secret)) {
    return jsonResponse(request, { error: 'review key required' }, 401);
  }

  const db = notesDb(env);
  if (!db) return jsonResponse(request, { error: 'DRAFT_NOTES_DB binding is not configured' }, 500);

  const url = new URL(request.url);

  if (request.method === 'GET') {
    const postId = url.searchParams.get('post_id') || '';
    const errors = [];
    validatePostId(postId, errors);
    if (errors.length) return jsonResponse(request, { errors }, 400);

    const notes = await listNotes(db, postId);
    return jsonResponse(request, { post_id: postId, notes });
  }

  if (request.method === 'POST') {
    const rawPayload = await parseJsonBody(request);
    if (!rawPayload) return jsonResponse(request, { errors: ['body must be valid JSON'] }, 400);

    const payload = normalizePayload(rawPayload);
    const errors = validateNotePayload(payload);
    if (errors.length) return jsonResponse(request, { errors }, 400);

    const note = await createNote(db, payload);
    return jsonResponse(request, { note }, 201);
  }

  if (request.method === 'PATCH') {
    const rawPayload = await parseJsonBody(request);
    if (!rawPayload) return jsonResponse(request, { errors: ['body must be valid JSON'] }, 400);

    const payload = normalizeDigestPayload(rawPayload);
    const errors = validateDigestPayload(payload);
    if (errors.length) return jsonResponse(request, { errors }, 400);

    const note = await markNoteDigested(db, payload.id);
    if (!note) return jsonResponse(request, { error: 'note not found' }, 404);
    return jsonResponse(request, { note });
  }

  return jsonResponse(request, { error: 'method not allowed' }, 405);
}
