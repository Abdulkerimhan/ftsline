// backend/src/routes/unilevelRoutes.js
import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

import Commission from "../models/Commission.js";
import { distributeUnilevelSignup } from "../services/unilevelService.js";

const router = express.Router();

/**
 * GET /api/unilevel/my
 * Kullanıcı kendi unilevel kazançları (Commission üstünden)
 */
router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const list = await Commission.find({
      type: "UNILEVEL",
      toUserId: req.user.id,
      amount: { $gt: 0 }, // SIGNUP_LOCK (0) görünmesin
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ ok: true, list });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/unilevel/admin/simulate-signup
 * Admin test: unilevel signup dağıtım simülasyonu
 * body: { sourceUserId, orderId? }
 */
router.post("/admin/simulate-signup", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const sourceUserId = req.body.sourceUserId;
    const orderId = req.body.orderId || `SIM-SIGNUP:${Date.now()}`;

    const result = await distributeUnilevelSignup({
      sourceUserId,
      orderId,
      currency: "USDT",
      matrixId: process.env.MATRIX_ID || "MAIN",
    });

    return res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

export default router;
