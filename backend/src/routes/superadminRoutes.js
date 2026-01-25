// backend/src/routes/superadminRoutes.js
import express from "express";
import bcrypt from "bcryptjs";

import requireSuperadmin from "../middleware/requireSuperadmin.js";
import { audit } from "../middleware/audit.js";

import User from "../models/User.js";
import MatrixNode from "../models/MatrixNode.js";
import AuditLog from "../models/AuditLog.js";
import Setting from "../models/Setting.js";

const router = express.Router();

/**
 * ✅ test
 * GET /api/superadmin/ping
 */
router.get("/ping", requireSuperadmin, audit("SUPERADMIN_PING"), (req, res) => {
  res.json({ ok: true, message: "superadmin ok", user: req.user });
});

/**
 * ✅ GET /api/superadmin/dashboard
 * query: matrixId?
 * Özet metrikler + son audit loglar + son ayarlar
 */
router.get("/dashboard", requireSuperadmin, audit("DASHBOARD_READ"), async (req, res, next) => {
  try {
    const matrixId = String(req.query.matrixId || process.env.MATRIX_ID || "MAIN").trim();

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalAdmins,
      totalSuperadmins,
      pendingMatrix,
      activeMatrix,
      removedMatrix,
      lastLogs,
      topSettings,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "superadmin" }),

      MatrixNode.countDocuments({ matrixId, status: "PENDING" }),
      MatrixNode.countDocuments({ matrixId, status: "ACTIVE" }),
      MatrixNode.countDocuments({ matrixId, status: "REMOVED" }),

      AuditLog.find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .select("createdAt action actorUsername actorRole statusCode path targetUserId meta")
        .lean(),

      Setting.find({})
        .sort({ updatedAt: -1 })
        .limit(10)
        .select("key value updatedAt")
        .lean(),
    ]);

    return res.json({
      ok: true,
      matrixId,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          admins: totalAdmins,
          superadmins: totalSuperadmins,
        },
        matrix: {
          pending: pendingMatrix,
          active: activeMatrix,
          removed: removedMatrix,
        },
      },
      lastLogs,
      topSettings,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ GET /api/superadmin/system/info
 */
router.get("/system/info", requireSuperadmin, audit("SYSTEM_INFO"), (req, res) => {
  return res.json({
    ok: true,
    system: {
      node: process.version,
      env: process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
    },
  });
});

/**
 * ✅ GET /api/superadmin/system/settings
 * Query: ?key=SITE_MAINTENANCE
 */
router.get("/system/settings", requireSuperadmin, audit("SETTINGS_READ"), async (req, res, next) => {
  try {
    const key = String(req.query.key || "").trim();

    if (key) {
      const item = await Setting.findOne({ key }).lean();
      return res.json({ ok: true, setting: item || null });
    }

    const list = await Setting.find({}).sort({ key: 1 }).lean();
    return res.json({ ok: true, settings: list });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ PATCH /api/superadmin/system/settings
 * body: { key, value }
 */
router.patch("/system/settings", requireSuperadmin, audit("SETTINGS_WRITE"), async (req, res, next) => {
  try {
    const key = String(req.body.key || "").trim();
    const value = req.body.value;

    if (!key) return res.status(400).json({ ok: false, message: "key zorunlu" });

    const updated = await Setting.findOneAndUpdate(
      { key },
      { $set: { value, updatedBy: req.user.id } },
      { upsert: true, new: true }
    ).lean();

    // audit meta
    req.auditMeta = { key };

    return res.json({ ok: true, setting: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ POST /api/superadmin/users/:id/reset-password
 * body: { newPassword }
 */
router.post(
  "/users/:id/reset-password",
  requireSuperadmin,
  audit("USER_RESET_PASSWORD"),
  async (req, res, next) => {
    try {
      const userId = req.params.id;
      const newPassword = String(req.body.newPassword || "").trim();

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ ok: false, message: "newPassword en az 6 karakter olmalı" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const updated = await User.findByIdAndUpdate(
        userId,
        { $set: { passwordHash } },
        { new: true }
      ).select("_id username email fullName role isActive");

      if (!updated) return res.status(404).json({ ok: false, message: "User not found" });

      // audit hedef kullanıcı
      req.auditTargetUserId = updated._id;
      req.auditMeta = { resetPassword: true };

      return res.json({ ok: true, message: "Password reset ok", user: updated });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * ✅ GET /api/superadmin/logs
 * Query:
 *  - action=...
 *  - userId=... (actor veya target)
 *  - statusCode=200
 *  - from=2026-01-01 (ISO date)
 *  - to=2026-01-24 (ISO date)  -> günün sonu dahil edilir
 *  - page=1
 *  - limit=50 (max 200)
 */
router.get("/logs", requireSuperadmin, audit("AUDITLOG_READ"), async (req, res, next) => {
  try {
    const action = String(req.query.action || "").trim();
    const userId = String(req.query.userId || "").trim();
    const statusCodeRaw = String(req.query.statusCode || "").trim();
    const fromRaw = String(req.query.from || "").trim();
    const toRaw = String(req.query.to || "").trim();

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(Math.max(1, Number(req.query.limit || 50)), 200);
    const skip = (page - 1) * limit;

    const q = {};
    if (action) q.action;

    if (action) q.action = action;

    if (userId) q.$or = [{ actorUserId: userId }, { targetUserId: userId }];

    if (statusCodeRaw) {
      const sc = Number(statusCodeRaw);
      if (!Number.isNaN(sc)) q.statusCode = sc;
    }

    if (fromRaw || toRaw) {
      q.createdAt = {};

      if (fromRaw) {
        const d = new Date(fromRaw);
        if (!Number.isNaN(d.getTime())) q.createdAt.$gte = d;
      }

      if (toRaw) {
        const d = new Date(toRaw);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999); // ✅ o günün tamamı
          q.createdAt.$lte = d;
        }
      }

      if (Object.keys(q.createdAt).length === 0) delete q.createdAt;
    }

    const [items, total] = await Promise.all([
      AuditLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(q),
    ]);

    return res.json({
      ok: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      logs: items,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ GET /api/superadmin/users
 * query:
 *  - q: arama (username/email/fullName)
 *  - role: user|admin|superadmin
 *  - isActive: true|false
 *  - page, limit
 */
router.get("/users", requireSuperadmin, audit("USERS_READ"), async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const role = String(req.query.role || "").trim();
    const isActiveRaw = String(req.query.isActive || "").trim();

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const filter = {};

    if (q) {
      filter.$or = [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } },
      ];
    }

    if (role) filter.role = role;

    if (isActiveRaw === "true") filter.isActive = true;
    if (isActiveRaw === "false") filter.isActive = false;

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("_id username email fullName role isActive sponsorId createdAt lastPaidYm missedMonthsStreak")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ PATCH /api/superadmin/users/:id/role
 * body: { role: "user"|"admin"|"superadmin" }
 */
router.patch("/users/:id/role", requireSuperadmin, audit("USERS_ROLE_CHANGE"), async (req, res, next) => {
  try {
    const id = req.params.id;
    const role = String(req.body.role || "").trim();

    if (!["user", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ ok: false, message: "Geçersiz role" });
    }

    // kendini düşürme kilidi
    if (req.user?.id === id && role !== "superadmin") {
      return res.status(400).json({ ok: false, message: "Kendi rolünü düşüremezsin" });
    }

    const user = await User.findByIdAndUpdate(id, { $set: { role } }, { new: true }).select(
      "_id username email fullName role isActive"
    );

    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    // audit hedef kullanıcı
    req.auditTargetUserId = user._id;
    req.auditMeta = { newRole: role };

    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ PATCH /api/superadmin/users/:id/active
 * body: { isActive: true|false }
 */
router.patch("/users/:id/active", requireSuperadmin, audit("USERS_ACTIVE_CHANGE"), async (req, res, next) => {
  try {
    const id = req.params.id;
    const isActive = Boolean(req.body.isActive);

    const user = await User.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).select(
      "_id username email fullName role isActive"
    );

    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    // audit hedef kullanıcı
    req.auditTargetUserId = user._id;
    req.auditMeta = { isActive };

    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ GET /api/superadmin/matrix/pending
 * query: matrixId?, page?, limit?
 */
router.get("/matrix/pending", requireSuperadmin, audit("MATRIX_PENDING_READ"), async (req, res, next) => {
  try {
    const matrixId = String(req.query.matrixId || process.env.MATRIX_ID || "MAIN").trim();

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const filter = { matrixId, status: "PENDING" };

    const [nodes, total] = await Promise.all([
      MatrixNode.find(filter).sort({ joinedAt: 1 }).skip(skip).limit(limit).lean(),
      MatrixNode.countDocuments(filter),
    ]);

    const userIds = nodes.map((n) => n.userId).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
      .select("_id username email fullName isActive role lastPaidYm")
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const items = nodes.map((n) => ({
      ...n,
      user: n.userId ? userMap.get(String(n.userId)) || null : null,
    }));

    res.json({ ok: true, page, limit, total, pages: Math.ceil(total / limit), items });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ POST /api/superadmin/payments/approve
 * body: { userId, matrixId?, amount?, txHash?, note? }
 * İş: user aktif + lastPaidYm + pending node ACTIVE
 */
router.post("/payments/approve", requireSuperadmin, audit("PAYMENT_APPROVE"), async (req, res, next) => {
  try {
    const userId = String(req.body.userId || "").trim();
    const matrixId = String(req.body.matrixId || process.env.MATRIX_ID || "MAIN").trim();
    const now = new Date();

    // ✅ optional fields
    const amountRaw = req.body.amount;
    const amount =
      amountRaw === undefined || amountRaw === null || amountRaw === "" ? null : Number(amountRaw);

    const txHash = String(req.body.txHash || "").trim();
    const note = String(req.body.note || "").trim();

    if (!userId) return res.status(400).json({ ok: false, message: "userId zorunlu" });

    if (amount !== null && Number.isNaN(amount)) {
      return res.status(400).json({ ok: false, message: "amount sayı olmalı" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    const node = await MatrixNode.findOne({ matrixId, userId: user._id });
    if (!node) return res.status(404).json({ ok: false, message: "Matrix node not found for user" });

    if (node.status !== "PENDING") {
      return res.status(400).json({ ok: false, message: `Node PENDING değil. status=${node.status}` });
    }

    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    user.isActive = true;
    user.lastPaidYm = ym;
    user.missedMonthsStreak = 0;

    // ✅ varsa ödeme kaydı düş
    if (Array.isArray(user.payments)) {
      user.payments.push({
        amount: amount ?? undefined,
        txHash: txHash || undefined,
        note: note || undefined,
        currency: user.currency || "USDT",
        network: user.network || "TRC20",
        createdAt: now,
      });
    }

    await user.save();

    node.status = "ACTIVE";
    node.activatedAt = now;
    node.pendingExpiresAt = null;
    await node.save();

    // audit hedef kullanıcı + meta
    req.auditTargetUserId = user._id;
    req.auditMeta = { matrixId, ym, amount, txHash, note };

    res.json({
      ok: true,
      message: "Approved: user activated + matrix node activated",
      approved: { matrixId, ym, amount, txHash, note },
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        lastPaidYm: user.lastPaidYm,
        role: user.role,
      },
      matrixNode: {
        id: node._id,
        matrixId: node.matrixId,
        status: node.status,
        parentId: node.parentId,
        side: node.side,
        activatedAt: node.activatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ POST /api/superadmin/matrix/remove-pending
 * body: { userId, matrixId?, reason? }
 * İş: pending node REMOVED
 */
router.post("/matrix/remove-pending", requireSuperadmin, audit("MATRIX_PENDING_REMOVE"), async (req, res, next) => {
  try {
    const userId = String(req.body.userId || "").trim();
    const matrixId = String(req.body.matrixId || process.env.MATRIX_ID || "MAIN").trim();
    const reason = String(req.body.reason || "REMOVED_BY_SUPERADMIN").trim();
    const now = new Date();

    if (!userId) return res.status(400).json({ ok: false, message: "userId zorunlu" });

    const node = await MatrixNode.findOne({ matrixId, userId });
    if (!node) return res.status(404).json({ ok: false, message: "Matrix node not found" });

    if (node.status !== "PENDING") {
      return res.status(400).json({ ok: false, message: `Node PENDING değil. status=${node.status}` });
    }

    node.status = "REMOVED";
    node.removedAt = now;

    // ✅ Senin modelde alan "removedReason"
    node.removedReason = reason;

    await node.save();

    // audit meta
    req.auditTargetUserId = node.userId || null;
    req.auditMeta = { matrixId, reason };

    res.json({ ok: true, message: "Pending removed", nodeId: node._id, status: node.status });
  } catch (err) {
    next(err);
  }
});

export default router;
