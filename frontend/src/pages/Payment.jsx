import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart, clearCart } from "../utils/cart.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Payment.css";

const API = import.meta.env.VITE_API_URL || "/api";

const LICENSE_PLANS = [
  { key: "initial", months: 1, price: 74.99 },
  { key: "annual", months: 12, price: 210 },
  { key: "biennial", months: 24, price: 360 },
];

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
        paymentMethod: "Odeme Yontemi",
        bankTransfer: "Havale / EFT",
        bankIban: "IBAN",
        bankName: "Banka",
        bankAccountName: "Alici Adi",
        bankProof: "Dekont / Aciklama",
        bankProofPlaceholder: "Ornek: EFT referans no veya dekont notu",
        copyIban: "IBAN Kopyala",
        bankUnavailable: "IBAN bilgisi henuz tanimlanmamis. Lutfen diger odeme yontemini secin.",
        copied: "Kopyalandi",
        paymentInfoText:
          "Bu ekranda kart bilgisi alinmaz. Siparis olustuktan sonra odeme durumu admin panelinde Odeme Bekliyor olarak gorunur ve manuel onaylanir.",
        licensePlansTitle: "Lisans Plani",
        licensePlanInfo: "Toplu odemede lisansin sure boyunca aktif kalir. Matrix primleri aylik sirayla islenir, hepsi ayni anda dagitilmaz.",
        initialPlan: "Lisans Bedeli",
        annualPlan: "1 Yillik Bedel",
        biennialPlan: "2 Yillik Bedel",
        licenseDuration: "Sure",
        month: "ay",
        licenseTotal: "Lisans Toplami",
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
        loginRequired: "Lisans siparisi olusturmak icin giris yapmalisiniz.",
        serverError: "Siparis olusturulurken bir hata olustu.",
      },
      en: {
        badge: "Manual Payment",
        title: "Complete Order",
        subtitle: "Enter shipping details. The order will appear in admin as awaiting payment.",
        shippingTitle: "Shipping Information",
        paymentTitle: "Payment Information",
        paymentInfoTitle: "Payment is approved by admin",
        paymentMethod: "Payment Method",
        bankTransfer: "Bank Transfer",
        bankIban: "IBAN",
        bankName: "Bank",
        bankAccountName: "Account Name",
        bankProof: "Receipt / Reference",
        bankProofPlaceholder: "Example: EFT reference number or receipt note",
        copyIban: "Copy IBAN",
        bankUnavailable: "Bank transfer details are not configured yet. Please choose another payment method.",
        copied: "Copied",
        paymentInfoText:
          "Card details are not collected on this screen. After the order is created, its payment status appears as Pending in the admin panel and can be approved manually.",
        licensePlansTitle: "License Plan",
        licensePlanInfo: "When you prepay, your license stays active for the selected period. Matrix bonuses are processed month by month, not all at once.",
        initialPlan: "License Fee",
        annualPlan: "1 Year",
        biennialPlan: "2 Years",
        licenseDuration: "Duration",
        month: "month",
        licenseTotal: "License Total",
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
        loginRequired: "You must log in to create a license order.",
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
  const [selectedLicensePlan, setSelectedLicensePlan] = useState(cart.length ? "" : "initial");
  const isLicenseOrder = cart.length === 0 && selectedLicensePlan;
  const licensePlan = LICENSE_PLANS.find((plan) => plan.key === selectedLicensePlan) || null;

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    city: "",
    district: "",
    address: "",
    note: "",
    agreement: false,
    paymentMethod: "bank_transfer",
    paymentProof: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [guestTrackingCode, setGuestTrackingCode] = useState("");
  const [publicConfig, setPublicConfig] = useState({ bank: { iban: "", accountName: "", bankName: "", enabled: false } });
  const [copyMsg, setCopyMsg] = useState("");

  const subtotal = isLicenseOrder
    ? Number(licensePlan?.price || 0)
    : cart.reduce((sum, item) => {
    const price = Number(
      item.selectedPrice ??
        item.price ??
        (isLicensed ? item.priceLicensed : item.priceNormal) ??
        0
    );

    const qty = Number(item.quantity || 1);
    return sum + price * qty;
  }, 0);

  const shipping = !isLicenseOrder && subtotal > 0 && subtotal < 1000 ? 150 : 0;
  const total = subtotal + shipping;
  const displayCurrency = isLicenseOrder ? "" : t.currency;
  useEffect(() => {
    let alive = true;

    async function loadPublicConfig() {
      try {
        const res = await fetch(`${API}/public/config`);
        const data = await res.json().catch(() => ({}));
        if (alive && data?.bank) {
          setPublicConfig(data);
        }
      } catch {
        if (alive) {
          setPublicConfig({ bank: { iban: "", accountName: "", bankName: "", enabled: false } });
        }
      }
    }

    loadPublicConfig();

    return () => {
      alive = false;
    };
  }, []);

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
    if (!cart.length && !selectedLicensePlan) return t.emptyText;
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
    if (isLicenseOrder && licensePlan) {
      return [
        {
          _id: `license-${licensePlan.key}`,
          productId: null,
          name: getLicensePlanLabel(licensePlan.key),
          image: "",
          selectedPrice: licensePlan.price,
          price: licensePlan.price,
          priceNormal: licensePlan.price,
          priceLicensed: licensePlan.price,
          quantity: 1,
        },
      ];
    }

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

  function getLicensePlanLabel(planKey) {
    if (planKey === "annual") return t.annualPlan;
    if (planKey === "biennial") return t.biennialPlan;
    return t.initialPlan;
  }


  async function copyPaymentValue(value) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyMsg(t.copied);
      setTimeout(() => setCopyMsg(""), 1400);
    } catch {
      setCopyMsg(value);
    }
  }

  function copyBankIban() {
    copyPaymentValue(publicConfig?.bank?.iban || "");
  }

  async function createOrder() {
    const token = sessionStorage.getItem("accessToken");

    if (isLicenseOrder && !token) {
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
      orderType: isLicenseOrder ? "license" : "product",
      licensePlan: isLicenseOrder ? selectedLicensePlan : "",
      paymentMethod: form.paymentMethod,
      paymentProof: form.paymentMethod === "bank_transfer" ? form.paymentProof.trim() : "",
    };

    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    if (!cart.length && !selectedLicensePlan) {
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

      const result = await createOrder();

      clearCart();
      window.dispatchEvent(new Event("cartUpdated"));

      setSuccessMsg(t.success);
      if (!user) {
        const code = result?.trackingCode || result?.order?.trackingCode || "";
        setGuestTrackingCode(code);
        sessionStorage.setItem("lastGuestTrackingCode", code);
        sessionStorage.setItem("lastGuestOrderEmail", form.email.trim().toLowerCase());
      } else {
        setTimeout(() => navigate("/dashboard", { replace: true }), 1000);
      }
    } catch (error) {
      setErrorMsg(error.message || t.serverError);
    } finally {
      setLoading(false);
    }
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

              <div className="payment-methods">
                <label className={`payment-method ${form.paymentMethod === "bank_transfer" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={form.paymentMethod === "bank_transfer"}
                    onChange={handleChange}
                  />
                  <span>{t.bankTransfer}</span>
                </label>

              </div>

              <div className="payment-manual-box">
                <strong>{t.paymentInfoTitle}</strong>
                <p>{t.paymentInfoText}</p>
              </div>

              {form.paymentMethod === "bank_transfer" && (
                <div className="payment-bank-box">
                  {publicConfig?.bank?.iban ? (
                    <>
                      <div className="payment-bank-row">
                        <span>{t.bankName}</span>
                        <strong>{publicConfig.bank.bankName || "-"}</strong>
                      </div>

                      <div className="payment-bank-row">
                        <span>{t.bankAccountName}</span>
                        <strong>{publicConfig.bank.accountName || "-"}</strong>
                      </div>

                      <div className="payment-bank-address">
                        <span>{t.bankIban}</span>
                        <code>{publicConfig.bank.iban}</code>
                        <button type="button" onClick={copyBankIban}>{t.copyIban}</button>
                        {copyMsg && <small>{copyMsg}</small>}
                      </div>

                      <div className="payment-group">
                        <label>{t.bankProof}</label>
                        <input
                          type="text"
                          name="paymentProof"
                          value={form.paymentProof}
                          onChange={handleChange}
                          placeholder={t.bankProofPlaceholder}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="payment-error">{t.bankUnavailable}</div>
                  )}
                </div>
              )}

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
              {guestTrackingCode && (
                <div className="payment-tracking-result">
                  <strong>{language === "tr" ? "Siparis takip kodunuz" : "Your order tracking code"}</strong>
                  <code>{guestTrackingCode}</code>
                  <p>
                    {language === "tr"
                      ? "Bu kodu kaydedin. E-posta adresinizle birlikte siparisinizi takip edebilirsiniz."
                      : "Save this code. You can track the order with your email address."}
                  </p>
                  <Link to="/order-tracking">
                    {language === "tr" ? "Siparisi Takip Et" : "Track Order"}
                  </Link>
                </div>
              )}

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
                {(isLicenseOrder ? normalizeItemsForOrder() : cart).map((item, index) => {
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
                        {formatPrice(itemPrice * qty)} {displayCurrency}
                      </strong>
                    </div>
                  );
                })}
              </div>

              <div className="payment-summary-line">
                <span>{t.subtotal}</span>
                <strong>
                  {formatPrice(subtotal)} {displayCurrency}
                </strong>
              </div>

              <div className="payment-summary-line">
                <span>{t.shipping}</span>
                <strong>{shipping ? `${formatPrice(shipping)} ${t.currency}` : t.free}</strong>
              </div>

              <div className="payment-summary-line total">
                <span>{t.total}</span>
                <strong>
                  {formatPrice(total)} {displayCurrency}
                </strong>
              </div>

              {cart.length === 0 && (
                <div className="payment-summary-license">
                  <h3>{t.licensePlansTitle}</h3>
                  <p className="payment-license-info">{t.licensePlanInfo}</p>

                  <div className="payment-license-plans">
                    {LICENSE_PLANS.map((plan) => (
                      <label
                        key={plan.key}
                        className={`payment-license-plan ${selectedLicensePlan === plan.key ? "active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="licensePlan"
                          value={plan.key}
                          checked={selectedLicensePlan === plan.key}
                          onChange={(event) => setSelectedLicensePlan(event.target.value)}
                        />
                        <span>{getLicensePlanLabel(plan.key)}</span>
                        <strong>{plan.price}</strong>
                        <small>
                          {t.licenseDuration}: {plan.months} {t.month}
                        </small>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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

