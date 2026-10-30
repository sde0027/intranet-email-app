import session from "express-session";
import { db } from "../database/connection.js";

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getExpiration(sessionData) {
  const expires = sessionData.cookie?.expires;

  if (expires) {
    const timestamp = new Date(expires).getTime();

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  const maxAge = sessionData.cookie?.originalMaxAge;

  if (typeof maxAge === "number" && Number.isFinite(maxAge)) {
    return Date.now() + Math.max(0, maxAge);
  }

  return Date.now() + DEFAULT_TTL_MS;
}

export class SQLiteSessionStore extends session.Store {
  constructor() {
    super();

    this.statements = {
      get: db.prepare(`
                SELECT sess, expired_at
                FROM sessions
                WHERE sid = ?
            `),

      set: db.prepare(`
                INSERT INTO sessions (sid, sess, expired_at)
                VALUES (?, ?, ?)
                ON CONFLICT(sid) DO UPDATE SET
                    sess = excluded.sess,
                    expired_at = excluded.expired_at
            `),

      destroy: db.prepare(`
                DELETE FROM sessions
                WHERE sid = ?
            `),

      touch: db.prepare(`
                UPDATE sessions
                SET expired_at = ?
                WHERE sid = ?
            `),

      cleanup: db.prepare(`
                DELETE FROM sessions
                WHERE expired_at <= ?
            `),
    };
  }

  get(sid, callback) {
    try {
      const row = this.statements.get.get(sid);

      if (!row) {
        return callback(null, null);
      }

      if (row.expired_at <= Date.now()) {
        this.statements.destroy.run(sid);
        return callback(null, null);
      }

      callback(null, JSON.parse(row.sess));
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const serialized = JSON.stringify(sessionData);
      const expiresAt = getExpiration(sessionData);

      this.statements.set.run(sid, serialized, expiresAt);

      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid, callback) {
    try {
      this.statements.destroy.run(sid);
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid, sessionData, callback) {
    try {
      const expiresAt = getExpiration(sessionData);

      this.statements.touch.run(expiresAt, sid);

      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  clearExpired() {
    return this.statements.cleanup.run(Date.now()).changes;
  }
}
