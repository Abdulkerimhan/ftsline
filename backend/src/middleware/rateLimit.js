// src/middleware/rateLimit.js
export function simpleRateLimit({ windowMs = 60_000, max = 30, key = "rl" } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  return function rateLimit(req, res, next) {
    const id =
      req.user?.id ||
      req.ip ||
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      "anon";

    const now = Date.now();
    const k = `${key}:${id}`;

    const cur = hits.get(k);
    if (!cur || now > cur.resetAt) {
      hits.set(k, { count: 1, resetAt: now + windowMs });
      return next();
    }

    cur.count += 1;
    if (cur.count > max) {
      const retryAfterSec = Math.ceil((cur.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        ok: false,
        message: "Çok fazla istek atıldı. Lütfen biraz bekleyip tekrar dene.",
      });
    }

    return next();
  };
}