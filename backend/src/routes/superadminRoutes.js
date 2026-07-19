import express from "express";
import User from "../models/User.js";
import { authRequired, superAdminOnly } from "../middleware/authMiddleware.js";
import { updateAllCareers } from "../services/networkCareerService.js";
import { getCareerLabel } from "../services/careerService.js";
import { calculateMonthlyPools } from "../services/poolService.js";
import {
  MONTHLY_LICENSE_USAGE_FEE_USDT,
  distributeLicenseCareerBonus,
} from "../services/careerBonusService.js";
import {
  INITIAL_LICENSE_BONUS_BASE_USDT,
  distributeInitialUnilevelBonus,
} from "../services/unilevelBonusService.js";
import { ensureUserMatrixPlacement } from "../services/matrixService.js";

const router = express.Router();

const ADMIN_PERMISSION_VALUES = ["users", "products", "finance", "settings"];

function normalizeAdminPermissions(permissions) {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter((permission) => ADMIN_PERMISSION_VALUES.includes(permission));
}

function addMonths(date, months) {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

router.get("/users", authRequired, superAdminOnly, async (req, res) => {
  try {
    // Suresi dolan lisanslari otomatik pasife al; kullanici hesabi aktif kalir.
    await User.updateMany(
      {
        role: { $ne: "superadmin" },
        isLicensed: true,
        licenseExpiresAt: { $ne: null, $lte: new Date() },
      },
      { $set: { isLicensed: false } }
    );

    const users = await User.find()
      .select("-passwordHash")
      .populate("sponsor", "username fullName email phone")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "KullanÄ±cÄ±lar getirilemedi" });
  }
});

router.get("/users/:id/details", authRequired, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-passwordHash")
      .populate("sponsor", "username fullName email phone");

    if (!user) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    const team = [];
    let parentIds = [user._id];
    let level = 1;

    while (parentIds.length) {
      const members = await User.find({ sponsor: { $in: parentIds } })
        .select("-passwordHash")
        .populate("sponsor", "username fullName email phone")
        .sort({ createdAt: 1 });

      if (!members.length) break;
      team.push(...members.map((member) => ({ ...member.toObject(), level })));
      parentIds = members.map((member) => member._id);
      level += 1;
    }

    res.json({
      user,
      team,
      directTeamCount: team.filter((member) => member.level === 1).length,
      totalTeamCount: team.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Kullanici ayrintilari getirilemedi" });
  }
});

router.put("/users/:id/active", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(isActive) },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "KullanÄ±cÄ± bulunamadÄ±" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "KullanÄ±cÄ± durumu gÃ¼ncellenemedi" });
  }
});

router.put("/users/:id/license", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { isLicensed, licenseFee, licensePaymentType } = req.body;
    const durationMonths = Number(req.body.durationMonths || 12);

    if (Boolean(isLicensed) && ![1, 12, 24].includes(durationMonths)) {
      return res.status(400).json({ message: "Lisans suresi 1 ay, 1 yil veya 2 yil olmalidir" });
    }

    const licenseStartedAt = Boolean(isLicensed) ? new Date() : null;
    const licensePlan = !isLicensed
      ? ""
      : durationMonths === 1
        ? "initial"
        : durationMonths === 24
          ? "biennial"
          : "annual";

    let user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isLicensed: Boolean(isLicensed),
        licenseStartedAt,
        licenseExpiresAt: isLicensed
          ? addMonths(licenseStartedAt, durationMonths)
          : null,
        licensePlan,
      },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "KullanÄ±cÄ± bulunamadÄ±" });
    }

    if (Boolean(isLicensed)) {
      user = await ensureUserMatrixPlacement(user._id);
    }

    const numericLicenseFee = Number(licenseFee || 0);
    const paymentType = String(licensePaymentType || "").trim().toLowerCase();
    const isInitialLicensePayment =
      paymentType === "initial" ||
      (!paymentType &&
        (!numericLicenseFee ||
          Math.abs(numericLicenseFee - INITIAL_LICENSE_BONUS_BASE_USDT) < 0.001));
    const isMonthlyUsagePayment =
      paymentType === "monthly" ||
      Math.abs(numericLicenseFee - MONTHLY_LICENSE_USAGE_FEE_USDT) < 0.001;

    let bonusResult = null;
    let unilevelBonusResult = null;

    if (Boolean(isLicensed) && isInitialLicensePayment) {
      unilevelBonusResult = await distributeInitialUnilevelBonus({
        payerUserId: user._id,
      });
    }

    if (Boolean(isLicensed) && isMonthlyUsagePayment) {
      bonusResult = await distributeLicenseCareerBonus({
        payerUserId: user._id,
        licenseFee: numericLicenseFee || MONTHLY_LICENSE_USAGE_FEE_USDT,
      });
    }

    res.json({ user, bonusResult, unilevelBonusResult });
  } catch (error) {
    res.status(500).json({ message: "Lisans gÃ¼ncellenemedi" });
  }
});

router.put("/users/:id/role", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "GeÃ§ersiz rol" });
    }

    const update = { role };

    if (role === "admin") {
      update.adminPermissions = [...ADMIN_PERMISSION_VALUES];
    }

    if (role === "user") {
      update.adminPermissions = [];
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "KullanÄ±cÄ± bulunamadÄ±" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Rol gÃ¼ncellenemedi" });
  }
});

router.put("/users/:id/admin-permissions", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { adminPermissions } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    if (user.role !== "admin") {
      return res.status(400).json({ message: "Sadece admin kullanicilarin alanlari kisitlanabilir" });
    }

    user.adminPermissions = normalizeAdminPermissions(adminPermissions);
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: "Admin alan izinleri guncellenemedi" });
  }
});
router.delete("/users/:id", authRequired, superAdminOnly, async (req, res) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ message: "Kendi kullanicinizi silemezsiniz" });
    }

    const user = await User.findByIdAndDelete(req.params.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    res.json({ message: "Kullanici silindi", user });
  } catch (error) {
    res.status(500).json({ message: "Kullanici silinemedi" });
  }
});
router.post("/careers/update-all", authRequired, superAdminOnly, async (req, res) => {
  try {
    const result = await updateAllCareers();

    res.json({
      message: "Kariyerler gÃ¼ncellendi",
      totalUsers: result.totalUsers,
      changedUsers: result.changedUsers,
      results: result.results.map((r) => ({
        ...r,
        oldLabel: getCareerLabel(r.oldLevel),
        newLabel: getCareerLabel(r.newLevel),
      })),
    });
  } catch (error) {
    console.error("Kariyer gÃ¼ncelleme hatasÄ±:", error);
    res.status(500).json({ message: "Kariyerler gÃ¼ncellenemedi" });
  }
});


router.post("/pools/calculate", authRequired, superAdminOnly, async (req, res) => {
  try {
    const result = await calculateMonthlyPools({
      companyProfit: req.body.companyProfit,
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Havuz hesaplanamadi" });
  }
});
export default router;



