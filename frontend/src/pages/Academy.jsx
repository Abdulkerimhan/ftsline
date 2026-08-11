import { useEffect, useMemo, useState } from "react";
import "./Academy.css";

const API = import.meta.env.VITE_API_URL || "/api";
const defaultLessonCovers = [
  "/images/academy/yol-haritasi.svg",
  "/images/academy/hedef-musteri.svg",
  "/images/academy/urun-dogrulama.svg",
  "/images/academy/maliyet-karlilik.svg",
  "/images/academy/guvenli-magaza.svg",
  "/images/academy/yayina-cikis.svg",
];

function embedVideoUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let youtubeId = "";
    if (parsed.hostname.includes("youtu.be")) {
      youtubeId = parsed.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      youtubeId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || "";
    }
    if (youtubeId) {
      const safeId = youtubeId.match(/^[A-Za-z0-9_-]{11}$/)?.[0];
      return safeId
        ? `https://www.youtube-nocookie.com/embed/${safeId}?rel=0&playsinline=1`
        : "";
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

export default function Academy({ language = "tr" }) {
  const isTr = language !== "en";
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCourses({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(`${API}/academy/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.message || "Akademi yuklenemedi.");
      const list = Array.isArray(data) ? data : [];
      setCourses(list);
      setSelectedCourseId((current) => current || list[0]?._id || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    const refreshCourses = () => loadCourses({ silent: true });
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshCourses();
    };
    window.addEventListener("focus", refreshCourses);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshCourses);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === selectedCourseId) || courses[0] || null,
    [courses, selectedCourseId]
  );
  const lessons = useMemo(
    () => [...(selectedCourse?.lessons || [])].sort((a, b) => a.order - b.order),
    [selectedCourse]
  );
  const selectedLesson =
    lessons.find((lesson) => lesson._id === selectedLessonId) || lessons[0] || null;
  const completedIds = new Set(
    (selectedCourse?.progress?.completedLessonIds || []).map(String)
  );
  const completedCount = lessons.filter((lesson) => completedIds.has(String(lesson._id))).length;
  const progressPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  useEffect(() => {
    const lessonStillExists = lessons.some((lesson) => lesson._id === selectedLessonId);
    if (!lessonStillExists) setSelectedLessonId(lessons[0]?._id || "");
  }, [lessons, selectedLessonId]);

  async function toggleLesson(lesson) {
    const completed = !completedIds.has(String(lesson._id));
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(
        `${API}/academy/courses/${selectedCourse._id}/lessons/${lesson._id}/progress`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ completed }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        await loadCourses({ silent: true });
        setError("");
        return;
      }
      if (!res.ok) throw new Error(data?.message || "Ilerleme kaydedilemedi.");
      setCourses((current) =>
        current.map((course) =>
          course._id === selectedCourse._id ? { ...course, progress: data } : course
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="academy-state">{isTr ? "Akademi yukleniyor..." : "Loading academy..."}</div>;

  if (error && !courses.length) {
    return (
      <div className="academy-locked">
        <span>🎓</span>
        <h2>{isTr ? "FTSLine Akademi" : "FTSLine Academy"}</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="academy-state">
        {isTr ? "Yayinlanmis egitim henuz bulunmuyor." : "No published courses yet."}
      </div>
    );
  }

  const videoUrl = embedVideoUrl(selectedLesson?.videoUrl);
  const courseIndex = Math.max(0, courses.findIndex((course) => course._id === selectedCourse?._id));
  const courseColors = ["aqua", "sky", "blue", "violet", "amber", "green"];

  return (
    <div className="academy-page">
      <div className="academy-heading">
        <div>
          <span>{isTr ? "FTSLine Eğitim Merkezi" : "FTSLine Learning Center"}</span>
          <h1>{isTr ? "E-Ticaret Akademisi" : "E-Commerce Academy"}</h1>
          <p>{isTr ? "Bilgini geliştir, dersleri tamamla ve e-ticaret yolculuğunda adım adım ilerle." : "Build your skills and advance through your e-commerce journey."}</p>
        </div>
        <div className="academy-overall">
          <strong>%{progressPercent}</strong>
          <small>{isTr ? "Egitim ilerlemesi" : "Course progress"}</small>
        </div>
      </div>

      <div className="academy-mobile-course">
        <label htmlFor="academy-course-select">{isTr ? "Eğitim programı" : "Training program"}</label>
        <select id="academy-course-select" value={selectedCourse?._id || ""} onChange={(event) => setSelectedCourseId(event.target.value)}>
          {courses.map((course, index) => <option key={course._id} value={course._id}>{index + 1}. {course.title}</option>)}
        </select>
      </div>

      <div className="academy-catalog">
        <aside className="academy-course-menu">
          <h2>{isTr ? "Eğitimler" : "Programs"}</h2>
          {courses.map((course, index) => (
            <button type="button" key={course._id} className={course._id === selectedCourse?._id ? "active" : ""} onClick={() => setSelectedCourseId(course._id)}>
              <span>{index + 1}</span><strong>{course.title}</strong><b>›</b>
            </button>
          ))}
        </aside>
        <section className="academy-catalog-content">
          <div className="academy-catalog-title">
            <div><small>{selectedCourse?.category}</small><h2>{selectedCourse?.title}</h2></div>
            <p>{selectedCourse?.description}</p>
          </div>
          <div className="academy-lesson-grid">
            {lessons.map((lesson, index) => (
              <article className={`academy-lesson-card ${courseColors[(courseIndex + index) % courseColors.length]}`} key={lesson._id}>
                <button className="academy-card-cover" type="button" onClick={() => setSelectedLessonId(lesson._id)}>
                  <img
                    src={defaultLessonCovers[index % defaultLessonCovers.length]}
                    alt={`${lesson.title} ders görseli`}
                    loading="lazy"
                  />
                </button>
                <div className="academy-card-body">
                  <small>{lesson.durationMinutes ? `${lesson.durationMinutes} ${isTr ? "dk" : "min"}` : (isTr ? "Ders" : "Lesson")}</small>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.description || (isTr ? "Uygulamalı eğitim içeriğini şimdi inceleyin." : "Explore this practical lesson.")}</p>
                  <button type="button" onClick={() => setSelectedLessonId(lesson._id)}>{completedIds.has(String(lesson._id)) ? "✓ " : "▶ "}{isTr ? "Eğitime Başla" : "Start Lesson"}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="academy-section-label"><span>{isTr ? "Seçili ders" : "Selected lesson"}</span><h2>{selectedLesson?.title}</h2></div>
      <div className="academy-layout" id="academy-player">
        <section className="academy-player-card">
          {videoUrl ? (
            <div className="academy-video">
              <iframe
                src={videoUrl}
                title={selectedLesson?.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="academy-video-empty">▶<span>{isTr ? "Video baglantisi bekleniyor" : "Video coming soon"}</span></div>
          )}
          <div className="academy-lesson-detail">
            <div>
              <small>{selectedCourse?.title}</small>
              <h2>{selectedLesson?.title || (isTr ? "Ders secin" : "Select a lesson")}</h2>
              <p>{selectedLesson?.description}</p>
            </div>
            {selectedLesson && (
              <button
                type="button"
                className={completedIds.has(String(selectedLesson._id)) ? "completed" : ""}
                onClick={() => toggleLesson(selectedLesson)}
              >
                {completedIds.has(String(selectedLesson._id))
                  ? (isTr ? "✓ Tamamlandi" : "✓ Completed")
                  : (isTr ? "Dersi Tamamla" : "Complete Lesson")}
              </button>
            )}
          </div>
          {selectedLesson?.content && (
            <div className="academy-article">
              <h3>{isTr ? "Ders Notlari" : "Lesson Notes"}</h3>
              {selectedLesson.content
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          )}
          {Boolean(selectedLesson?.keyPoints?.length) && (
            <div className="academy-material academy-warnings">
              <h3>{isTr ? "Dikkat Edilecekler" : "Key Points"}</h3>
              <ul>
                {selectedLesson.keyPoints.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
          )}
          {Boolean(selectedLesson?.checklist?.length) && (
            <div className="academy-material academy-checklist">
              <h3>{isTr ? "Uygulama Kontrol Listesi" : "Action Checklist"}</h3>
              {selectedLesson.checklist.map((item, index) => (
                <label key={index}>
                  <input type="checkbox" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          )}
          {selectedLesson?.documentUrl && (
            <a
              className="academy-document"
              href={selectedLesson.documentUrl}
              target="_blank"
              rel="noreferrer"
            >
              📄 {isTr ? "Ders dokumanini ac" : "Open lesson document"}
            </a>
          )}
        </section>

        <aside className="academy-lessons-card">
          <div className="academy-progress">
            <div><span style={{ width: `${progressPercent}%` }} /></div>
            <p>{completedCount}/{lessons.length} {isTr ? "ders tamamlandi" : "lessons completed"}</p>
          </div>
          <div className="academy-lesson-list">
            {lessons.map((lesson, index) => (
              <button
                type="button"
                key={lesson._id}
                className={lesson._id === selectedLesson?._id ? "active" : ""}
                onClick={() => setSelectedLessonId(lesson._id)}
              >
                <span className={completedIds.has(String(lesson._id)) ? "done" : ""}>
                  {completedIds.has(String(lesson._id)) ? "✓" : index + 1}
                </span>
                <div>
                  <strong>{lesson.title}</strong>
                  <small>{lesson.durationMinutes ? `${lesson.durationMinutes} dk` : (isTr ? "Ders" : "Lesson")}</small>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
      {error && <div className="academy-inline-error">{error}</div>}
    </div>
  );
}
