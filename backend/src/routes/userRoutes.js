import express from "express";
import User from "../models/User.js";
import MatrixNode from "../models/MatrixNode.js";
import { auth } from "../middleware/auth.js";
import { placeUserBinary } from "../services/matrixService.js";

let Ledger = null;
try {
  const mod = await import("../models/Ledger.js");
  Ledger = mod.default;
} catch {
  //
}

const router = express.Router();

function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?._id || null;
}

function cleanStr(v) {
  return String(v || "").trim();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

/* =========================
   GET PROFILE
========================= */
router.get("/profile", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ ok: false, message: "Kullanıcı bulunamadı" });
    }

    delete user.passwordHash;

    return res.json({ ok: true, user });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   UPDATE PROFILE
========================= */
router.put("/profile", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    const user = await User.findById(userId).select("+passwordHash");
    if (!user) {
      return res.status(404).json({ ok: false, message: "Kullanıcı bulunamadı" });
    }

    const {
      fullName,
      email,
      phone,
      birthDate,
      nationality,
      addressLine,
      postalCode,
      country,
      stateCode,
      phoneCode,
      city,
      district,
      invoiceName,
      invoiceTaxNo,
      invoiceTaxOffice,
      invoiceAddressLine,
      invoiceCity,
      invoiceDistrict,
      invoicePostalCode,
      invoiceCountry,
    } = req.body || {};

    if (email !== undefined) {
      const normalizedEmail = cleanStr(email).toLowerCase();

      if (normalizedEmail) {
        const exists = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        }).lean();

        if (exists) {
          return res.status(400).json({
            ok: false,
            message: "Bu e-posta başka bir kullanıcıda kayıtlı",
          });
        }

        user.email = normalizedEmail;
      }
    }

    if (fullName !== undefined) user.fullName = cleanStr(fullName);
    if (phone !== undefined) user.phone = cleanStr(phone);

    user.profile = {
      ...(user.profile || {}),
      birthDate: birthDate ? new Date(birthDate) : null,
      nationality: nationality ? cleanStr(nationality).toUpperCase() : "",
      addressLine: cleanStr(addressLine),
      postalCode: cleanStr(postalCode),
      country: cleanStr(country || "TR").toUpperCase(),
      stateCode: cleanStr(stateCode),
      phoneCode: cleanStr(phoneCode),
      city: cleanStr(city),
      district: cleanStr(district),
    };

    user.invoice = {
      ...(user.invoice || {}),
      name: cleanStr(invoiceName),
      taxNo: cleanStr(invoiceTaxNo),
      taxOffice: cleanStr(invoiceTaxOffice),
      addressLine: cleanStr(invoiceAddressLine),
      city: cleanStr(invoiceCity),
      district: cleanStr(invoiceDistrict),
      postalCode: cleanStr(invoicePostalCode),
      country: cleanStr(invoiceCountry || user.profile?.country || "TR").toUpperCase(),
    };

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    return res.json({
      ok: true,
      message: "Profil güncellendi",
      user: safeUser,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   LICENSE ACTIVATE
   Geçici / test amaçlı:
   Kullanıcı lisanslı olur ve matrix'e eklenir.
   Prod'da bunu ödeme veya admin onay akışına bağlaman daha doğru olur.
========================= */
router.post("/license/activate", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: "Kullanıcı bulunamadı" });
    }

    const alreadyInMatrix = await MatrixNode.findOne({ user: user._id })
      .select("_id")
      .lean();

    const now = new Date();
    const currentExpire = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : null;
    const baseDate =
      currentExpire && currentExpire.getTime() > now.getTime() ? currentExpire : now;

    user.isLicensed = true;
    user.licenseExpiresAt = addDays(baseDate, 30);
    await user.save();

    let matrixPlaced = false;

    if (!alreadyInMatrix && user.sponsor) {
      try {
        await placeUserBinary({
          sponsorUserId: user.sponsor,
          newUserId: user._id,
        });
        matrixPlaced = true;
      } catch (e) {
        console.error("LICENSE_MATRIX_PLACE_ERR:", e?.message || e);
      }
    }

    return res.json({
      ok: true,
      message: matrixPlaced
        ? "Lisans aktif edildi ve kullanıcı matrix ağına eklendi."
        : "Lisans aktif edildi.",
      isLicensed: user.isLicensed,
      licenseExpiresAt: user.licenseExpiresAt,
      matrixPlaced,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   SUMMARY
========================= */
router.get("/summary", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    const u = await User.findById(userId).lean();
    if (!u) {
      return res.status(404).json({ ok: false, message: "Kullanıcı bulunamadı" });
    }

    const matrixNode = await MatrixNode.findOne({ user: u._id }).select("_id").lean();

    const now = Date.now();
    const exp = u.licenseExpiresAt ? new Date(u.licenseExpiresAt).getTime() : 0;

    let licenseStatus = "inactive";
    if (u.isLicensed && exp && exp > now) licenseStatus = "active";
    else if (u.isLicensed && exp && exp <= now) licenseStatus = "expired";

    let balance = 0;
    let totalEarning = 0;
    let monthEarning = 0;

    if (Ledger) {
      try {
        const agg = await Ledger.aggregate([
          { $match: { user: u._id, status: { $in: ["paid", "success"] } } },
          { $group: { _id: null, sum: { $sum: "$amount" } } },
        ]);
        balance = agg?.[0]?.sum || 0;
      } catch {}

      try {
        const agg = await Ledger.aggregate([
          {
            $match: {
              user: u._id,
              status: { $in: ["paid", "success"] },
              type: { $in: ["bonus", "commission", "earning"] },
            },
          },
          { $group: { _id: null, sum: { $sum: "$amount" } } },
        ]);
        totalEarning = agg?.[0]?.sum || 0;
      } catch {}

      try {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const agg = await Ledger.aggregate([
          {
            $match: {
              user: u._id,
              status: { $in: ["paid", "success"] },
              type: { $in: ["bonus", "commission", "earning"] },
              createdAt: { $gte: start },
            },
          },
          { $group: { _id: null, sum: { $sum: "$amount" } } },
        ]);
        monthEarning = agg?.[0]?.sum || 0;
      } catch {}
    }

    return res.json({
      ok: true,
      balance,
      totalEarning,
      monthEarning,
      teamCount: Number(u.teamCount || 0),
      isLicensed: !!u.isLicensed,
      matrixJoined: !!matrixNode,
      licenseStatus,
      licenseEndsAt: u.licenseExpiresAt || null,
      fullName: u.fullName || "",
      email: u.email || "",
      phone: u.phone || "",
      profile: {
        birthDate: u.profile?.birthDate || null,
        nationality: u.profile?.nationality || "",
        addressLine: u.profile?.addressLine || "",
        postalCode: u.profile?.postalCode || "",
        country: u.profile?.country || "TR",
        stateCode: u.profile?.stateCode || "",
        phoneCode: u.profile?.phoneCode || "",
        city: u.profile?.city || "",
        district: u.profile?.district || "",
      },
      invoice: {
        name: u.invoice?.name || "",
        taxNo: u.invoice?.taxNo || "",
        taxOffice: u.invoice?.taxOffice || "",
        addressLine: u.invoice?.addressLine || "",
        city: u.invoice?.city || "",
        district: u.invoice?.district || "",
        postalCode: u.invoice?.postalCode || "",
        country: u.invoice?.country || (u.profile?.country || "TR"),
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   EARNINGS SERIES
========================= */
router.get("/earnings/series", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    if (!Ledger) {
      return res.json({
        ok: true,
        items: [],
      });
    }

    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    let items = [];
    try {
      items = await Ledger.aggregate([
        {
          $match: {
            user: userId,
            status: { $in: ["paid", "success"] },
            type: { $in: ["bonus", "commission", "earning"] },
            createdAt: { $gte: start },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: "$createdAt" },
              m: { $month: "$createdAt" },
            },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]);
    } catch {
      items = [];
    }

    const mapped = items.map((x) => ({
      month: `${x._id.y}-${String(x._id.m).padStart(2, "0")}`,
      earning: Number(x.amount || 0),
    }));

    return res.json({
      ok: true,
      items: mapped,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   TEAM
========================= */
router.get("/team", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    const me = await User.findById(userId).select("_id").lean();
    if (!me) {
      return res.status(404).json({ ok: false, message: "Kullanıcı bulunamadı" });
    }

    const items = await User.find({ sponsor: me._id })
      .select("_id username fullName email role isLicensed licenseExpiresAt teamCount createdAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const mapped = items.map((x) => ({
      ...x,
      level: 1,
    }));

    return res.json({
      ok: true,
      items: mapped,
      total: mapped.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

export default router;