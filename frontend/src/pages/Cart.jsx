import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  clearCart,
  decreaseQty,
  getCart,
  getCartTotal,
  increaseQty,
  removeFromCart,
} from "../utils/cart.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Cart.css";

export default function Cart() {
  const { language } = useI18n();

  const texts = useMemo(
    () => ({
      tr: {
        title: "Sepetim",
        subtitle:
          "Sepetindeki ürünleri buradan yönetebilir, adet değiştirebilir ve toplam tutarı görebilirsin.",
        emptyTitle: "Sepetin boş",
        emptyText: "Henüz sepete ürün eklemedin.",
        browseProducts: "Ürünleri İncele",
        noImage: "Görsel Yok",
        unitPrice: "Birim Fiyat",
        rowTotal: "Ara Toplam",
        totalProducts: "Toplam Ürün",
        totalAmount: "Toplam Tutar",
        orderSummary: "Sipariş Özeti",
        checkout: "Siparişi Tamamla",
        clearCart: "Sepeti Temizle",
        remove: "Ürünü Sil",
        backToProducts: "Alışverişe Devam Et",
        currency: "TL",
      },
      en: {
        title: "My Cart",
        subtitle:
          "You can manage your cart here, change quantities, and see the total amount.",
        emptyTitle: "Your cart is empty",
        emptyText: "You have not added any products to your cart yet.",
        browseProducts: "Browse Products",
        noImage: "No Image",
        unitPrice: "Unit Price",
        rowTotal: "Subtotal",
        totalProducts: "Total Items",
        totalAmount: "Total Amount",
        orderSummary: "Order Summary",
        checkout: "Complete Order",
        clearCart: "Clear Cart",
        remove: "Remove Item",
        backToProducts: "Continue Shopping",
        currency: "TL",
      },
    }),
    []
  );

  const t = texts[language] || texts.tr;

  const [cart, setCart] = useState([]);

  const loadCart = () => {
    setCart(getCart());
  };

  useEffect(() => {
    loadCart();

    const handleCartUpdate = () => loadCart();
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  const total = getCartTotal();
  const totalQty = cart.reduce((sum, item) => {
    return sum + Number(item.quantity || 1);
  }, 0);

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <div className="cart-badge">FTSLine</div>
          <h1 className="cart-title">{t.title}</h1>
          <p className="cart-subtitle">{t.subtitle}</p>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h2 className="cart-empty-title">{t.emptyTitle}</h2>
            <p className="cart-empty-text">{t.emptyText}</p>

            <Link to="/products" className="cart-empty-link">
              {t.browseProducts}
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-list">
              {cart.map((item, index) => {
                const unitPrice = Number(
                  item.selectedPrice ?? item.price ?? item.priceNormal ?? 0
                );
                const qty = Number(item.quantity || 1);
                const rowTotal = unitPrice * qty;

                const imageSrc =
                  item.image ||
                  item.images?.[0] ||
                  "https://via.placeholder.com/300x300?text=Ürün";

                return (
                  <div className="cart-item" key={item._id || `${item.name}-${index}`}>
                    {item.image || item.images?.[0] ? (
                      <img
                        src={imageSrc}
                        alt={item.name}
                        className="cart-item-image"
                      />
                    ) : (
                      <div className="cart-item-no-image">{t.noImage}</div>
                    )}

                    <div className="cart-item-info">
                      <h3 className="cart-item-name">{item.name}</h3>

                      {item.brand && (
                        <p className="cart-item-meta">
                          <span>{item.brand}</span>
                        </p>
                      )}

                      <p className="cart-item-text">
                        {t.unitPrice}:{" "}
                        <strong>
                          {formatPrice(unitPrice)} {t.currency}
                        </strong>
                      </p>

                      <p className="cart-item-text">
                        {t.rowTotal}:{" "}
                        <strong>
                          {formatPrice(rowTotal)} {t.currency}
                        </strong>
                      </p>
                    </div>

                    <div className="cart-item-actions">
                      <div className="cart-qty-box">
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => decreaseQty(item._id)}
                        >
                          -
                        </button>

                        <span className="cart-qty-value">{qty}</span>

                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => increaseQty(item._id)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => removeFromCart(item._id)}
                      >
                        {t.remove}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="cart-summary">
              <h2 className="cart-summary-title">{t.orderSummary}</h2>

              <div className="cart-summary-row">
                <span>{t.totalProducts}</span>
                <strong>{totalQty}</strong>
              </div>

              <div className="cart-summary-row">
                <span>{t.totalAmount}</span>
                <strong className="cart-summary-total">
                  {formatPrice(total)} {t.currency}
                </strong>
              </div>

              <Link to="/payment" className="cart-checkout-btn">
                {t.checkout}
              </Link>

              <button
                type="button"
                onClick={clearCart}
                className="cart-clear-btn"
              >
                {t.clearCart}
              </button>

              <Link to="/products" className="cart-back-link">
                {t.backToProducts}
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPrice(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value) || 0);
}