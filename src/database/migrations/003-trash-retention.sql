
ALTER TABLE email_recipients
ADD COLUMN deleted_at TEXT;

-- Start the 30-day retention clock for existing
-- records that were already marked as deleted.
UPDATE email_recipients
SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE is_deleted = 1
  AND deleted_at IS NULL;

CREATE INDEX idx_recipients_trash_expiry
ON email_recipients(is_deleted, deleted_at);
