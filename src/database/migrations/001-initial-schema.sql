-- Enabling foreign key enforcement for this dB connection
PRAGMA foreign_keys = ON;

-- 1. Employee Accounts
CREATE TABLE users(
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'EMPLOYEE',
    CHECK(role IN ('ADMIN','EMPLOYEE')),
    is_active INTEGER NOT NULL DEFAULT 1 
    CHECK(is_active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 2. Messages and drafts
CREATE TABLE emails (
id INTEGER PRIMARY KEY,
sender_id INTEGER NOT NULL,
subject TEXT NOT NULL DEFAULT '',
body TEXT NOT NULL DEFAULT '',
status TEXT NOT NULL DEFAULT 'DRAFT'

CHECK (status IN ('DRAFT', 'SENT')),
parent_email_id INTEGER,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
sent_at TEXT,

FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT,
FOREIGN KEY (parent_email_id) REFERENCES emails(id) ON DELETE SET NULL,

CHECK (
    (status = 'DRAFT' AND sent_at IS NULL)
    OR
    (status = 'SENT' AND sent_at IS NOT NULL)
));

-- 3. Recipient-specific message state
CREATE TABLE email_recipients (
id INTEGER PRIMARY KEY,
email_id INTEGER NOT NULL,
recipient_id INTEGER NOT NULL,
recipient_type TEXT NOT NULL DEFAULT 'TO'
CHECK (recipient_type IN ('TO', 'CC', 'BCC')),
is_read INTEGER NOT NULL DEFAULT 0
CHECK (is_read IN (0, 1)),
is_deleted INTEGER NOT NULL DEFAULT 0
CHECK (is_deleted IN (0, 1)),
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT,

UNIQUE (email_id, recipient_id, recipient_type)

);

-- 4. Attachment metadata; file contents live on disk.
CREATE TABLE attachments (
id INTEGER PRIMARY KEY,
email_id INTEGER NOT NULL,
original_name TEXT NOT NULL,
storage_name TEXT NOT NULL UNIQUE,
mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE

);

-- Indexes for common inbox, sent, and recipient queries.
CREATE INDEX idx_emails_sender_status
ON emails(sender_id, status, sent_at);

CREATE INDEX idx_recipients_inbox
ON email_recipients(recipient_id, is_deleted, email_id);

CREATE INDEX idx_recipients_email
ON email_recipients(email_id);

CREATE INDEX idx_attachments_email
ON attachments(email_id);