-- Add a nullable digestion marker for review notes already processed by the assistant.
ALTER TABLE draft_notes ADD COLUMN digested_at TEXT DEFAULT NULL;
