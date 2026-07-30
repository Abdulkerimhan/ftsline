import express from "express";
import AcademyCourse from "../models/AcademyCourse.js";
import AcademyEnrollment from "../models/AcademyEnrollment.js";
import AcademyProgress from "../models/AcademyProgress.js";
import { authRequired, superAdminOnly } from "../middleware/authMiddleware.js";
import {
  hasAcademyAccess,
  normalizeAcademyLessons,
} from "../services/academyContractService.js";
import {
  getPurchasedAcademyCourseIds,
  syncAcademyEnrollmentsForCourse,
  userCanAccessAcademyCourse,
} from "../services/academyEnrollmentService.js";

const router = express.Router();

function coursePayload(body) {
  return {
    title: String(body?.title || "").trim(),
    description: String(body?.description || "").trim(),
    category: String(body?.category || "E-Ticaret").trim(),
    coverImage: String(body?.coverImage || "").trim(),
    product: body?.product || null,
    products: Array.isArray(body?.products)
      ? body.products.map(String).filter(Boolean)
      : [],
    order: Number(body?.order || 0),
    isPublished: Boolean(body?.isPublished),
    lessons: normalizeAcademyLessons(body?.lessons),
  };
}

router.get("/courses", authRequired, async (req, res) => {
  const hasLicenseAccess = hasAcademyAccess(req.user);
  const purchasedCourseIds = await getPurchasedAcademyCourseIds(req.user._id);
  if (!hasLicenseAccess && !purchasedCourseIds.length) {
    return res.status(403).json({
      code: "ACADEMY_LICENSE_REQUIRED",
      message: "Akademi erisimi icin aktif lisans gereklidir.",
    });
  }

  const courses = await AcademyCourse.find({
    isPublished: true,
    ...(hasLicenseAccess ? {} : { _id: { $in: purchasedCourseIds } }),
  }).sort({
    order: 1,
    createdAt: 1,
  });
  const progress = await AcademyProgress.find({
    user: req.user._id,
    course: { $in: courses.map((course) => course._id) },
  });
  const progressByCourse = new Map(progress.map((item) => [String(item.course), item]));

  res.json(
    courses.map((course) => {
      const item = course.toObject();
      item.lessons.sort((a, b) => a.order - b.order);
      const saved = progressByCourse.get(String(course._id));
      return {
        ...item,
        progress: {
          completedLessonIds: saved?.completedLessonIds || [],
          lastLessonId: saved?.lastLessonId || null,
          completedAt: saved?.completedAt || null,
        },
      };
    })
  );
});

router.patch("/courses/:courseId/lessons/:lessonId/progress", authRequired, async (req, res) => {
  const canAccess =
    hasAcademyAccess(req.user) ||
    (await userCanAccessAcademyCourse({
      user: req.user,
      courseId: req.params.courseId,
    }));
  if (!canAccess) {
    return res.status(403).json({ message: "Akademi erisimi icin aktif lisans gereklidir." });
  }

  const course = await AcademyCourse.findOne({
    _id: req.params.courseId,
    isPublished: true,
    "lessons._id": req.params.lessonId,
  });
  if (!course) return res.status(404).json({ message: "Ders bulunamadi." });

  const completed = req.body?.completed !== false;
  const update = completed
    ? {
        $addToSet: { completedLessonIds: req.params.lessonId },
        $set: { lastLessonId: req.params.lessonId },
      }
    : {
        $pull: { completedLessonIds: req.params.lessonId },
        $set: { lastLessonId: req.params.lessonId, completedAt: null },
      };

  const progress = await AcademyProgress.findOneAndUpdate(
    { user: req.user._id, course: course._id },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const completedIds = new Set(progress.completedLessonIds.map(String));
  const courseCompleted =
    course.lessons.length > 0 && course.lessons.every((lesson) => completedIds.has(String(lesson._id)));
  progress.completedAt = courseCompleted ? progress.completedAt || new Date() : null;
  await progress.save();

  res.json(progress);
});

router.get("/admin/courses", authRequired, superAdminOnly, async (_req, res) => {
  const courses = await AcademyCourse.find()
    .populate("product", "name nameTr nameEn isActive")
    .populate("products", "name nameTr nameEn isActive")
    .sort({ order: 1, createdAt: 1 });
  res.json(courses);
});

router.post("/admin/courses", authRequired, superAdminOnly, async (req, res) => {
  const payload = coursePayload(req.body);
  if (!payload.title) return res.status(400).json({ message: "Egitim basligi zorunludur." });
  const course = await AcademyCourse.create(payload);
  await syncAcademyEnrollmentsForCourse(course);
  res.status(201).json(course);
});

router.put("/admin/courses/:id", authRequired, superAdminOnly, async (req, res) => {
  const payload = coursePayload(req.body);
  if (!payload.title) return res.status(400).json({ message: "Egitim basligi zorunludur." });
  const course = await AcademyCourse.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!course) return res.status(404).json({ message: "Egitim bulunamadi." });
  await syncAcademyEnrollmentsForCourse(course);
  res.json(course);
});

router.delete("/admin/courses/:id", authRequired, superAdminOnly, async (req, res) => {
  const course = await AcademyCourse.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: "Egitim bulunamadi." });
  await AcademyProgress.deleteMany({ course: course._id });
  await AcademyEnrollment.deleteMany({ course: course._id });
  res.json({ message: "Egitim silindi." });
});

export default router;
