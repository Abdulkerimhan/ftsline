import express from "express";
import User from "../models/User.js";
import { authRequired, superAdminOnly } from "../middleware/authMiddleware.js";
import { updateAllCareers } from "../services/networkCareerService.js";
import { getCareerLabel } from "../services/careerService.js";

const router = express.Router();

router.get("/users", authRequired, superAdminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Kullanıcılar getirilemedi" });
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
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Kullanıcı durumu güncellenemedi" });
  }
});

router.put("/users/:id/license", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { isLicensed } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isLicensed: Boolean(isLicensed),
        licenseStartedAt: isLicensed ? new Date() : null,
        licenseExpiresAt: isLicensed
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : null,
      },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Lisans güncellenemedi" });
  }
});

router.put("/users/:id/role", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Geçersiz rol" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Rol güncellenemedi" });
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
      message: "Kariyerler güncellendi",
      totalUsers: result.totalUsers,
      changedUsers: result.changedUsers,
      results: result.results.map((r) => ({
        ...r,
        oldLabel: getCareerLabel(r.oldLevel),
        newLabel: getCareerLabel(r.newLevel),
      })),
    });
  } catch (error) {
    console.error("Kariyer güncelleme hatası:", error);
    res.status(500).json({ message: "Kariyerler güncellenemedi" });
  }
});

export default router;