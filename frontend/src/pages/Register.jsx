import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { registerUser } from "../api.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import logo from "../assets/ftsline.png";

const text = {
  tr: {
    title: "Kayıt Ol",
    username: "Kullanici adi",
    fullName: "Ad Soyad",
    email: "E-mail adresi",
    password: "Sifre",
    show: "Goster",
    hide: "Gizle",
    required: "Kullanici adi, e-mail ve sifre zorunlu",
    usernameLength: "Kullanici adi en az 3 karakter olmali",
    usernameInvalid: "Kullanici adinda sadece kucuk harf, rakam, _ ve . olabilir",
    passwordLength: "Sifre en az 6 karakter olmali",
    success: "Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...",
    failed: "Kayıt başarısız",
    serverError: "Sunucu baglanti hatasi",
    loading: "Kayıt oluşturuluyor...",
    submit: "Kayıt Ol",
    hasAccount: "Zaten hesabin var mi?",
    login: "Giris Yap",
  },
  en: {
    title: "Register",
    username: "Username",
    fullName: "Full name",
    email: "Email address",
    password: "Password",
    show: "Show",
    hide: "Hide",
    required: "Username, email and password are required",
    usernameLength: "Username must be at least 3 characters",
    usernameInvalid: "Username can only contain lowercase letters, numbers, _ and .",
    passwordLength: "Password must be at least 6 characters",
    success: "Registration successful! Redirecting to login...",
    failed: "Registration failed",
    serverError: "Server connection error",
    loading: "Creating account...",
    submit: "Register",
    hasAccount: "Already have an account?",
    login: "Login",
  },
};

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useI18n();
  const tt = text[language] || text.tr;

  const params = new URLSearchParams(location.search);
  const sponsorFromLink = params.get("ref") || params.get("sponsor") || params.get("s") || "";

  const [form, setForm] = useState({ username: "", fullName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "username" ? value.toLowerCase() : value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) return setErrorMsg(tt.required);
    if (form.username.trim().length < 3) return setErrorMsg(tt.usernameLength);
    if (!/^[a-z0-9_.]+$/.test(form.username.trim())) return setErrorMsg(tt.usernameInvalid);
    if (form.password.length < 6) return setErrorMsg(tt.passwordLength);

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const data = await registerUser({ username: form.username.trim(), fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, sponsor: sponsorFromLink.trim() });

      if (data?.message === "Kayıt başarılı" || data?.message === "Kayit basarili" || data?.success) {
        setSuccessMsg(tt.success);
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setErrorMsg(data?.message || tt.failed);
      }
    } catch (error) {
      console.error("Register error:", error);
      setErrorMsg(error?.response?.data?.message || error?.message || tt.serverError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
          <img src={logo} alt="FTSLine Logo" style={{ width: "180px", maxWidth: "100%", objectFit: "contain" }} />
        </div>
        <h1 style={titleStyle}>{tt.title}</h1>
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <input name="username" type="text" placeholder={tt.username} value={form.username} onChange={handleChange} autoComplete="username" style={inputStyle} />
          <input name="fullName" type="text" placeholder={tt.fullName} value={form.fullName} onChange={handleChange} autoComplete="name" style={inputStyle} />
          <input name="email" type="email" placeholder={tt.email} value={form.email} onChange={handleChange} autoComplete="email" style={inputStyle} />
          <div style={{ position: "relative" }}>
            <input name="password" type={showPassword ? "text" : "password"} placeholder={tt.password} value={form.password} onChange={handleChange} autoComplete="new-password" style={{ ...inputStyle, width: "100%", paddingRight: "50px", boxSizing: "border-box" }} />
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} style={toggleStyle}>{showPassword ? tt.hide : tt.show}</button>
          </div>
          {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
          {successMsg && <div style={successStyle}>{successMsg}</div>}
          <button type="submit" disabled={loading} style={{ ...submitStyle, background: loading ? "#94a3b8" : "#1d4ed8", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? tt.loading : tt.submit}
          </button>
        </form>
        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#475569" }}>
          {tt.hasAccount} <span onClick={() => navigate("/login")} style={{ color: "#1d4ed8", fontWeight: "700", cursor: "pointer" }}>{tt.login}</span>
        </div>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #0f172a, #1e3a8a)", padding: "20px" };
const cardStyle = { width: "100%", maxWidth: "460px", background: "#ffffff", borderRadius: "22px", padding: "38px 28px", boxShadow: "0 20px 50px rgba(0,0,0,0.20)" };
const titleStyle = { textAlign: "center", marginBottom: "24px", fontSize: "28px", fontWeight: "700", color: "#0f172a" };
const inputStyle = { padding: "14px 15px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none" };
const toggleStyle = { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#1d4ed8" };
const errorStyle = { color: "#dc2626", fontSize: "14px", background: "#fef2f2", padding: "10px 12px", borderRadius: "10px" };
const successStyle = { color: "#166534", fontSize: "14px", background: "#f0fdf4", padding: "10px 12px", borderRadius: "10px" };
const submitStyle = { marginTop: "4px", padding: "14px", borderRadius: "12px", border: "none", color: "#fff", fontSize: "16px", fontWeight: "700", transition: "0.2s" };
