import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const SUPERADMIN_USERNAME = "superadmin";
const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

function signToken(user) {
  const secret = process.env.JWT_SECRET || "dev_secret_change_me";
  return jwt.sign(
    {
      id: String(user._id),
      role: user.role,
    },
    secret,
    { expiresIn: "7d" }
  );
}

/* =========================
   REGISTER
   Not:
   Kullanıcı burada oluşturulur ama matrix'e eklenmez.
   Matrix'e giriş lisans aktif olduğunda yapılır.
========================= */
router.post("/register", async (req, res) => {
  try {
    let { username, fullName, email, password, sponsorCode } = req.body || {};

    username = String(username || "").trim().toLowerCase();
    fullName = String(fullName || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    sponsorCode = String(sponsorCode || "").trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Kullanıcı adı, e-posta ve şifre zorunlu.",
      });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        ok: false,
        message:
          "Kullanıcı adı sadece küçük İngilizce harf, rakam, alt çizgi (_) ve nokta (.) içerebilir. 3-20 karakter olmalı.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "Şifre en az 6 karakter olmalı.",
      });
    }

    const existingByUsername = await User.findOne({ username }).lean();
    if (existingByUsername) {
      return res.status(400).json({
        ok: false,
        message: "Bu kullanıcı adı zaten alınmış.",
      });
    }

    const existingByEmail = await User.findOne({ email }).lean();
    if (existingByEmail) {
      return res.status(400).json({
        ok: false,
        message: "Bu e-posta adresi zaten kayıtlı.",
      });
    }

    let sponsorUser = null;

    if (sponsorCode) {
      sponsorUser = await User.findOne({ username: sponsorCode }).lean();
    }

    if (!sponsorUser) {
      sponsorUser = await User.findOne({ username: SUPERADMIN_USERNAME }).lean();
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      fullName,
      email,
      passwordHash,
      sponsor: sponsorUser?._id || null,
    });

    if (sponsorUser?._id) {
      try {
        await User.updateOne(
          { _id: sponsorUser._id },
          { $inc: { teamCount: 1 } }
        );
      } catch (e) {
        console.error("TEAMCOUNT_INC_ERR:", e?.message || e);
      }
    }

    const token = signToken(newUser);

    return res.json({
      ok: true,
      accessToken: token,
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions || [],
        isLicensed: newUser.isLicensed,
        isActive: newUser.isActive,
      },
    });
  } catch (err) {
    console.error("REGISTER_ERR:", err);
    return res.status(500).json({
      ok: false,
      message: "Sunucu hatası",
    });
  }
});

/* =========================
   LOGIN
   body: { identifier, password }
========================= */
router.post("/login", async (req, res) => {
  try {
    const identifierRaw =
      req.body?.identifier ?? req.body?.username ?? req.body?.email;

    const identifier = String(identifierRaw || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!identifier || !password) {
      return res.status(400).json({
        ok: false,
        message: "identifier (veya username/email) ve password zorunlu",
      });
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        ok: false,
        message: "Hesap pasif",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        ok: false,
        message: "Şifre yanlış",
      });
    }

    const token = signToken(user);

    return res.json({
      ok: true,
      accessToken: token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        isLicensed: user.isLicensed,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("LOGIN_ERR:", err);
    return res.status(500).json({
      ok: false,
      message: "Sunucu hatası",
    });
  }
});

/* =========================
   ME
========================= */
router.get("/me", auth, async (req, res) => {
  try {
    const id = req.user?.id || req.user?.userId || req.user?._id;

    if (!id) {
      return res.status(401).json({
        ok: false,
        message: "Unauthenticated",
      });
    }

    const u = await User.findById(id)
      .select("_id username fullName email role permissions isLicensed isActive")
      .lean();

    if (!u) {
      return res.status(401).json({
        ok: false,
        message: "User not found",
      });
    }

    return res.json({
      ok: true,
      user: {
        id: u._id,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        permissions: u.permissions || [],
        isLicensed: u.isLicensed,
        isActive: u.isActive,
      },
    });
  } catch (err) {
    console.error("ME_ERR:", err);
    return res.status(500).json({
      ok: false,
      message: "Sunucu hatası",
    });
  }
});

export default router;