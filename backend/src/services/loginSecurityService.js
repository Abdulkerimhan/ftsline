import nodemailer from "nodemailer";

export const MAX_FAILED_LOGIN_ATTEMPTS = 3;

function lockDurationMinutes() {
  const configured = Number(process.env.LOGIN_LOCK_MINUTES || 120);
  return Number.isFinite(configured) && configured > 0 ? configured : 120;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSender() {
  const from = String(process.env.MAIL_FROM || "FTSLine <no-reply@ftsline.net>");
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  return match
    ? { name: match[1].trim() || "FTSLine", email: match[2].trim() }
    : { name: process.env.MAIL_FROM_NAME || "FTSLine", email: from.trim() };
}

function notificationRecipients(userEmail) {
  const adminEmail = String(
    process.env.ADMIN_NOTIFICATION_EMAIL || "ftsline@ftsline.net"
  ).trim();
  return {
    to: userEmail ? [{ email: userEmail }] : adminEmail ? [{ email: adminEmail }] : [],
    bcc: adminEmail && adminEmail !== userEmail ? [{ email: adminEmail }] : [],
  };
}

async function sendLockEmail({ user, lockedUntil, ipAddress }) {
  const recipients = notificationRecipients(user.email);
  if (!recipients.to.length) return;

  const lockedUntilText = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(lockedUntil);
  const subject = `FTSLine güvenlik uyarısı: ${user.username} hesabı geçici olarak bloke edildi`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a;">
      <div style="background:#123a87;color:#fff;padding:18px 22px;">
        <h2 style="margin:0;">FTSLine giriş güvenliği</h2>
      </div>
      <div style="padding:22px;border:1px solid #dbe4f3;border-top:0;">
        <p><strong>${escapeHtml(user.username)}</strong> hesabı art arda ${MAX_FAILED_LOGIN_ATTEMPTS} hatalı giriş nedeniyle geçici olarak bloke edildi.</p>
        <p><strong>Blokenin kalkacağı zaman:</strong> ${escapeHtml(lockedUntilText)}</p>
        <p><strong>Yaklaşık IP:</strong> ${escapeHtml(ipAddress || "Bilinmiyor")}</p>
        <p>Bu girişleri siz yapmadıysanız şifrenizi sıfırlamanızı öneririz. Şifreniz bu e-postada paylaşılmaz.</p>
      </div>
    </div>`;

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
        to: recipients.to,
        bcc: recipients.bcc,
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

  const { MAIL_HOST, MAIL_USER, MAIL_PASS } = process.env;
  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
    throw new Error("E-posta sunucusu ayarları eksik");
  }
  const port = Number(process.env.MAIL_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM || MAIL_USER,
    to: recipients.to.map(({ email }) => email).join(","),
    bcc: recipients.bcc.map(({ email }) => email).join(",") || undefined,
    subject,
    html: htmlContent,
  });
}

export function isLoginLocked(user, now = new Date()) {
  return Boolean(user.loginLockedUntil && user.loginLockedUntil.getTime() > now.getTime());
}

export function loginLockMessage(user) {
  const time = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(user.loginLockedUntil);
  return `Hesabınız geçici olarak bloke edildi. ${time} itibarıyla tekrar deneyebilirsiniz.`;
}

export async function recordFailedLogin(user, { ipAddress = "" } = {}) {
  const now = new Date();
  if (user.loginLockedUntil && user.loginLockedUntil.getTime() <= now.getTime()) {
    user.failedLoginAttempts = 0;
    user.loginLockedUntil = null;
  }

  user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
  let justLocked = false;

  if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    user.failedLoginAttempts = MAX_FAILED_LOGIN_ATTEMPTS;
    user.loginLockedUntil = new Date(now.getTime() + lockDurationMinutes() * 60 * 1000);
    justLocked = true;
  }

  await user.save();

  if (justLocked) {
    sendLockEmail({ user, lockedUntil: user.loginLockedUntil, ipAddress }).catch((error) => {
      console.error("LOGIN_LOCK_EMAIL_ERR:", error);
    });
  }

  return {
    locked: justLocked,
    attemptsRemaining: Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - user.failedLoginAttempts),
  };
}

export async function resetFailedLogins(user) {
  if (!user.failedLoginAttempts && !user.loginLockedUntil) return;
  user.failedLoginAttempts = 0;
  user.loginLockedUntil = null;
  await user.save();
}
