import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

function normalizeProduct(p) {
  const x = p?.toObject ? p.toObject() : p;

  // bazı eski datalarda field isimleri farklı
  const priceNormal = x.priceNormal ?? x.normalPrice ?? 0;
  const priceLicensed = x.priceLicensed ?? x.licensedPrice ?? 0;

  const desc = x.desc ?? x.description ?? "";

  return {
    _id: x._id,
    name: x.name,
    brand: x.brand || "",
    category: x.category || "",
    images: Array.isArray(x.images) ? x.images : [],

    // ✅ TEK FORMAT
    priceNormal: Number(priceNormal || 0),
    priceLicensed: Number(priceLicensed || 0),
    desc: String(desc || ""),

    // opsiyonel (eski datadan gelebilir)
    tags: Array.isArray(x.tags) ? x.tags : [],
    badge: x.badge || "",
    featured: Boolean(x.featured || false),
    stock: x.stock ?? null,

    isActive: x.isActive !== false,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}

/* =========================
   GET ALL PRODUCTS
========================= */
// GET /api/products
router.get("/", async (req, res, next) => {
  try {
    const { category, brand, search, includeInactive } = req.query;

    const filter = {};
    if (includeInactive !== "1") filter.isActive = true;

    if (category) filter.category = category;
    if (brand) filter.brand = brand;

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json({ ok: true, products: products.map(normalizeProduct) });
  } catch (e) {
    next(e);
  }
});

/* =========================
   GET SINGLE PRODUCT
========================= */
// GET /api/products/:id
router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    res.json({ ok: true, product: normalizeProduct(product) });
  } catch (e) {
    next(e);
  }
});

/* =========================
   CREATE PRODUCT
========================= */
// POST /api/products
router.post("/", async (req, res, next) => {
  try {
    const data = req.body || {};

    // ✅ eski formatla geleni de kabul et
    const payload = {
      ...data,
      priceNormal: data.priceNormal ?? data.normalPrice,
      priceLicensed: data.priceLicensed ?? data.licensedPrice,
      desc: data.desc ?? data.description ?? "",
    };

    const product = await Product.create(payload);

    res.json({ ok: true, product: normalizeProduct(product) });
  } catch (e) {
    next(e);
  }
});

/* =========================
   UPDATE PRODUCT
========================= */
// PUT /api/products/:id
router.put("/:id", async (req, res, next) => {
  try {
    const data = req.body || {};

    const patch = {
      ...data,
      priceNormal: data.priceNormal ?? data.normalPrice,
      priceLicensed: data.priceLicensed ?? data.licensedPrice,
      desc: data.desc ?? data.description,
    };

    // undefined alanları set etmesin diye temizle
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

    const product = await Product.findByIdAndUpdate(req.params.id, patch, { new: true });

    if (!product) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    res.json({ ok: true, product: normalizeProduct(product) });
  } catch (e) {
    next(e);
  }
});

/* =========================
   DELETE PRODUCT
========================= */
// DELETE /api/products/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;