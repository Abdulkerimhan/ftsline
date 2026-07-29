import { useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Contact.css";

const text = {
  tr: {
    title: "İletişim",
    subtitle: "Sorularınız ve talepleriniz için bize doğrudan mesaj gönderebilirsiniz.",
    mail: "E-posta",
    name: "Ad Soyad",
    phone: "Telefon (isteğe bağlı)",
    subject: "Konu",
    message: "Mesajınız",
    send: "Mesaj Gönder",
    sending: "Gönderiliyor...",
    error: "Mesaj gönderilemedi.",
  },
  en: {
    title: "Contact",
    subtitle: "Send us a direct message for your questions and requests.",
    mail: "Email",
    name: "Full Name",
    phone: "Phone (optional)",
    subject: "Subject",
    message: "Your message",
    send: "Send Message",
    sending: "Sending...",
    error: "Message could not be sent.",
  },
};

const initialForm = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  website: "",
};

export default function Contact() {
  const { language } = useI18n();
  const tt = text[language] || text.tr;
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [sending, setSending] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || tt.error);

      setStatus({ type: "success", message: result.message });
      setForm(initialForm);
    } catch (error) {
      setStatus({ type: "error", message: error.message || tt.error });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="contact-page">
      <section className="contact-card">
        <div className="contact-intro">
          <span className="contact-badge">FTSLine</span>
          <h1>{tt.title}</h1>
          <p>{tt.subtitle}</p>
          <div className="contact-email">
            <span>{tt.mail}</span>
            <a href="mailto:ftsline@ftsline.net">ftsline@ftsline.net</a>
          </div>
        </div>

        <form className="contact-form" onSubmit={submit}>
          <div className="contact-form-grid">
            <label>
              <span>{tt.name}</span>
              <input name="name" value={form.name} onChange={update} minLength={2} maxLength={100} required />
            </label>
            <label>
              <span>{tt.mail}</span>
              <input name="email" type="email" value={form.email} onChange={update} maxLength={160} required />
            </label>
          </div>
          <label>
            <span>{tt.phone}</span>
            <input name="phone" type="tel" value={form.phone} onChange={update} maxLength={30} />
          </label>
          <label>
            <span>{tt.subject}</span>
            <input name="subject" value={form.subject} onChange={update} minLength={3} maxLength={160} required />
          </label>
          <label>
            <span>{tt.message}</span>
            <textarea name="message" value={form.message} onChange={update} minLength={10} maxLength={3000} rows={7} required />
          </label>
          <input
            className="contact-honeypot"
            name="website"
            value={form.website}
            onChange={update}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          {status.message && (
            <div className={`contact-status ${status.type}`} role="status">
              {status.message}
            </div>
          )}
          <button type="submit" disabled={sending}>
            {sending ? tt.sending : tt.send}
          </button>
        </form>
      </section>
    </main>
  );
}
