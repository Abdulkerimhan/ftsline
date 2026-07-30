import fs from "node:fs/promises";

const apiUrl = String(process.env.ACADEMY_API_URL || "https://ftsline.onrender.com/api").replace(/\/$/, "");
const identifier = process.env.ACADEMY_ADMIN_IDENTIFIER;
const password = process.env.ACADEMY_ADMIN_PASSWORD;

if (!identifier || !password) {
  throw new Error("ACADEMY_ADMIN_IDENTIFIER ve ACADEMY_ADMIN_PASSWORD zorunludur.");
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `${path} istegi basarisiz.`);
  return data;
}

const content = JSON.parse(
  await fs.readFile(new URL("../data/academyStarterContent.json", import.meta.url), "utf8")
);
const login = await request("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier, password }),
});
const headers = {
  Authorization: `Bearer ${login.token}`,
  "Content-Type": "application/json",
};
const courses = await request("/academy/admin/courses", { headers });
const course = courses.find((item) =>
  String(item.title || "").toLocaleLowerCase("tr-TR").includes("e-ticarete")
);
if (!course) throw new Error("E-Ticarete Baslangic kursu bulunamadi.");

const result = await request(`/academy/admin/courses/${course._id}`, {
  method: "PUT",
  headers,
  body: JSON.stringify({
    ...course,
    title: content.title,
    description: content.description,
    product: course.product?._id || course.product || null,
    products: (course.products || []).map((product) => product?._id || product),
    lessons: content.lessons,
  }),
});

console.log(`Yayinlandi: ${result.title} (${result.lessons?.length || 0} ders)`);
