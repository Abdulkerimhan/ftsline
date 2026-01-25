import { verifyAccessToken } from "../utils/tokens.js";

export default function requireSuperadmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ ok: false, message: "Missing Bearer token" });
    }

    const decoded = verifyAccessToken(token); // { id, role, username }
    if (decoded.role !== "superadmin") {
      return res.status(403).json({ ok: false, message: "Superadmin required" });
    }

    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired access token" });
  }
}
