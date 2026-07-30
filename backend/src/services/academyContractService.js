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
      content: String(lesson?.content || "").trim(),
      keyPoints: normalizeTextList(lesson?.keyPoints),
      checklist: normalizeTextList(lesson?.checklist),
      videoUrl: String(lesson?.videoUrl || "").trim(),
      documentUrl: String(lesson?.documentUrl || "").trim(),
      durationMinutes: Math.max(0, Number(lesson?.durationMinutes || 0)),
      order: Number.isFinite(Number(lesson?.order)) ? Number(lesson.order) : index,
    }))
    .filter((lesson) => lesson.title);
}

function normalizeTextList(value) {
  const list = Array.isArray(value) ? value : String(value || "").split("\n");
  return list
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 30);
}
