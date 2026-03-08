import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import "./Cart.css";

const CART_KEY = "fts_cart_v1";

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function fmtTry(n) {
  return Number(n || 0).toLocaleString("tr-TR") + "₺";
}

function getUserIsLicensed() {
  try {
    const raw = localStorage.getItem("user");
    const u = raw ? safeJsonParse(raw) : null;
    return Boolean(u?.isLicensed || u?.licensed || u?.hasLicense || u?.licenseActive);
  } catch {
    return false;
  }
}

function getId(x) {
  return String(x?._id || x?.id || "");
}

/* =========================
   CART (utils'siz)
========================= */
function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  window.dispatchEvent(new Event("cart:updated"));
}

function updateCartQty(productId, qty) {
  const id = String(productId || "");
  if (!id) return getCart();

  const q = Number(qty || 1);

  if (q <= 0) return removeFromCart(id);

  const items = getCart().map((x) => (getId(x) === id ? { ...x, qty: q } : x));
  saveCart(items);
  return items;
}

function removeFromCart(productId) {
  const id = String(productId || "");
  const items = getCart().filter((x) => getId(x) !== id);
  saveCart(items);
  return items;
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("cart:updated"));
}

function getCartItemPrice(item, isLicensed) {
  const normal = Number(item?.priceNormal ?? item?.normalPrice ?? item?.price ?? 0);
  const licensed = Number(item?.priceLicensed ?? item?.licensedPrice ?? 0);

  if (isLicensed && licensed > 0) return licensed;
  return normal;
}

export default function Cart() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [isLicensed, setIsLicensed] = useState(false);

  function refresh() {
    setItems(getCart());
    setIsLicensed(getUserIsLicensed());
  }

  useEffect(() => {
    refresh();

    function onCartUpdate() {
      refresh();
    }

    window.addEventListener("cart:updated", onCartUpdate);
    return () => window.removeEventListener("cart:updated", onCartUpdate);
  }, []);

  const totalQty = useMemo(() => {
    return items.reduce((sum, x) => sum + Number(x.qty || 0), 0);
  }, [items]);

  const total = useMemo(() => {
    return items.reduce((sum, x) => {
      const price = getCartItemPrice(x, isLicensed);
      return sum + price * Number(x.qty || 0);
    }, 0);
  }, [items, isLicensed]);

  return (
    <div className="cartPage">
      <Navbar />

      <div className="cartShell">
        <div className="cartHead">
          <h1>Sepetim</h1>
          <button className="cartBtn" onClick={() => nav("/products")} type="button">
            Alışverişe Dön
          </button>
        </div>

        {!items.length ? (
          <div className="cartEmpty">
            <h3>Sepetin boş</h3>
            <p>Henüz sepete ürün eklemedin.</p>
            <button className="cartBtn primary" onClick={() => nav("/products")} type="button">
              Ürünlere Git
            </button>
          </div>
        ) : (
          <div className="cartGrid">
            <div className="cartList">
              {items.map((item) => {
                const pid = item?._id || item?.id;
                const unitPrice = getCartItemPrice(item, isLicensed);
                const lineTotal = unitPrice * Number(item.qty || 0);
                const img = item?.images?.[0] || item?.image || "/ftsline.png";

                return (
                  <div className="cartCard" key={String(pid)}>
                    <img src={img} alt={item.name || "Ürün"} className="cartImg" />

                    <div className="cartInfo">
                      <div className="cartName">{item.name || "Ürün"}</div>

                      <div className="cartMeta">
                        {item.brand ? <span>{item.brand}</span> : null}
                        {item.brand && item.category ? <span className="dot">•</span> : null}
                        {item.category ? <span>{item.category}</span> : null}
                      </div>

                      <div className="cartPrice">{fmtTry(unitPrice)}</div>
                    </div>

                    <div className="cartQty">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(1, Number(item.qty || 1) - 1);
                          updateCartQty(pid, next);
                        }}
                      >
                        -
                      </button>

                      <span>{item.qty}</span>

                      <button
                        type="button"
                        onClick={() => updateCartQty(pid, Number(item.qty || 1) + 1)}
                      >
                        +
                      </button>
                    </div>

                    <div className="cartLineTotal">{fmtTry(lineTotal)}</div>

                    <button className="cartRemove" type="button" onClick={() => removeFromCart(pid)}>
                      Sil
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cartSummary">
              <h3>Sipariş Özeti</h3>

              <div className="cartRow">
                <span>Lisans Durumu</span>
                <b>{isLicensed ? "Aktif" : "Pasif"}</b>
              </div>

              <div className="cartRow">
                <span>Ürün Adedi</span>
                <b>{totalQty}</b>
              </div>

              <div className="cartRow">
                <span>Toplam</span>
                <b>{fmtTry(total)}</b>
              </div>

              <button
                className="cartBtn primary"
                type="button"
                onClick={() => nav("/checkout")}
              >
                Siparişi Tamamla
              </button>

              <button
                className="cartBtn danger"
                type="button"
                onClick={() => {
                  clearCart();
                  refresh();
                }}
              >
                Sepeti Temizle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}