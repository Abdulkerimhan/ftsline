import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./AuthPages.css";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ login: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.login.trim()) {
      setErr("Kullanıcı adı veya mail zorunlu.");
      return;
    }

    if (!form.password.trim()) {
      setErr("Şifre zorunlu.");
      return;
    }

    setBusy(true);

    try {
      const result = await login(form.login, form.password);

      if (!result?.ok) {
        setErr(result?.message || "Giriş yapılamadı.");
        return;
      }

      nav("/dashboard", { replace: true });
    } catch (e) {
      setErr(e?.message || "Giriş yapılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authPage">
      <Navbar />

      <div className="authShell">
        <div className="authCard">
          <div className="authBrand">
            <img src="/ftsline.png" alt="FTSLine" className="authLogo" />
            <div className="authBrandText">
              <div className="authBrandName">FTSLINE</div>
              <div className="authBrandSlogan">GELECEĞE YÖN VER</div>
            </div>
          </div>

          <div className="authHead">
            <h2 className="authTitle">Giriş</h2>
            <p className="authSub">Hesabına giriş yap ve panele geç.</p>
          </div>

          <form onSubmit={onSubmit} className="authForm">
            <label className="authLabel">Kullanıcı adı / Mail</label>
            <input
              className="authInput"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="kerim2 / kerim2@test.com"
              autoComplete="username"
            />

            <label className="authLabel">Şifre</label>
            <input
              className="authInput"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••"
              autoComplete="current-password"
            />

            {err ? <div className="authErr">{err}</div> : null}

            <button className="authBtn primary" type="submit" disabled={busy}>
              {busy ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>

            <button
              className="authBtn ghost"
              type="button"
              onClick={() => nav("/register")}
              disabled={busy}
            >
              Hesabın yok mu? Kayıt ol
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}