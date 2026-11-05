-- Track deletion from the sender's Sent folder independently of recipients' copies.
ALTER TABLE emails
ADD COLUMN is_sender_deleted INTEGER NOT NULL DEFAULT 0
CHECK (is_sender_deleted IN (0, 1));

CREATE INDEX idx_emails_sent_visible
ON emails(sender_id, status, is_sender_deleted, sent_at);
