import express from "express";
import mongoose from "mongoose";
import { auth } from "../middleware/auth.js";
import { attachUser } from "../middleware/attachUser.js";
import Payment from "../models/Payment.js";

const router = express.Router();

function s(v, def = "") {
  return String(v ?? def).trim();
}

function n(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

function isObjId(x) {
  return mongoose.Types.ObjectId.isValid(String(x || ""));
}

/* =========================
   CREATE PAYMENT REQUEST
========================= */
router.post("/", auth, attachUser, async (req, res, next) => {
  try {
    const amount = n(req.body?.amount, 0);
    const months = Math.max(1, Math.min(60, n(req.body?.months, 12)));
    const method = s(req.body?.method, "");
    const type = s(req.body?.type, "license");
    const currency = s(req.body?.currency, "USDT").toUpperCase();

    if (!amount || amount <= 0) {
      return res.status(400).json({ ok: false, message: "Geçerli amount zorunlu" });
    }

    if (!["USDT_TRC20", "BANK", "CASH", "OTHER"].includes(method)) {
      return res.status(400).json({ ok: false, message: "Geçersiz ödeme yöntemi" });
    }

    if (!["license", "product", "manual"].includes(type)) {
      return res.status(400).json({ ok: false, message: "Geçersiz ödeme tipi" });
    }

    const payment = await Payment.create({
      user: req.user._id,
      type,
      method,
      amount,
      currency,
      months,
      txHash: s(req.body?.txHash, ""),
      receiptImage: s(req.body?.receiptImage, ""),
      note: s(req.body?.note, ""),
      status: "pending",
    });

    res.json({ ok: true, payment });
  } catch (e) {
    next(e);
  }
});

/* =========================
   MY PAYMENTS
========================= */
router.get("/mine", auth, attachUser, async (req, res, next) => {
  try {
    const items = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ok: true, items });
  } catch (e) {
    next(e);
  }
});

export default router;