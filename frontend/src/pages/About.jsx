import { useI18n } from "../i18n/I18nContext.jsx";
import "./About.css";

const text = {
  tr: {
    badge: "DIJITAL CAGDA",
    title: "Erken dijitallesen, yol alir.",
    quote: "DIJITAL DUNYAYA ACILAN KAPI.",
    desc: "FTSLine, dijital dunyada bireylerin gelir elde edebilecegi yenilikci ve adil bir e-ticaret ve eğitim platformudur. Guvene ve surdurulebilir bir sisteme dayanan modern bir deneyim sunar.",
    whoTitle: "Biz Kimiz?",
    whoDesc: "Teknolojiyi, insan potansiyelini ve paylasimi bir araya getirerek kazanci buyuten bir sistem kurduk. Amacimiz sadece kazanc degil, birlikte buyuyen guclu bir topluluk olusturmaktir.",
    cards: [
      { title: "Misyonumuz", desc: "Her bireyin dijitalde kendi ekonomisini kurmasini saglamak." },
      { title: "Vizyonumuz", desc: "Global ölçekte lider bir dijital eco sistem ağı olmak." },
      { title: "Temel Gucumuz", desc: "Teknoloji, sistem ve topluluk birlesimi." },
    ],
    teamTitle: "Ekibimiz",
    team: [
      { title: "Yazilim", desc: "Platform altyapisini gelistiren ekip" },
      { title: "Strateji", desc: "Kazanc modelini yoneten ekip" },
      { title: "Topluluk", desc: "Kullanici deneyimini yoneten ekip" },
    ],
    ctaTitle: "Gelecegi birlikte kur",
    ctaDesc: "FTSLine sadece kazanc degil, dijital bir yasam modeli sunar.",
  },
  en: {
    badge: "IN THE DIGITAL AGE",
    title: "Those who go digital early move ahead.",
    quote: "THE GATEWAY TO THE DIGITAL WORLD.",
    desc: "FTSLine is an innovative and fair e-commerce and education platform where people can build income in the digital world. It offers a modern experience based on trust and a sustainable system.",
    whoTitle: "Who Are We?",
    whoDesc: "We built a system that combines technology, human potential and sharing to grow value. Our goal is not only income, but a strong community that grows together.",
    cards: [
      { title: "Our Mission", desc: "To help every person build their own digital economy." },
      { title: "Our Vision", desc: "To become a leading digital network platform globally." },
      { title: "Our Core Strength", desc: "The combination of technology, system and community." },
    ],
    teamTitle: "Our Team",
    team: [
      { title: "Software", desc: "The team developing the platform infrastructure" },
      { title: "Strategy", desc: "The team managing the earning model" },
      { title: "Community", desc: "The team managing user experience" },
    ],
    ctaTitle: "Build the future together",
    ctaDesc: "FTSLine offers not only earnings, but a digital lifestyle model.",
  },
};

export default function About() {
  const { language } = useI18n();
  const tt = text[language] || text.tr;

  return (
    <div className="about-page">
      <div className="about-container">
        <section className="about-hero">
          <span className="about-badge">{tt.badge}</span>
          <h1>{tt.title}</h1>
          <p className="about-quote">{tt.quote}</p>
          <p className="about-desc">{tt.desc}</p>
        </section>

        <section className="about-section">
          <h2>{tt.whoTitle}</h2>
          <p>{tt.whoDesc}</p>
          <div className="about-grid">
            {tt.cards.map((card) => (
              <div className="about-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>{tt.teamTitle}</h2>
          <div className="about-grid">
            {tt.team.map((card) => (
              <div className="about-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-cta">
          <h2>{tt.ctaTitle}</h2>
          <p>{tt.ctaDesc}</p>
        </section>
      </div>
    </div>
  );
}
