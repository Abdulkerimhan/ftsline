import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { registerUser, verifyRegistration } from "../api.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import logo from "../assets/ftsline.png";

const text = {
  tr: {
    title: "Kayıt Ol",
    username: "Kullanıcı adı",
    fullName: "Ad Soyad",
    email: "E-posta adresi",
    password: "Şifre",
    show: "Göster",
    hide: "Gizle",
    required: "Kullanıcı adı, e-posta ve şifre zorunlu",
    usernameLength: "Kullanıcı adı en az 5 karakter olmalı",
    usernameInvalid: "Kullanıcı adı en az bir küçük harf içermeli; yalnızca küçük harf ve rakam kullanılabilir",
    passwordLength: "Şifre en az 6 karakter olmalı",
    success: "Kayıt tamamlandı! Giriş sayfasına yönlendiriliyorsunuz...",
    failed: "Kayıt başarısız",
    serverError: "Sunucu bağlantı hatası",
    loading: "Kod gönderiliyor...",
    submit: "Kayıt Ol",
    hasAccount: "Zaten hesabın var mı?",
    login: "Giriş Yap",
    code: "E-postaya gelen 6 haneli kod",
    codeInvalid: "Lütfen 6 haneli doğrulama kodunu girin",
    codeSent: "Doğrulama kodu e-posta adresinize gönderildi.",
    verify: "Kodu Doğrula",
    verifying: "Kod doğrulanıyor...",
    resend: "Kodu Yeniden Gönder",
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
    usernameLength: "Username must be at least 5 characters",
    usernameInvalid: "Username must contain at least one lowercase letter and may only use lowercase letters and numbers",
    passwordLength: "Password must be at least 6 characters",
    success: "Registration completed! Redirecting to login...",
    failed: "Registration failed",
    serverError: "Server connection error",
    loading: "Sending code...",
    submit: "Register",
    hasAccount: "Already have an account?",
    login: "Login",
    code: "6-digit code sent to your email",
    codeInvalid: "Please enter the 6-digit verification code",
    codeSent: "A verification code was sent to your email.",
    verify: "Verify Code",
    verifying: "Verifying code...",
    resend: "Resend Code",
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
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: name === "username" ? value.toLowerCase() : value,
    }));
  };

  const requestCode = async () => {
    const data = await registerUser({
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      sponsor: sponsorFromLink.trim(),
    });

    if (!data?.verificationRequired) {
      throw new Error(data?.message || tt.failed);
    }
    setVerificationStep(true);
    setSuccessMsg(tt.codeSent);
  };

  const handleRegister = async (event) => {
    event?.preventDefault();
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) return setErrorMsg(tt.required);
    if (form.username.trim().length < 5) return setErrorMsg(tt.usernameLength);
    if (!/^(?=.*[a-z])[a-z0-9]{5,20}$/.test(form.username.trim())) return setErrorMsg(tt.usernameInvalid);
    if (form.password.length < 6) return setErrorMsg(tt.passwordLength);

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await requestCode();
    } catch (error) {
      setErrorMsg(error?.message || tt.serverError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode.trim())) return setErrorMsg(tt.codeInvalid);

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const data = await verifyRegistration({
        email: form.email.trim(),
        code: verificationCode.trim(),
      });
      if (!data?.success) throw new Error(data?.message || tt.failed);
      setSuccessMsg(tt.success);
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setErrorMsg(error?.message || tt.serverError);
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

        {!verificationStep ? (
          <form onSubmit={handleRegister} style={formStyle}>
            <input name="username" type="text" placeholder={tt.username} value={form.username} onChange={handleChange} autoComplete="username" style={inputStyle} />
            <input name="fullName" type="text" placeholder={tt.fullName} value={form.fullName} onChange={handleChange} autoComplete="name" style={inputStyle} />
            <input name="email" type="email" placeholder={tt.email} value={form.email} onChange={handleChange} autoComplete="email" style={inputStyle} />
            <div style={{ position: "relative" }}>
              <input name="password" type={showPassword ? "text" : "password"} placeholder={tt.password} value={form.password} onChange={handleChange} autoComplete="new-password" style={{ ...inputStyle, width: "100%", paddingRight: "60px", boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowPassword((previous) => !previous)} style={toggleStyle}>{showPassword ? tt.hide : tt.show}</button>
            </div>
            {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
            <button type="submit" disabled={loading} style={buttonStyle(loading)}>
              {loading ? tt.loading : tt.submit}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} style={formStyle}>
            <div style={successStyle}>{tt.codeSent}<br /><strong>{form.email}</strong></div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={tt.code}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              style={{ ...inputStyle, textAlign: "center", fontSize: "22px", letterSpacing: "6px" }}
            />
            {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
            {successMsg && successMsg !== tt.codeSent && <div style={successStyle}>{successMsg}</div>}
            <button type="submit" disabled={loading} style={buttonStyle(loading)}>
              {loading ? tt.verifying : tt.verify}
            </button>
            <button type="button" disabled={loading} onClick={handleRegister} style={secondaryButtonStyle}>
              {tt.resend}
            </button>
          </form>
        )}

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
const formStyle = { display: "flex", flexDirection: "column", gap: "14px" };
const inputStyle = { padding: "14px 15px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none" };
const toggleStyle = { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#1d4ed8" };
const errorStyle = { color: "#dc2626", fontSize: "14px", background: "#fef2f2", padding: "10px 12px", borderRadius: "10px" };
const successStyle = { color: "#166534", fontSize: "14px", background: "#f0fdf4", padding: "10px 12px", borderRadius: "10px" };
const buttonStyle = (loading) => ({ marginTop: "4px", padding: "14px", borderRadius: "12px", border: "none", color: "#fff", fontSize: "16px", fontWeight: "700", background: loading ? "#94a3b8" : "#1d4ed8", cursor: loading ? "not-allowed" : "pointer" });
const secondaryButtonStyle = { padding: "12px", borderRadius: "12px", border: "1px solid #bfdbfe", color: "#1d4ed8", background: "#eff6ff", fontSize: "14px", fontWeight: "700", cursor: "pointer" };
