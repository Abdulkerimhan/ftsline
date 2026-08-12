import crypto from "crypto";
import express from "express";
import VisitorEvent from "../models/VisitorEvent.js";
import { authRequired, superAdminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(`${process.env.JWT_SECRET || "ftsline"}:${value}`)
    .digest("hex");
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "unknown";
}

function maskIp(ip) {
  const clean = String(ip || "").replace(/^::ffff:/, "");
  if (clean.includes(".")) {
    const parts = clean.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.xxx` : "Maskeli";
  }
  if (clean.includes(":")) {
    const parts = clean.split(":").filter(Boolean);
    return `${parts.slice(0, 3).join(":")}:xxxx:xxxx`;
  }
  return "Maskeli";
}

function parseAgent(agent = "") {
  const value = String(agent);
  const device = /mobile|android|iphone|ipad/i.test(value) ? "Mobil" : "Masaustu";
  let browser = "Diger";
  if (/edg\//i.test(value)) browser = "Edge";
  else if (/opr\//i.test(value)) browser = "Opera";
  else if (/chrome\//i.test(value)) browser = "Chrome";
  else if (/safari\//i.test(value)) browser = "Safari";
  else if (/firefox\//i.test(value)) browser = "Firefox";
  return { device, browser };
}

function safeText(value, fallback, limit) {
  const text = String(value || "").trim();
  return (text || fallback).slice(0, limit);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

function sanitizeReferrer(value) {
  const text = safeText(value, "Direkt", 500);
  if (text === "Direkt") return text;
  try {
    const url = new URL(text);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return text.split(/[?#]/)[0].slice(0, 500);
  }
}

async function resolveLocation(ip, ipHash, req) {
  const headerCountry = req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"];
  const headerCity = req.headers["x-vercel-ip-city"];
  if (headerCountry || headerCity) {
    return {
      country: safeText(headerCountry, "Bilinmiyor", 100),
      city: safeText(safeDecode(headerCity), "Bilinmiyor", 120),
    };
  }

  const previous = await VisitorEvent.findOne({
    ipHash,
    country: { $ne: "Bilinmiyor" },
  }).select("country city").lean();
  if (previous) return { country: previous.country, city: previous.city };

  const clean = String(ip).replace(/^::ffff:/, "");
  if (clean === "unknown" || clean === "127.0.0.1" || clean === "::1") {
    return { country: "Yerel", city: "Yerel" };
  }

  try {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(clean)}?fields=success,country,city`,
      { signal: AbortSignal.timeout(1400) }
    );
    const data = await response.json();
    if (data?.success) {
      return {
        country: safeText(data.country, "Bilinmiyor", 100),
        city: safeText(data.city, "Bilinmiyor", 120),
      };
    }
  } catch {
    // Konum servisi yanit vermezse ziyaret kaydi yine olusturulur.
  }
  return { country: "Bilinmiyor", city: "Bilinmiyor" };
}

router.post("/visit", async (req, res) => {
  try {
    const userAgent = String(req.headers["user-agent"] || "");
    if (/bot|crawler|spider|preview/i.test(userAgent)) return res.status(204).end();

    const path = safeText(req.body?.path, "/", 300);
    if (!path.startsWith("/") || path.startsWith("/superadmin")) return res.status(204).end();

    const ip = getClientIp(req);
    const ipHash = hash(ip);
    const clientVisitorId = safeText(req.body?.visitorId, ipHash, 160);
    const visitorKey = hash(clientVisitorId);
    const duplicate = await VisitorEvent.exists({
      visitorKey,
      path,
      createdAt: { $gte: new Date(Date.now() - 30 * 1000) },
    });
    if (duplicate) return res.status(204).end();

    const location = await resolveLocation(ip, ipHash, req);
    const agent = parseAgent(userAgent);

    await VisitorEvent.create({
      visitorKey,
      ipHash,
      maskedIp: maskIp(ip),
      path,
      referrer: sanitizeReferrer(req.body?.referrer),
      ...location,
      ...agent,
    });
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("VISITOR_TRACKING_ERROR", error.message);
    return res.status(204).end();
  }
});

router.get("/admin/overview", authRequired, superAdminOnly, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 10), 250);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalViews, todayViews, uniqueResult, todayUniqueResult, recent, topPages] = await Promise.all([
      VisitorEvent.countDocuments(),
      VisitorEvent.countDocuments({ createdAt: { $gte: today } }),
      VisitorEvent.distinct("visitorKey", { createdAt: { $gte: last30Days } }),
      VisitorEvent.distinct("visitorKey", { createdAt: { $gte: today } }),
      VisitorEvent.find().sort({ createdAt: -1 }).limit(limit).lean(),
      VisitorEvent.aggregate([
        { $match: { createdAt: { $gte: last30Days } } },
        { $group: { _id: "$path", views: { $sum: 1 }, visitors: { $addToSet: "$visitorKey" } } },
        { $project: { _id: 0, path: "$_id", views: 1, uniqueVisitors: { $size: "$visitors" } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ]),
    ]);

    res.json({
      summary: {
        totalViews,
        todayViews,
        uniqueVisitors30Days: uniqueResult.length,
        todayUniqueVisitors: todayUniqueResult.length,
      },
      topPages,
      recent,
      retentionDays: 90,
    });
  } catch (error) {
    console.error("VISITOR_ANALYTICS_ERROR", error);
    res.status(500).json({ message: "Ziyaretci verileri getirilemedi" });
  }
});

export default router;
