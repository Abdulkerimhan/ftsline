// backend/src/routes/adminRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import { attachUser } from "../middleware/attachUser.js";
import { requireRole } from "../middleware/requireRole.js";
import { requirePerm } from "../middleware/requirePerm.js";

// MODELLERİN varsa import et:
// import Product from "../models/Product.js";
// import Order from "../models/Order.js";
// import Ledger from "../models/Ledger.js";
// import User from "../models/User.js";

const router = express.Router();

/* =========================
   ✅ HEALTH / ME
========================= */
router.get("/ping", auth, attachUser, requireRole("admin", "superadmin"), (req, res) => {
  res.json({
    ok: true,
    message: "admin ok",
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions,
    },
  });
});

/* =========================
   ✅ FINANCE (read-only by default)
========================= */
router.get(
  "/finance/summary",
  auth,
  attachUser,
  requireRole("admin", "superadmin"),
  requirePerm("finance.view"),
  async (req, res) => {
    // Burayı gerçek Ledger toplamlarına bağlayacaksın.
    // Şimdilik demo:
    res.json({
      ok: true,
      summary: {
        totalIn: 0,
        totalOut: 0,
        pending: 0,
        last24h: 0,
      },
    });
  }
);

router.get(
  "/finance/ledger",
  auth,
  attachUser,
  requireRole("admin", "superadmin"),
  requirePerm("finance.view"),
  async (req, res) => {
    // ✅ örnek filtre paramları: ?q=&type=&status=&page=&limit=
    // Gerçek DB bağlamak istersen Ledger.find() ile doldur.
    res.json({ ok: true, items: [], page: 1, pages: 1, total: 0 });
  }
);

/* =========================
   ✅ PRODUCTS
========================= */
router.get(
  "/products",
  auth,
  attachUser,
  requireRole("admin", "superadmin"),
  requirePerm("products.view"),
  async (req, res) => {
    // Product list (stub)
    res.json({ ok: true, items: [], total: 0 });
  }
);

router.post(
  "/products",
  auth,
  attachUser,
  requireRole("admin", "superadmin"),
  requirePerm("products.create"),
  async (req, res) => {
    // Product create (stub)
    // const created = await Product.create(req.body)
    res.json({ ok: true, message: "Product created (stub)" });
  }
);

router.put(
  "/products/:id",
  auth,
  attachUser,
  requireRole("admin", "superadmin"),
  requirePerm("products.update"),
  async (req, res) => {
    res.json({ ok: true, message: "Product updated (stub)" });
  }
);

router.delete(
  "/products/:id",
  auth,
  attachUser,
  requireRole("admin", "superadmin"),
  requirePerm("products.delete"),
  async (req, res) => {
    res.json({ ok: true, message: "Product deleted (stub)" });
  }
);

/* =========================
   ✅ USERS (read-only)
========================= */
router.get(
  "/users",
  auth,
  attachUser,
  requireRole("admin", "superadmin"),
  requirePerm("users.view"),
  async (req, res) => {
    res.json({ ok: true, items: [], total: 0 });
  }
);

/* =========================
   ✅ NETWORK (read-only)
========================= */
router.get(
  "/network/overview",
  auth,
  attachUser,
  requireRole("admin", "superadmin"),
  requirePerm("network.view_all"),
  async (req, res) => {
    res.json({ ok: true, overview: { teams: 0, nodes: 0 } });
  }
);

export default router;