// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cron from "node-cron";

import { connectDB } from "./src/db/connect.js";

// DAILY JOBS
import { updateUserActiveStatuses } from "./src/services/userActivityService.js";
import { removeExpiredPending } from "./src/services/matrixCleanup.js";
import { removeTwoMonthsMissedUsers } from "./src/services/matrixMonthlyCheck.js";

// CAREER
import { runCareerMonthlyUpdate } from "./src/services/careerCron.js";

// ROUTES
import authRoutes from "./src/routes/authRoutes.js";
import careerRoutes from "./src/routes/careerRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import unilevelRoutes from "./src/routes/unilevelRoutes.js";
import superadminRoutes from "./src/routes/superadminRoutes.js"; // ✅

console.log("SERVER PATH:", import.meta.url);

dotenv.config();

const app = express();

let cronInitialized = false;
let httpServer = null;

// ✅ Varsayılan portu 5001 yaptık (5000 çakışmasın diye)
const PORT = Number(process.env.PORT) || 5001;

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ===============================
// ROUTES
// ===============================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ftsline-backend",
    time: new Date().toISOString(),
    port: PORT,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/career", careerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/unilevel", unilevelRoutes);
app.use("/api/superadmin", superadminRoutes);

// ✅ 404 (en sona)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found", path: req.originalUrl });
});

// ✅ Global error handler (en en sona)
app.use((err, req, res, next) => {
  console.error("❌ Global error:", err);
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Server error",
  });
});

// ===============================
// JOBS
// ===============================
async function runDailyJobs() {
  try {
    const now = new Date();
    console.log("🕒 Daily jobs started:", now.toISOString());

    await updateUserActiveStatuses(now);
    await removeExpiredPending(now);
    await removeTwoMonthsMissedUsers({
      matrixId: process.env.MATRIX_ID || "MAIN",
      now,
    });

    console.log("✅ Daily jobs finished");
  } catch (err) {
    console.error("❌ Daily jobs error:", err);
  }
}

async function runMonthlyCareerJob() {
  try {
    console.log("🕒 Career monthly job started");
    await runCareerMonthlyUpdate();
    console.log("✅ Career monthly job finished");
  } catch (err) {
    console.error("❌ Career monthly job error:", err);
  }
}

// ===============================
// SERVER START
// ===============================
async function startServer() {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");
    if (!process.env.ACCESS_TOKEN_SECRET)
      throw new Error("ACCESS_TOKEN_SECRET missing in .env");
    if (!process.env.REFRESH_TOKEN_SECRET)
      throw new Error("REFRESH_TOKEN_SECRET missing in .env");

    await connectDB();
    console.log("✅ MongoDB connected");

    // ✅ Server'ı sadece 1 kez başlat
    if (!httpServer) {
      httpServer = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });

      // ✅ Port dolu vs. olursa net log
      httpServer.on("error", (e) => {
        console.error("❌ Listen error:", e?.code || e);
        if (e?.code === "EADDRINUSE") {
          console.error(
            `❌ Port ${PORT} kullanımda. Başka port dene (örn 5002) veya portu tutan işlemi kapat.`
          );
        }
        process.exit(1);
      });
    }

    // ilk açılışta 1 kez
    await runDailyJobs();

    // cron 1 kere
    if (!cronInitialized) {
      cronInitialized = true;

      cron.schedule("10 3 * * *", runDailyJobs); // her gün 03:10
      cron.schedule("20 4 1 * *", runMonthlyCareerJob); // her ayın 1'i 04:20

      console.log("⏱️ Cron jobs initialized");
    }

    // ✅ Ctrl+C ile düzgün kapansın
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("❌ Server start error:", err);
    process.exit(1);
  }
}

function shutdown(signal) {
  console.log(`\n🧯 Shutdown signal received: ${signal}`);
  if (httpServer) {
    httpServer.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });
    // 5 sn içinde kapanmazsa zorla çık
    setTimeout(() => {
      console.log("⚠️ Force exit");
      process.exit(1);
    }, 5000).unref();
  } else {
    process.exit(0);
  }
}

await startServer();
