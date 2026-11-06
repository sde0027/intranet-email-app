-- Allow multiple email attachment records to reference one physical file.
-- SHA-256 is backfilled from data/attachments by application maintenance.
ALTER TABLE attachments RENAME TO attachments_legacy;

CREATE TABLE attachments (
  id INTEGER PRIMARY KEY,
  email_id INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  storage_name TEXT NOT NULL,
  content_hash TEXT,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

INSERT INTO attachments (
  id, email_id, original_name, storage_name, content_hash,
  mime_type, size_bytes, created_at
)
SELECT
  id, email_id, original_name, storage_name, NULL,
  mime_type, size_bytes, created_at
FROM attachments_legacy;

DROP TABLE attachments_legacy;

CREATE INDEX idx_attachments_email ON attachments(email_id);
CREATE INDEX idx_attachments_content_hash ON attachments(content_hash)
  WHERE content_hash IS NOT NULL;
