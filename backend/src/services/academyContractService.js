export function hasAcademyAccess(user, now = Date.now()) {
  if (user?.role === "superadmin") return true;
  if (!user?.isLicensed) return false;
  if (!user?.licenseExpiresAt) return true;
  return new Date(user.licenseExpiresAt).getTime() > now;
}

export function normalizeAcademyLessons(lessons) {
  if (!Array.isArray(lessons)) return [];
  return lessons
    .map((lesson, index) => ({
      ...(lesson?._id ? { _id: lesson._id } : {}),
      title: String(lesson?.title || "").trim(),
      description: String(lesson?.description || "").trim(),
      videoUrl: String(lesson?.videoUrl || "").trim(),
      documentUrl: String(lesson?.documentUrl || "").trim(),
      durationMinutes: Math.max(0, Number(lesson?.durationMinutes || 0)),
      order: Number.isFinite(Number(lesson?.order)) ? Number(lesson.order) : index,
    }))
    .filter((lesson) => lesson.title);
}
