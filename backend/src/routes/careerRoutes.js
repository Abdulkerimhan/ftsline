// backend/src/routes/careerRoutes.js
import express from "express";

const router = express.Router();

// test endpoint
router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "careerRoutes çalışıyor",
  });
});

export default router;
