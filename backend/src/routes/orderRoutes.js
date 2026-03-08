import express from "express";
import mongoose from "mongoose";
import { auth } from "../middleware/auth.js";
import { attachUser } from "../middleware/attachUser.js";

import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

const router = express.Router();

function safeNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/* =========================
   POST /api/orders
   Sipariş oluştur
   body:
   {
     items: [{ productId, qty }],
     shippingFee?,
     currency?,
     address?,
     note?
   }
========================= */
router.post("/", auth, attachUser, async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const itemsIn = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!itemsIn.length) return res.status(400).json({ ok: false, message: "Sepet boş" });

    // lisans durumunu al
    const u = await User.findById(userId).select("isLicensed").lean();
    const licensed = !!u?.isLicensed;

    // id listesi
    const ids = itemsIn
      .map((x) => x?.productId || x?.id)
      .filter(Boolean)
      .map((x) => String(x));

    const objIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const products = await Product.find({
      _id: { $in: objIds },
      isActive: { $ne: false },
    }).lean();

    if (!products.length) {
      return res.status(400).json({ ok: false, message: "Ürün bulunamadı" });
    }

    const map = new Map(products.map((p) => [String(p._id), p]));

    const items = [];
    let subTotal = 0;

    for (const it of itemsIn) {
      const pid = String(it?.productId || it?.id || "");
      const p = map.get(pid);
      if (!p) continue;

      const qty = Math.max(1, safeNum(it?.qty, 1));
      const unitPrice = licensed ? safeNum(p.priceLicensed, 0) : safeNum(p.priceNormal, 0);
      const lineTotal = unitPrice * qty;

      // fiyat güvenliği
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) continue;

      items.push({
        product: p._id,
        name: p.name,
        brand: p.brand || "",
        category: p.category || "",
        image: Array.isArray(p.images) && p.images[0] ? p.images[0] : "",
        qty,
        unitPrice,
        lineTotal,
      });

      subTotal += lineTotal;
    }

    if (!items.length) return res.status(400).json({ ok: false, message: "Geçerli ürün yok" });

    const shippingFee = Math.max(0, safeNum(req.body?.shippingFee, 0));
    const grandTotal = subTotal + shippingFee;

    const order = await Order.create({
      user: userId,
      status: "pending",
      items,
      currency: String(req.body?.currency || "TRY"),
      subTotal,
      shippingFee,
      grandTotal,
      address: req.body?.address || {},
      note: String(req.body?.note || ""),
    });

    res.json({ ok: true, order });
  } catch (e) {
    next(e);
  }
});

/* =========================
   GET /api/orders/mine
   Kullanıcı kendi siparişleri
========================= */
router.get("/mine", auth, attachUser, async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const items = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ ok: true, items });
  } catch (e) {
    next(e);
  }
});

export default router;