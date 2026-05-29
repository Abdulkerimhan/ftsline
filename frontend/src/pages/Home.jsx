import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Home.css";

function pick(value, fallback) {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function pickArray(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

export default function Home() {
  const { t = {} } = useI18n() || {};
  const home = t.home || {};

  const hero = home.hero || {};
  const vision = home.vision || {};
  const platform = home.platform || {};
  const license = home.license || {};
  const cta = home.cta || {};

  const checks = pickArray(hero.checks, ["Guvenli hesap", "Lisansli fiyat", "Hizli sepet", "Panel takibi"]);
  const stats = pickArray(home.stats, [
    { value: "1", label: "Tek platform" },
    { value: "7/24", label: "Online erisim" },
    { value: "3", label: "Kullanici rolu" },
    { value: "Pro", label: "Lisans avantaji" },
  ]);
  const cards = pickArray(vision.cards, [
    { label: "Satis", title: "Urun", desc: "Magaza ve sepet akisi" },
    { label: "Lisans", title: "Avantaj", desc: "Ozel fiyat modeli" },
    { label: "Network", title: "Ekip", desc: "Referans ve kariyer" },
    { label: "Panel", title: "Kontrol", desc: "Rol bazli yonetim" },
  ]);
  const features = pickArray(platform.features, [
    { label: "Magaza", title: "E-Ticaret", desc: "Urunleri sergile, sepete eklet ve satis akislarini tek panelden yonet." },
    { label: "Ekip", title: "Network", desc: "Ekibini, referans yapini ve kariyer surecini kullanici panelinden takip et." },
    { label: "Panel", title: "Akilli Sistem", desc: "Lisansli fiyat, siparis ve panel yapisi ayni platformda birlikte calisir." },
  ]);
  const advantages = pickArray(license.advantages, [
    "Ozel fiyat avantajlari",
    "Network ve kariyer takibi",
    "Siparis ve sepet yonetimi",
    "Admin ve superadmin kontrolu",
  ]);

  return (
    <main className="home-page">
      <div className="home-container">
        <section className="home-hero">
          <div className="home-hero-left">
            <div className="home-badge">{pick(hero.badge, "FTSLine Premium Platform")}</div>

            <h1 className="home-title">
              {pick(hero.title, "E-ticaret, network ve lisans avantajini tek yerde topla.")}
            </h1>

            <p className="home-description">
              {pick(hero.description, "FTSLine; urun satisi, lisansli fiyat sistemi, kullanici paneli ve ekip takibini bir araya getiren modern bir dijital platformdur.")}
            </p>

            <div className="home-hero-buttons">
              <Link to="/register" className="home-btn home-btn-primary">
                {pick(hero.primaryButton, "Hemen Kayit Ol")}
              </Link>
              <Link to="/products" className="home-btn home-btn-secondary">
                {pick(hero.secondaryButton, "Urunleri Gor")}
              </Link>
            </div>

            <div className="home-checks">
              {checks.map((item) => (
                <span className="home-check-item" key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="home-hero-right">
            <div className="home-vision-card">
              <div className="home-vision-top">
                <div className="home-vision-label">{pick(vision.label, "FTSLine Vitrin")}</div>
                <div className="home-vision-title">{pick(vision.title, "Dijital satis ve kazanc deneyimi")}</div>
              </div>

              <div className="home-logo-card">
                <img src="/ftsline.png" alt="FTSLine" />
              </div>

              <div className="home-mini-cards">
                {cards.map((card) => (
                  <div className="home-mini-card" key={`${card.label}-${card.title}`}>
                    <div className="home-mini-card-label">{card.label}</div>
                    <div className="home-mini-card-title">{card.title}</div>
                    <div className="home-mini-card-desc">{card.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="home-stats" aria-label={pick(home.statsLabel, "FTSLine ozeti")}>
          {stats.map((item) => (
            <div key={item.label} className="home-stat-card">
              <div className="home-stat-value">{item.value}</div>
              <div className="home-stat-label">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="home-platform">
          <div className="home-section-header">
            <div className="home-section-badge">{pick(platform.badge, "PLATFORM")}</div>
            <h2 className="home-section-title">{pick(platform.title, "Ziyaretcinin ilk bakista anlayacagi net bir sistem.")}</h2>
            <p className="home-section-desc">
              {pick(platform.desc, "Ana sayfa; urunleri, lisans fikrini ve panel mantigini sade bir akista anlatir. Kullanici ister alisverise, ister kayda, ister iletisime hizlica gecebilir.")}
            </p>
          </div>

          <div className="home-features">
            {features.map((item) => (
              <div key={item.title} className="home-feature-card">
                <div className="home-feature-icon">{item.label}</div>
                <h3 className="home-feature-title">{item.title}</h3>
                <p className="home-feature-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-license">
          <div className="home-license-grid">
            <div>
              <div className="home-license-badge">{pick(license.badge, "Lisansli Sistem")}</div>
              <h2 className="home-license-title">{pick(license.title, "Uyeligin gucunu fiyat avantajina donustur.")}</h2>
              <p className="home-license-desc">
                {pick(license.desc, "Lisans modeliyle kullaniciya daha net avantaj sunulur. Urun, siparis ve network akislarinin ayni platformda ilerlemesi daha kontrollu bir deneyim olusturur.")}
              </p>
              <Link to="/register" className="home-license-btn">{pick(license.button, "Lisans Avantajini Incele")}</Link>
            </div>

            <div className="home-license-card">
              <div className="home-license-advantages-title">{pick(license.advantagesTitle, "Avantajlar")}</div>
              <div className="home-license-advantages">
                {advantages.map((item) => (
                  <div key={item} className="home-license-advantage">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="home-cta">
          <div className="home-cta-inner">
            <h2 className="home-cta-title">{pick(cta.title, "FTSLine deneyimini simdi baslat.")}</h2>
            <p className="home-cta-desc">
              {pick(cta.desc, "Hesap olustur, urunleri incele ve panel uzerinden kendi surecini takip et.")}
            </p>
            <div className="home-cta-buttons">
              <Link to="/register" className="home-cta-btn-primary">{pick(cta.primaryButton, "Kayit Ol")}</Link>
              <Link to="/contact" className="home-cta-btn-secondary">{pick(cta.secondaryButton, "Iletisime Gec")}</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
