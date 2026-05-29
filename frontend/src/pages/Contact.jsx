import { useI18n } from "../i18n/I18nContext.jsx";

const text = {
  tr: { title: "Iletisim", subtitle: "Sorularin icin bizimle iletisime gecebilirsin.", mail: "Mail", phone: "Telefon" },
  en: { title: "Contact", subtitle: "You can contact us for your questions.", mail: "Email", phone: "Phone" },
};

export default function Contact() {
  const { language } = useI18n();
  const tt = text[language] || text.tr;

  return (
    <div style={{ minHeight: "70vh", padding: "48px 22px", background: "#f7faff" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", background: "#fff", border: "1px solid rgba(15,63,174,.1)", borderRadius: 18, padding: 28, boxShadow: "0 18px 42px rgba(12,32,84,.08)" }}>
        <span style={{ display: "inline-flex", padding: "8px 12px", borderRadius: 999, background: "rgba(15,63,174,.08)", color: "#2148b8", fontWeight: 800, fontSize: 12 }}>FTSLine</span>
        <h1 style={{ margin: "14px 0 8px", color: "#0d1b3d" }}>{tt.title}</h1>
        <p style={{ color: "#5f6d88", marginBottom: 22 }}>{tt.subtitle}</p>
        <p><strong>{tt.mail}:</strong> info@ftsline.com</p>
        <p><strong>{tt.phone}:</strong> +90 555 555 55 55</p>
      </div>
    </div>
  );
}
