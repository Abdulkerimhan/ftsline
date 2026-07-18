import { useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./OrderTracking.css";

const API = import.meta.env.VITE_API_URL || "/api";

const statusLabels = {
  tr: {
    pending: "Siparis alindi",
    preparing: "Hazirlaniyor",
    shipped: "Kargoya verildi",
    completed: "Tamamlandi",
    cancelled: "Iptal edildi",
  },
  en: {
    pending: "Order received",
    preparing: "Preparing",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled",
  },
};

const paymentLabels = {
  tr: { pending: "Odeme bekliyor", paid: "Odendi", failed: "Basarisiz", refunded: "Iade edildi" },
  en: { pending: "Payment pending", paid: "Paid", failed: "Failed", refunded: "Refunded" },
};

export default function OrderTracking() {
  const { language } = useI18n();
  const isTr = language === "tr";
  const [trackingCode, setTrackingCode] = useState(
    () => sessionStorage.getItem("lastGuestTrackingCode") || ""
  );
  const [email, setEmail] = useState(
    () => sessionStorage.getItem("lastGuestOrderEmail") || ""
  );
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setOrder(null);

    if (!trackingCode.trim() || !email.trim()) {
      setError(isTr ? "Takip kodu ve e-posta zorunludur." : "Tracking code and email are required.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API}/orders/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode, email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || (isTr ? "Siparis bulunamadi." : "Order not found."));
      }

      setOrder(data);
    } catch (requestError) {
      setError(requestError.message || (isTr ? "Siparis bulunamadi." : "Order not found."));
    } finally {
      setLoading(false);
    }
  }

  const statusText = order
    ? statusLabels[isTr ? "tr" : "en"][order.status] || order.status
    : "";
  const paymentText = order
    ? paymentLabels[isTr ? "tr" : "en"][order.paymentStatus] || order.paymentStatus
    : "";

  return (
    <main className="tracking-page">
      <section className="tracking-card">
        <span className="tracking-badge">FTSLine</span>
        <h1>{isTr ? "Siparis Takip" : "Track Order"}</h1>
        <p>
          {isTr
            ? "Siparis olustururken verilen takip kodunu ve kullandiginiz e-posta adresini yazin."
            : "Enter the tracking code and email address used when placing the order."}
        </p>

        <form onSubmit={handleSubmit} className="tracking-form">
          <label>
            {isTr ? "Takip Kodu" : "Tracking Code"}
            <input
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value.toUpperCase())}
              placeholder="FTS-XXXXXXXXXX"
              autoComplete="off"
            />
          </label>
          <label>
            {isTr ? "E-posta" : "Email"}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ornek@email.com"
              autoComplete="email"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? (isTr ? "Araniyor..." : "Searching...") : (isTr ? "Siparisi Bul" : "Find Order")}
          </button>
        </form>

        {error && <div className="tracking-error">{error}</div>}

        {order && (
          <div className="tracking-result">
            <div className="tracking-result-head">
              <div>
                <small>{isTr ? "Takip Kodu" : "Tracking Code"}</small>
                <strong>{order.trackingCode}</strong>
              </div>
              <span className={`tracking-status status-${order.status}`}>{statusText}</span>
            </div>

            <div className="tracking-meta">
              <div><small>{isTr ? "Siparis Tarihi" : "Order Date"}</small><strong>{new Date(order.createdAt).toLocaleDateString(isTr ? "tr-TR" : "en-US")}</strong></div>
              <div><small>{isTr ? "Odeme" : "Payment"}</small><strong>{paymentText}</strong></div>
              <div><small>{isTr ? "Teslimat Bolgesi" : "Delivery Area"}</small><strong>{order.shippingInfo?.district}, {order.shippingInfo?.city}</strong></div>
            </div>

            <div className="tracking-items">
              {order.items?.map((item, index) => (
                <div className="tracking-item" key={`${item.productId || item.name}-${index}`}>
                  {item.image ? <img src={item.image} alt={item.name} /> : <div className="tracking-image-empty">FTS</div>}
                  <div><strong>{item.name}</strong><small>{isTr ? "Adet" : "Qty"}: {item.quantity}</small></div>
                  <b>{Number(item.price || 0).toLocaleString(isTr ? "tr-TR" : "en-US")} {order.orderType === "license" ? "USDT" : "TL"}</b>
                </div>
              ))}
            </div>

            <div className="tracking-total">
              <span>{isTr ? "Toplam" : "Total"}</span>
              <strong>{Number(order.total || 0).toLocaleString(isTr ? "tr-TR" : "en-US")} {order.orderType === "license" ? "USDT" : "TL"}</strong>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
