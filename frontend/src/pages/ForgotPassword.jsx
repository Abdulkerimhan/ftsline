import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import logo from "../assets/ftsline.png";

const text = {
  tr: {
    title: "Sifremi Unuttum",
    desc: "Hesabina ait e-mail adresini gir. Sifre sifirlama islemi icin baglanti veya kod gonderelim.",
    email: "E-mail adresiniz",
    required: "Lutfen e-mail adresinizi girin.",
    info: "Sifre sifirlama baglantisi/kodu gonderme sistemi buraya baglanacak.",
    submit: "Sifirlama Linki Gonder",
    back: "Giris sayfasina don",
  },
  en: {
    title: "Forgot Password",
    desc: "Enter the email address connected to your account. We will send a link or code for password reset.",
    email: "Your email address",
    required: "Please enter your email address.",
    info: "The password reset link/code system will be connected here.",
    submit: "Send Reset Link",
    back: "Back to login",
  },
};

export default function ForgotPassword() {
  const { language } = useI18n();
  const tt = text[language] || text.tr;
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setMsg(email.trim() ? tt.info : tt.required);
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
          <input type="email" placeholder={tt.email} value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          {msg && <div style={messageStyle}>{msg}</div>}
          <button type="submit" style={buttonStyle}>{tt.submit}</button>
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
const buttonStyle = { padding: "14px", borderRadius: "12px", border: "none", background: "#1d4ed8", color: "#fff", fontSize: "16px", fontWeight: "700", cursor: "pointer" };
