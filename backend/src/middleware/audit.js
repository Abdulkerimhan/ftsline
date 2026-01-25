// backend/src/middleware/audit.js
import AuditLog from "../models/AuditLog.js";

/**
 * audit(action)
 * - Route içinde kullan: audit("SOME_ACTION")
 * - Response bittikten sonra log yazar (statusCode dahil)
 */
export function audit(action = "UNKNOWN") {
  return (req, res, next) => {
    const start = Date.now();

    res.on("finish", async () => {
      try {
        // req.user yoksa loglama (superadmin route'larda zaten var)
        if (!req.user?.id) return;

        const meta = {
          durationMs: Date.now() - start,
        };

        await AuditLog.create({
          actorUserId: req.user.id,
          actorRole: req.user.role || "user",
          actorUsername: req.user.username || "",

          action,
          method: req.method,
          path: req.originalUrl || req.path,

          // hedef kullanıcı varsa route içinde set edeceğiz: req.auditTargetUserId
          targetUserId: req.auditTargetUserId || null,
          meta: { ...meta, ...(req.auditMeta || {}) },

          statusCode: res.statusCode,
          ip: req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket?.remoteAddress || "",
          userAgent: req.headers["user-agent"] || "",
        });
      } catch {
        // audit log hatası API'yi bozmasın
      }
    });

    next();
  };
}
