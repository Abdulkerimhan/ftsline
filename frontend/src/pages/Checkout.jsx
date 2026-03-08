// src/pages/Checkout.jsx
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import "./Checkout.css";

const CART_KEY = "fts_cart_v1";

function fmtTry(n) {
  return Number(n || 0).toLocaleString("tr-TR") + "₺";
}

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("cart:updated"));
}

export default function Checkout() {
  const nav = useNavigate();
  const [cart, setCart] = useState([]);

  useEffect(() => {
    setCart(getCart());
  }, []);

  const totalQty = useMemo(() => {
    return cart.reduce((sum, x) => sum + Number(x?.qty || 0), 0);
  }, [cart]);

  const total = useMemo(() => {
    return cart.reduce((sum, x) => {
      const price = Number(x?.priceLicensed || x?.priceNormal || 0);
      return sum + price * Number(x?.qty || 0);
    }, 0);
  }, [cart]);

  function completeOrder() {
    alert("Sipariş oluşturuldu (demo)");
    clearCart();
    nav("/dashboard");
  }

  return (
    <div className="checkoutPage">
      <Navbar />

      <div className="checkoutShell">
        <div className="checkoutHead">
          <h1 className="checkoutTitle">Siparişi Tamamla</h1>
          <button className="checkoutBackBtn" type="button" onClick={() => nav("/cart")}>
            Sepete Dön
          </button>
        </div>

        {!cart.length ? (
          <div className="checkoutEmpty">
            <h3>Sepet boş</h3>
            <p>Ödeme yapmadan önce sepete ürün eklemelisin.</p>
            <button className="checkoutBtn" type="button" onClick={() => nav("/products")}>
              Ürünlere Git
            </button>
          </div>
        ) : (
          <div className="checkoutGrid">
            <div className="checkoutList">
              {cart.map((item) => {
                const unitPrice = Number(item?.priceLicensed || item?.priceNormal || 0);
                const lineTotal = unitPrice * Number(item?.qty || 0);

                return (
                  <div key={item.id} className="checkoutItem">
                    <div className="checkoutItemLeft">
                      <div className="checkoutName">{item.name}</div>
                      <div className="checkoutMeta">
                        <span>{item.qty} adet</span>
                        {item.brand ? (
                          <>
                            <span className="dot">•</span>
                            <span>{item.brand}</span>
                          </>
                        ) : null}
                        {item.category ? (
                          <>
                            <span className="dot">•</span>
                            <span>{item.category}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="checkoutItemRight">
                      <div className="checkoutUnitPrice">{fmtTry(unitPrice)}</div>
                      <div className="checkoutPrice">{fmtTry(lineTotal)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="checkoutSummary">
              <h3>Sipariş Özeti</h3>

              <div className="checkoutRow">
                <span>Toplam Ürün</span>
                <b>{totalQty}</b>
              </div>

              <div className="checkoutRow">
                <span>Ara Toplam</span>
                <b>{fmtTry(total)}</b>
              </div>

              <div className="checkoutRow checkoutTotal">
                <span>Genel Toplam</span>
                <b>{fmtTry(total)}</b>
              </div>

              <button className="checkoutBtn" type="button" onClick={completeOrder}>
                Ödemeyi Tamamla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}