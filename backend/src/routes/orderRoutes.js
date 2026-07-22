import express from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { activateLicensePlanForUser, getLicensePlan } from "../services/licensePlanService.js";

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

async function authOptional(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select("role isActive isLicensed");

    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Kullanici oturumu gecersiz" });
    }

    req.user = user;
    return next();
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

async function normalizeOrderItems(items = [], isLicensed = false) {
  const requested = items.map((item) => ({
    productId: String(item.productId || item._id || "").trim(),
    quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
  }));
  const productIds = requested.map((item) => item.productId).filter(Boolean);
  if (productIds.some((productId) => !mongoose.isValidObjectId(productId))) {
    throw new Error("Sipariste gecersiz veya pasif urun var");
  }
  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  if (productIds.length !== requested.length || products.length !== new Set(productIds).size) {
    throw new Error("Sipariste gecersiz veya pasif urun var");
  }

  return requested.map(({ productId, quantity }) => {
    const product = productMap.get(productId);
    const licensedPrice = Number(product.priceLicensed || 0);
    const normalPrice = Number(product.priceNormal || 0);

    return {
      productId: product._id,
      name: product.nameTr || product.name || "Urun",
      image: product.image || product.images?.[0] || "",
      price: isLicensed && licensedPrice > 0 ? licensedPrice : normalPrice,
      quantity,
    };
  });
}

async function createUniqueTrackingCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `FTS-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    const exists = await Order.exists({ trackingCode: code });
    if (!exists) return code;
  }

  throw new Error("Takip kodu olusturulamadi");
}

/* ================= CREATE ORDER ================= */

router.post("/", authOptional, async (req, res) => {
  try {
    const {
      items,
      shippingInfo,
      subtotal,
      shippingPrice,
      total,
      paymentMethod,
      paymentProof,
      orderType,
      licensePlan,
    } = req.body;
    const isLicenseOrder = orderType === "license";
    const selectedLicensePlan = isLicenseOrder ? getLicensePlan(licensePlan) : null;

    if (isLicenseOrder && !selectedLicensePlan) {
      return res.status(400).json({ message: "Gecersiz lisans plani." });
    }

    if (isLicenseOrder && !req.user) {
      return res.status(401).json({ message: "Lisans siparisi icin giris yapmalisiniz." });
    }

    if (!isLicenseOrder && (!items || !Array.isArray(items) || items.length === 0)) {
      return res.status(400).json({ message: "Sepet bos." });
    }

    if (!shippingInfo) {
      return res.status(400).json({ message: "Teslimat bilgileri eksik." });
    }

    const orderItems = isLicenseOrder
      ? [
          {
            productId: null,
            name: selectedLicensePlan.label,
            image: "",
            price: selectedLicensePlan.priceUsdt,
            quantity: 1,
          },
        ]
      : await normalizeOrderItems(items, req.user?.isLicensed === true);

    const calculatedSubtotal = orderItems.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);

    const finalShippingPrice = 0;
    const finalTotal = calculatedSubtotal + finalShippingPrice;

    const trackingCode = await createUniqueTrackingCode();
    const order = await Order.create({
      trackingCode,
      user: req.user?._id || null,
      items: orderItems,
      shippingInfo,
      subtotal: calculatedSubtotal,
      shippingPrice: finalShippingPrice,
      total: finalTotal,
      orderType: isLicenseOrder ? "license" : "product",
      licensePlan: selectedLicensePlan?.key || "",
      licenseMonths: selectedLicensePlan?.durationMonths || 0,
      licenseAmountUsdt: selectedLicensePlan?.priceUsdt || 0,
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
      trackingCode: order.trackingCode,
      order,
    });
  } catch (error) {
    console.error("Siparis olusturma hatasi:", error);
    if (error.message === "Sipariste gecersiz veya pasif urun var") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({
      message: "Siparis olusturulamadi.",
    });
  }
});

/* ================= PUBLIC GUEST TRACKING ================= */

router.post("/track", async (req, res) => {
  try {
    const trackingCode = String(req.body?.trackingCode || "").trim().toUpperCase();
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!trackingCode || !email) {
      return res.status(400).json({ message: "Takip kodu ve e-posta zorunludur." });
    }

    const order = await Order.findOne({
      trackingCode,
      "shippingInfo.email": email,
    })
      .select(
        "trackingCode items subtotal shippingPrice total orderType status paymentMethod paymentStatus createdAt shippingInfo.fullName shippingInfo.city shippingInfo.district"
      )
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Takip kodu veya e-posta eslesmedi." });
    }

    return res.json(order);
  } catch (error) {
    console.error("Misafir siparis takip hatasi:", error);
    return res.status(500).json({ message: "Siparis bilgisi alinamadi." });
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

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Guncellenecek odeme alani bulunamadi" });
    }

    const previousOrder = await Order.findById(req.params.id);

    if (!previousOrder) {
      return res.status(404).json({ message: "Siparis bulunamadi" });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    })
      .populate("user", "username fullName email role")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Siparis bulunamadi" });
    }

    let licenseActivation = null;

    if (
      order.orderType === "license" &&
      order.licensePlan &&
      paymentStatus === "paid" &&
      previousOrder.paymentStatus !== "paid" &&
      !previousOrder.licenseActivatedAt
    ) {
      licenseActivation = await activateLicensePlanForUser({
        userId: previousOrder.user,
        planKey: order.licensePlan,
        paidAt: new Date(),
      });

      await Order.findByIdAndUpdate(order._id, {
        status: "completed",
        licenseActivatedAt: new Date(),
      });
    }

    const finalOrder = await Order.findById(order._id)
      .populate("user", "username fullName email role")
      .lean();

    return res.json({ ...finalOrder, licenseActivation });
  } catch (error) {
    console.error("Odeme durumu guncelleme hatasi:", error);
    return res.status(500).json({ message: "Odeme durumu guncellenemedi" });
  }
});

/* ================= ADMIN UPDATE ORDER ================= */

router.put("/admin/:id/status", authRequired, adminOrSuperadmin, async (req, res) => {
  try {
    const { status, shippingCarrier, cargoTrackingNumber } = req.body;
    const allowedStatuses = ["pending", "preparing", "shipped", "completed", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Gecersiz siparis durumu" });
    }

    const updates = {
      status,
      shippingCarrier: String(shippingCarrier || "").trim(),
      cargoTrackingNumber: String(cargoTrackingNumber || "").trim(),
    };

    if (status === "shipped" && !updates.cargoTrackingNumber) {
      return res.status(400).json({ message: "Kargoya verildi durumunda takip numarasi gereklidir" });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("user", "username fullName email role")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Siparis bulunamadi" });
    }

    return res.json(order);
  } catch (error) {
    console.error("Siparis durumu guncelleme hatasi:", error);
    return res.status(500).json({ message: "Siparis durumu guncellenemedi" });
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
