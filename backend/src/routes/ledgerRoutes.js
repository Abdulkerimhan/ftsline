import express from "express";
import mongoose from "mongoose";
import { auth } from "../middleware/auth.js";
import { attachUser } from "../middleware/attachUser.js";

import Ledger from "../models/Ledger.js";
import User from "../models/User.js";

const router = express.Router();

function s(v, def = "") { return String(v ?? def).trim(); }
function n(v, def = 0) { const x = Number(v); return Number.isFinite(x) ? x : def; }
function isObjId(x) { return mongoose.Types.ObjectId.isValid(String(x || "")); }

// ✅ superadmin = full
function isSuperadmin(req) {
  return req.user?.role === "superadmin";
}

// ✅ admin izin kontrol (senin sisteminde permissions var)
function hasPerm(req, perm) {
  if (isSuperadmin(req)) return true;
  if (req.user?.role !== "admin") return false;
  const perms = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
  return perms.includes(perm);
}

function requireFinanceView(req, res, next) {
  if (isSuperadmin(req) || hasPerm(req, "finance.view")) return next();
  return res.status(403).json({ ok: false, message: "finance.view yetkisi yok" });
}

function requireFinanceExport(req, res, next) {
  if (isSuperadmin(req) || hasPerm(req, "finance.export")) return next();
  return res.status(403).json({ ok: false, message: "finance.export yetkisi yok" });
}

/* =========================
   PING
========================= */
router.get("/ping", auth, attachUser, (req, res) => {
  res.json({ ok: true, route: "ledger", user: { id: req.user?._id, role: req.user?.role } });
});

/* =========================
   USER: My ledger (own)
========================= */
router.get("/mine", auth, attachUser, async (req, res, next) => {
  try {
    const page = Math.max(1, n(req.query.page, 1));
    const limit = Math.min(200, Math.max(1, n(req.query.limit, 30)));
    const skip = (page - 1) * limit;

    const type = s(req.query.type, "");
    const status = s(req.query.status, "");

    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Ledger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ledger.countDocuments(filter),
    ]);

    res.json({ ok: true, items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});

/* =========================
   USER: Summary (own)
========================= */
router.get("/summary", auth, attachUser, async (req, res, next) => {
  try {
    const uid = req.user._id;

    const agg = await Ledger.aggregate([
      { $match: { user: uid } },
      { $group: { _id: "$status", sum: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    const out = { total: 0, paid: 0, pending: 0, count: 0 };
    for (const x of agg) {
      out.total += Number(x.sum || 0);
      out.count += Number(x.count || 0);
      if (x._id === "paid" || x._id === "success") out.paid += Number(x.sum || 0);
      if (x._id === "pending") out.pending += Number(x.sum || 0);
    }

    res.json({ ok: true, summary: out });
  } catch (e) {
    next(e);
  }
});

/* =========================
   USER: Earnings series (chart)
   GET /api/ledger/earnings/series?days=30
========================= */
router.get("/earnings/series", auth, attachUser, async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(7, n(req.query.days, 30)));
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // sadece "kazanç" gibi düşüneceğimiz türleri istersen filtrele
    const match = {
      user: req.user._id,
      createdAt: { $gte: from },
      status: { $in: ["paid", "success"] },
    };

    const rows = await Ledger.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          sum: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);

    // frontend kolay çizsin diye: [{date:"2026-03-02", value: 123}]
    const series = rows.map(r => {
      const y = String(r._id.y).padStart(4, "0");
      const m = String(r._id.m).padStart(2, "0");
      const d = String(r._id.d).padStart(2, "0");
      return { date: `${y}-${m}-${d}`, value: Number(r.sum || 0) };
    });

    res.json({ ok: true, days, series });
  } catch (e) {
    next(e);
  }
});

/* =========================
   ADMIN/SUPERADMIN: list all ledger
   GET /api/ledger/admin/list?q=&status=&type=&user=
========================= */
router.get("/admin/list", auth, attachUser, requireFinanceView, async (req, res, next) => {
  try {
    const q = s(req.query.q, "");
    const type = s(req.query.type, "");
    const status = s(req.query.status, "");
    const user = s(req.query.user, "");

    const page = Math.max(1, n(req.query.page, 1));
    const limit = Math.min(300, Math.max(1, n(req.query.limit, 100)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (user && isObjId(user)) filter.user = user;
    if (q) filter.title = { $regex: q, $options: "i" };

    const [items, total] = await Promise.all([
      Ledger.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username email role")
        .lean(),
      Ledger.countDocuments(filter),
    ]);

    res.json({ ok: true, items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});

/* =========================
   ADMIN/SUPERADMIN: create manual ledger
   POST /api/ledger/admin/create
   body: { user, amount, title, type, status, currency, note }
========================= */
router.post("/admin/create", auth, attachUser, requireFinanceView, async (req, res, next) => {
  try {
    const userId = s(req.body?.user, "");
    if (!isObjId(userId)) return res.status(400).json({ ok: false, message: "Geçersiz user" });

    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ ok: false, message: "amount 0 olamaz" });
    }

    const title = s(req.body?.title, "");
    if (!title) return res.status(400).json({ ok: false, message: "title zorunlu" });

    const u = await User.findById(userId).select("_id").lean();
    if (!u) return res.status(404).json({ ok: false, message: "User not found" });

    const doc = await Ledger.create({
      user: userId,
      type: s(req.body?.type, "adjust"),
      status: s(req.body?.status, "paid"),
      amount,
      currency: s(req.body?.currency, "USDT"),
      title,
      note: s(req.body?.note, ""),
      refType: "manual",
      refId: s(req.body?.refId, ""),
      txHash: s(req.body?.txHash, ""),
    });

    res.json({ ok: true, ledger: doc });
  } catch (e) {
    next(e);
  }
});

/* =========================
   ADMIN/SUPERADMIN: export (json)
   GET /api/ledger/admin/export
========================= */
router.get("/admin/export", auth, attachUser, requireFinanceExport, async (req, res, next) => {
  try {
    const status = s(req.query.status, "");
    const type = s(req.query.type, "");

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const items = await Ledger.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .populate("user", "username email")
      .lean();

    res.json({ ok: true, total: items.length, items });
  } catch (e) {
    next(e);
  }
});

export default router;