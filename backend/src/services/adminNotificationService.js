import nodemailer from "nodemailer";

const DEFAULT_ADMIN_EMAIL = "ftsline@ftsline.net";

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

function getAdminEmail() {
  return String(process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_EMAIL).trim();
}

async function sendEmail({ subject, htmlContent }) {
  const to = getAdminEmail();
  if (!to) return;

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
      throw new Error(result.message || `Brevo API hatasi (${response.status})`);
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

function layout(title, rows, actionPath = "") {
  const baseUrl = String(process.env.CLIENT_URL || "https://www.ftsline.net").replace(/\/+$/, "");
  const tableRows = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;">${escapeHtml(label)}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;">
      <div style="background:#123a87;color:white;padding:18px 22px;">
        <h2 style="margin:0;">${escapeHtml(title)}</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#fff;">${tableRows}</table>
      ${
        actionPath
          ? `<p style="margin:24px 0;"><a href="${escapeHtml(`${baseUrl}${actionPath}`)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;">Yonetici panelinde goruntule</a></p>`
          : ""
      }
      <p style="color:#64748b;font-size:12px;">Bu ileti FTSLine yonetici bildirim sisteminden gonderildi.</p>
    </div>`;
}

function formatDate(value = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function paymentMethodLabel(method) {
  return {
    bank_transfer: "Havale / EFT",
    cash_on_delivery: "Kapida odeme",
    card: "Kart",
    usdt_trc20: "USDT TRC20",
  }[method] || method;
}

function paymentStatusLabel(status) {
  return {
    pending: "Odeme bekleniyor",
    paid: "Odendi",
    failed: "Basarisiz",
    refunded: "Iade edildi",
  }[status] || status;
}

export async function notifyNewRegistration({ user, sponsor }) {
  return sendEmail({
    subject: `Yeni FTSLine kaydi: ${user.username}`,
    htmlContent: layout(
      "Yeni kullanici kaydi",
      [
        ["Kullanici adi", user.username],
        ["Ad soyad", user.fullName],
        ["E-posta", user.email],
        ["Telefon", user.phone],
        ["Sponsor", sponsor?.username || sponsor?.referralCode || "-"],
        ["Kayit tarihi", formatDate(user.createdAt)],
      ],
      "/super-admin"
    ),
  });
}

export async function notifyNewOrder({ order, username }) {
  const items = (order.items || [])
    .map((item) => `${item.name} x ${item.quantity} (${Number(item.price || 0).toLocaleString("tr-TR")} TL)`)
    .join(", ");
  const shipping = order.shippingInfo || {};

  return sendEmail({
    subject: `Yeni siparis: ${order.trackingCode}`,
    htmlContent: layout(
      "Yeni siparis olusturuldu",
      [
        ["Siparis numarasi", order.trackingCode],
        ["Kullanici", username || "Misafir"],
        ["Musteri", shipping.fullName],
        ["E-posta", shipping.email],
        ["Telefon", shipping.phone],
        ["Urunler", items],
        ["Toplam", `${Number(order.total || 0).toLocaleString("tr-TR")} TL`],
        ["Odeme yontemi", paymentMethodLabel(order.paymentMethod)],
        ["Odeme durumu", paymentStatusLabel(order.paymentStatus)],
        ["Adres", `${shipping.address || ""}, ${shipping.district || ""}/${shipping.city || ""}`],
        ["Siparis notu", shipping.note],
        ["Dekont", order.paymentProof],
        ["Siparis tarihi", formatDate(order.createdAt)],
      ],
      "/super-admin"
    ),
  });
}

export async function notifyPaymentUpdate({ order }) {
  return sendEmail({
    subject: `Odeme durumu: ${order.trackingCode} - ${paymentStatusLabel(order.paymentStatus)}`,
    htmlContent: layout(
      "Siparis odeme durumu guncellendi",
      [
        ["Siparis numarasi", order.trackingCode],
        ["Musteri", order.shippingInfo?.fullName],
        ["Toplam", `${Number(order.total || 0).toLocaleString("tr-TR")} TL`],
        ["Odeme yontemi", paymentMethodLabel(order.paymentMethod)],
        ["Yeni durum", paymentStatusLabel(order.paymentStatus)],
        ["Guncelleme tarihi", formatDate()],
      ],
      "/super-admin"
    ),
  });
}

export async function notifyContactMessage({ name, email, phone, subject, message }) {
  return sendEmail({
    subject: `Iletisim formu: ${subject}`,
    htmlContent: layout("Yeni iletisim mesaji", [
      ["Ad soyad", name],
      ["E-posta", email],
      ["Telefon", phone],
      ["Konu", subject],
      ["Mesaj", message],
      ["Gonderim tarihi", formatDate()],
    ]),
  });
}

export function reportNotificationError(type, error) {
  console.error(`ADMIN_NOTIFICATION_${type}_ERR:`, error);
}
