// src/middleware/attachUser.js
import User from "../models/User.js";
import { effectivePerms } from "../auth/effectivePerms.js";

export async function attachUser(req, res, next) {
  try {
    const id = req.user?.id || req.user?._id || req.user?.userId;
    if (!id) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const u = await User.findById(id)
      .select("_id username email role permissions isActive isLicensed")
      .lean();

    if (!u) return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (u.isActive === false) return res.status(403).json({ ok: false, message: "Hesap pasif" });

    const perms = effectivePerms(u);            // Set dönsün
    if (u.role === "superadmin") perms.add("*"); // ✅ KRİTİK

    req.userDb = u;
    req.perms = perms;

    next();
  } catch (e) {
    next(e);
  }
}