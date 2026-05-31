import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import logo from "../assets/ftsline.png";

const text = {
  tr: {
    title: "Giris Yap",
    identifier: "Kullanici adi veya e-mail adresi",
    password: "Sifre",
    required: "Kullanici adi/e-mail ve sifre zorunlu",
    failed: "Giris basarisiz",
    error: "Giris sirasinda hata olustu",
    show: "Goster",
    hide: "Gizle",
    forgot: "Sifremi unuttum",
    submit: "Giris Yap",
    loading: "Giris yapiliyor...",
    noAccount: "Eger daha once kaydiniz yok ise",
    register: "Kayit Ol",
  },
  en: {
    title: "Login",
    identifier: "Username or email address",
    password: "Password",
    required: "Username/email and password are required",
    failed: "Login failed",
    error: "An error occurred during login",
    show: "Show",
    hide: "Hide",
    forgot: "Forgot password",
    submit: "Login",
    loading: "Logging in...",
    noAccount: "If you do not have an account yet",
    register: "Register",
  },
};

export default function Login() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const tt = text[language] || text.tr;

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!form.identifier.trim() || !form.password.trim()) {
      setErrorMsg(tt.required);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const data = await loginUser({ identifier: form.identifier.trim(), password: form.password });

      if (data?.token) {
        sessionStorage.setItem("accessToken", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user || null));
        window.dispatchEvent(new Event("authChanged"));
        navigate("/dashboard", { replace: true });
        return;
      }

      setErrorMsg(data?.message || tt.failed);
    } catch (error) {
      console.error("Login error:", error);
      setErrorMsg(error?.response?.data?.message || error?.message || tt.error);
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

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <input name="identifier" type="text" placeholder={tt.identifier} value={form.identifier} onChange={handleChange} autoComplete="username" style={inputStyle} />

          <div style={{ position: "relative" }}>
            <input name="password" type={showPassword ? "text" : "password"} placeholder={tt.password} value={form.password} onChange={handleChange} autoComplete="current-password" style={{ ...inputStyle, width: "100%", paddingRight: "50px", boxSizing: "border-box" }} />
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} style={toggleStyle}>
              {showPassword ? tt.hide : tt.show}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-4px" }}>
            <Link to="/forgot-password" style={linkStyle}>{tt.forgot}</Link>
          </div>

          {errorMsg && <div style={errorStyle}>{errorMsg}</div>}

          <button type="submit" disabled={loading} style={{ ...submitStyle, background: loading ? "#94a3b8" : "#1d4ed8", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? tt.loading : tt.submit}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#475569" }}>
          {tt.noAccount} <Link to="/register" style={linkStrongStyle}>{tt.register}</Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #0f172a, #1e3a8a)", padding: "20px" };
const cardStyle = { width: "100%", maxWidth: "430px", background: "#ffffff", borderRadius: "22px", padding: "38px 28px", boxShadow: "0 20px 50px rgba(0,0,0,0.20)" };
const titleStyle = { textAlign: "center", marginBottom: "24px", fontSize: "28px", fontWeight: "700", color: "#0f172a" };
const inputStyle = { padding: "14px 15px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none" };
const toggleStyle = { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#1d4ed8" };
const linkStyle = { fontSize: "14px", color: "#1d4ed8", textDecoration: "none", fontWeight: "500" };
const linkStrongStyle = { color: "#1d4ed8", fontWeight: "700", textDecoration: "none" };
const errorStyle = { color: "#dc2626", fontSize: "14px", background: "#fef2f2", padding: "10px 12px", borderRadius: "10px" };
const submitStyle = { marginTop: "4px", padding: "14px", borderRadius: "12px", border: "none", color: "#fff", fontSize: "16px", fontWeight: "700", transition: "0.2s" };
