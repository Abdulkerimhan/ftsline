import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { buildUserEarningSummary } from "../services/earningSummaryService.js";
import User from "../models/User.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";

const router = express.Router();
const MIN_WITHDRAWAL_AMOUNT = 5000;

router.get("/me", authRequired, async (req, res) => {
  try {
    res.json(await buildUserEarningSummary(req.user._id));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Kazanç bilgileri alınamadı" });
  }
});

router.get("/withdrawals/me", authRequired, async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ minimumAmount: MIN_WITHDRAWAL_AMOUNT, requests });
  } catch (error) {
    res.status(500).json({ message: "Cekim talepleri alinamadi" });
  }
});

router.post("/withdrawals", authRequired, async (req, res) => {
  const amount = Math.round(Number(req.body.amount || 0) * 100) / 100;
  const accountHolder = String(req.body.accountHolder || "").trim();
  const bankName = String(req.body.bankName || "").trim();
  const iban = String(req.body.iban || "").replace(/\s+/g, "").toUpperCase();

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
    return res.status(400).json({
      message: `Minimum cekim tutari ${MIN_WITHDRAWAL_AMOUNT} TL'dir`,
    });
  }
  if (!accountHolder || !bankName || !/^TR\d{24}$/.test(iban)) {
    return res.status(400).json({
      message: "Ad soyad, banka adı ve geçerli bir Türkiye IBAN bilgisi zorunludur",
    });
  }

  try {
    const pendingRequest = await WithdrawalRequest.findOne({
      user: req.user._id,
      status: "pending",
    }).lean();
    if (pendingRequest) {
      return res.status(409).json({ message: "Bekleyen bir cekim talebiniz zaten var" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id, walletBalance: { $gte: amount } },
      { $inc: { walletBalance: -amount } },
      { new: true }
    ).select("walletBalance");

    if (!user) {
      return res.status(400).json({ message: "Cekilebilir bakiye yetersiz" });
    }

    try {
      const request = await WithdrawalRequest.create({
        user: req.user._id,
        amount,
        accountHolder,
        bankName,
        iban,
      });
      return res.status(201).json({
        message: "Hak ediş ödeme talebiniz alındı",
        minimumAmount: MIN_WITHDRAWAL_AMOUNT,
        availableBalance: user.walletBalance,
        request,
      });
    } catch (createError) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: amount } });
      if (createError?.code === 11000) {
        return res.status(409).json({ message: "Bekleyen bir cekim talebiniz zaten var" });
      }
      throw createError;
    }
  } catch (error) {
    console.error("Cekim talebi olusturma hatasi:", error);
    return res.status(500).json({ message: "Cekim talebi olusturulamadi" });
  }
});

export default router;
