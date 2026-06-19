-- Elbow Room Draft Review notes.
-- Apply locally/remotely with:
--   npx wrangler d1 execute elbowroom-draft-notes --local --file=workers/schema-draft-notes.sql --config wrangler-draft-notes.jsonc
--   npx wrangler d1 execute elbowroom-draft-notes --remote --file=workers/schema-draft-notes.sql --config wrangler-draft-notes.jsonc

CREATE TABLE IF NOT EXISTS draft_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL CHECK(length(post_id) <= 16),
  reviewer TEXT NOT NULL CHECK(length(reviewer) BETWEEN 1 AND 80),
  note TEXT NOT NULL CHECK(length(note) BETWEEN 1 AND 4000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  digested_at TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_draft_notes_post_created
  ON draft_notes (post_id, created_at DESC, id DESC);
