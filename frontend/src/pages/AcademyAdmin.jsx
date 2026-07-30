import { useEffect, useState } from "react";
import "./AcademyAdmin.css";

const API = import.meta.env.VITE_API_URL || "/api";
const emptyLesson = {
  title: "",
  description: "",
  videoUrl: "",
  documentUrl: "",
  durationMinutes: "",
  order: 0,
};
const emptyCourse = {
  title: "",
  description: "",
  category: "E-Ticaret",
  coverImage: "",
  product: "",
  order: 0,
  isPublished: false,
  lessons: [{ ...emptyLesson }],
};

export default function AcademyAdmin({ onMessage }) {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);

  async function call(path, options = {}) {
    const token = sessionStorage.getItem("accessToken");
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Islem basarisiz.");
    return data;
  }

  async function loadCourses() {
    setLoading(true);
    try {
      const data = await call("/academy/admin/courses");
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      onMessage?.(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const data = await call("/admin/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      onMessage?.(error.message);
    }
  }

  useEffect(() => {
    loadCourses();
    loadProducts();
  }, []);

  function editCourse(course) {
    setEditingId(course._id);
    setForm({
      title: course.title || "",
      description: course.description || "",
      category: course.category || "E-Ticaret",
      coverImage: course.coverImage || "",
      product: course.product?._id || course.product || "",
      order: course.order || 0,
      isPublished: Boolean(course.isPublished),
      lessons: course.lessons?.length
        ? [...course.lessons]
            .sort((a, b) => a.order - b.order)
            .map((lesson) => ({ ...lesson }))
        : [{ ...emptyLesson }],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm({ ...emptyCourse, lessons: [{ ...emptyLesson }] });
  }

  function updateLesson(index, key, value) {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.map((lesson, lessonIndex) =>
        lessonIndex === index ? { ...lesson, [key]: value } : lesson
      ),
    }));
  }

  function addLesson() {
    setForm((current) => ({
      ...current,
      lessons: [...current.lessons, { ...emptyLesson, order: current.lessons.length }],
    }));
  }

  function removeLesson(index) {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.filter((_, lessonIndex) => lessonIndex !== index),
    }));
  }

  async function saveCourse(event) {
    event.preventDefault();
    if (!form.title.trim()) return onMessage?.("Egitim basligi zorunludur.");
    setSaving(true);
    try {
      await call(
        editingId ? `/academy/admin/courses/${editingId}` : "/academy/admin/courses",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            lessons: form.lessons.map((lesson, index) => ({
              ...lesson,
              order: index,
              durationMinutes: Number(lesson.durationMinutes || 0),
            })),
          }),
        }
      );
      onMessage?.(editingId ? "Egitim guncellendi." : "Egitim olusturuldu.");
      resetForm();
      await loadCourses();
    } catch (error) {
      onMessage?.(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse(course) {
    if (!window.confirm(`"${course.title}" egitimini silmek istiyor musunuz?`)) return;
    try {
      await call(`/academy/admin/courses/${course._id}`, { method: "DELETE" });
      onMessage?.("Egitim silindi.");
      if (editingId === course._id) resetForm();
      await loadCourses();
    } catch (error) {
      onMessage?.(error.message);
    }
  }

  return (
    <div className="academy-admin">
      <section className="super-card">
        <div className="academy-admin-head">
          <div>
            <h2>{editingId ? "Egitimi Duzenle" : "Yeni Egitim Ekle"}</h2>
            <p>Video icin YouTube veya Vimeo, dokuman icin PDF baglantisi kullanabilirsiniz.</p>
          </div>
          {editingId && <button className="super-btn" onClick={resetForm}>Yeni Egitim</button>}
        </div>

        <form onSubmit={saveCourse} className="academy-admin-form">
          <div className="academy-admin-grid">
            <label>Baslik<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
            <label>Kategori<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
            <label>Kapak gorseli URL<input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} /></label>
            <label>
              Satista olan egitim paketi
              <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                <option value="">Lisans alan herkese acik</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.nameTr || product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>Siralama<input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></label>
          </div>
          <label>Aciklama<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="academy-publish"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Kullanici panelinde yayinla</label>

          <div className="academy-admin-lessons-head">
            <h3>Dersler</h3>
            <button type="button" className="super-btn" onClick={addLesson}>+ Ders Ekle</button>
          </div>
          <div className="academy-admin-lessons">
            {form.lessons.map((lesson, index) => (
              <div className="academy-admin-lesson" key={lesson._id || index}>
                <div className="academy-admin-lesson-title">
                  <strong>{index + 1}. Ders</strong>
                  {form.lessons.length > 1 && <button type="button" onClick={() => removeLesson(index)}>Kaldir</button>}
                </div>
                <div className="academy-admin-grid">
                  <label>Ders basligi<input value={lesson.title} onChange={(e) => updateLesson(index, "title", e.target.value)} /></label>
                  <label>Sure (dakika)<input type="number" min="0" value={lesson.durationMinutes} onChange={(e) => updateLesson(index, "durationMinutes", e.target.value)} /></label>
                  <label>Video URL<input placeholder="https://youtube.com/watch?v=..." value={lesson.videoUrl} onChange={(e) => updateLesson(index, "videoUrl", e.target.value)} /></label>
                  <label>PDF / dokuman URL<input placeholder="https://..." value={lesson.documentUrl} onChange={(e) => updateLesson(index, "documentUrl", e.target.value)} /></label>
                </div>
                <label>Ders aciklamasi<textarea rows="2" value={lesson.description} onChange={(e) => updateLesson(index, "description", e.target.value)} /></label>
              </div>
            ))}
          </div>
          <button className="super-btn academy-admin-save" disabled={saving}>
            {saving ? "Kaydediliyor..." : editingId ? "Degisiklikleri Kaydet" : "Egitimi Kaydet"}
          </button>
        </form>
      </section>

      <section className="super-card">
        <h2>Akademi Egitimleri</h2>
        {loading ? <div className="super-empty">Yukleniyor...</div> : (
          <div className="academy-admin-course-list">
            {courses.map((course) => (
              <article key={course._id}>
                <div>
                  <span>{course.category}</span>
                  <h3>{course.title}</h3>
                  <p>{course.lessons?.length || 0} ders · {course.isPublished ? "Yayinda" : "Taslak"}</p>
                </div>
                <div>
                  <button className="super-btn" onClick={() => editCourse(course)}>Duzenle</button>
                  <button className="super-btn danger" onClick={() => deleteCourse(course)}>Sil</button>
                </div>
              </article>
            ))}
            {!courses.length && <div className="super-empty">Henuz egitim eklenmedi.</div>}
          </div>
        )}
      </section>
    </div>
  );
}
