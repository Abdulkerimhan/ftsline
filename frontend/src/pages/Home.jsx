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

export default function Home() {
  const { t = {} } = useI18n() || {};
  const home = t.home || {};
  const hero = home.hero || {};
  const [products, setProducts] = useState([]);

  const values = [
    {
      title: "Urun odakli magaza",
      desc: "Ziyaretci once urunleri, fiyatlari ve lisansli kullanici avantajini net gorur.",
    },
    {
      title: "Lisansli uyelik",
      desc: "Baslangic, yillik ve iki yillik planlar sade bir satin alma akisiyle sunulur.",
    },
    {
      title: "Takip edilebilir sistem",
      desc: "Siparis, odeme bildirimi, kariyer ve ekip sureci panel tarafinda kontrol edilir.",
    },
  ];

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

    return [
      {
        label: "En cok satanlar",
        title: "Magazada one cikan urunler",
        products: activeProducts.slice(0, 3),
      },
      {
        label: "Yeni urunler",
        title: "Son eklenen secenekler",
        products: newest,
      },
      {
        label: "Kampanyali urunler",
        title: "Lisans avantajli fiyatlar",
        products: campaign.length ? campaign : activeProducts.slice(0, 3),
      },
    ];
  }, [products]);

  const licensedAdvantages = [
    {
      title: "Ozel fiyat avantajlari",
      desc: "Lisansli kullanicilar, urunlerde kendilerine tanimlanan avantajli fiyatlari gorur.",
    },
    {
      title: "Aktif uyelik deneyimi",
      desc: "Lisans suresi boyunca hesap aktif kabul edilir ve panelde lisans durumu takip edilir.",
    },
    {
      title: "Kariyer sistemine katilim",
      desc: "Aktif lisans, kariyer ve ekip hesaplamalarinda kullanicinin sisteme dahil olmasini saglar.",
    },
    {
      title: "Panelden surec takibi",
      desc: "Siparisler, odeme bildirimleri, referans linki ve ekip bilgileri tek alanda izlenir.",
    },
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
                Urunleri Incele
              </Link>
              <Link to="/register" className="home-secondary-action">
                Lisansli Uyelik
              </Link>
            </div>
          </div>

          <div className="home-hero-visual" aria-label="FTSLine marka vitrini">
            <img src="/ftsline.png" alt="FTSLine" />
            <div className="home-visual-copy">
              <span>FTSLine</span>
              <strong>Gelecege yon veren dijital satis deneyimi</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="home-values">
        <div className="home-shell">
          <div className="home-section-heading">
            <span>Sade deneyim</span>
            <h2>FTSLine dijitallesmenin en kolay yolu.</h2>
          </div>
          <div className="home-value-grid">
            {values.map((item) => (
              <article className="home-value-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section className="home-products-showcase">
          <div className="home-shell">
            <div className="home-section-heading">
              <span>Urun vitrini</span>
              <h2>FTSLine'da Enlerimiz</h2>
            </div>

            <div className="home-showcase-stack">
              {productShowcases.map((section) => (
                <article className="home-showcase-block" key={section.label}>
                  <div className="home-showcase-head">
                    <div>
                      <span>{section.label}</span>
                      <h3>{section.title}</h3>
                    </div>
                    <Link to="/products">Tumunu gor</Link>
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
                              alt={product.nameTr || product.name || "FTSLine urun"}
                              onError={(event) => {
                                event.currentTarget.src = "/ftsline.png";
                              }}
                            />
                            {hasCampaign && <span>Kampanya</span>}
                          </div>
                          <div className="home-product-body">
                            <strong>{product.nameTr || product.name || product.nameEn || "FTSLine urun"}</strong>
                            <small>{product.brand || product.categoryTr || product.category || "FTSLine"}</small>
                            <div>
                              {normalPrice > 0 ? `${formatPrice(normalPrice)} TL` : "Fiyat icin incele"}
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
            <span>Lisansli kullanici avantaji</span>
            <h2>Lisans dijital dunyada ayricalikli olmanizi saglar.</h2>
            <p>
              Bu alanda lisansli kullanicilara sunulacak avantajlari net, sade ve guven veren bir
              dille anlatabiliriz. Fiyat detaylarini ana ekranda gostermeden, uyeligin degerini one
              cikarir.
            </p>
          </div>

          <div className="home-advantage-grid">
            {licensedAdvantages.map((item) => (
              <article className="home-advantage-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-final-cta">
        <div className="home-shell home-final-inner">
          <h2>FTSLine ile dijital satis deneyimini baslat.</h2>
          <p>
            Urunleri incele, lisans avantajini gor ve tum sureci tek hesap uzerinden takip et.
          </p>
          <div className="home-actions centered">
            <Link to="/products" className="home-primary-action">
              Magazaya Git
            </Link>
            <Link to="/contact" className="home-secondary-action light">
              Iletisime Gec
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
