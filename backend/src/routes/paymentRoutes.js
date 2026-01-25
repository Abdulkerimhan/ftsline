// backend/src/routes/paymentRoutes.js
import express from "express";
import User from "../models/User.js";

import { requireAuth } from "../middleware/auth.js";
import { distributeUnilevelSignup } from "../services/unilevelService.js";

const router = express.Router();

// "YYYY-MM"
function getYmKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * ✅ SIGNUP / LICENSE (İLK ÖDEME)
 * POST /api/payments/license
 *
 * KURAL:
 * - Sadece 1 kere yapılır
 * - Tutar sabit: UNILEVEL_BASE_AMOUNT (default 74.99)
 * - Unilevel sadece burada çalışır (kariyer şartlarına göre, 74.99 tabanı üzerinden)
 */
router.post("/license", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const baseAmount = Number(process.env.UNILEVEL_BASE_AMOUNT || 74.99);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return res.status(500).json({ ok: false, message: "UNILEVEL_BASE_AMOUNT invalid" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    // payments array garanti
    if (!Array.isArray(user.payments)) user.payments = [];

    // ✅ 1 kere SIGNUP
    const alreadySignup = user.payments.some((p) => p?.type === "SIGNUP");
    if (alreadySignup) {
      return res.status(409).json({ ok: false, message: "SIGNUP payment already exists" });
    }

    // ✅ SIGNUP payment kaydı ekle
    user.payments.push({
      type: "SIGNUP",
      amount: baseAmount,
      currency: "USDT",
      network: "TRC20",
      paidAt: now,
      monthKey: null,
    });

    // İstersen SIGNUP sonrası kullanıcı aktif olsun (genelde evet)
    user.isActive = true;
    user.lastPaidYm = getYmKey(now);
    user.missedMonthsStreak = 0;

    await user.save();

    // ✅ UNILEVEL dağıtım (sadece SIGNUP)
    const orderId = `SIGNUP:${userId}:${now.getTime()}`; // unique
    const uni = await distributeUnilevelSignup({
      sourceUserId: userId,
      orderId,
      currency: "USDT",
      matrixId: process.env.MATRIX_ID || "MAIN",
    });

    return res.json({
      ok: true,
      message: "SIGNUP (license) payment recorded",
      amount: baseAmount,
      user: {
        id: user._id,
        isActive: user.isActive,
        lastPaidYm: user.lastPaidYm,
        missedMonthsStreak: user.missedMonthsStreak,
      },
      unilevel: uni,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ✅ MONTHLY ÖDEME
 * POST /api/payments/monthly
 * body: { amount?: 14.99 }
 *
 * KURAL:
 * - Takvim ayı içinde ödeme yaptıysa aktif
 * - Aynı ay ikinci kez ödeme yok
 * - Unilevel YOK (unilevel sadece SIGNUP)
 */
router.post("/monthly", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const monthKey = getYmKey(now);

    const amount = Number(req.body?.amount ?? 14.99);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid amount" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    if (!Array.isArray(user.payments)) user.payments = [];

    // Aynı ay zaten ödeme yaptı mı?
    const alreadyPaid = user.payments.some((p) => p?.type === "MONTHLY" && p?.monthKey === monthKey);
    if (alreadyPaid) {
      return res.status(409).json({
        ok: false,
        message: "Monthly payment already exists for this month",
        monthKey,
      });
    }

    user.payments.push({
      type: "MONTHLY",
      amount,
      currency: "USDT",
      network: "TRC20",
      paidAt: now,
      monthKey,
    });

    // ✅ aktiflik güncelle
    user.isActive = true;
    user.lastMonthlyPaidAt = now;
    user.lastPaidYm = monthKey;
    user.missedMonthsStreak = 0;

    await user.save();

    return res.json({
      ok: true,
      message: "MONTHLY payment recorded",
      monthKey,
      user: {
        id: user._id,
        isActive: user.isActive,
        lastPaidYm: user.lastPaidYm,
        missedMonthsStreak: user.missedMonthsStreak,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Ödeme geçmişi
 * GET /api/payments/history
 */
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id, { payments: 1 });
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    res.json({
      ok: true,
      payments: user.payments || [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
