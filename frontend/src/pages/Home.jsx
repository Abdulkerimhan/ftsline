import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../api.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Home.css";

function pick(value, fallback) {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function formatPrice(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value) || 0);
}

function productImage(product) {
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
  if (product.image) return product.image;
  return "/ftsline.png";
}

const valueImages = [
  "/home-features/product-store.png",
  "/home-features/digital-education.png",
  "/home-features/order-tracking.png",
];

export default function Home() {
  const { t = {}, language = "tr" } = useI18n() || {};
  const home = t.home || {};
  const hero = home.hero || {};
  const storefront = home.storefront || {};
  const [products, setProducts] = useState([]);

  const values = storefront.values || [];

  useEffect(() => {
    let mounted = true;

    getProducts().then((data) => {
      if (!mounted) return;
      setProducts(Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : []);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const productShowcases = useMemo(() => {
    const activeProducts = products.filter((product) => product?.isActive !== false);
    const newest = [...activeProducts]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 3);

    const campaign = activeProducts
      .filter((product) => {
        const normal = Number(product.priceNormal || product.price || 0);
        const licensed = Number(product.priceLicensed || 0);
        return normal > 0 && licensed > 0 && licensed < normal;
      })
      .slice(0, 3);

    const showcases = storefront.showcases || [];
    return [
      {
        label: showcases[0]?.label || "En cok satanlar",
        title: showcases[0]?.title || "Magazada one cikan urunler",
        products: activeProducts.slice(0, 3),
      },
      {
        label: showcases[1]?.label || "Yeni urunler",
        title: showcases[1]?.title || "Son eklenen secenekler",
        products: newest,
      },
      {
        label: showcases[2]?.label || "Kampanyali urunler",
        title: showcases[2]?.title || "Lisans avantajli fiyatlar",
        products: campaign.length ? campaign : activeProducts.slice(0, 3),
      },
    ];
  }, [products, storefront.showcases]);

  const licensedAdvantages = storefront.licenseAdvantages || [];
  const whyFtsline =
    language === "en"
      ? [
          ["ED", "Training from A to Z"],
          ["OP", "Rewarding income opportunities"],
          ["24", "Time-independent e-commerce"],
          ["TE", "Strong technological support"],
          ["PR", "Advertising and promotion support"],
          ["SU", "Weekly presentations"],
          ["BI", "Continuous information flow"],
          ["AV", "Advantageous products and campaigns"],
          ["OD", "Rewards that support success"],
        ]
      : [
          ["EĞ", "A’dan Z’ye eğitimler"],
          ["FR", "Tatmin edici gelir fırsatları"],
          ["24", "Zamandan bağımsız e-ticaret"],
          ["TE", "Güçlü teknolojik destek"],
          ["PR", "Reklam ve tanıtım çalışmaları"],
          ["SU", "Haftalık sunumlar"],
          ["Bİ", "Sürekli bilgi akışı"],
          ["AV", "Avantajlı ürünler ve kampanyalar"],
          ["ÖD", "Başarıyı destekleyen ödüller"],
        ];

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-shell home-hero-layout">
          <div className="home-hero-copy">
            <div className="home-eyebrow">
              {pick(hero.badge, "FTSLine Premium Platform")}
            </div>
            <h1>
              {pick(
                hero.title,
                "Urun, lisans ve ekip avantajlarini tek dijital platformda birlestir."
              )}
            </h1>
            <p>
              {pick(
                hero.description,
                "FTSLine; e-ticaret deneyimini lisansli uyelik modeli ve takip edilebilir kazanc sistemiyle bir araya getiren modern bir platformdur."
              )}
            </p>
            <div className="home-actions">
              <Link to="/products" className="home-primary-action">
                {storefront.primaryButton}
              </Link>
              <Link to="/register" className="home-secondary-action">
                {storefront.secondaryButton}
              </Link>
            </div>
          </div>

          <div className="home-hero-visual" aria-label="FTSLine marka vitrini">
            <div className="home-visual-brand">
              <img src="/ftsline.png" alt="FTSLine" />
              <div>
                <span>FTSLine</span>
                <small>{language === "en" ? "Digital commerce platform" : "Dijital ticaret platformu"}</small>
              </div>
            </div>
            <div className="home-visual-copy">
              <span>{language === "en" ? "ONE DIGITAL EXPERIENCE" : "TEK DİJİTAL DENEYİM"}</span>
              <strong>{storefront.visualText}</strong>
              <div className="home-visual-tags">
                <em>{language === "en" ? "E-Commerce" : "E-Ticaret"}</em>
                <em>{language === "en" ? "Education" : "Eğitim"}</em>
                <em>{language === "en" ? "Order Tracking" : "Sipariş Takibi"}</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-why">
        <div className="home-shell home-why-panel">
          <div className="home-why-content">
            <span className="home-why-kicker">
              {language === "en" ? "WHY FTSLINE?" : "NEDEN FTSLINE?"}
            </span>
            <h2>
              {language === "en"
                ? "Important reasons to choose FTSLine"
                : "FTSLINE’ı Seçmeniz İçin Önemli Sebepler!"}
            </h2>

            <div className="home-why-list">
              {whyFtsline.map(([icon, text]) => (
                <div className="home-why-item" key={text}>
                  <span className="home-why-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <strong>{text}</strong>
                </div>
              ))}
            </div>

            <div className="home-why-action">
              <p>
                {language === "en"
                  ? "We thought of everything for you."
                  : "Sizin İçin Her Şeyi Düşündük!"}
              </p>
              <Link to="/register" className="home-primary-action">
                {language === "en" ? "Join FTSLine" : "FTSLINE’a Katıl"}
              </Link>
            </div>
          </div>

          <div className="home-commerce-visual" aria-hidden="true">
            <div className="home-commerce-orbit orbit-one">✓</div>
            <div className="home-commerce-orbit orbit-two">↗</div>
            <div className="home-commerce-orbit orbit-three">☁</div>
            <div className="home-commerce-screen">
              <div className="home-commerce-awning">
                <i></i><i></i><i></i><i></i><i></i><i></i>
              </div>
              <div className="home-commerce-window">
                <span className="home-commerce-cart">🛒</span>
                <div>
                  <b></b><b></b><b></b>
                </div>
              </div>
              <div className="home-commerce-stand"></div>
            </div>
            <div className="home-commerce-phone">
              <span>FTS</span>
              <b>🛍</b>
            </div>
            <div className="home-commerce-bag">
              <img src="/ftsline.png" alt="" />
            </div>
            <div className="home-commerce-tag">
              <span>FTSLine</span>
              <strong>{language === "en" ? "Shape the future" : "Geleceğe yön ver"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="home-values">
        <div className="home-shell">
          <div className="home-section-heading">
            <span>{storefront.valuesLabel}</span>
            <h2>{storefront.valuesTitle}</h2>
          </div>
          <div className="home-value-grid">
            {values.map((item, index) => (
              <article className="home-value-card" key={item.title}>
                <img
                  className="home-value-image"
                  src={valueImages[index % valueImages.length]}
                  alt=""
                  loading="lazy"
                />
                <div className="home-value-content">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section className="home-products-showcase">
          <div className="home-shell">
            <div className="home-section-heading">
              <span>{storefront.showcaseLabel}</span>
              <h2>{storefront.showcaseTitle}</h2>
            </div>

            <div className="home-showcase-stack">
              {productShowcases.map((section) => (
                <article className="home-showcase-block" key={section.label}>
                  <div className="home-showcase-head">
                    <div>
                      <span>{section.label}</span>
                      <h3>{section.title}</h3>
                    </div>
                    <Link to="/products">{storefront.viewAll}</Link>
                  </div>

                  <div className="home-product-row">
                    {section.products.map((product, index) => {
                      const id = product._id || product.id || index;
                      const normalPrice = Number(product.priceNormal || product.price || 0);
                      const licensedPrice = Number(product.priceLicensed || 0);
                      const hasCampaign = normalPrice > 0 && licensedPrice > 0 && licensedPrice < normalPrice;

                      return (
                        <Link to={`/products/${id}`} className="home-product-card" key={`${section.label}-${id}`}>
                          <div className="home-product-image">
                            <img
                              src={productImage(product)}
                              alt={(language === "en" ? product.nameEn : product.nameTr) || product.name || storefront.fallbackProduct}
                              onError={(event) => {
                                event.currentTarget.src = "/ftsline.png";
                              }}
                            />
                            {hasCampaign && <span>{storefront.campaign}</span>}
                          </div>
                          <div className="home-product-body">
                            <strong>{(language === "en" ? product.nameEn : product.nameTr) || product.name || product.nameEn || storefront.fallbackProduct}</strong>
                            <small>{product.brand || product.categoryTr || product.category || "FTSLine"}</small>
                            <div>
                              {normalPrice > 0 ? `${formatPrice(normalPrice)} TL` : storefront.noPrice}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="home-license-advantages">
        <div className="home-shell home-license-advantages-inner">
          <div className="home-license-advantages-copy">
            <span>{storefront.licenseLabel}</span>
            <h2>{storefront.licenseTitle}</h2>
            <p>{storefront.licenseDesc}</p>
          </div>

          <img
            className="home-license-advantages-image"
            src="/home-features/license-advantages.png"
            alt=""
            loading="lazy"
          />

          <div className="home-advantage-grid">
            {licensedAdvantages.map((item, index) => (
              <article className="home-advantage-card" key={item.title}>
                <span className="home-advantage-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-final-cta">
        <div className="home-shell home-final-inner">
          <h2>{storefront.finalTitle}</h2>
          <p>{storefront.finalDesc}</p>
          <div className="home-actions centered">
            <Link to="/products" className="home-primary-action">
              {storefront.shopButton}
            </Link>
            <Link to="/contact" className="home-secondary-action light">
              {storefront.contactButton}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
