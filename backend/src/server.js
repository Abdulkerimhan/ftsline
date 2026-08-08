import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import multer from "multer";

import User from "./models/User.js";
import SiteSetting from "./models/SiteSetting.js";
import { processDueLicenseMatrixPayouts } from "./services/licensePlanService.js";
import { ensureLicensedUsersMatrixPlacement } from "./services/matrixService.js";

import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import earningRoutes from "./routes/earningRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import academyRoutes from "./routes/academyRoutes.js";
import { uploadUserAvatar } from "./utils/cloudinaryUpload.js";

dotenv.config();

const app = express();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(String(file.mimetype || "").toLowerCase()));
  },
});

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

app.use("/api/auth", registrationRoutes);

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
        message: "Bu kullanıcı adı veya e-posta zaten kullanılıyor",
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
          message: "Geçersiz referans kullanıcı adı",
        });
      }
    } else {
      sponsorUser = await User.findOne({ role: "superadmin" }).sort({ createdAt: 1 });

      if (!sponsorUser) {
        return res.status(500).json({ message: "Süper Admin bulunamadı" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: normalizedUsername,
      fullName: fullName || "",
      email: normalizedEmail,
      passwordHash,
      referralCode: normalizedUsername,
      sponsor: sponsorUser._id,
    });

    await User.findByIdAndUpdate(sponsorUser._id, {
      $inc: { teamCount: 1 },
    });

    res.json({
      message: "Kayıt başarılı",
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isLicensed: user.isLicensed,
        career: user.career,
        careerLevel: user?.career?.level || user.careerLevel || "NONE",
        adminPermissions: user.adminPermissions || [],
        matrixParent: user.matrixParent || null,
        matrixPosition: user.matrixPosition || "",
        matrixDepth: user.matrixDepth || 0,
      },
    });
  } catch (error) {
    console.error("Kayıt hatası:", error);
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
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Hesap pasif" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Şifre yanlış" });
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
        career: user.career,
        careerLevel: user?.career?.level || user.careerLevel || "NONE",
        adminPermissions: user.adminPermissions || [],
        matrixParent: user.matrixParent || null,
        matrixPosition: user.matrixPosition || "",
        matrixDepth: user.matrixDepth || 0,
      },
    });
  } catch (error) {
    console.error("Giriş hatası:", error);
    res.status(500).json({ message: "Server hata" });
  }
});

// Register/login are kept above for backward compatibility. The router also
// provides password reset endpoints used by the public forgot-password flow.
app.use("/api/auth", authRoutes);

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
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    res.json(user);
  } catch {
    res.status(401).json({ message: "Geçersiz token" });
  }
});

app.patch("/api/user/me", async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token yok" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("+passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const city = String(req.body?.city || "").trim();
    const addressLine = String(req.body?.address || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Geçerli bir e-posta girin" });
    }

    const emailOwner = await User.findOne({
      email,
      _id: { $ne: user._id },
    }).select("_id");

    if (emailOwner) {
      return res.status(409).json({ message: "Bu e-posta başka bir kullanıcıya ait" });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Yeni şifre en az 6 karakter olmalı" });
    }

    user.fullName = fullName;
    user.email = email;
    user.phone = phone;
    user.address = {
      ...(user.address?.toObject?.() || user.address || {}),
      city,
      addressLine,
    };

    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    const updatedUser = await User.findById(user._id).populate(
      "sponsor",
      "username email fullName"
    );

    return res.json(updatedUser);
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);

    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    return res.status(500).json({ message: "Profil bilgileri kaydedilemedi" });
  }
});

app.post("/api/user/me/avatar", avatarUpload.single("avatar"), async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token yok" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!req.file) {
      return res.status(400).json({
        message: "JPG, PNG veya WebP formatinda bir profil fotografi secin",
      });
    }

    const avatar = await uploadUserAvatar(req.file);
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { avatar },
      { new: true }
    ).populate("sponsor", "username email fullName");

    if (!user) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Profil fotografi yukleme hatasi:", error);

    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Gecersiz token" });
    }

    return res.status(500).json({ message: "Profil fotografi yuklenemedi" });
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

    const currentUser = await User.findById(decoded.id).select("role");

    if (!currentUser) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    // Unilevel agacini istemci sponsor alanindan katmanli kurar. Super admin
    // tum gercek uyeleri; normal kullanici ise yalnizca kendi alt agini gorur.
    const allMembers = await User.find({
      _id: { $ne: currentUser._id },
      role: { $ne: "superadmin" },
    })
      .select("username fullName email isActive isLicensed licenseExpiresAt createdAt sponsor career careerLevel")
      .sort({ createdAt: 1 })
      .lean();

    let referrals = allMembers;

    if (currentUser.role !== "superadmin") {
      const visibleSponsorIds = new Set([String(currentUser._id)]);
      referrals = [];

      // Sponsorlar daima uyelerden once kaydedilmis olsa da veri tasimalarinda
      // siralama bozulabilir; tekrarlı gecis tum torunlari guvenle toplar.
      let foundNewMember = true;
      while (foundNewMember) {
        foundNewMember = false;
        for (const member of allMembers) {
          const memberId = String(member._id);
          if (visibleSponsorIds.has(memberId)) continue;
          if (!visibleSponsorIds.has(String(member.sponsor || ""))) continue;
          visibleSponsorIds.add(memberId);
          referrals.push(member);
          foundNewMember = true;
        }
      }
    }

    res.json(referrals);
  } catch (error) {
    console.error("Referanslar hatası:", error);
    res.status(401).json({ message: "Geçersiz token" });
  }
});

app.get("/api/user/matrix", async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token yok" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const rootUser = await User.findById(decoded.id).select("username role").lean();

    if (!rootUser) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    await ensureLicensedUsersMatrixPlacement();

    const users = await User.find({
      isActive: true,
      isLicensed: true,
      role: { $ne: "superadmin" },
    })
      .select("username matrixParent matrixPosition matrixDepth")
      .sort({ matrixDepth: 1, createdAt: 1 })
      .lean();

    const childrenByParent = new Map();
    for (const member of users) {
      if (!member.matrixParent || !["left", "right"].includes(member.matrixPosition)) continue;
      const parentId = String(member.matrixParent);
      const children = childrenByParent.get(parentId) || {};
      children[member.matrixPosition] = member;
      childrenByParent.set(parentId, children);
    }

    const buildNode = (member, visited = new Set()) => {
      const memberId = String(member._id);
      if (visited.has(memberId)) return null;

      const nextVisited = new Set(visited);
      nextVisited.add(memberId);
      const children = childrenByParent.get(memberId) || {};

      return {
        id: memberId,
        username: member.username,
        left: children.left ? buildNode(children.left, nextVisited) : null,
        right: children.right ? buildNode(children.right, nextVisited) : null,
      };
    };

    res.json(buildNode(rootUser));
  } catch (error) {
    console.error("Matrix agaci hatasi:", error);
    res.status(401).json({ message: "Gecersiz token" });
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

app.get("/api/public/announcements", async (req, res) => {
  try {
    const settings = await SiteSetting.findOne({ key: "main" }).lean();
    const announcements = (settings?.announcements || [])
      .filter((item) => item.isActive !== false && item.textTr)
      .map((item) => ({
        id: String(item._id || ""),
        textTr: item.textTr,
        textEn: item.textEn || item.textTr,
      }));

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ message: "Duyurular getirilemedi" });
  }
});
/* ================= ROUTES ================= */

app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/earnings", earningRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/academy", academyRoutes);

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




