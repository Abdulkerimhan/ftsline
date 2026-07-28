import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import { requestPasswordReset, resetPassword } from "../api.js";
import logo from "../assets/ftsline.png";

const text = {
  tr: {
    title: "Sifremi Unuttum",
    desc: "Hesabına ait e-posta adresini gir. Sana 6 haneli bir doğrulama kodu gönderelim.",
    email: "E-mail adresiniz",
    required: "Lütfen e-posta adresinizi girin.",
    submit: "Doğrulama Kodu Gönder",
    code: "6 haneli doğrulama kodu",
    password: "Yeni şifre (en az 6 karakter)",
    reset: "Şifremi Değiştir",
    sent: "Kod gönderildi. E-posta kutunu kontrol et.",
    success: "Şifren başarıyla değiştirildi. Giriş yapabilirsin.",
    back: "Giriş sayfasına dön",
  },
  en: {
    title: "Forgot Password",
    desc: "Enter the email address connected to your account. We will send a link or code for password reset.",
    email: "Your email address",
    required: "Please enter your email address.",
    submit: "Send Reset Link",
    code: "6-digit verification code",
    password: "New password (minimum 6 characters)",
    reset: "Change My Password",
    sent: "Code sent. Check your inbox.",
    success: "Your password was changed. You can now sign in.",
    back: "Back to login",
  },
};

export default function ForgotPassword() {
  const { language } = useI18n();
  const tt = text[language] || text.tr;
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(false);

    if (!email.trim()) {
      setError(true);
      setMsg(tt.required);
      return;
    }

    setLoading(true);
    try {
      if (step === "request") {
        await requestPasswordReset(email.trim());
        setStep("reset");
        setMsg(tt.sent);
      } else {
        await resetPassword({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        });
        setStep("done");
        setMsg(tt.success);
      }
    } catch (err) {
      setError(true);
      setMsg(err.message);
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
        <p style={descStyle}>{tt.desc}</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <input type="email" placeholder={tt.email} value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} disabled={step !== "request"} />
          {step === "reset" && (
            <>
              <input inputMode="numeric" maxLength={6} placeholder={tt.code} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={inputStyle} />
              <input type="password" minLength={6} placeholder={tt.password} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
            </>
          )}
          {msg && <div style={{ ...messageStyle, ...(error ? errorMessageStyle : {}) }}>{msg}</div>}
          {step !== "done" && <button type="submit" style={buttonStyle} disabled={loading}>{loading ? "..." : step === "request" ? tt.submit : tt.reset}</button>}
        </form>
        <div style={{ marginTop: "18px", textAlign: "center", fontSize: "14px" }}>
          <Link to="/login" style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: "700" }}>{tt.back}</Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #0f172a, #1e3a8a)", padding: "20px" };
const cardStyle = { width: "100%", maxWidth: "430px", background: "#fff", borderRadius: "22px", padding: "38px 28px", boxShadow: "0 20px 50px rgba(0,0,0,0.20)" };
const titleStyle = { textAlign: "center", marginBottom: "10px", fontSize: "28px", fontWeight: "700", color: "#0f172a" };
const descStyle = { textAlign: "center", color: "#475569", fontSize: "14px", marginBottom: "22px", lineHeight: "1.5" };
const inputStyle = { padding: "14px 15px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none" };
const messageStyle = { fontSize: "14px", background: "#eff6ff", color: "#1d4ed8", padding: "10px 12px", borderRadius: "10px" };
const errorMessageStyle = { background: "#fef2f2", color: "#b91c1c" };
const buttonStyle = { padding: "14px", borderRadius: "12px", border: "none", background: "#1d4ed8", color: "#fff", fontSize: "16px", fontWeight: "700", cursor: "pointer" };
