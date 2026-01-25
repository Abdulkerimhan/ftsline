import { useState } from "react";
import { registerRequest } from "../api/auth";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    sponsorId: "",
    password: "",
    password2: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (form.password.length < 6) {
      setMsg("❌ Şifre en az 6 karakter olmalı");
      return;
    }
    if (form.password !== form.password2) {
      setMsg("❌ Şifreler uyuşmuyor");
      return;
    }

    setLoading(true);
    try {
      const data = await registerRequest({
        username: form.username,
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        sponsorId: form.sponsorId || null,
      });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      setMsg(`✅ Kayıt başarılı: ${data.user.username}`);
      console.log("matrix placement:", data.matrix);
    } catch (err) {
      setMsg("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h2>Register</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input name="username" placeholder="Kullanıcı adı" value={form.username} onChange={onChange} />
        <input name="fullName" placeholder="Ad Soyad" value={form.fullName} onChange={onChange} />
        <input name="email" placeholder="E-posta" value={form.email} onChange={onChange} />
        <input name="sponsorId" placeholder="Sponsor ID (opsiyonel)" value={form.sponsorId} onChange={onChange} />

        <input name="password" placeholder="Şifre" type="password" value={form.password} onChange={onChange} />
        <input name="password2" placeholder="Şifre tekrar" type="password" value={form.password2} onChange={onChange} />

        <button disabled={loading} type="submit">
          {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
