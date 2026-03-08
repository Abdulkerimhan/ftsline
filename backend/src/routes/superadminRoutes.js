import express from "express";
import mongoose from "mongoose";
import { auth } from "../middleware/auth.js";
import { attachUser } from "../middleware/attachUser.js";
import { requirePerm } from "../middleware/requirePerm.js";

import User from "../models/User.js";
import { PERM_CATALOG, allCatalogPerms } from "../auth/permissions.js";

const router = express.Router();
const SA = [auth, attachUser, requirePerm("*")]; // ✅ sadece superadmin

function s(v, def = "") { return String(v ?? def).trim(); }
function n(v, def = 0) { const x = Number(v); return Number.isFinite(x) ? x : def; }
function arrStr(v) { return Array.isArray(v) ? v.map(String).map(x => x.trim()).filter(Boolean) : []; }
function isObjId(x) { return mongoose.Types.ObjectId.isValid(String(x || "")); }

/* =========================
   OPTIONAL MODELS (lazy load)
========================= */
let _Product = null;
let _Ledger = null;
let _Order = null;
let _Payment = null;
let _tried = { p: false, l: false, o: false, pay: false };

async function getProductModel() {
  if (_Product) return _Product;
  if (_tried.p) return null;
  _tried.p = true;
  try { _Product = (await import("../models/Product.js")).default; } catch {}
  return _Product;
}
async function getLedgerModel() {
  if (_Ledger) return _Ledger;
  if (_tried.l) return null;
  _tried.l = true;
  try { _Ledger = (await import("../models/Ledger.js")).default; } catch {}
  return _Ledger;
}
async function getOrderModel() {
  if (_Order) return _Order;
  if (_tried.o) return null;
  _tried.o = true;
  try { _Order = (await import("../models/Order.js")).default; } catch {}
  return _Order;
}
async function getPaymentModel() {
  if (_Payment) return _Payment;
  if (_tried.pay) return null;
  _tried.pay = true;
  try { _Payment = (await import("../models/Payment.js")).default; } catch {}
  return _Payment;
}

/* =========================
   PING
========================= */
router.get("/ping", ...SA, (req, res) => {
  res.json({ ok: true, message: "superadmin ok", user: req.user });
});

/* =========================
   PERMISSIONS CATALOG
========================= */
router.get("/permissions/catalog", ...SA, (req, res) => {
  res.json({ ok: true, catalog: PERM_CATALOG, flat: allCatalogPerms() });
});

/* =========================
   SETTINGS (demo in-memory)
========================= */
let SA_SETTINGS = { maintenance: false, banner: "" };

router.get("/settings", ...SA, (req, res) => {
  res.json({ ok: true, settings: SA_SETTINGS });
});

router.put("/settings", ...SA, (req, res) => {
  SA_SETTINGS = {
    maintenance: !!req.body?.maintenance,
    banner: s(req.body?.banner, "")
  };
  res.json({ ok: true, settings: SA_SETTINGS });
});

/* =========================
   USERS
========================= */
router.get("/users", ...SA, async (req, res, next) => {
  try {
    const q = s(req.query.q, "");
    const role = s(req.query.role, "");
    const licensed = s(req.query.licensed, "");
    const active = s(req.query.active, "");

    const page = Math.max(1, n(req.query.page, 1));
    const limit = Math.min(500, Math.max(1, n(req.query.limit, 20)));
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
    if (active === "true") filter.isActive = { $ne: false };
    if (active === "false") filter.isActive = false;
    if (licensed === "true") filter.isLicensed = true;
    if (licensed === "false") filter.isLicensed = { $ne: true };

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("_id username fullName email role permissions isActive isLicensed licenseExpiresAt createdAt sponsor teamCount")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ ok: true, items, page, pages: Math.ceil(total / limit), total });
  } catch (e) {
    next(e);
  }
});

/* ✅ Güvenlik: başka superadmin'i pasifleştirme/düşürme */
function preventTouchingOtherSuperadmins(reqUser, targetUser, update) {
  const actorId = String(reqUser?._id || reqUser?.id || "");
  const targetId = String(targetUser?._id || "");

  const isSelf = actorId && targetId && actorId === targetId;

  if (!isSelf && targetUser?.role === "superadmin") {
    if (update.role && update.role !== "superadmin") return "Başka superadmin'in rolü değiştirilemez.";
    if (update.isActive === false) return "Başka superadmin pasifleştirilemez.";
  }

  if (isSelf) {
    if (update.role && update.role !== "superadmin") return "Kendi rolünü superadmin dışına düşüremezsin.";
    if (update.isActive === false) return "Kendini pasifleştiremezsin.";
  }

  return null;
}

router.put("/users/:id", ...SA, async (req, res, next) => {
  try {
    const id = s(req.params.id, "");
    if (!isObjId(id)) return res.status(400).json({ ok: false, message: "Geçersiz id" });

    const existing = await User.findById(id)
      .select("_id role isActive isLicensed licenseExpiresAt")
      .lean();

    if (!existing) return res.status(404).json({ ok: false, message: "User not found" });

    const update = {};

    if (req.body?.role !== undefined) {
      const role = s(req.body?.role, "");
      if (!["user", "admin", "superadmin"].includes(role)) {
        return res.status(400).json({ ok: false, message: "Invalid role" });
      }
      update.role = role;
    }

    if (req.body?.isActive !== undefined) {
      update.isActive = !!req.body.isActive;
    }

    if (req.body?.isLicensed !== undefined) {
      update.isLicensed = !!req.body.isLicensed;
      if (!update.isLicensed) {
        update.licenseExpiresAt = null;
      }
    }

    if (req.body?.licenseExpiresAt !== undefined) {
      const raw = req.body.licenseExpiresAt;

      if (!raw) {
        update.licenseExpiresAt = null;
      } else {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ ok: false, message: "Geçersiz licenseExpiresAt" });
        }
        update.licenseExpiresAt = d;

        if (req.body?.isLicensed === undefined) {
          update.isLicensed = true;
        }
      }
    }

    const blocked = preventTouchingOtherSuperadmins(req.user, existing, update);
    if (blocked) return res.status(403).json({ ok: false, message: blocked });

    const u = await User.findByIdAndUpdate(id, update, { new: true })
      .select("_id username fullName email role permissions isActive isLicensed licenseExpiresAt createdAt sponsor teamCount")
      .lean();

    res.json({ ok: true, user: u });
  } catch (e) {
    next(e);
  }
});

/* =========================
   LICENSE MANAGEMENT
========================= */
router.put("/users/:id/license", ...SA, async (req, res, next) => {
  try {
    const id = s(req.params.id, "");
    if (!isObjId(id)) {
      return res.status(400).json({ ok: false, message: "Geçersiz id" });
    }

    const existing = await User.findById(id)
      .select("_id username fullName email role isActive isLicensed licenseExpiresAt")
      .lean();

    if (!existing) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    if (
      String(req.user?._id || req.user?.id || "") !== String(existing._id) &&
      existing.role === "superadmin"
    ) {
      return res.status(403).json({
        ok: false,
        message: "Başka superadmin'in lisans durumu değiştirilemez.",
      });
    }

    const isLicensed = !!req.body?.isLicensed;
    const monthsRaw = Number(req.body?.months);
    const daysRaw = Number(req.body?.days);

    let licenseExpiresAt = null;

    if (isLicensed) {
      const now = new Date();

      if (Number.isFinite(monthsRaw) && monthsRaw > 0) {
        const d = new Date(now);
        d.setMonth(d.getMonth() + monthsRaw);
        licenseExpiresAt = d;
      } else if (Number.isFinite(daysRaw) && daysRaw > 0) {
        const d = new Date(now);
        d.setDate(d.getDate() + daysRaw);
        licenseExpiresAt = d;
      } else if (req.body?.licenseExpiresAt !== undefined) {
        if (!req.body.licenseExpiresAt) {
          licenseExpiresAt = null;
        } else {
          const d = new Date(req.body.licenseExpiresAt);
          if (Number.isNaN(d.getTime())) {
            return res.status(400).json({
              ok: false,
              message: "Geçersiz licenseExpiresAt değeri",
            });
          }
          licenseExpiresAt = d;
        }
      } else {
        const d = new Date(now);
        d.setMonth(d.getMonth() + 12);
        licenseExpiresAt = d;
      }
    }

    const updated = await User.findByIdAndUpdate(
      id,
      {
        isLicensed,
        licenseExpiresAt: isLicensed ? licenseExpiresAt : null,
      },
      { new: true }
    )
      .select("_id username fullName email role isActive isLicensed licenseExpiresAt createdAt sponsor teamCount")
      .lean();

    return res.json({
      ok: true,
      message: isLicensed ? "Lisans verildi / güncellendi" : "Lisans kaldırıldı",
      user: updated,
    });
  } catch (e) {
    next(e);
  }
});

/* =========================
   ADMIN PERMISSIONS (catalog based)
========================= */
router.put("/admin-perms/:id", ...SA, async (req, res, next) => {
  try {
    const id = s(req.params.id, "");
    if (!isObjId(id)) return res.status(400).json({ ok: false, message: "Geçersiz id" });

    const existing = await User.findById(id).select("_id role").lean();
    if (!existing) return res.status(404).json({ ok: false, message: "User not found" });

    if (String(req.user?._id || req.user?.id) !== String(existing._id) && existing.role === "superadmin") {
      return res.status(403).json({ ok: false, message: "Başka superadmin'e yetki yazılamaz." });
    }

    const perms = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
    const flat = new Set(allCatalogPerms());
    const cleaned = [...new Set(perms.map(String).map(x => x.trim()))].filter(p => flat.has(p));

    const u = await User.findByIdAndUpdate(
      id,
      { role: "admin", permissions: cleaned },
      { new: true }
    )
      .select("_id username role permissions")
      .lean();

    res.json({ ok: true, user: u });
  } catch (e) {
    next(e);
  }
});

/* =========================
   NETWORK (UNILEVEL & MATRIX VIEW)
========================= */
async function buildUnilevelTree(rootId, depth = 4) {
  const root = await User.findById(rootId)
    .select("_id username fullName email role isLicensed teamCount sponsor createdAt")
    .lean();

  if (!root) return null;

  const nodeMap = new Map();
  const makeNode = (u) => ({
    id: String(u._id),
    username: u.username,
    fullName: u.fullName || "",
    email: u.email || "",
    role: u.role,
    isLicensed: !!u.isLicensed,
    teamCount: Number(u.teamCount || 0),
    sponsor: u.sponsor ? String(u.sponsor) : null,
    createdAt: u.createdAt,
    children: [],
  });

  const rootNode = makeNode(root);
  nodeMap.set(rootNode.id, rootNode);

  let levelIds = [rootNode.id];

  for (let d = 1; d <= depth; d++) {
    if (levelIds.length === 0) break;

    const users = await User.find({
      sponsor: { $in: levelIds.map((x) => new mongoose.Types.ObjectId(x)) }
    })
      .select("_id username fullName email role isLicensed teamCount sponsor createdAt")
      .lean();

    const nextLevelIds = [];

    for (const u of users) {
      const child = makeNode(u);
      nodeMap.set(child.id, child);
      nextLevelIds.push(child.id);

      const parentId = child.sponsor;
      const parent = parentId ? nodeMap.get(parentId) : null;
      if (parent) parent.children.push(child);
    }

    levelIds = nextLevelIds;
  }

  return rootNode;
}

function clampMatrixWidth(node, width = 2) {
  if (!node) return node;
  const copy = { ...node, children: Array.isArray(node.children) ? [...node.children] : [] };
  copy.children = copy.children
    .slice(0, Math.max(1, Number(width) || 2))
    .map((c) => clampMatrixWidth(c, width));
  return copy;
}

router.get("/network/unilevel/tree", ...SA, async (req, res, next) => {
  try {
    const root = s(req.query.root, "");
    const depth = Math.min(8, Math.max(1, n(req.query.depth, 4)));

    const rootId = isObjId(root) ? root : (req.user?.id || req.user?._id);
    if (!isObjId(rootId)) return res.status(400).json({ ok: false, message: "Geçersiz root" });

    const tree = await buildUnilevelTree(rootId, depth);
    res.json({ ok: true, root: String(rootId), depth, tree });
  } catch (e) {
    next(e);
  }
});

router.get("/network/matrix/tree", ...SA, async (req, res, next) => {
  try {
    const root = s(req.query.root, "");
    const depth = Math.min(10, Math.max(1, n(req.query.depth, 4)));
    const width = Math.min(5, Math.max(1, n(req.query.width, 2)));

    const rootId = isObjId(root) ? root : (req.user?.id || req.user?._id);
    if (!isObjId(rootId)) return res.status(400).json({ ok: false, message: "Geçersiz root" });

    const base = await buildUnilevelTree(rootId, depth);
    const tree = clampMatrixWidth(base, width);

    res.json({
      ok: true,
      root: String(rootId),
      depth,
      width,
      tree,
      note: "MatrixNode modeli yoksa geçici olarak sponsor ağacından width ile kırpılmış matrix görünümü döner.",
    });
  } catch (e) {
    next(e);
  }
});

/* =========================
   CAREERS (SIMPLE / COMPUTED)
========================= */
function computeCareer(u) {
  const team = Number(u?.teamCount || 0);
  const licensed = !!u?.isLicensed;

  if (!licensed) return { key: "unlicensed", label: "Lisanssız", rank: 0 };
  if (team >= 100) return { key: "diamond", label: "Diamond", rank: 5 };
  if (team >= 50) return { key: "platinum", label: "Platinum", rank: 4 };
  if (team >= 20) return { key: "gold", label: "Gold", rank: 3 };
  if (team >= 5) return { key: "silver", label: "Silver", rank: 2 };
  return { key: "bronze", label: "Bronze", rank: 1 };
}

router.get("/careers/summary", ...SA, async (req, res, next) => {
  try {
    const users = await User.find({})
      .select("_id role isActive isLicensed teamCount")
      .lean();

    const out = {
      total: users.length,
      active: 0,
      licensed: 0,
      roles: { user: 0, admin: 0, superadmin: 0 },
      careers: {},
    };

    for (const u of users) {
      if (u.isActive !== false) out.active += 1;
      if (u.isLicensed) out.licensed += 1;

      const r = u.role || "user";
      if (out.roles[r] !== undefined) out.roles[r] += 1;

      const c = computeCareer(u);
      out.careers[c.key] = (out.careers[c.key] || 0) + 1;
    }

    res.json({ ok: true, summary: out });
  } catch (e) {
    next(e);
  }
});

router.get("/careers/users", ...SA, async (req, res, next) => {
  try {
    const q = s(req.query.q, "");
    const page = Math.max(1, n(req.query.page, 1));
    const limit = Math.min(200, Math.max(1, n(req.query.limit, 50)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (q) {
      filter.$or = [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("_id username fullName email role isActive isLicensed teamCount sponsor createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const mapped = items.map((u) => ({
      ...u,
      career: computeCareer(u),
    }));

    res.json({ ok: true, items: mapped, page, pages: Math.ceil(total / limit), total });
  } catch (e) {
    next(e);
  }
});

/* =========================
   PRODUCTS
========================= */
router.get("/products", ...SA, async (req, res, next) => {
  try {
    const Product = await getProductModel();
    if (!Product) return res.json({ ok: true, items: [], total: 0, note: "Product model yok" });

    const q = s(req.query.q, "");
    const page = Math.max(1, n(req.query.page, 1));
    const limit = Math.min(200, Math.max(1, n(req.query.limit, 50)));
    const skip = (page - 1) * limit;

    const filter = q
      ? { $or: [{ name: { $regex: q, $options: "i" } }, { brand: { $regex: q, $options: "i" } }] }
      : {};

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({ ok: true, items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});

router.post("/products", ...SA, async (req, res, next) => {
  try {
    const Product = await getProductModel();
    if (!Product) return res.status(400).json({ ok: false, message: "Product model yok" });

    const name = s(req.body?.name, "");
    if (!name) return res.status(400).json({ ok: false, message: "name zorunlu" });

    const priceNormal = n(req.body?.priceNormal, NaN);
    const priceLicensed = n(req.body?.priceLicensed, NaN);
    if (!Number.isFinite(priceNormal) || priceNormal <= 0) {
      return res.status(400).json({ ok: false, message: "priceNormal geçersiz" });
    }
    if (!Number.isFinite(priceLicensed) || priceLicensed <= 0) {
      return res.status(400).json({ ok: false, message: "priceLicensed geçersiz" });
    }

    const created = await Product.create({
      name,
      brand: s(req.body?.brand, ""),
      category: s(req.body?.category, ""),
      images: arrStr(req.body?.images),
      priceNormal,
      priceLicensed,
      desc: s(req.body?.desc, ""),
      isActive: req.body?.isActive !== false,
    });

    res.json({ ok: true, product: created });
  } catch (e) {
    next(e);
  }
});

router.put("/products/:id", ...SA, async (req, res, next) => {
  try {
    const Product = await getProductModel();
    if (!Product) return res.status(400).json({ ok: false, message: "Product model yok" });

    const id = s(req.params.id, "");
    if (!isObjId(id)) return res.status(400).json({ ok: false, message: "Geçersiz id" });

    const patch = {};
    const allowed = ["name", "brand", "category", "images", "priceNormal", "priceLicensed", "desc", "isActive"];
    for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    if (patch.images) patch.images = arrStr(patch.images);
    if (patch.name !== undefined) patch.name = s(patch.name, "");
    if (patch.brand !== undefined) patch.brand = s(patch.brand, "");
    if (patch.category !== undefined) patch.category = s(patch.category, "");
    if (patch.desc !== undefined) patch.desc = s(patch.desc, "");

    const updated = await Product.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!updated) return res.status(404).json({ ok: false, message: "Product not found" });

    res.json({ ok: true, product: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/products/:id", ...SA, async (req, res, next) => {
  try {
    const Product = await getProductModel();
    if (!Product) return res.status(400).json({ ok: false, message: "Product model yok" });

    const id = s(req.params.id, "");
    if (!isObjId(id)) return res.status(400).json({ ok: false, message: "Geçersiz id" });

    const deleted = await Product.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ ok: false, message: "Product not found" });

    res.json({ ok: true, deleted: true });
  } catch (e) {
    next(e);
  }
});

/* =========================
   FINANCE
========================= */
router.get("/finance/summary", ...SA, async (req, res, next) => {
  try {
    const Ledger = await getLedgerModel();
    if (!Ledger) {
      return res.json({ ok: true, summary: { total: 0, paid: 0, pending: 0, count: 0 }, note: "Ledger model yok" });
    }

    const agg = await Ledger.aggregate([
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

router.get("/finance/ledger", ...SA, async (req, res, next) => {
  try {
    const Ledger = await getLedgerModel();
    if (!Ledger) return res.json({ ok: true, items: [], total: 0, note: "Ledger model yok" });

    const q = s(req.query.q, "");
    const type = s(req.query.type, "");
    const status = s(req.query.status, "");

    const page = Math.max(1, n(req.query.page, 1));
    const limit = Math.min(300, Math.max(1, n(req.query.limit, 100)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (q) filter.title = { $regex: q, $options: "i" };

    const [items, total] = await Promise.all([
      Ledger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ledger.countDocuments(filter),
    ]);

    res.json({ ok: true, items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});

router.post("/finance/ledger", ...SA, async (req, res, next) => {
  try {
    const Ledger = await getLedgerModel();
    if (!Ledger) return res.status(400).json({ ok: false, message: "Ledger model yok" });

    const userId = s(req.body?.user, "");
    if (!isObjId(userId)) return res.status(400).json({ ok: false, message: "Geçersiz user" });

    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ ok: false, message: "amount 0 olamaz" });
    }

    const title = s(req.body?.title, "");
    if (!title) return res.status(400).json({ ok: false, message: "title zorunlu" });

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
   PAYMENTS
========================= */

// GET /api/superadmin/payments?q=&status=&method=&page=1&limit=50
router.get("/payments", ...SA, async (req, res, next) => {
  try {
    const Payment = await getPaymentModel();
    if (!Payment) {
      return res.json({ ok: true, items: [], total: 0, note: "Payment model yok" });
    }

    const q = s(req.query.q, "");
    const status = s(req.query.status, "");
    const method = s(req.query.method, "");

    const page = Math.max(1, n(req.query.page, 1));
    const limit = Math.min(200, Math.max(1, n(req.query.limit, 50)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;

    const [rawItems, total] = await Promise.all([
      Payment.find(filter)
        .populate("user", "username fullName email isLicensed licenseExpiresAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    let items = rawItems;
    if (q) {
      const qq = q.toLowerCase();
      items = rawItems.filter((x) => {
        const u = x.user || {};
        return (
          String(u.username || "").toLowerCase().includes(qq) ||
          String(u.fullName || "").toLowerCase().includes(qq) ||
          String(u.email || "").toLowerCase().includes(qq) ||
          String(x.txHash || "").toLowerCase().includes(qq)
        );
      });
    }

    res.json({
      ok: true,
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    next(e);
  }
});

// PUT /api/superadmin/payments/:id/approve
router.put("/payments/:id/approve", ...SA, async (req, res, next) => {
  try {
    const Payment = await getPaymentModel();
    if (!Payment) {
      return res.status(400).json({ ok: false, message: "Payment model yok" });
    }

    const id = s(req.params.id, "");
    if (!isObjId(id)) {
      return res.status(400).json({ ok: false, message: "Geçersiz payment id" });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ ok: false, message: "Payment not found" });
    }

    if (payment.status === "approved") {
      return res.status(400).json({ ok: false, message: "Ödeme zaten onaylanmış" });
    }

    const user = await User.findById(payment.user);
    if (!user) {
      return res.status(404).json({ ok: false, message: "Kullanıcı bulunamadı" });
    }

    if (payment.type === "license") {
      const now = new Date();
      const currentExp = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : null;
      const baseDate =
        user.isLicensed && currentExp && currentExp > now
          ? currentExp
          : now;

      baseDate.setMonth(baseDate.getMonth() + Number(payment.months || 12));

      user.isLicensed = true;
      user.licenseExpiresAt = baseDate;
      await user.save();
    }

    payment.status = "approved";
    payment.approvedAt = new Date();
    payment.approvedBy = req.user?._id || null;
    payment.adminNote = s(req.body?.adminNote, "");
    await payment.save();

    const Ledger = await getLedgerModel();
    if (Ledger) {
      await Ledger.create({
        user: user._id,
        type: "payment",
        status: "paid",
        amount: Number(payment.amount || 0),
        currency: s(payment.currency, "USDT"),
        title: `Ödeme onayı (${payment.method})`,
        note: `Payment approve #${payment._id}`,
        refType: "payment",
        refId: String(payment._id),
        txHash: s(payment.txHash, ""),
      });
    }

    const out = await Payment.findById(payment._id)
      .populate("user", "username fullName email isLicensed licenseExpiresAt")
      .lean();

    res.json({ ok: true, message: "Ödeme onaylandı", payment: out });
  } catch (e) {
    next(e);
  }
});

// PUT /api/superadmin/payments/:id/reject
router.put("/payments/:id/reject", ...SA, async (req, res, next) => {
  try {
    const Payment = await getPaymentModel();
    if (!Payment) {
      return res.status(400).json({ ok: false, message: "Payment model yok" });
    }

    const id = s(req.params.id, "");
    if (!isObjId(id)) {
      return res.status(400).json({ ok: false, message: "Geçersiz payment id" });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ ok: false, message: "Payment not found" });
    }

    if (payment.status === "approved") {
      return res.status(400).json({ ok: false, message: "Onaylanmış ödeme reddedilemez" });
    }

    payment.status = "rejected";
    payment.rejectedAt = new Date();
    payment.rejectedBy = req.user?._id || null;
    payment.adminNote = s(req.body?.adminNote, "");
    await payment.save();

    const out = await Payment.findById(payment._id)
      .populate("user", "username fullName email")
      .lean();

    res.json({ ok: true, message: "Ödeme reddedildi", payment: out });
  } catch (e) {
    next(e);
  }
});

/* =========================
   ORDERS (optional)
========================= */
router.get("/orders", ...SA, async (req, res, next) => {
  try {
    const Order = await getOrderModel();
    if (!Order) return res.json({ ok: true, items: [], total: 0, note: "Order model yok" });

    const items = await Order.find({}).sort({ createdAt: -1 }).limit(300).lean();
    res.json({ ok: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
});

export default router;