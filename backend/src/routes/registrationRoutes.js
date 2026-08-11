import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import {
  notifyNewRegistration,
  reportNotificationError,
} from "../services/adminNotificationService.js";

const router = express.Router();
const USERNAME_REGEX = /^(?=.*[a-z])[a-z0-9]{5,20}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const LEGAL_TEXT_VERSION = "2026-08-11";

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getSender() {
  const from = String(process.env.MAIL_FROM || "FTSLine <no-reply@ftsline.net>");
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  return match
    ? { name: match[1].trim() || "FTSLine", email: match[2].trim() }
    : { name: process.env.MAIL_FROM_NAME || "FTSLine", email: from.trim() };
}

async function sendVerificationEmail({ to, code }) {
  const subject = "FTSLine E-posta Doğrulama Kodu";
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#0f172a;">
      <h2>FTSLine'a Hoş Geldiniz</h2>
      <p>Kayıt işleminizi tamamlamak için doğrulama kodunuz:</p>
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

  const port = Number(process.env.MAIL_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    html: htmlContent,
  });
}

router.post("/register", async (req, res) => {
  try {
    let { username, fullName, email, password, sponsor, termsAccepted, privacyNoticeAcknowledged } = req.body || {};
    username = String(username || "").trim().toLowerCase();
    fullName = String(fullName || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    sponsor = String(sponsor || "").trim().toLowerCase();

    if (termsAccepted !== true || privacyNoticeAcknowledged !== true) {
      return res.status(400).json({
        message: "Kullanım koşulları ve KVKK Aydınlatma Metni onaylanmalıdır",
      });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı adı" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Geçerli bir e-posta adresi girin" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Şifre en az 6 karakter olmalı" });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ message: "E-posta veya kullanıcı adı kullanımda" });
    }

    if (sponsor) {
      const sponsorExists = await User.exists({
        $or: [{ username: sponsor }, { referralCode: sponsor }],
      });
      if (!sponsorExists) {
        return res.status(400).json({ message: "Geçersiz sponsor kodu" });
      }
    } else if (!(await User.exists({ role: "superadmin" }))) {
      return res.status(500).json({ message: "Superadmin bulunamadı" });
    }

    const code = generateCode();
    await PendingRegistration.findOneAndUpdate(
      { email },
      {
        username,
        fullName,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        sponsor,
        legalAcceptance: {
          termsAcceptedAt: new Date(),
          privacyNoticeAcknowledgedAt: new Date(),
          termsVersion: LEGAL_TEXT_VERSION,
          privacyVersion: LEGAL_TEXT_VERSION,
        },
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendVerificationEmail({ to: email, code });
    } catch (mailError) {
      await PendingRegistration.deleteOne({ email });
      throw mailError;
    }

    return res.status(202).json({
      message: "Doğrulama kodu e-posta adresinize gönderildi",
      verificationRequired: true,
      email,
    });
  } catch (error) {
    console.error("REGISTER_VERIFICATION_ERR:", error);
    return res.status(500).json({ message: "Doğrulama kodu gönderilemedi" });
  }
});

router.post("/verify-registration", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!EMAIL_REGEX.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "E-posta ve 6 haneli kod zorunlu" });
    }

    const pending = await PendingRegistration.findOne({ email });
    if (!pending) {
      return res.status(400).json({ message: "Kayıt isteği bulunamadı veya kodun süresi doldu" });
    }
    if (pending.code !== code) {
      return res.status(400).json({ message: "Doğrulama kodu yanlış" });
    }
    if (new Date() > pending.expiresAt) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: "Doğrulama kodunun süresi doldu" });
    }

    const exists = await User.findOne({
      $or: [{ email: pending.email }, { username: pending.username }],
    });
    if (exists) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: "E-posta veya kullanıcı adı kullanımda" });
    }

    const sponsorUser = pending.sponsor
      ? await User.findOne({
          $or: [{ username: pending.sponsor }, { referralCode: pending.sponsor }],
        })
      : await User.findOne({ role: "superadmin" }).sort({ createdAt: 1 });

    if (!sponsorUser) {
      return res.status(400).json({ message: "Geçersiz sponsor kodu" });
    }

    const user = await User.create({
      username: pending.username,
      fullName: pending.fullName,
      email: pending.email,
      passwordHash: pending.passwordHash,
      role: "user",
      sponsor: sponsorUser._id,
      referralCode: pending.username,
      legalAcceptance: pending.legalAcceptance,
    });
    await User.findByIdAndUpdate(sponsorUser._id, { $inc: { teamCount: 1 } });
    await PendingRegistration.deleteOne({ _id: pending._id });

    notifyNewRegistration({ user, sponsor: sponsorUser }).catch((error) =>
      reportNotificationError("REGISTRATION", error)
    );

    return res.status(201).json({
      message: "E-posta doğrulandı, kayıt başarıyla tamamlandı",
      success: true,
    });
  } catch (error) {
    console.error("VERIFY_REGISTRATION_ERR:", error);
    return res.status(500).json({ message: "Kayıt doğrulanamadı" });
  }
});

export default router;
