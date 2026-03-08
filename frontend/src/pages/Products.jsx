import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { apiGet } from "../api/http.js";
import "./Products.css";

const FAV_KEY = "fts_favs_v1";
const CART_KEY = "fts_cart_v1";

/* -------------------------
   Helpers
------------------------- */
function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function fmtTry(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("tr-TR");
}

function getPrice(p, isLicensed) {
  const normal = Number(p?.priceNormal ?? p?.normalPrice ?? p?.price ?? 0);
  const licensed = Number(p?.priceLicensed ?? p?.licensedPrice ?? 0);

  if (isLicensed && licensed > 0) {
    return {
      main: licensed,
      sub: normal,
      hasDiscount: licensed < normal,
    };
  }

  return {
    main: normal,
    sub: licensed > 0 ? licensed : null,
    hasDiscount: false,
  };
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean).map((x) => String(x).trim()))).sort((a, b) =>
    a.localeCompare(b, "tr")
  );
}

function readFavs() {
  const raw = localStorage.getItem(FAV_KEY);
  const arr = raw ? safeJsonParse(raw) : [];
  return Array.isArray(arr) ? arr : [];
}

function writeFavs(ids) {
  localStorage.setItem(FAV_KEY, JSON.stringify(Array.isArray(ids) ? ids : []));
}

/* -------------------------
   Cart (utils olmadan)
------------------------- */
function readCart() {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  window.dispatchEvent(new Event("cart:updated"));
}

function addToCart(product, qty = 1) {
  const id = String(product?._id || product?.id || product?.productId || "");
  if (!id) throw new Error("Ürün id yok");

  const q = Math.max(1, Number(qty || 1));
  const cart = readCart();

  const idx = cart.findIndex((x) => String(x?.id || x?._id || x?.productId || "") === id);

  const item = {
    id,
    name: product?.name || product?.title || "Ürün",
    brand: product?.brand || "",
    category: product?.category || "",
    image: product?.images?.[0] || product?.image || product?.cover || "",
    priceNormal: Number(product?.priceNormal ?? product?.normalPrice ?? product?.price ?? 0),
    priceLicensed: Number(product?.priceLicensed ?? product?.licensedPrice ?? 0),
    qty: q,
  };

  if (idx >= 0) {
    const prevQty = Number(cart[idx]?.qty || 1);
    cart[idx] = { ...cart[idx], qty: prevQty + q };
  } else {
    cart.push(item);
  }

  writeCart(cart);
  return cart;
}

export default function Products() {
  const nav = useNavigate();

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState("");
  const [quick, setQuick] = useState(null);
  const [favs, setFavs] = useState(() => new Set(readFavs()));

  const isLicensed = useMemo(() => {
    const raw = localStorage.getItem("user");
    const u = raw ? safeJsonParse(raw) : null;
    return Boolean(u?.isLicensed || u?.licensed || u?.hasLicense || u?.licenseActive);
  }, []);

  const PER_PAGE = 12;

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const data = await apiGet("/api/products");
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        if (!alive) return;
        setAll(list);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Ürünler alınamadı");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => uniqueSorted(all.map((p) => p?.category)), [all]);
  const brands = useMemo(() => uniqueSorted(all.map((p) => p?.brand)), [all]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();

    const out = all.filter((p) => {
      const name = String(p?.name || "").toLowerCase();
      const b = String(p?.brand || "").toLowerCase();
      const c = String(p?.category || "").toLowerCase();

      if (text) {
        const hit =
          name.includes(text) ||
          b.includes(text) ||
          c.includes(text) ||
          String(p?.description || "").toLowerCase().includes(text);

        if (!hit) return false;
      }

      if (category !== "all" && String(p?.category || "") !== category) return false;
      if (brand !== "all" && String(p?.brand || "") !== brand) return false;

      return true;
    });

    const sorted = [...out];

    if (sort === "price_asc" || sort === "price_desc") {
      sorted.sort((a, b) => {
        const pa = getPrice(a, isLicensed).main;
        const pb = getPrice(b, isLicensed).main;
        return sort === "price_asc" ? pa - pb : pb - pa;
      });
    } else if (sort === "name_asc" || sort === "name_desc") {
      sorted.sort((a, b) => {
        const na = String(a?.name || "");
        const nb = String(b?.name || "");
        return sort === "name_asc" ? na.localeCompare(nb, "tr") : nb.localeCompare(na, "tr");
      });
    } else if (sort === "newest") {
      sorted.sort((a, b) => {
        const da = new Date(a?.createdAt || a?.created_at || 0).getTime();
        const db = new Date(b?.createdAt || b?.created_at || 0).getTime();
        return db - da;
      });
    } else if (sort === "fav") {
      sorted.sort((a, b) => {
        const ia = favs.has(String(a?._id || a?.id)) ? 1 : 0;
        const ib = favs.has(String(b?._id || b?.id)) ? 1 : 0;
        return ib - ia;
      });
    }

    return sorted;
  }, [all, q, category, brand, sort, isLicensed, favs]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  const pageItems = useMemo(() => {
    const p = Math.min(Math.max(1, page), pageCount);
    const start = (p - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [q, category, brand, sort]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__fts_toast);
    window.__fts_toast = window.setTimeout(() => setToast(""), 1800);
  }

  function toggleFav(id) {
    const sid = String(id);
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      writeFavs(Array.from(next));
      return next;
    });
  }

  function handleAddToCart(product, closeQuick = false) {
    try {
      addToCart(product, 1);
      showToast("✅ Sepete eklendi");

      if (closeQuick) setQuick(null);

      setTimeout(() => {
        nav("/cart");
      }, 250);
    } catch (e) {
      showToast(e?.message || "⚠️ Ürün sepete eklenemedi");
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setQuick(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (quick) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";

    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [quick]);

  return (
    <div className="prPage">
      <Navbar />

      <header className="prHero">
        <div className="prGlow" />
        <div className="prWrap prHeroInner">
          <div className="prHeroLeft">
            <div className="prKicker">FTSLine • Ürün Vitrini</div>
            <h1 className="prTitle">
              Premium alışveriş deneyimi. <span>Hızlı filtrele, hızlı seç.</span>
            </h1>
            <p className="prSub">
              Lisanslı fiyat avantajı, düzenli kategori yapısı ve modern vitrin görünümü.
            </p>

            <div className="prChips">
              <span className="prChip">🛍️ {total} ürün</span>
              <span className="prChip">⚡ Hızlı Sepet</span>
              <span className={`prChip ${isLicensed ? "pro" : ""}`}>
                💎 Lisans: {isLicensed ? "Aktif" : "Pasif"}
              </span>
            </div>
          </div>

          <div className="prHeroRight">
            <div className="prSearchBox">
              <div className="prSearchTop">
                <div className="prSearchTitle">Ara & Filtrele</div>
                <button
                  className="prLinkBtn"
                  type="button"
                  onClick={() => {
                    setQ("");
                    setCategory("all");
                    setBrand("all");
                    setSort("featured");
                    setPage(1);
                    showToast("✅ Filtreler sıfırlandı");
                  }}
                >
                  Sıfırla
                </button>
              </div>

              <div className="prRow">
                <label className="prLabel">Ürün ara</label>
                <input
                  className="prInput"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ürün adı, marka, kategori..."
                />
              </div>

              <div className="prGrid2">
                <div className="prRow">
                  <label className="prLabel">Kategori</label>
                  <select className="prSelect" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="all">Tümü</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="prRow">
                  <label className="prLabel">Marka</label>
                  <select className="prSelect" value={brand} onChange={(e) => setBrand(e.target.value)}>
                    <option value="all">Tümü</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="prRow">
                <label className="prLabel">Sıralama</label>
                <select className="prSelect" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="featured">Öne Çıkan</option>
                  <option value="newest">En Yeni</option>
                  <option value="price_asc">Fiyat (Artan)</option>
                  <option value="price_desc">Fiyat (Azalan)</option>
                  <option value="name_asc">İsim (A-Z)</option>
                  <option value="name_desc">İsim (Z-A)</option>
                  <option value="fav">Favoriler önce</option>
                </select>
              </div>

              <div className="prHint">
                <b>İpucu:</b> Lisans aktifse kartlarda “Lisanslı fiyat” ana fiyat olur.
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="prWrap prMain">
        <div className="prTopbar">
          <div className="prCount">
            <b>{total}</b> sonuç
            {q ? <span className="prMuted"> • “{q}”</span> : null}
          </div>

          <div className="prPager">
            <button className="prPgBtn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ←
            </button>
            <div className="prPgText">
              {page} / {pageCount}
            </div>
            <button
              className="prPgBtn"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              →
            </button>
          </div>
        </div>

        {err ? <div className="prErr">{err}</div> : null}

        {loading ? (
          <div className="prGrid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="prSkel" />
            ))}
          </div>
        ) : (
          <>
            {pageItems.length === 0 ? (
              <div className="prEmpty">
                <div className="prEmptyIcon">🔎</div>
                <h3>Ürün bulunamadı</h3>
                <p>Filtreleri değiştirip tekrar dene.</p>
                <button
                  className="prBtn"
                  onClick={() => {
                    setQ("");
                    setCategory("all");
                    setBrand("all");
                    setSort("featured");
                    setPage(1);
                    showToast("✅ Filtreler sıfırlandı");
                  }}
                >
                  Filtreleri Sıfırla
                </button>
              </div>
            ) : (
              <div className="prGrid">
                {pageItems.map((p) => {
                  const id = p?._id || p?.id;
                  const sid = String(id || p?.name || Math.random());
                  const img = p?.images?.[0] || p?.image || "";
                  const price = getPrice(p, isLicensed);

                  const normal = Number(p?.priceNormal ?? p?.normalPrice ?? p?.price ?? 0);
                  const licensed = Number(p?.priceLicensed ?? p?.licensedPrice ?? 0);

                  const isFav = id ? favs.has(String(id)) : false;

                  return (
                    <div key={sid} className="prCard">
                      <div className="prCardTopActions">
                        <button
                          type="button"
                          className={`prIconBtn ${isFav ? "active" : ""}`}
                          title={isFav ? "Favoriden çıkar" : "Favoriye ekle"}
                          onClick={() => {
                            if (!id) return showToast("⚠️ Ürün id yok, favori kaydedilemedi");
                            toggleFav(id);
                            showToast(isFav ? "💔 Favoriden çıkarıldı" : "❤️ Favoriye eklendi");
                          }}
                        >
                          ♥
                        </button>

                        <button
                          type="button"
                          className="prIconBtn"
                          title="Hızlı Görünüm"
                          onClick={() => setQuick(p)}
                        >
                          👁
                        </button>
                      </div>

                      <Link to={id ? `/products/${id}` : "/products"} className="prImgWrap">
                        {img ? <img src={img} alt={p?.name || "Ürün"} /> : <div className="prImgPh" />}
                        {licensed > 0 ? (
                          <span className="prTag">💎 Lisanslı</span>
                        ) : (
                          <span className="prTag soft">⭐ Vitrin</span>
                        )}
                      </Link>

                      <div className="prBody">
                        <div className="prNameRow">
                          <div className="prName" title={p?.name}>
                            {p?.name || "Ürün"}
                          </div>
                        </div>

                        <div className="prMeta">
                          <span>{p?.brand || "—"}</span>
                          <span className="dot">•</span>
                          <span>{p?.category || "—"}</span>
                        </div>

                        <div className="prPriceRow">
                          <div className="prPrice">
                            <b>₺{fmtTry(price.main)}</b>
                            {price.sub !== null ? (
                              <span className={`prSubPrice ${price.hasDiscount ? "strike" : ""}`}>
                                ₺{fmtTry(price.sub)}
                              </span>
                            ) : null}
                          </div>

                          {isLicensed && licensed > 0 && licensed < normal ? (
                            <span className="prSave">
                              -%{Math.round(((normal - licensed) / Math.max(1, normal)) * 100)}
                            </span>
                          ) : (
                            <span className="prSave ghost">Hızlı</span>
                          )}
                        </div>

                        <div className="prActions">
                          <button className="prBtn ghost" type="button" onClick={() => setQuick(p)}>
                            Hızlı Gör
                          </button>

                          <button className="prBtn primary" onClick={() => handleAddToCart(p)} type="button">
                            Sepete Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="prBottomPager">
          <button className="prPgBtn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Önceki
          </button>

          <div className="prPgNums">
            {Array.from({ length: Math.min(7, pageCount) }).map((_, i) => {
              const start = Math.max(1, Math.min(page - 3, pageCount - 6));
              const n = start + i;
              if (n > pageCount) return null;
              return (
                <button
                  key={n}
                  className={`prPgNum ${n === page ? "active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <button className="prPgBtn" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
            Sonraki →
          </button>
        </div>

        {toast ? (
          <div className="prToast" role="status" aria-live="polite">
            {toast}
          </div>
        ) : null}
      </main>

      {quick ? (
        <div className="prModalOverlay" onMouseDown={() => setQuick(null)}>
          <div className="prModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="prModalTop">
              <div className="prModalTitle">Hızlı Görünüm</div>
              <button className="prIconBtn" type="button" onClick={() => setQuick(null)} title="Kapat">
                ✕
              </button>
            </div>

            <div className="prModalBody">
              <div className="prModalMedia">
                {quick?.images?.[0] || quick?.image ? (
                  <img src={quick?.images?.[0] || quick?.image} alt={quick?.name || "Ürün"} />
                ) : (
                  <div className="prModalPh" />
                )}
              </div>

              <div className="prModalInfo">
                <div className="prModalName">{quick?.name || "Ürün"}</div>
                <div className="prModalMeta">
                  <span>{quick?.brand || "—"}</span>
                  <span className="dot">•</span>
                  <span>{quick?.category || "—"}</span>
                </div>

                <div className="prModalPrice">
                  {(() => {
                    const price = getPrice(quick, isLicensed);
                    return (
                      <>
                        <b>₺{fmtTry(price.main)}</b>
                        {price.sub !== null ? (
                          <span className={`prSubPrice ${price.hasDiscount ? "strike" : ""}`}>
                            ₺{fmtTry(price.sub)}
                          </span>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                {quick?.description ? (
                  <div className="prModalDesc">{String(quick.description)}</div>
                ) : (
                  <div className="prModalDesc muted">Bu ürün için açıklama eklenmemiş.</div>
                )}

                <div className="prModalActions">
                  <Link
                    className="prBtn ghost"
                    to={quick?._id || quick?.id ? `/products/${quick?._id || quick?.id}` : "/products"}
                    onClick={() => setQuick(null)}
                  >
                    Detaya Git
                  </Link>

                  <button
                    className="prBtn primary"
                    type="button"
                    onClick={() => handleAddToCart(quick, true)}
                  >
                    Sepete Ekle
                  </button>
                </div>

                <div className="prModalHint">
                  <b>İpucu:</b> ESC ile kapatabilirsin.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}