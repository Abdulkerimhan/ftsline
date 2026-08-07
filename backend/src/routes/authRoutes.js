import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();

const USERNAME_REGEX = /^(?=.*[a-z])[a-z0-9]{5,20}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function createMailTransporter() {
  const { MAIL_HOST, MAIL_USER, MAIL_PASS } = process.env;

  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
    throw new Error("E-posta sunucusu ayarlari eksik");
  }

  const port = Number(process.env.MAIL_PORT || 587);
  return nodemailer.createTransport({
    host: MAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
  });
}

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getSender() {
  const from = String(process.env.MAIL_FROM || "FTSLine <no-reply@ftsline.net>");
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);

  return match
    ? { name: match[1].trim() || "FTSLine", email: match[2].trim() }
    : { name: process.env.MAIL_FROM_NAME || "FTSLine", email: from.trim() };
}

async function sendPasswordResetEmail({ to, code }) {
  const subject = "FTSLine Şifre Sıfırlama Kodu";
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;padding:20px;">
      <h2>FTSLine Şifre Sıfırlama</h2>
      <p>Şifre sıfırlama kodunuz:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1d4ed8;">${code}</div>
      <p>Bu kod 5 dakika boyunca geçerlidir.</p>
    </div>
  `;

  if (process.env.BREVO_API_KEY) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: getSender(),
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || `Brevo API hatası (${response.status})`);
    }
    return;
  }

  const transporter = createMailTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    html: htmlContent,
  });
}

router.post("/register", async (req, res) => {
  try {
    let { username, fullName, email, password, sponsor } = req.body || {};

    username = String(username || "").trim().toLowerCase();
    fullName = String(fullName || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    sponsor = String(sponsor || "").trim().toLowerCase();

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı adı" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Geçerli bir email girin" });
    }

    if (!password) {
      return res.status(400).json({ message: "Şifre zorunlu" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Şifre en az 6 karakter olmalı" });
    }

    const exists = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (exists) {
      return res.status(400).json({
        message: "Email veya kullanıcı adı kullanımda",
      });
    }

    let sponsorUser = null;

    if (sponsor) {
      sponsorUser = await User.findOne({
        $or: [{ username: sponsor }, { referralCode: sponsor }],
      });

      if (!sponsorUser) {
        return res.status(400).json({ message: "Geçersiz sponsor kodu" });
      }
    } else {
      sponsorUser = await User.findOne({ role: "superadmin" }).sort({ createdAt: 1 });
    }

    if (!sponsorUser) {
      return res.status(500).json({ message: "Superadmin bulunamadı" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      fullName,
      email,
      passwordHash,
      role: "user",
      sponsor: sponsorUser._id,
      referralCode: username,
    });

    await User.findByIdAndUpdate(sponsorUser._id, {
      $inc: { teamCount: 1 },
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "Kayıt başarılı",
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isLicensed: user.isLicensed,
        teamCount: user.teamCount,
        careerLevel: user.careerLevel,
        walletBalance: user.walletBalance,
        totalEarning: user.totalEarning,
        monthlyEarning: user.monthlyEarning,
        referralCode: user.referralCode,
        sponsor: sponsorUser
          ? {
              id: sponsorUser._id,
              username: sponsorUser.username,
              fullName: sponsorUser.fullName,
              email: sponsorUser.email,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("REGISTER_ERR:", err);
    return res.status(500).json({ message: "Kayıt hatası" });
  }
});

router.post("/login", async (req, res) => {
  try {
    let { login, identifier, password } = req.body || {};

    const loginValue = String(login || identifier || "")
      .trim()
      .toLowerCase();
    password = String(password || "");

    if (!loginValue || !password) {
      return res.status(400).json({
        message: "Kullanıcı adı/email ve şifre zorunlu",
      });
    }

    const user = await User.findOne({
      $or: [{ email: loginValue }, { username: loginValue }],
    })
      .select("+passwordHash")
      .populate("sponsor", "username fullName email");

    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ message: "Şifre yanlış" });
    }

    const token = signToken(user);

    return res.json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isLicensed: user.isLicensed,
        teamCount: user.teamCount,
        careerLevel: user.careerLevel,
        walletBalance: user.walletBalance,
        totalEarning: user.totalEarning,
        monthlyEarning: user.monthlyEarning,
        referralCode: user.referralCode,
        sponsor: user.sponsor
          ? {
              id: user.sponsor._id,
              username: user.sponsor.username,
              fullName: user.sponsor.fullName,
              email: user.sponsor.email,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("LOGIN_ERR:", err);
    return res.status(500).json({ message: "Giriş hatası" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    let { email } = req.body || {};
    email = String(email || "").trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Geçerli bir email girin" });
    }

    const user = await User.findOne({ email }).select(
      "+resetCode +resetCodeExpiresAt"
    );

    if (!user) {
      return res.status(404).json({ message: "Bu email ile kullanıcı bulunamadı" });
    }

    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.resetCode = code;
    user.resetCodeExpiresAt = expiresAt;
    await user.save();

    if (process.env.BREVO_API_KEY) {
      await sendPasswordResetEmail({ to: user.email, code });
    } else {
      const transporter = createMailTransporter();
      await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: user.email,
      subject: "FTSLine Şifre Sıfırlama Kodu",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;">
          <h2>FTSLine Şifre Sıfırlama</h2>
          <p>Şifre sıfırlama kodunuz:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1d4ed8;">
            ${code}
          </div>
          <p>Bu kod 5 dakika boyunca geçerlidir.</p>
        </div>
      `,
      });
    }

    return res.json({
      message: "Kod gönderildi. Lütfen e-posta kutunuzu kontrol edin.",
    });
  } catch (err) {
    console.error("FORGOT_PASSWORD_ERR:", err);
    return res.status(500).json({ message: "Kod gönderilemedi" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    let { email, code, newPassword } = req.body || {};

    email = String(email || "").trim().toLowerCase();
    code = String(code || "").trim();
    newPassword = String(newPassword || "");

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Geçerli bir email girin" });
    }

    if (!code || code.length !== 6) {
      return res.status(400).json({ message: "6 haneli kod girin" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Yeni şifre en az 6 karakter olmalı" });
    }

    const user = await User.findOne({ email }).select(
      "+passwordHash +resetCode +resetCodeExpiresAt"
    );

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    if (!user.resetCode || !user.resetCodeExpiresAt) {
      return res.status(400).json({ message: "Önce kod istemelisiniz" });
    }

    if (user.resetCode !== code) {
      return res.status(400).json({ message: "Kod yanlış" });
    }

    if (new Date() > new Date(user.resetCodeExpiresAt)) {
      return res.status(400).json({ message: "Kodun süresi dolmuş" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetCode = "";
    user.resetCodeExpiresAt = null;

    await user.save();

    return res.json({ message: "Şifre başarıyla güncellendi" });
  } catch (err) {
    console.error("RESET_PASSWORD_ERR:", err);
    return res.status(500).json({ message: "Şifre güncellenemedi" });
  }
});

export default router;
