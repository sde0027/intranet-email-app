const attemptsByIp = new Map();

export function createLoginRateLimiter({ windowMs, maxAttempts }) {
  return function loginRateLimiter(req, res, next) {
    // This limiter protects credential guessing, not authenticated account actions.
    if (req.method !== "POST" || req.path !== "/login") return next();

    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let record = attemptsByIp.get(key);

    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + windowMs };
      attemptsByIp.set(key, record);
    }

    if (record.count >= maxAttempts) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((record.resetAt - now) / 1000),
      );

      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: "Too many login attempts. Please try again later.",
      });
    }

    record.count += 1;
    return next();
  };
}

// Keep expired client entries from accumulating indefinitely.
const cleanupTimer = setInterval(() => {
  const now = Date.now();

  for (const [key, record] of attemptsByIp) {
    if (record.resetAt <= now) attemptsByIp.delete(key);
  }
}, 60 * 1000);

cleanupTimer.unref();
