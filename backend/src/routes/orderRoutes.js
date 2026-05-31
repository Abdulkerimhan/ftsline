import express from "express";
import jwt from "jsonwebtoken";
import Order from "../models/Order.js";

const router = express.Router();

/* ================= AUTH MIDDLEWARE ================= */

function getJwtSecret() {
  return process.env.JWT_SECRET || "ftsline_dev_secret_change_me";
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token yok" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret());

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Gecersiz token" });
  }
}

function adminOrSuperadmin(req, res, next) {
  if (!["admin", "superadmin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Admin yetkisi gerekli" });
  }

  next();
}

/* ================= HELPERS ================= */

function normalizeOrderItems(items = []) {
  return items.map((item) => {
    const price = Number(
      item.selectedPrice ?? item.price ?? item.priceNormal ?? 0
    );

    return {
      productId: item._id || item.productId || null,
      name: item.name,
      image: item.image || item.images?.[0] || "",
      price,
      quantity: Number(item.quantity || 1),
    };
  });
}

/* ================= CREATE ORDER ================= */

router.post("/", authRequired, async (req, res) => {
  try {
    const { items, shippingInfo, subtotal, shippingPrice, total, paymentMethod, paymentProof } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Sepet bos." });
    }

    if (!shippingInfo) {
      return res.status(400).json({ message: "Teslimat bilgileri eksik." });
    }

    const orderItems = normalizeOrderItems(items);

    const calculatedSubtotal = orderItems.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);

    const finalShippingPrice = Number(shippingPrice || 0);
    const finalTotal = calculatedSubtotal + finalShippingPrice;

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingInfo,
      subtotal: Number(subtotal || calculatedSubtotal),
      shippingPrice: finalShippingPrice,
      total: Number(total || finalTotal),
      status: "pending",
      paymentMethod: ["bank_transfer", "cash_on_delivery", "card", "usdt_trc20"].includes(paymentMethod)
        ? paymentMethod
        : "bank_transfer",
      paymentStatus: "pending",
      paymentProof: ["bank_transfer", "usdt_trc20"].includes(paymentMethod) ? String(paymentProof || "").trim() : "",
      paymentNetwork: paymentMethod === "usdt_trc20" ? "TRC20" : "",
      paymentAddress:
        paymentMethod === "usdt_trc20"
          ? String(process.env.USDT_TRC20_ADDRESS || "").trim()
          : "",
    });

    return res.status(201).json({
      message: "Siparis basariyla olusturuldu.",
      order,
    });
  } catch (error) {
    console.error("Siparis olusturma hatasi:", error);
    return res.status(500).json({
      message: "Siparis olusturulamadi.",
    });
  }
});

/* ================= MY ORDERS ================= */

router.get("/my", authRequired, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(orders);
  } catch (error) {
    console.error("Siparislerim hatasi:", error);
    return res.status(500).json({
      message: "Siparisler alinamadi.",
    });
  }
});

/* ================= ADMIN ALL ORDERS ================= */

router.get("/admin/all", authRequired, adminOrSuperadmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username fullName email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(orders);
  } catch (error) {
    console.error("Admin siparis listesi hatasi:", error);
    return res.status(500).json({
      message: "Siparisler alinamadi.",
    });
  }
});

/* ================= ADMIN UPDATE PAYMENT ================= */

router.put("/admin/:id/payment", authRequired, adminOrSuperadmin, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paymentProof } = req.body;
    const updates = {};

    if (paymentStatus) {
      if (!["pending", "paid", "failed", "refunded"].includes(paymentStatus)) {
        return res.status(400).json({ message: "Gecersiz odeme durumu" });
      }
      updates.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      if (!["card", "cash_on_delivery", "bank_transfer", "usdt_trc20"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Gecersiz odeme yontemi" });
      }
      updates.paymentMethod = paymentMethod;
    }

    if (paymentProof !== undefined) {
      updates.paymentProof = String(paymentProof || "").trim();
    }
    const order = await Order.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    })
      .populate("user", "username fullName email role")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Siparis bulunamadi" });
    }

    return res.json(order);
  } catch (error) {
    console.error("Odeme durumu guncelleme hatasi:", error);
    return res.status(500).json({ message: "Odeme durumu guncellenemedi" });
  }
});
/* ================= SINGLE ORDER ================= */

router.get("/:id", authRequired, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).lean();

    if (!order) {
      return res.status(404).json({ message: "Siparis bulunamadi." });
    }

    return res.json(order);
  } catch (error) {
    console.error("Siparis detay hatasi:", error);
    return res.status(500).json({
      message: "Siparis detayi alinamadi.",
    });
  }
});

export default router;
