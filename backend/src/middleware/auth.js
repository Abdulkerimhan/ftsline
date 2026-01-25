// backend/src/middleware/auth.js
import { verifyAccessToken } from "../utils/tokens.js";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ ok: false, message: "Missing Bearer token" });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, role, username }
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Invalid or expired access token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role || "user";
    if (!roles.includes(role)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    return next();
  };
}

// İstersen hızlı kullanım için:
export function requireAdmin(req, res, next) {
  const role = req.user?.role || "user";
  if (role !== "admin" && role !== "superadmin") {
    return res.status(403).json({ ok: false, message: "Admin only" });
  }
  return next();
}
