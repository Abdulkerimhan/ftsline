// backend/src/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { placeUserPendingInMatrix } from "../services/matrixPlacement.js";

import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/tokens.js";

const router = express.Router();

const normalize = (v) => String(v ?? "").trim();

function ensureSecrets() {
  if (!process.env.ACCESS_TOKEN_SECRET) throw new Error("ACCESS_TOKEN_SECRET missing in .env");
  if (!process.env.REFRESH_TOKEN_SECRET) throw new Error("REFRESH_TOKEN_SECRET missing in .env");
}

/** Authorization: Bearer <accessToken> */
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ ok: false, message: "Missing Bearer token" });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, role, username }
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired access token" });
  }
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // refresh token hash + expiry (JWT exp)
  const decoded = verifyRefreshToken(refreshToken);
  if (decoded.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

async function rotateRefreshToken(oldRefreshToken) {
  // 1) JWT doğrula
  const decoded = verifyRefreshToken(oldRefreshToken);
  if (decoded.type !== "refresh") {
    const e = new Error("Invalid refresh token type");
    e.status = 401;
    throw e;
  }

  // 2) DB’de eski refresh var mı, aktif mi?
  const oldHash = hashToken(oldRefreshToken);
  const record = await RefreshToken.findOne({ tokenHash: oldHash });

  if (!record) {
    const e = new Error("Refresh token not found");
    e.status = 401;
    throw e;
  }

  if (record.revokedAt) {
    const e = new Error("Refresh token revoked");
    e.status = 401;
    throw e;
  }

  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    const e = new Error("Refresh token expired");
    e.status = 401;
    throw e;
  }

  // 3) Kullanıcıyı al
  const user = await User.findById(record.userId);
  if (!user) {
    const e = new Error("User not found");
    e.status = 401;
    throw e;
  }

  // 4) Yeni token çifti üret + DB’ye kaydet
  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  const newDecoded = verifyRefreshToken(newRefreshToken);
  if (newDecoded.type !== "refresh") {
    const e = new Error("Invalid refresh token type");
    e.status = 401;
    throw e;
  }

  const newHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(newDecoded.exp * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: newHash,
    expiresAt: newExpiresAt,
  });

  // 5) Eski refresh’i revoke et + replacedBy set et
  record.revokedAt = new Date();
  record.replacedByTokenHash = newHash;
  await record.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * POST /api/auth/register
 * body: { username, email, password, fullName?, sponsorId? }
 */
router.post("/register", async (req, res, next) => {
  try {
    ensureSecrets();

    const username = normalize(req.body.username).toLowerCase();
    const email = normalize(req.body.email).toLowerCase();
    const password = normalize(req.body.password);
    const fullName = normalize(req.body.fullName);
    const sponsorId = req.body.sponsorId || null;

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, message: "username, email, password zorunlu" });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "Şifre en az 6 karakter olmalı" });
    }

    const exists = await User.findOne({ $or: [{ username }, { email }] }).lean();
    if (exists) {
      return res.status(409).json({ ok: false, message: "username veya email zaten kayıtlı" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      fullName,
      passwordHash,
      sponsorId,
      isActive: false,
      role: "user",
    });

    // kayıt olunca matrix pending
    const placement = await placeUserPendingInMatrix({
      matrixId: process.env.MATRIX_ID || "MAIN",
      userId: user._id,
      sponsorId,
      now: new Date(),
      pendingDays: Number(process.env.PENDING_DAYS || 7),
    });

    const { accessToken, refreshToken } = await issueTokens(user);

    return res.status(201).json({
      ok: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || "",
        role: user.role || "user",
        isActive: user.isActive,
      },
      matrix: placement,
      message: "Kayıt başarılı. 7 gün içinde ödeme yapılmazsa Matrix kaydı silinir.",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * body: { identifier, password }
 *
 * ✅ user/admin: username veya email ile giriş
 * ✅ superadmin: SADECE email ile giriş
 */
router.post("/login", async (req, res, next) => {
  try {
    ensureSecrets();

    const identifierRaw = normalize(req.body.identifier);
    const identifier = identifierRaw.toLowerCase();
    const password = normalize(req.body.password);

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: "identifier ve password zorunlu" });
    }

    const isEmail = identifier.includes("@");

    // Önce bul: username veya email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({ ok: false, message: "Hatalı giriş bilgileri" });
    }

    // ✅ superadmin sadece email ile girsin
    if (user.role === "superadmin" && !isEmail) {
      return res.status(403).json({
        ok: false,
        message: "Superadmin girişi için e-posta kullanmalısın.",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, message: "Hatalı giriş bilgileri" });
    }

    const { accessToken, refreshToken } = await issueTokens(user);

    return res.json({
      ok: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || "",
        role: user.role || "user",
        isActive: user.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * body: { refreshToken }
 */
router.post("/refresh", async (req, res, next) => {
  try {
    ensureSecrets();

    const refreshToken = normalize(req.body.refreshToken);
    if (!refreshToken) {
      return res.status(400).json({ ok: false, message: "refreshToken zorunlu" });
    }

    const rotated = await rotateRefreshToken(refreshToken);
    return res.json({ ok: true, ...rotated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * body: { refreshToken }
 */
router.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = normalize(req.body.refreshToken);
    if (!refreshToken) {
      return res.status(400).json({ ok: false, message: "refreshToken zorunlu" });
    }

    const tokenHash = hashToken(refreshToken);

    await RefreshToken.updateOne(
      { tokenHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    // Schema'n revokedAt default'u null ise, üstteki yetmez. O zaman bunu kullan:
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return res.json({ ok: true, message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * header: Authorization: Bearer <accessToken>
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("_id username email fullName role isActive sponsorId lastPaidYm missedMonthsStreak")
      .lean();

    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

export default router;
