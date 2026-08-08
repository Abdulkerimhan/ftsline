import nodemailer from "nodemailer";
import { getCareerLabel } from "./careerService.js";

function getSender() {
  const from = String(process.env.MAIL_FROM || "FTSLine <no-reply@ftsline.net>");
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  return match
    ? { name: match[1].trim() || "FTSLine", email: match[2].trim() }
    : { name: process.env.MAIL_FROM_NAME || "FTSLine", email: from.trim() };
}

function createCareerEmail({ fullName, username, level }) {
  const career = getCareerLabel(level);
  const name = String(fullName || username || "Değerli kullanıcımız");

  return {
    subject: `Tebrikler! ${career} kariyerine ulaştınız`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a;">
        <div style="background:linear-gradient(135deg,#123a87,#2563eb);color:#fff;padding:28px;border-radius:16px 16px 0 0;">
          <h1 style="margin:0 0 8px;">Tebrikler ${name}!</h1>
          <p style="margin:0;font-size:18px;">FTSLine'da <strong>${career}</strong> kariyerine ulaştınız.</p>
        </div>
        <div style="padding:26px;border:1px solid #dbeafe;border-top:0;border-radius:0 0 16px 16px;">
          <p>Başarınız sistemimize kaydedildi ve kariyeriniz tüm kariyer alanlarında güncellendi.</p>
          <p>Yeni hedeflerinize ilerlerken yanınızdayız.</p>
          <p style="margin-bottom:0;color:#1d4ed8;font-weight:700;">FTSLine — Geleceğe yön ver.</p>
        </div>
      </div>`,
  };
}

export async function sendCareerCongratulations(user, level) {
  const to = String(user?.email || "").trim();
  if (!to) return { sent: false, reason: "email_missing" };

  const { subject, htmlContent } = createCareerEmail({
    fullName: user.fullName,
    username: user.username,
    level,
  });

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
        to: [{ email: to, name: user.fullName || user.username }],
        subject,
        htmlContent,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || `Brevo API hatası (${response.status})`);
    }
    return { sent: true, provider: "brevo" };
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
  return { sent: true, provider: "smtp" };
}
