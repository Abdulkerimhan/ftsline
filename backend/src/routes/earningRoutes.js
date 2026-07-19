import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { buildUserEarningSummary } from "../services/earningSummaryService.js";

const router = express.Router();

router.get("/me", authRequired, async (req, res) => {
  try {
    res.json(await buildUserEarningSummary(req.user._id));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Kazanç bilgileri alınamadı" });
  }
});

export default router;
