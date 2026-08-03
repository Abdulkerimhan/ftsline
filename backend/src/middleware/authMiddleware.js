import jwt from "jsonwebtoken";
import User from "../models/User.js";

function getJwtSecret() {
  return process.env.JWT_SECRET || "ftsline_dev_secret_change_me";
}

/* Kullanici giris kontrolu */
export async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token yok veya hatali" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret());

    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ message: "Kullanici bulunamadi" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Hesabiniz pasif durumda" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Gecersiz token" });
  }
}

/* Admin veya Superadmin */
export function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Yetkisiz erisim" });
  }

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Admin yetkisi gerekli" });
  }

  next();
}

/* Sadece Superadmin */
export function superAdminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Yetkisiz erisim" });
  }

  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Superadmin yetkisi gerekli" });
  }

  next();
}

/* Herkese acik sayfalarda varsa kullaniciyi tanir */
export async function authOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select(
      "role isActive isLicensed licenseExpiresAt"
    );

    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Kullanici oturumu gecersiz" });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Gecersiz token" });
  }
}
