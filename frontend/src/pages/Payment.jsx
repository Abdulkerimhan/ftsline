import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart, clearCart } from "../utils/cart.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Payment.css";

const API = import.meta.env.VITE_API_URL || "/api";

export default function Payment() {
  const navigate = useNavigate();
  const { language } = useI18n();

  const texts = useMemo(
    () => ({
      tr: {
        badge: "Manuel Odeme",
        title: "Siparisi Tamamla",
        subtitle: "Teslimat bilgilerini gir. Siparisin odeme bekliyor olarak admin paneline duser.",
        shippingTitle: "Teslimat Bilgileri",
        paymentTitle: "Odeme Bilgisi",
        paymentInfoTitle: "Odeme onayi admin tarafindan yapilir",
        paymentInfoText:
          "Bu ekranda kart bilgisi alinmaz. Siparis olustuktan sonra odeme durumu admin panelinde Odeme Bekliyor olarak gorunur ve manuel onaylanir.",
        summaryTitle: "Siparis Ozeti",
        fullName: "Ad Soyad",
        email: "E-posta",
        phone: "Telefon",
        city: "Sehir",
        district: "Ilce",
        address: "Adres",
        note: "Siparis Notu",
        agreement:
          "Mesafeli satis sozlesmesini ve manuel odeme kosullarini kabul ediyorum.",
        completePayment: "Siparisi Olustur",
        processing: "Siparis Olusturuluyor...",
        backToCart: "Sepete Geri Don",
        emptyTitle: "Sepetin bos",
        emptyText: "Siparis olusturmak icin once sepetine urun eklemelisin.",
        goCart: "Sepete Git",
        quantity: "Adet",
        subtotal: "Ara Toplam",
        shipping: "Kargo",
        free: "Ucretsiz",
        total: "Toplam",
        success: "Siparis olusturuldu. Odeme onayi bekliyor.",
        currency: "TL",
        requiredName: "Ad soyad zorunludur.",
        requiredEmail: "E-posta zorunludur.",
        requiredPhone: "Telefon zorunludur.",
        requiredCity: "Sehir zorunludur.",
        requiredDistrict: "Ilce zorunludur.",
        requiredAddress: "Adres zorunludur.",
        agreementRequired: "Satis sozlesmesini onaylamalisiniz.",
        loginRequired: "Siparis olusturmak icin giris yapmalisiniz.",
        serverError: "Siparis olusturulurken bir hata olustu.",
      },
      en: {
        badge: "Manual Payment",
        title: "Complete Order",
        subtitle: "Enter shipping details. The order will appear in admin as awaiting payment.",
        shippingTitle: "Shipping Information",
        paymentTitle: "Payment Information",
        paymentInfoTitle: "Payment is approved by admin",
        paymentInfoText:
          "Card details are not collected on this screen. After the order is created, its payment status appears as Pending in the admin panel and can be approved manually.",
        summaryTitle: "Order Summary",
        fullName: "Full Name",
        email: "Email",
        phone: "Phone",
        city: "City",
        district: "District",
        address: "Address",
        note: "Order Note",
        agreement: "I accept the distance sales agreement and manual payment terms.",
        completePayment: "Create Order",
        processing: "Creating Order...",
        backToCart: "Back to Cart",
        emptyTitle: "Your cart is empty",
        emptyText: "Add products to your cart before creating an order.",
        goCart: "Go to Cart",
        quantity: "Qty",
        subtotal: "Subtotal",
        shipping: "Shipping",
        free: "Free",
        total: "Total",
        success: "Order created. Payment approval is pending.",
        currency: "TL",
        requiredName: "Full name is required.",
        requiredEmail: "Email is required.",
        requiredPhone: "Phone is required.",
        requiredCity: "City is required.",
        requiredDistrict: "District is required.",
        requiredAddress: "Address is required.",
        agreementRequired: "You must accept the agreement.",
        loginRequired: "You must log in to create an order.",
        serverError: "An error occurred while creating the order.",
      },
    }),
    []
  );

  const t = texts[language] || texts.tr;

  function getCurrentUser() {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }

  const user = getCurrentUser();
  const cart = getCart();
  const isLicensed = user?.isLicensed || false;

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    city: "",
    district: "",
    address: "",
    note: "",
    agreement: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const subtotal = cart.reduce((sum, item) => {
    const price = Number(
      item.selectedPrice ??
        item.price ??
        (isLicensed ? item.priceLicensed : item.priceNormal) ??
        0
    );

    const qty = Number(item.quantity || 1);
    return sum + price * qty;
  }, 0);

  const shipping = 0;
  const total = subtotal + shipping;

  function formatPrice(value) {
    return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US").format(
      Number(value) || 0
    );
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function validateForm() {
    if (!form.fullName.trim()) return t.requiredName;
    if (!form.email.trim()) return t.requiredEmail;
    if (!form.phone.trim()) return t.requiredPhone;
    if (!form.city.trim()) return t.requiredCity;
    if (!form.district.trim()) return t.requiredDistrict;
    if (!form.address.trim()) return t.requiredAddress;
    if (!form.agreement) return t.agreementRequired;

    return "";
  }

  function normalizeItemsForOrder() {
    return cart.map((item) => {
      const price = Number(
        item.selectedPrice ??
          item.price ??
          (isLicensed ? item.priceLicensed : item.priceNormal) ??
          0
      );

      return {
        _id: item._id,
        productId: item.productId || item._id || null,
        name: item.name,
        image: item.image || item.images?.[0] || "",
        images: item.images || [],
        selectedPrice: price,
        price,
        priceNormal: item.priceNormal,
        priceLicensed: item.priceLicensed,
        quantity: Number(item.quantity || 1),
      };
    });
  }

  async function createOrder() {
    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      throw new Error(t.loginRequired);
    }

    const payload = {
      items: normalizeItemsForOrder(),
      shippingInfo: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        district: form.district,
        address: form.address,
        note: form.note,
      },
      subtotal,
      shippingPrice: shipping,
      total,
      paymentMethod: "bank_transfer",
    };

    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || t.serverError);
    }

    return data;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!cart.length) {
      navigate("/cart", { replace: true });
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setLoading(true);

      await createOrder();

      clearCart();
      window.dispatchEvent(new Event("cartUpdated"));

      setSuccessMsg(t.success);

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1000);
    } catch (error) {
      setErrorMsg(error.message || t.serverError);
    } finally {
      setLoading(false);
    }
  }

  if (!cart.length) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="payment-empty">
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptyText}</p>

            <Link to="/cart" className="payment-back-btn">
              {t.goCart}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <span className="payment-badge">{t.badge}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <div className="payment-grid">
          <form className="payment-form" onSubmit={handleSubmit}>
            <div className="payment-card">
              <h2>{t.shippingTitle}</h2>

              <div className="payment-row">
                <div className="payment-group">
                  <label>{t.fullName}</label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                  />
                </div>

                <div className="payment-group">
                  <label>{t.email}</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="payment-row">
                <div className="payment-group">
                  <label>{t.phone}</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="payment-group">
                  <label>{t.city}</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="payment-row">
                <div className="payment-group">
                  <label>{t.district}</label>
                  <input
                    type="text"
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                  />
                </div>

                <div className="payment-group">
                  <label>{t.address}</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="payment-group">
                <label>{t.note}</label>
                <textarea
                  name="note"
                  rows="3"
                  value={form.note}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="payment-card">
              <h2>{t.paymentTitle}</h2>

              <div className="payment-manual-box">
                <strong>{t.paymentInfoTitle}</strong>
                <p>{t.paymentInfoText}</p>
              </div>

              <label className="payment-checkbox">
                <input
                  type="checkbox"
                  name="agreement"
                  checked={form.agreement}
                  onChange={handleChange}
                />
                <span>{t.agreement}</span>
              </label>

              {errorMsg && <div className="payment-error">{errorMsg}</div>}
              {successMsg && <div className="payment-success">{successMsg}</div>}

              <button
                type="submit"
                className="payment-submit-btn"
                disabled={loading}
              >
                {loading ? t.processing : t.completePayment}
              </button>
            </div>
          </form>

          <aside className="payment-summary">
            <div className="payment-summary-card">
              <h2>{t.summaryTitle}</h2>

              <div className="payment-summary-list">
                {cart.map((item, index) => {
                  const itemPrice = Number(
                    item.selectedPrice ??
                      item.price ??
                      (isLicensed ? item.priceLicensed : item.priceNormal) ??
                      0
                  );

                  const qty = Number(item.quantity || 1);

                  return (
                    <div
                      className="payment-summary-item"
                      key={item._id || index}
                    >
                      <div className="payment-summary-left">
                        <img
                          src={
                            item.image ||
                            item.images?.[0] ||
                            "https://via.placeholder.com/80x80?text=Urun"
                          }
                          alt={item.name}
                        />

                        <div>
                          <h4>{item.name}</h4>
                          <p>
                            {t.quantity}: {qty}
                          </p>
                        </div>
                      </div>

                      <strong>
                        {formatPrice(itemPrice * qty)} {t.currency}
                      </strong>
                    </div>
                  );
                })}
              </div>

              <div className="payment-summary-line">
                <span>{t.subtotal}</span>
                <strong>
                  {formatPrice(subtotal)} {t.currency}
                </strong>
              </div>

              <div className="payment-summary-line">
                <span>{t.shipping}</span>
                <strong>{t.free}</strong>
              </div>

              <div className="payment-summary-line total">
                <span>{t.total}</span>
                <strong>
                  {formatPrice(total)} {t.currency}
                </strong>
              </div>

              <Link to="/cart" className="payment-cart-link">
                {t.backToCart}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}