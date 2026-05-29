import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Product from "../models/Product.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= UPLOAD ================= */

const uploadDir = "uploads/products";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.random() + ext);
  },
});

const upload = multer({ storage });

function adminOrSuperadmin(req, res, next) {
  const role = req.user?.role;
  if (role === "admin" || role === "superadmin") return next();
  return res.status(403).json({ message: "Yetki yok" });
}

function fileUrl(req, file) {
  return `${req.protocol}://${req.get("host")}/uploads/products/${file.filename}`;
}

/* ================= PUBLIC ================= */

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch {
    res.status(500).json({ message: "Ürünler alınamadı" });
  }
});

/* ================= ADMIN ================= */

// TÜM ÜRÜNLER
router.get("/admin/products", authRequired, adminOrSuperadmin, async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

/* ================= CREATE ================= */

router.post(
  "/admin/products",
  authRequired,
  adminOrSuperadmin,
  upload.array("images"),
  async (req, res) => {
    try {
      const uploadedImages = (req.files || []).map((f) => fileUrl(req, f));

      const product = await Product.create({
        name: req.body.name,
        nameTr: req.body.nameTr,
        nameEn: req.body.nameEn,

        brand: req.body.brand,

        category: req.body.category,
        categoryTr: req.body.categoryTr,
        categoryEn: req.body.categoryEn,

        description: req.body.description,
        descriptionTr: req.body.descriptionTr,
        descriptionEn: req.body.descriptionEn,

        priceNormal: Number(req.body.priceNormal),
        priceLicensed: Number(req.body.priceLicensed),

        stock: req.body.stock || "Sınırsız",

        isActive: req.body.isActive === "true" || req.body.isActive === true,

        images: uploadedImages,
      });

      res.json({ message: "Ürün eklendi", product });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Ürün eklenemedi" });
    }
  }
);

/* ================= UPDATE ================= */

router.put(
  "/admin/products/:id",
  authRequired,
  adminOrSuperadmin,
  upload.array("images"),
  async (req, res) => {
    try {
      const existingImages = req.body.existingImages
        ? Array.isArray(req.body.existingImages)
          ? req.body.existingImages
          : [req.body.existingImages]
        : [];

      const uploadedImages = (req.files || []).map((f) => fileUrl(req, f));

      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          nameTr: req.body.nameTr,
          nameEn: req.body.nameEn,

          brand: req.body.brand,

          category: req.body.category,
          categoryTr: req.body.categoryTr,
          categoryEn: req.body.categoryEn,

          description: req.body.description,
          descriptionTr: req.body.descriptionTr,
          descriptionEn: req.body.descriptionEn,

          priceNormal: Number(req.body.priceNormal),
          priceLicensed: Number(req.body.priceLicensed),

          stock: req.body.stock,

          isActive: req.body.isActive === "true" || req.body.isActive === true,

          images: [...existingImages, ...uploadedImages],
        },
        { new: true }
      );

      res.json({ message: "Güncellendi", product: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Güncellenemedi" });
    }
  }
);

/* ================= DELETE ================= */

router.delete(
  "/admin/products/:id",
  authRequired,
  adminOrSuperadmin,
  async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Silindi" });
  }
);

/* ================= SINGLE ================= */

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Yok" });
  res.json(product);
});

export default router;