import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requirePerm } from "../middleware/requirePerm.js";
import User from "../models/User.js";
import { PERM_CATALOG, allCatalogPerms } from "../auth/permissions.js";

const r = Router();

// sadece superadmin
r.use(requireAuth, requirePerm("*"));

r.get("/permissions/catalog", (req, res) => {
  res.json({ ok: true, catalog: PERM_CATALOG, flat: allCatalogPerms() });
});

// admin list
r.get("/admins", async (req, res) => {
  const items = await User.find({ role: "admin" })
    .select("_id username fullName email role permissions createdAt")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ ok: true, items });
});

// role yönetimi (admin/superadmin/user)
r.put("/users/:id/role", async (req, res) => {
  const { role } = req.body || {};
  if (!["user", "admin", "superadmin"].includes(role)) {
    return res.status(400).json({ ok: false, message: "Invalid role" });
  }

  const u = await User.findByIdAndUpdate(req.params.id, { role }, { new: true })
    .select("_id username email role permissions");

  if (!u) return res.status(404).json({ ok: false, message: "User not found" });
  res.json({ ok: true, user: u });
});

// admin permission set (tek alan: permissions)
r.put("/admins/:id/permissions", async (req, res) => {
  const { permissions = [] } = req.body || {};
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ ok: false, message: "permissions must be array" });
  }

  const flat = new Set(allCatalogPerms());
  const clean = [...new Set(permissions.map(String))].filter((p) => flat.has(p));

  const admin = await User.findById(req.params.id);
  if (!admin) return res.status(404).json({ ok: false, message: "Admin not found" });
  if (admin.role !== "admin") return res.status(400).json({ ok: false, message: "Target user is not admin" });

  admin.permissions = clean;
  await admin.save();

  res.json({
    ok: true,
    admin: {
      id: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    },
  });
});

export default r;