import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { apiPost } from "../api/http.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./AuthPages.css";

function getSponsor(search, refUser) {
  if (refUser) return String(refUser).trim().toLowerCase();

  const sp = new URLSearchParams(search);
  return (sp.get("sponsor") || sp.get("ref") || sp.get("s") || "")
    .trim()
    .toLowerCase();
}

const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const nav = useNavigate();
  const loc = useLocation();
  const { username: refUser } = useParams();
  const { login } = useAuth();

  const sponsorFromUrl = useMemo(
    () => getSponsor(loc.search, refUser),
    [loc.search, refUser]
  );

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    password2: "",
    sponsorCode: "",
  });

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      sponsorCode: sponsorFromUrl || "",
    }));
  }, [sponsorFromUrl]);

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const username = form.username.trim().toLowerCase();
    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const password2 = form.password2;
    const sponsorCode = String(form.sponsorCode || "").trim().toLowerCase();

    if (!username) {
      setErr("Kullanıcı adı zorunlu.");
      return;
    }

    if (!USERNAME_REGEX.test(username)) {
      setErr(
        "Kullanıcı adı sadece küçük İngilizce harf, rakam, alt çizgi (_) ve nokta (.) içerebilir. 3-20 karakter olmalı."
      );
      return;
    }

    if (!email) {
      setErr("E-posta zorunlu.");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setErr("Geçerli bir e-posta adresi girin.");
      return;
    }

    if (!password.trim()) {
      setErr("Şifre zorunlu.");
      return;
    }

    if (password.length < 6) {
      setErr("Şifre en az 6 karakter olmalı.");
      return;
    }

    if (password !== password2) {
      setErr("Şifreler eşleşmiyor.");
      return;
    }

    setBusy(true);

    try {
      const payload = {
        username,
        fullName,
        email,
        password,
        sponsorCode,
      };

      const res = await apiPost("/api/auth/register", payload);

      if (!res?.ok) {
        throw new Error(res?.message || "Kayıt başarısız.");
      }

      const loginResult = await login(username, password);

      if (!loginResult?.ok) {
        throw new Error(
          loginResult?.message || "Kayıt oluşturuldu ama otomatik giriş başarısız."
        );
      }

      nav("/dashboard", { replace: true });
    } catch (e) {
      setErr(e?.message || "Kayıt başarısız.");
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
            <h2 className="authTitle">Kayıt Ol</h2>
            <p className="authSub">FTSLine ekosistemine katıl.</p>

            <div className="authSponsorBox">
              <span className="authSponsorLabel">Sponsor</span>
              <span className="authSponsorValue">
                {form.sponsorCode || "superadmin"}
              </span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="authForm">
            <label className="authLabel">Kullanıcı adı</label>
            <input
              className="authInput"
              value={form.username}
              onChange={(e) =>
                updateField(
                  "username",
                  e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "")
                )
              }
              placeholder="kerim01"
              autoComplete="username"
              maxLength={20}
            />
            <div className="authHint">
              Türkçe karakter kullanmayın. Sadece: a-z, 0-9, _ .
            </div>

            <label className="authLabel">Ad Soyad</label>
            <input
              className="authInput"
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="Kerim Test"
              autoComplete="name"
            />

            <label className="authLabel">E-posta</label>
            <input
              className="authInput"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="kerim@test.com"
              autoComplete="email"
            />

            <label className="authLabel">Şifre</label>
            <input
              className="authInput"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <label className="authLabel">Şifre Tekrar</label>
            <input
              className="authInput"
              type="password"
              value={form.password2}
              onChange={(e) => updateField("password2", e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <input
              type="hidden"
              name="sponsorCode"
              value={form.sponsorCode}
              readOnly
            />

            {err ? <div className="authErr">{err}</div> : null}

            <button className="authBtn primary" type="submit" disabled={busy}>
              {busy ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
            </button>

            <button
              className="authBtn ghost"
              type="button"
              onClick={() => nav("/login")}
              disabled={busy}
            >
              Zaten hesabın var mı? Giriş yap
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}