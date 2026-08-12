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

const academyCoverThemes = [
  { label: "E-TİCARET BAŞLANGIÇ", colors: ["#0b4fa8", "#13a6c8"], accent: "#71e2ff" },
  { label: "ÜRÜN VE TEDARİK", colors: ["#075985", "#0d9488"], accent: "#facc15" },
  { label: "SOSYAL MEDYA VE REKLAM", colors: ["#5b21b6", "#db2777"], accent: "#67e8f9" },
  { label: "SİPARİŞ VE MÜŞTERİ", colors: ["#1d4ed8", "#0891b2"], accent: "#fb923c" },
];

function ProductSupplierArt({ variant, accent }) {
  const arts = [
    <g transform="translate(318 79)"><path d="M18 116 118 22l100 94" fill="none" stroke="#fff" strokeWidth="17" strokeLinecap="round"/><circle cx="18" cy="116" r="17" fill="#5eead4"/><circle cx="118" cy="22" r="17" fill={accent}/><circle cx="218" cy="116" r="17" fill="#99f6e4"/><path d="M49 142h181" stroke="#ccfbf1" strokeWidth="13" strokeLinecap="round"/><path d="M69 118V82h37v36m25 0V61h37v57" fill="#fff" opacity=".9"/></g>,
    <g transform="translate(315 77)"><circle cx="116" cy="88" r="72" fill="#fff" opacity=".96"/><circle cx="116" cy="88" r="43" fill="none" stroke={accent} strokeWidth="13"/><circle cx="116" cy="88" r="14" fill="#0d9488"/><path d="m169 35 76-28-29 76-19-27-31 31-20-20 31-31Z" fill={accent}/><path d="M21 180h220" stroke="#99f6e4" strokeWidth="12" strokeLinecap="round"/></g>,
    <g transform="translate(311 76)"><path d="M25 53 112 14l87 39-87 42z" fill="#fff"/><path d="M25 53v98l87 41V95z" fill="#ccfbf1"/><path d="M199 53v98l-87 41V95z" fill="#99f6e4"/><circle cx="225" cy="135" r="48" fill="#fff" stroke={accent} strokeWidth="12"/><path d="m203 135 15 15 31-38" fill="none" stroke="#0f766e" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/></g>,
    <g transform="translate(316 76)"><rect x="7" y="17" width="218" height="166" rx="18" fill="#fff"/><path d="M42 52h147M42 87h96M42 122h126" stroke="#5eead4" strokeWidth="12" strokeLinecap="round"/><circle cx="202" cy="129" r="46" fill={accent}/><path d="m181 129 14 14 29-35" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/><path d="m31 12 13 13 24-29" fill="none" stroke="#0d9488" strokeWidth="9" strokeLinecap="round"/></g>,
    <g transform="translate(312 74)"><rect x="12" y="35" width="93" height="142" rx="15" fill="#fff"/><rect x="137" y="4" width="93" height="142" rx="15" fill="#ccfbf1"/><path d="M35 70h47M35 99h47M160 39h47m-47 29h47" stroke="#0d9488" strokeWidth="9" strokeLinecap="round"/><path d="m91 18 57 151" stroke={accent} strokeWidth="12" strokeLinecap="round"/><circle cx="119" cy="92" r="28" fill={accent}/><path d="m107 92 9 9 18-22" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round"/></g>,
    <g transform="translate(315 78)"><path d="M21 47 101 11l80 36-80 38z" fill="#fff"/><path d="M21 47v89l80 38V85z" fill="#ccfbf1"/><path d="M181 47v89l-80 38V85z" fill="#99f6e4"/><path d="M204 23h62v126h-62z" fill="#fff"/><path d="M216 48h38m-38 25h38m-38 25h38" stroke={accent} strokeWidth="8" strokeLinecap="round"/><path d="m207 152 20 20 38-50" fill="none" stroke="#facc15" strokeWidth="11" strokeLinecap="round"/></g>,
  ];
  return arts[variant] || arts[0];
}

function SocialMediaArt({ variant, accent }) {
  const arts = [
    <g transform="translate(319 72)"><rect x="8" y="9" width="104" height="176" rx="23" fill="#fff"/><rect x="25" y="34" width="70" height="95" rx="9" fill="#c4b5fd"/><circle cx="60" cy="157" r="11" fill="#6d28d9"/><path d="M127 51 222 14v111l-95-38z" fill={accent}/><rect x="112" y="47" width="32" height="48" rx="8" fill="#fff"/><path d="m216 34 43-23m-36 58h52m-59 34 43 23" stroke="#fff" strokeWidth="10" strokeLinecap="round"/></g>,
    <g transform="translate(315 76)"><circle cx="83" cy="82" r="62" fill="#fff" opacity=".95"/><circle cx="83" cy="64" r="24" fill="#a78bfa"/><path d="M38 125c9-39 81-39 90 0" fill="#c4b5fd"/><path d="M158 22h99v136h-99z" fill="#fff"/><path d="M176 48h63m-63 29h44m-44 29h63" stroke={accent} strokeWidth="10" strokeLinecap="round"/><path d="m202 168 20-20 20 20" fill="none" stroke="#f0abfc" strokeWidth="12" strokeLinecap="round"/></g>,
    <g transform="translate(315 76)"><rect x="5" y="9" width="242" height="165" rx="20" fill="#fff"/><path d="M29 139V93h35v46m24 0V58h35v81m24 0V79h35v60m24 0V35h20v104" fill="#c4b5fd"/><path d="m28 68 54-31 52 21 75-41" fill="none" stroke={accent} strokeWidth="11" strokeLinecap="round"/><circle cx="210" cy="17" r="14" fill="#facc15"/></g>,
    <g transform="translate(318 77)"><rect x="11" y="13" width="224" height="164" rx="21" fill="#fff"/><circle cx="58" cy="55" r="24" fill="#a78bfa"/><path d="M32 101c6-27 47-27 53 0" fill="#ddd6fe"/><path d="M109 44h93m-93 31h72m-72 31h93" stroke="#d946ef" strokeWidth="10" strokeLinecap="round"/><path d="m196 134 14 28 31 5-23 22" fill={accent}/></g>,
    <g transform="translate(316 75)"><path d="M17 31h224v142H17z" fill="#fff"/><circle cx="72" cy="87" r="35" fill="#c4b5fd"/><path d="m61 69 30 18-30 18Z" fill="#6d28d9"/><path d="M128 58h83m-83 30h61m-61 30h83" stroke={accent} strokeWidth="10" strokeLinecap="round"/><path d="M50 12h43" stroke="#f0abfc" strokeWidth="12" strokeLinecap="round"/></g>,
    <g transform="translate(316 75)"><circle cx="72" cy="77" r="56" fill="#fff"/><path d="M72 77 72 21a56 56 0 0 1 50 80Z" fill={accent}/><path d="M72 77 26 109a56 56 0 0 1 46-88Z" fill="#c4b5fd"/><rect x="150" y="14" width="99" height="157" rx="17" fill="#fff"/><path d="M169 48h61m-61 30h42m-42 30h61" stroke="#d946ef" strokeWidth="10" strokeLinecap="round"/><path d="m177 145 18-20 15 11 24-29" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round"/></g>,
  ];
  return arts[variant] || arts[0];
}

function AcademyCover({ courseIndex, lessonIndex, title }) {
  if (courseIndex === 0) {
    return <img src={defaultLessonCovers[lessonIndex % defaultLessonCovers.length]} alt={`${title} ders görseli`} loading="lazy" />;
  }

  const theme = academyCoverThemes[courseIndex % academyCoverThemes.length];
  const variant = lessonIndex % 6;
  const normalizedTitle = String(title || theme.label).toLocaleUpperCase("tr-TR");
  const displayTitle = normalizedTitle.length > 29 ? `${normalizedTitle.slice(0, 28)}…` : normalizedTitle;
  const gradientId = `academy-gradient-${courseIndex}-${variant}`;

  return (
    <svg className="academy-topic-cover" viewBox="0 0 640 270" role="img" aria-label={`${title} ders görseli`}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop stopColor={theme.colors[0]} /><stop offset="1" stopColor={theme.colors[1]} /></linearGradient></defs>
      <rect width="640" height="270" rx="22" fill={`url(#${gradientId})`} />
      <circle cx="550" cy="42" r="72" fill="#fff" opacity=".13" /><circle cx="582" cy="218" r="105" fill="#071a3d" opacity=".12" />
      <text x="34" y="43" fill="#fff" fontSize="23" fontWeight="900" fontFamily="Arial, sans-serif">{displayTitle}</text>
      <text x="35" y="68" fill="#fff" opacity=".82" fontSize="13" fontWeight="700" fontFamily="Arial, sans-serif">{theme.label} • DERS {lessonIndex + 1}</text>
      {courseIndex % 4 === 1 && <ProductSupplierArt variant={variant} accent={theme.accent} />}
      {courseIndex % 4 === 2 && <SocialMediaArt variant={variant} accent={theme.accent} />}
      {courseIndex % 4 === 3 && variant === 0 && <g transform="translate(320 88)"><rect x="0" y="18" width="72" height="50" rx="9" fill="#fff"/><rect x="180" y="18" width="72" height="50" rx="9" fill="#dff7ff"/><rect x="90" y="112" width="72" height="50" rx="9" fill="#fff"/><path d="M78 43h86m-16-14 18 14-18 14M207 78v25h-79m14-14-18 14 18 14M90 137H28V82m-14 16 14-18 14 18" fill="none" stroke={theme.accent} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><circle cx="36" cy="43" r="10" fill="#2563eb"/><circle cx="216" cy="43" r="10" fill="#0891b2"/><circle cx="126" cy="137" r="10" fill="#2563eb"/></g>}
      {courseIndex % 4 === 3 && variant === 1 && <g transform="translate(302 88)"><path d="M12 38 92 4l80 34-80 38z" fill="#fff"/><path d="M12 38v92l80 37V76z" fill="#dff7ff"/><path d="M172 38v92l-80 37V76z" fill="#bae6fd"/><path d="M181 72h68l38 38v36H181z" fill={theme.accent}/><path d="M204 84h34l22 26h-56z" fill="#fff" opacity=".9"/><circle cx="209" cy="151" r="20" fill="#071a3d" stroke="#fff" strokeWidth="7"/><circle cx="264" cy="151" r="20" fill="#071a3d" stroke="#fff" strokeWidth="7"/><path d="m63 27 79 35" stroke="#38bdf8" strokeWidth="8" opacity=".7"/></g>}
      {courseIndex % 4 === 3 && variant === 2 && <g transform="translate(320 80)"><circle cx="70" cy="68" r="45" fill="#dff7ff"/><circle cx="70" cy="52" r="18" fill="#2563eb"/><path d="M35 105c8-29 62-29 70 0" fill="#60a5fa"/><path d="M124 18h125a18 18 0 0 1 18 18v70a18 18 0 0 1-18 18h-48l-29 28 5-28h-53a18 18 0 0 1-18-18V36a18 18 0 0 1 18-18Z" fill="#fff"/><path d="M143 52h86m-86 27h61" stroke={theme.accent} strokeWidth="10" strokeLinecap="round"/><circle cx="238" cy="79" r="8" fill="#38bdf8"/></g>}
      {courseIndex % 4 === 3 && variant === 3 && <g transform="translate(315 79)"><path d="M29 60 111 23l82 37-82 39z" fill="#fff"/><path d="M29 60v86l82 39V99z" fill="#dff7ff"/><path d="M193 60v86l-82 39V99z" fill="#bae6fd"/><path d="M222 58a63 63 0 1 1-1 89" fill="none" stroke={theme.accent} strokeWidth="15" strokeLinecap="round"/><path d="m211 36 32 20-28 26M228 169l-33-17 25-28" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/></g>}
      {courseIndex % 4 === 3 && variant === 4 && <g transform="translate(318 78)"><path d="M133 175C50 124 17 91 17 49 17 10 67-7 94 27c27-34 77-17 77 22 0 42-33 75-38 126Z" fill="#fff"/><path d="m68 77 20 20 43-47" fill="none" stroke={theme.accent} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/><path d="m220 18 12 27 30 3-22 20 6 30-26-15-27 15 7-30-23-20 31-3Z" fill="#facc15"/><circle cx="223" cy="137" r="43" fill="#dff7ff"/><path d="M202 137h42m-21-21v42" stroke="#2563eb" strokeWidth="10" strokeLinecap="round"/></g>}
      {courseIndex % 4 === 3 && variant === 5 && <g transform="translate(318 75)"><rect x="0" y="8" width="250" height="165" rx="18" fill="#fff"/><path d="M35 136V96h31v40m23 0V63h31v73m23 0V86h31v50m23 0V39h31v97" fill={theme.accent} opacity=".9"/><path d="m31 77 45-31 44 20 76-46" fill="none" stroke="#2563eb" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><path d="m179 17 26-4-8 26" fill="none" stroke="#2563eb" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><path d="M27 151h198" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round"/></g>}
    </svg>
  );
}

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
                  <AcademyCover courseIndex={courseIndex} lessonIndex={index} title={lesson.title} />
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
