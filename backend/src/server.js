import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";
import path from "path";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";

import adminRoutes from "./routes/adminRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";

import ledgerRoutes from "./routes/ledgerRoutes.js";
import networkRoutes from "./routes/networkRoutes.js";
import matrixRoutes from "./routes/matrixRoutes.js";

import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/payments.js";

/* 🔥 YENİ */
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();

const app = express();

/* =========================
   MIDDLEWARE
========================= */
const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.length === 0) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  })
);

app.options("*", cors());

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

/* =========================
   STATIC FILES (UPLOADS)
========================= */
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

/* =========================
   HEALTH
========================= */
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, name: "ftsline-backend" });
});

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// USER
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes);

// ORDERS
app.use("/api/orders", orderRoutes);

// PAYMENTS
app.use("/api/payments", paymentRoutes);

// ADMIN / SUPERADMIN
app.use("/api/admin", adminRoutes);
app.use("/api/superadmin", superadminRoutes);

// DASHBOARD
app.use("/api/ledger", ledgerRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/matrix", matrixRoutes);

/* 🔥 UPLOAD ROUTE (EN KRİTİK YER) */
app.use("/api/upload", uploadRoutes);

/* =========================
   404 (API)
========================= */
app.use("/api", (req, res) => {
  res.status(404).json({
    ok: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("ERR:", err);
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Server error",
  });
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;

async function start() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in .env");

  await mongoose.connect(uri);
  console.log("Mongo connected");

  app.listen(PORT, () => console.log("Server running on", PORT));
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});