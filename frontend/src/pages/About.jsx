import { useI18n } from "../i18n/I18nContext.jsx";
import "./About.css";

const text = {
  tr: {
    badge: "DİJİTAL ÇAĞDA",
    title: "Erken dijitalleşen, yol alır.",
    quote: "DİJİTAL DÜNYAYA AÇILAN KAPI.",
    desc: "FTSLine; e-ticaret, dijital eğitim ve güvenli sipariş süreçlerini tek platformda bir araya getirir. Teknolojiyle desteklenen, anlaşılır ve sürdürülebilir bir deneyim sunar.",
    whoTitle: "Biz Kimiz?",
    whoDesc: "Teknolojiyi, eğitimi ve e-ticareti bir araya getirerek kullanıcıların dijital dünyada güvenle ilerleyebileceği güçlü bir sistem kurduk.",
    cards: [
      { title: "Misyonumuz", desc: "Her bireyin dijitalde bilgiye, eğitime ve ticaret araçlarına kolayca ulaşmasını sağlamak." },
      { title: "Vizyonumuz", desc: "Global ölçekte lider bir dijital ekosistem olmak." },
      { title: "Temel Gücümüz", desc: "Teknoloji, güvenli sistemler ve kullanıcı odaklı hizmetlerin birleşimi." },
    ],
    teamTitle: "Ekibimiz",
    team: [
      { title: "Yazılım", desc: "Platform altyapısını geliştiren ve güvenliğini sağlayan ekip", icon: "</>" },
      { title: "E-Ticaret", desc: "Ürün, sipariş ve müşteri deneyimini geliştiren ekip", icon: "▣" },
      { title: "Eğitim", desc: "Dijital eğitim içeriklerini hazırlayan ekip", icon: "▶" },
    ],
    ctaTitle: "Geleceği birlikte şekillendirelim",
    ctaDesc: "FTSLine ile e-ticaret ve dijital eğitimi tek bir güvenilir deneyimde keşfedin.",
  },
  en: {
    badge: "IN THE DIGITAL AGE",
    title: "Those who go digital early move ahead.",
    quote: "THE GATEWAY TO THE DIGITAL WORLD.",
    desc: "FTSLine brings e-commerce, digital education and secure ordering processes together on one platform. It offers a clear and sustainable experience supported by technology.",
    whoTitle: "Who Are We?",
    whoDesc: "We combine technology, education and e-commerce in a powerful system where users can move forward confidently in the digital world.",
    cards: [
      { title: "Our Mission", desc: "To provide easy access to digital knowledge, education and commerce tools." },
      { title: "Our Vision", desc: "To become a leading global digital ecosystem." },
      { title: "Our Core Strength", desc: "The combination of technology, reliable systems and user-focused services." },
    ],
    teamTitle: "Our Team",
    team: [
      { title: "Software", desc: "The team developing and securing the platform infrastructure", icon: "</>" },
      { title: "E-Commerce", desc: "The team improving product, order and customer experience", icon: "▣" },
      { title: "Education", desc: "The team preparing digital education content", icon: "▶" },
    ],
    ctaTitle: "Shape the future together",
    ctaDesc: "Discover e-commerce and digital education in one reliable FTSLine experience.",
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
              <article className="about-card about-value-card" key={card.title}>
                <div className="about-value-image" aria-hidden="true" />
                <div className="about-card-content">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>{tt.teamTitle}</h2>
          <div className="about-grid">
            {tt.team.map((card) => (
              <article className="about-card about-team-card" key={card.title}>
                <div className="about-team-image" aria-hidden="true">
                  <span className="about-team-icon">{card.icon}</span>
                </div>
                <div className="about-team-content">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              </article>
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
