import express from "express";
import multer from "multer";
import Product from "../models/Product.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { uploadProductImages } from "../utils/cloudinaryUpload.js";

const router = express.Router();

/* ================= UPLOAD AYARLARI ================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
  fileFilter(req, file, cb) {
    cb(null, String(file.mimetype || "").startsWith("image/"));
  },
});

/* ================= YETKÄ° KONTROL ================= */

function hasAdminPermission(req, permission) {
  if (req.user?.role === "superadmin") return true;
  if (req.user?.role !== "admin") return false;
  const permissions = Array.isArray(req.user.adminPermissions)
    ? req.user.adminPermissions
    : ["users", "products", "finance", "settings"];
  return permissions.includes(permission);
}

function adminOrSuperadmin(req, res, next) {
  const role = req.user?.role;

  if (role === "admin" || role === "superadmin") {
    return next();
  }

  return res.status(403).json({ message: "Yetki yok" });
}

function requireAdminPermission(permission) {
  return (req, res, next) => {
    if (!hasAdminPermission(req, permission)) {
      return res.status(403).json({ message: "Bu admin alani icin yetkiniz yok" });
    }

    next();
  };
}

/* ================= ADMIN - TÃœM ÃœRÃœNLER ================= */

router.get("/products", authRequired, adminOrSuperadmin, requireAdminPermission("products"), async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("Admin Ã¼rÃ¼nler alÄ±namadÄ±:", error);
    res.status(500).json({ message: "ÃœrÃ¼nler alÄ±namadÄ±" });
  }
});

/* ================= ADMIN - ÃœRÃœN EKLE ================= */

router.post(
  "/products",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("products"),
  upload.array("images"),
  async (req, res) => {
    try {
      const uploadedImages = await uploadProductImages(req.files || []);

      const product = await Product.create({
        name: req.body.name || req.body.nameTr || "",
        nameTr: req.body.nameTr || req.body.name || "",
        nameEn: req.body.nameEn || "",

        brand: req.body.brand || "",

        category: req.body.category || req.body.categoryTr || "",
        categoryTr: req.body.categoryTr || req.body.category || "",
        categoryEn: req.body.categoryEn || "",

        description: req.body.description || req.body.descriptionTr || "",
        descriptionTr: req.body.descriptionTr || req.body.description || "",
        descriptionEn: req.body.descriptionEn || "",

        priceNormal: Number(req.body.priceNormal || 0),
        priceLicensed: Number(req.body.priceLicensed || 0),

        stock: req.body.stock || "SÄ±nÄ±rsÄ±z",

        isActive:
          req.body.isActive === "true" ||
          req.body.isActive === true ||
          req.body.isActive === "on",

        images: uploadedImages,
        image: uploadedImages[0] || "",
      });

      res.status(201).json({
        message: "ÃœrÃ¼n eklendi",
        product,
      });
    } catch (error) {
      console.error("ÃœrÃ¼n ekleme hatasÄ±:", error);
      res.status(500).json({ message: "ÃœrÃ¼n eklenemedi" });
    }
  }
);

/* ================= ADMIN - ÃœRÃœN GÃœNCELLE ================= */

router.put(
  "/products/:id",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("products"),
  upload.array("images"),
  async (req, res) => {
    try {
      const existingImages = req.body.existingImages
        ? Array.isArray(req.body.existingImages)
          ? req.body.existingImages
          : [req.body.existingImages]
        : [];

      const uploadedImages = await uploadProductImages(req.files || []);

      const allImages = [...existingImages, ...uploadedImages];

      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name || req.body.nameTr || "",
          nameTr: req.body.nameTr || req.body.name || "",
          nameEn: req.body.nameEn || "",

          brand: req.body.brand || "",

          category: req.body.category || req.body.categoryTr || "",
          categoryTr: req.body.categoryTr || req.body.category || "",
          categoryEn: req.body.categoryEn || "",

          description: req.body.description || req.body.descriptionTr || "",
          descriptionTr: req.body.descriptionTr || req.body.description || "",
          descriptionEn: req.body.descriptionEn || "",

          priceNormal: Number(req.body.priceNormal || 0),
          priceLicensed: Number(req.body.priceLicensed || 0),

          stock: req.body.stock || "SÄ±nÄ±rsÄ±z",

          isActive:
            req.body.isActive === "true" ||
            req.body.isActive === true ||
            req.body.isActive === "on",

          images: allImages,
          image: allImages[0] || "",
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "ÃœrÃ¼n bulunamadÄ±" });
      }

      res.json({
        message: "ÃœrÃ¼n gÃ¼ncellendi",
        product: updated,
      });
    } catch (error) {
      console.error("ÃœrÃ¼n gÃ¼ncelleme hatasÄ±:", error);
      res.status(500).json({ message: "ÃœrÃ¼n gÃ¼ncellenemedi" });
    }
  }
);

/* ================= ADMIN - ÃœRÃœN SÄ°L ================= */

router.delete(
  "/products/:id",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("products"),
  async (req, res) => {
    try {
      const deleted = await Product.findByIdAndDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({ message: "ÃœrÃ¼n bulunamadÄ±" });
      }

      res.json({ message: "ÃœrÃ¼n silindi" });
    } catch (error) {
      console.error("ÃœrÃ¼n silme hatasÄ±:", error);
      res.status(500).json({ message: "ÃœrÃ¼n silinemedi" });
    }
  }
);

export default router;

