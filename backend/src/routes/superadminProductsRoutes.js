import express from "express";
import Product from "../models/Product.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/* =========================
   GET /api/superadmin/products
========================= */
router.get("/", auth, requireRole("superadmin"), async (req, res, next) => {
  try {
    const { q = "", category = "", brand = "", page = 1, limit = 20 } = req.query;

    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
      ];
    }

    if (category) filter.category = category;
    if (brand) filter.brand = brand;

    const p = Math.max(1, Number(page));
    const l = Math.min(100, Number(limit));

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),

      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: p,
      pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
});

/* =========================
   POST /api/superadmin/products
   ÜRÜN EKLE
========================= */
router.post("/", auth, requireRole("superadmin"), async (req, res, next) => {
  try {
    const {
      name,
      brand,
      category,
      images,
      priceNormal,
      priceLicensed,
      desc,
    } = req.body;

    if (!name || priceNormal == null || priceLicensed == null) {
      return res.status(400).json({ message: "Eksik alanlar" });
    }

    const product = await Product.create({
      name,
      brand,
      category,
      images: Array.isArray(images) ? images : [],
      priceNormal,
      priceLicensed,
      desc,
    });

    res.json(product);
  } catch (err) {
    next(err);
  }
});

/* =========================
   PUT /api/superadmin/products/:id
   GÜNCELLE
========================= */
router.put("/:id", auth, requireRole("superadmin"), async (req, res, next) => {
  try {
    const update = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

/* =========================
   DELETE /api/superadmin/products/:id
========================= */
router.delete("/:id", auth, requireRole("superadmin"), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* =========================
   PUT /api/superadmin/products/:id/toggle
   AKTİF / PASİF
========================= */
router.put("/:id/toggle", auth, requireRole("superadmin"), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json(product);
  } catch (err) {
    next(err);
  }
});

export default router;