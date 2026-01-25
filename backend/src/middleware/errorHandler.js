// backend/src/middleware/errorHandler.js
export function notFound(req, res, next) {
  return res.status(404).json({
    ok: false,
    message: `Not Found - ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // Mongoose duplicate key (username/email)
  if (err?.code === 11000) {
    return res.status(409).json({
      ok: false,
      message: "Duplicate key",
      details: err.keyValue,
    });
  }

  // JWT hataları bazen buraya düşebilir
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }

  return res.status(status).json({
    ok: false,
    message: err.message || "Server Error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
}
