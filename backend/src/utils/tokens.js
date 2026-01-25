// backend/src/utils/tokens.js
import jwt from "jsonwebtoken";
import crypto from "crypto";

/* =======================
   TOKEN HELPERS
======================= */

// Token hashleme (email doğrulama, reset vb.)
export function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

/* =======================
   ACCESS TOKEN
======================= */

export function signAccessToken(user) {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET missing in .env");
  }

  const payload = {
    id: user._id.toString(),
    role: user.role || "user",
    username: user.username,
  };

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  });
}

export function verifyAccessToken(token) {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET missing in .env");
  }

  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
}

/* =======================
   REFRESH TOKEN
======================= */

export function signRefreshToken(user) {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET missing in .env");
  }

  const payload = {
    id: user._id.toString(),
    type: "refresh",
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "30d",
  });
}

export function verifyRefreshToken(token) {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET missing in .env");
  }

  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
}
