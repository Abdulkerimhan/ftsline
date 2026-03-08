import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { apiGet } from "../api/http.js";
import "./Landing.css";

const CART_KEY = "fts_cart_v1";

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function fmtTry(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("tr-TR");
}

function getPrice(p, isLicensed) {
  const normal = Number(p?.priceNormal ?? p?.normalPrice ?? p?.price ?? 0);
  const licensed = Number(p?.priceLicensed ?? p?.licensedPrice ?? 0);

  if (isLicensed && licensed > 0) {
    return { main: licensed, sub: normal, hasDiscount: licensed < normal };
  }
  return { main: normal, sub: licensed > 0 ? licensed : null, hasDiscount: false };
}

function readCart() {
  const raw = localStorage.getItem(CART_KEY);
  const arr = raw ? safeJsonParse(raw) : [];
  return Array.isArray(arr) ? arr : [];
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  window.dispatchEvent(new Event("cart:changed"));
}

function addToCart(product, qty = 1) {
  const id = product?._id || product?.id || product?.productId;
  if (!id) return;

  const cart = readCart();
  const idx = cart.findIndex((x) => String(x?.id) === String(id));

  const item = {
    id,
    name: product?.name || "Ürün",
    brand: product?.brand || "",
    category: product?.category || "",
    image: (product?.images && product.images[0]) || product?.image || "",
    priceNormal: Number(product?.priceNormal ?? product?.normalPrice ?? product?.price ?? 0),
    priceLicensed: Number(product?.priceLicensed ?? product?.licensedPrice ?? 0),
    qty: Math.max(1, Number(qty || 1)),
  };

  if (idx >= 0) {
    const current = cart[idx];
    cart[idx] = { ...current, qty: Number(current?.qty || 0) + item.qty };
  } else {
    cart.push(item);
  }
  writeCart(cart);
}

export default function Landing() {
  const [all, setAll] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // optional stats (varsa dolar)
  const [stats, setStats] = useState({ users: null, orders: null, products: null });

  const user = useMemo(() => {
    const raw = localStorage.getItem("user");
    return raw ? safeJsonParse(raw) : null;
  }, []);

  const isLicensed = useMemo(() => {
    const u = user;
    return Boolean(u?.isLicensed || u?.licensed || u?.hasLicense || u?.licenseActive);
  }, [user]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__fts_toast_ln);
    window.__fts_toast_ln = window.setTimeout(() => setToast(""), 1700);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        // products
        const data = await apiGet("/api/products");
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        if (!alive) return;
        setAll(list);

        // stats (opsiyonel endpointler – yoksa patlamasın)
        // 1) /api/meta gibi bir endpointin varsa buradan çekebilirsin
        // 2) şimdilik products sayısından products stats basıyoruz
        setStats((s) => ({ ...s, products: list.length }));

        // örnek: eğer backend'de varsa (yoksa catch'e düşer, sorun yok)
        // const meta = await apiGet("/api/meta");
        // setStats({ users: meta?.users, orders: meta?.orders, products: meta?.products });
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Ürünler alınamadı");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, []);

  const campaigns = useMemo(() => {
    const list = all
      .map((p) => {
        const normal = Number(p?.priceNormal ?? p?.normalPrice ?? p?.price ?? 0);
        const licensed = Number(p?.priceLicensed ?? p?.licensedPrice ?? 0);
        const discount = licensed > 0 && normal > 0 ? Math.round(((normal - licensed) / normal) * 100) : 0;
        return { p, discount };
      })
      .filter((x) => x.discount >= 10)
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 8)
      .map((x) => x.p);

    return list.length ? list : all.slice(0, 8);
  }, [all]);

  const bestSellers = useMemo(() => {
    const score = (p) =>
      Number(p?.soldCount ?? p?.totalSold ?? p?.ordersCount ?? p?.salesCount ?? 0);

    const withScore = all
      .filter((p) => Number(p?.priceNormal ?? p?.normalPrice ?? p?.price ?? 0) > 0)
      .map((p) => ({ p, s: score(p) }));

    const hasAnyScore = withScore.some((x) => x.s > 0);

    const sorted = hasAnyScore
      ? withScore.sort((a, b) => b.s - a.s).map((x) => x.p)
      : all.filter((p) => Number(p?.priceNormal ?? p?.normalPrice ?? p?.price ?? 0) > 0);

    return sorted.slice(0, 8);
  }, [all]);

  const cats = useMemo(() => {
    const set = new Set(
      all
        .slice(0, 24)
        .map((p) => String(p?.category || "").trim())
        .filter(Boolean)
    );
    return Array.from(set).slice(0, 7);
  }, [all]);

  return (
    <div className="lnPage">
      <Navbar />

      {/* HERO */}
      <section className="lnHero">
        <div className="lnGlow" />
        <div className="lnWrap lnHeroInner">
          {/* LEFT */}
          <div className="lnLeft">
            <div className="lnBadgeRow">
              <span className="lnBadge">FTSLine • Premium</span>
              <span className={`lnBadge ${isLicensed ? "pro" : ""}`}>
                💎 Lisans: {isLicensed ? "Aktif" : "Pasif"}
              </span>
              <span className="lnBadge soft">⚡ Hızlı Alışveriş</span>
            </div>

            <h1 className="lnTitle">
              DİJİTAL DÜNYA’YA <span>AÇILAN KAPI.</span>
              <div className="lnTitleGlow" />
            </h1>

            <p className="lnSub">
              Premium vitrin, hızlı filtreleme ve lisanslı fiyat avantajı. Kullanıcı daha ilk saniyede “kaliteli” hisseder.
            </p>

            <div className="lnActions">
              <Link className="lnBtn primary" to="/products">Ürünlere Git</Link>
              <Link className="lnBtn ghost" to="/register">Kayıt Ol</Link>
              <Link className="lnBtn ghost" to="/login">Giriş</Link>
            </div>

            <div className="lnTrust">
              <div className="lnTrustItem">
                <div className="lnTrustIcon">🛡️</div>
                <div>
                  <b>Güvenli Oturum</b>
                  <span>JWT tabanlı giriş</span>
                </div>
              </div>

              <div className="lnTrustItem">
                <div className="lnTrustIcon">💳</div>
                <div>
                  <b>2 Fiyat Tipi</b>
                  <span>Normal / Lisanslı</span>
                </div>
              </div>

              <div className="lnTrustItem">
                <div className="lnTrustIcon">📦</div>
                <div>
                  <b>Modern Vitrin</b>
                  <span>Hızlı keşif</span>
                </div>
              </div>
            </div>

            {cats.length ? (
              <div className="lnCats">
                <div className="lnCatsT">Popüler Kategoriler</div>
                <div className="lnCatRow">
                  {cats.map((c) => (
                    <Link key={c} className="lnCat" to="/products">{c}</Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT (Brand + Stats + License CTA) */}
          <div className="lnBrandCard">
            <div className="lnBrandTop">
              <div className="lnDot" />
              <div className="lnDot" />
              <div className="lnDot" />
              <div className="lnBrandTopT">Marka Vitrini</div>
            </div>

            <div className="lnBrandBody">
              <div className="lnBrandGrid">
                <div className="lnBrandLogo">
                  <img src="/ftsline.png" alt="FTSLine" />
                </div>

                <div className="lnBrandText">
                  <div className="lnBrandTitle">FTSLine</div>
                  <div className="lnBrandSub">
                    Premium e-ticaret deneyimi + lisanslı fiyat sistemi.
                    <span className="lnBrandSub2">
                      Kampanyaları ve çok satanları keşfet, sepete ekle, farkı gör.
                    </span>
                  </div>

                  {/* mini stats */}
                  <div className="lnMiniStats">
                    <div className="lnMiniStat">
                      <div className="lnMiniStatN">{loading ? "…" : fmtTry(stats.products)}</div>
                      <div className="lnMiniStatT">Ürün</div>
                    </div>
                    <div className="lnMiniStat">
                      <div className="lnMiniStatN">{stats.users == null ? "—" : fmtTry(stats.users)}</div>
                      <div className="lnMiniStatT">Kullanıcı</div>
                    </div>
                    <div className="lnMiniStat">
                      <div className="lnMiniStatN">{stats.orders == null ? "—" : fmtTry(stats.orders)}</div>
                      <div className="lnMiniStatT">Sipariş</div>
                    </div>
                  </div>

                  {/* License CTA */}
                  <div className="lnLicenseBox">
                    <div className="lnLicenseLeft">
                      <div className="lnLicenseT">
                        {isLicensed ? "💎 Lisansın aktif!" : "💎 Lisans ile daha ucuz fiyat!"}
                      </div>
                      <div className="lnLicenseS">
                        {isLicensed
                          ? "Lisanslı fiyatlar otomatik uygulanıyor."
                          : "Lisans al, indirimli fiyatlar otomatik açılsın."}
                      </div>
                    </div>

                    <div className="lnLicenseBtns">
                      {isLicensed ? (
                        <Link className="lnBtn small primary" to="/products">İndirimleri Gör</Link>
                      ) : (
                        <Link className="lnBtn small primary" to="/products">Lisans Paketleri</Link>
                      )}
                      <Link className="lnBtn small ghost" to="/contact">Destek</Link>
                    </div>
                  </div>

                  <div className="lnBrandBtns">
                    <Link className="lnBtn primary" to="/products">Alışverişe Başla</Link>
                    <Link className="lnBtn ghost" to="/about">Hakkımızda</Link>
                  </div>

                  {err ? <div className="lnErr">{err}</div> : null}
                  {loading ? <div className="lnMiniHint">Ürünler yükleniyor…</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ KAMPANYALI */}
      <section className="lnWrap lnShopSec">
        <div className="lnSecTop">
          <div>
            <h2 className="lnSecTitle">🔥 Kampanyalı Ürünler</h2>
            <p className="lnSecSub">Lisanslı fiyat avantajı olan ürünler öne çıkar.</p>
          </div>
          <Link className="lnSecLink" to="/products">Hepsini gör →</Link>
        </div>

        {loading ? (
          <div className="lnProdGrid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="lnProdSkel" />)}
          </div>
        ) : (
          <div className="lnProdGrid">
            {campaigns.slice(0, 8).map((p) => {
              const id = p?._id || p?.id;
              const img = p?.images?.[0] || p?.image || "";
              const normal = Number(p?.priceNormal ?? p?.normalPrice ?? p?.price ?? 0);
              const licensed = Number(p?.priceLicensed ?? p?.licensedPrice ?? 0);
              const discount = licensed > 0 && normal > 0 ? Math.round(((normal - licensed) / normal) * 100) : 0;
              const price = getPrice(p, isLicensed);

              return (
                <div key={String(id || p?.name)} className="lnProdCard">
                  <Link to={id ? `/products/${id}` : "/products"} className="lnProdImg">
                    {img ? <img src={img} alt={p?.name || "Ürün"} /> : <div className="lnProdPh" />}
                    <span className="lnProdTag">Kampanya</span>
                    {discount >= 10 ? <span className="lnProdOff">-%{discount}</span> : null}
                  </Link>

                  <div className="lnProdBody">
                    <div className="lnProdName" title={p?.name}>{p?.name || "Ürün"}</div>
                    <div className="lnProdMeta">{p?.brand || "—"} • {p?.category || "—"}</div>

                    <div className="lnProdPrice">
                      <b>₺{fmtTry(price.main)}</b>
                      {price.sub !== null ? (
                        <span className={`lnProdSubPrice ${price.hasDiscount ? "strike" : ""}`}>
                          ₺{fmtTry(price.sub)}
                        </span>
                      ) : null}
                    </div>

                    <div className="lnProdActions">
                      <button
                        className="lnBtn small primary"
                        type="button"
                        onClick={() => {
                          addToCart(p, 1);
                          showToast("✅ Sepete eklendi");
                        }}
                      >
                        Sepete Ekle
                      </button>
                      <Link className="lnBtn small ghost" to={id ? `/products/${id}` : "/products"}>
                        Detay
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ✅ EN ÇOK SATAN */}
      <section className="lnWrap lnShopSec">
        <div className="lnSecTop">
          <div>
            <h2 className="lnSecTitle">⭐ En Çok Satanlar</h2>
            <p className="lnSecSub">Popüler ürünler hızlıca sepete gider.</p>
          </div>
          <Link className="lnSecLink" to="/products">Hepsini gör →</Link>
        </div>

        {loading ? (
          <div className="lnProdGrid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="lnProdSkel" />)}
          </div>
        ) : (
          <div className="lnProdGrid">
            {bestSellers.slice(0, 8).map((p) => {
              const id = p?._id || p?.id;
              const img = p?.images?.[0] || p?.image || "";
              const price = getPrice(p, isLicensed);

              return (
                <div key={String(id || p?.name)} className="lnProdCard">
                  <Link to={id ? `/products/${id}` : "/products"} className="lnProdImg">
                    {img ? <img src={img} alt={p?.name || "Ürün"} /> : <div className="lnProdPh" />}
                    <span className="lnProdTag soft">Çok Satan</span>
                  </Link>

                  <div className="lnProdBody">
                    <div className="lnProdName" title={p?.name}>{p?.name || "Ürün"}</div>
                    <div className="lnProdMeta">{p?.brand || "—"} • {p?.category || "—"}</div>

                    <div className="lnProdPrice">
                      <b>₺{fmtTry(price.main)}</b>
                      {price.sub !== null ? (
                        <span className={`lnProdSubPrice ${price.hasDiscount ? "strike" : ""}`}>
                          ₺{fmtTry(price.sub)}
                        </span>
                      ) : null}
                    </div>

                    <div className="lnProdActions">
                      <button
                        className="lnBtn small primary"
                        type="button"
                        onClick={() => {
                          addToCart(p, 1);
                          showToast("✅ Sepete eklendi");
                        }}
                      >
                        Sepete Ekle
                      </button>
                      <Link className="lnBtn small ghost" to={id ? `/products/${id}` : "/products"}>
                        Detay
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TOAST */}
      {toast ? (
        <div className="lnToast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <footer className="lnFoot">
        <div className="lnWrap lnFootInner">
          <div>© {new Date().getFullYear()} FTSLine</div>
          <div className="lnFootMuted">Parlamento Mavisi • Brand Landing</div>
        </div>
      </footer>
    </div>
  );
}