import { useState } from "react";
import { loginRequest } from "../api/auth";

export default function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const data = await loginRequest({
        identifier: form.identifier,
        password: form.password,
      });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      setMsg(`✅ Giriş başarılı: ${data.user.username} (${data.user.role})`);
    } catch (err) {
      setMsg("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h2>Login</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          name="identifier"
          placeholder="Kullanıcı adı veya e-posta"
          value={form.identifier}
          onChange={onChange}
          autoComplete="username"
        />
        <input
          name="password"
          placeholder="Şifre"
          type="password"
          value={form.password}
          onChange={onChange}
          autoComplete="current-password"
        />
        <button disabled={loading} type="submit">
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
