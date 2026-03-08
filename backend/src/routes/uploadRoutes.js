import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

/* =========================
   CONFIG
========================= */
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* =========================
   MULTER STORAGE
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB
  },
});

/* =========================
   ROUTE
========================= */
// POST /api/upload
router.post("/", upload.array("files", 12), (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];

  const base = `${req.protocol}://${req.get("host")}`;

  const urls = files.map((f) => `${base}/uploads/${f.filename}`);

  res.json({
    ok: true,
    urls,
  });
});

export default router;