CREATE TABLE sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired_at INTEGER NOT NULL
);

CREATE INDEX idx_sessions_expired_at
    ON sessions(expired_at);