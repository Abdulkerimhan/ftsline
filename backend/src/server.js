import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import User from "./models/User.js";
import { findNextMatrixSlot, getMatrixPlacementFields } from "./services/matrixService.js";
import { processDueLicenseMatrixPayouts } from "./services/licensePlanService.js";

import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET || "ftsline_dev_secret_change_me";

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI environment variable is required");
}

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required in production");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.JWT_SECRET = JWT_SECRET;

/* ================= MIDDLEWARE ================= */

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== "production" && origin.endsWith(".trycloudflare.com")) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsRoot = process.env.UPLOAD_DIR
  ? path.dirname(path.resolve(process.env.UPLOAD_DIR))
  : path.join(__dirname, "../uploads");

app.use("/uploads", express.static(uploadsRoot));

/* ================= MONGODB ================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB baÄŸlandÄ±"))
  .catch((err) => {
    console.log("Mongo hata:", err);
    if (isProduction) {
      process.exit(1);
    }
  });

/* ================= AUTH ================= */

app.post("/api/auth/register", async (req, res) => {
  const { username, fullName, email, password, sponsor } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Eksik alan" });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Bu kullanÄ±cÄ± adÄ± veya email zaten kullanÄ±lÄ±yor",
      });
    }

    const normalizedSponsor = String(sponsor || "").trim().toLowerCase();
    let sponsorUser = null;

    if (normalizedSponsor) {
      sponsorUser = await User.findOne({
        $or: [
          { username: normalizedSponsor },
          { referralCode: normalizedSponsor },
        ],
      });

      if (!sponsorUser) {
        return res.status(400).json({
          message: "GeÃ§ersiz referans kullanÄ±cÄ± adÄ±",
        });
      }
    } else {
      sponsorUser = await User.findOne({ role: "superadmin" }).sort({ createdAt: 1 });

      if (!sponsorUser) {
        return res.status(500).json({ message: "Süper Admin bulunamadı" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const matrixSlot = await findNextMatrixSlot(sponsorUser._id);

    const user = await User.create({
      username: normalizedUsername,
      fullName: fullName || "",
      email: normalizedEmail,
      passwordHash,
      referralCode: normalizedUsername,
      sponsor: sponsorUser._id,
      ...getMatrixPlacementFields(matrixSlot),
    });

    await User.findByIdAndUpdate(sponsorUser._id, {
      $inc: { teamCount: 1 },
    });

    res.json({
      message: "KayÄ±t baÅŸarÄ±lÄ±",
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isLicensed: user.isLicensed,
        adminPermissions: user.adminPermissions || [],
        matrixParent: user.matrixParent || null,
        matrixPosition: user.matrixPosition || "",
        matrixDepth: user.matrixDepth || 0,
      },
    });
  } catch (error) {
    console.error("Register hatasÄ±:", error);
    res.status(500).json({ message: "Server hata" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body;

  try {
    if (!identifier || !password) {
      return res.status(400).json({ message: "Eksik alan" });
    }

    const normalizedIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({ message: "KullanÄ±cÄ± bulunamadÄ±" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Hesap pasif" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Åifre yanlÄ±ÅŸ" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isLicensed: user.isLicensed,
        adminPermissions: user.adminPermissions || [],
        matrixParent: user.matrixParent || null,
        matrixPosition: user.matrixPosition || "",
        matrixDepth: user.matrixDepth || 0,
      },
    });
  } catch (error) {
    console.error("Login hatasÄ±:", error);
    res.status(500).json({ message: "Server hata" });
  }
});

/* ================= USER ================= */

app.get("/api/user/me", async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token yok" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).populate(
      "sponsor",
      "username email fullName"
    );

    if (!user) {
      return res.status(404).json({ message: "KullanÄ±cÄ± bulunamadÄ±" });
    }

    res.json(user);
  } catch {
    res.status(401).json({ message: "GeÃ§ersiz token" });
  }
});

app.get("/api/user/referrals", async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token yok" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const referrals = await User.find({ sponsor: decoded.id })
      .select("username fullName email createdAt")
      .sort({ createdAt: -1 });

    res.json(referrals);
  } catch (error) {
    console.error("Referrals hatasÄ±:", error);
    res.status(401).json({ message: "GeÃ§ersiz token" });
  }
});

app.get("/api/public/config", (req, res) => {
  res.json({
    bank: {
      iban: process.env.BANK_IBAN || "",
      accountName: process.env.BANK_ACCOUNT_NAME || "",
      bankName: process.env.BANK_NAME || "",
      enabled: Boolean(process.env.BANK_IBAN && process.env.BANK_ACCOUNT_NAME),
    },
    usdt: {
      trc20Address: process.env.USDT_TRC20_ADDRESS || "",
      network: process.env.USDT_NETWORK || "TRC20",
      enabled: Boolean(process.env.USDT_TRC20_ADDRESS),
    },
  });
});
/* ================= ROUTES ================= */

app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/superadmin", superadminRoutes);

/* ================= TEST ================= */

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, message: "Server Ã§alÄ±ÅŸÄ±yor" });
});

/* ================= SERVER ================= */

app.listen(PORT, () => {
  console.log(`Server Ã§alÄ±ÅŸÄ±yor: http://localhost:${PORT}`);
});

setInterval(() => {
  processDueLicenseMatrixPayouts().catch((error) => {
    console.error("Lisans matrix aylik odeme kontrolu hatasi:", error);
  });
}, 60 * 60 * 1000);




