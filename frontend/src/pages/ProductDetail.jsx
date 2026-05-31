import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProduct } from "../api.js";
import { addToCart } from "../utils/cart.js";
import { useI18n } from "../i18n/I18nContext.jsx";

const text = {
  tr: { loading: "Urun yukleniyor...", notFound: "Urun bulunamadi", loadError: "Urun yuklenirken hata olustu", back: "Urunlere Don", noImage: "Gorsel Yok", noDesc: "Bu urun icin aciklama eklenmemis.", normalPrice: "Normal Fiyat", licensedPrice: "Lisansli Fiyat", specialPrice: "Sana ozel fiyat", shownPrice: "Gosterilen fiyat", licenseActive: "Lisans avantaji aktif", brand: "Marka", category: "Kategori", userType: "Kullanici Tipi", licensed: "Lisansli", standard: "Standart", addToCart: "Sepete Ekle", added: "sepete eklendi", currency: "TL" },
  en: { loading: "Loading product...", notFound: "Product not found", loadError: "An error occurred while loading the product", back: "Back to Products", noImage: "No Image", noDesc: "No description has been added for this product.", normalPrice: "Normal Price", licensedPrice: "Licensed Price", specialPrice: "Your special price", shownPrice: "Displayed price", licenseActive: "License advantage active", brand: "Brand", category: "Category", userType: "User Type", licensed: "Licensed", standard: "Standard", addToCart: "Add to Cart", added: "added to cart", currency: "TL" },
};

export default function ProductDetail() {
  const { id } = useParams();
  const { language } = useI18n();
  const tt = text[language] || text.tr;

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const isLicensed = user?.isLicensed || false;
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadProduct() {
      setLoading(true);
      setErrorMsg("");
      try {
        const data = await getProduct(id);
        if (!alive) return;
        if (data && typeof data === "object") {
          setProduct(data);
          setActiveImage(0);
        } else {
          setErrorMsg(tt.notFound);
        }
      } catch (error) {
        console.error("Product detail error:", error);
        if (alive) setErrorMsg(tt.loadError);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProduct();
    return () => {
      alive = false;
    };
  }, [id, tt.loadError, tt.notFound]);

  const images = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    if (product.image) return [product.image];
    return [];
  }, [product]);

  const normalPrice = Number(product?.priceNormal) || 0;
  const licensedPrice = Number(product?.priceLicensed) || 0;
  const displayPrice = isLicensed && licensedPrice > 0 ? licensedPrice : normalPrice;
  const hasDiscount = isLicensed && licensedPrice > 0 && normalPrice > 0 && licensedPrice < normalPrice;

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, isLicensed);
    setMessage(`${product.name} ${tt.added}`);
    setTimeout(() => setMessage(""), 1600);
  };

  if (loading) {
    return <PageBox><div style={boxStyle}>{tt.loading}</div></PageBox>;
  }

  if (errorMsg || !product) {
    return (
      <PageBox>
        <div style={{ ...boxStyle, background: "#fff4f4", color: "#b42318", border: "1px solid #f1c4c4" }}>
          <p style={{ marginTop: 0 }}>{errorMsg || tt.notFound}</p>
          <Link to="/products" style={backLinkStyle}>{tt.back}</Link>
        </div>
      </PageBox>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={containerStyle}>
        <div style={{ marginBottom: "20px" }}>
          <Link to="/products" style={backLinkStyle}>← {tt.back}</Link>
        </div>

        {message && <div style={successBox}>{message}</div>}

        <div style={detailGrid}>
          <div style={cardStyle}>
            <div style={imageFrame}>
              {images.length > 0 ? (
                <img src={images[activeImage]} alt={product.name} style={mainImageStyle} />
              ) : (
                <div style={emptyImageStyle}>{tt.noImage}</div>
              )}
            </div>

            {images.length > 1 && (
              <div style={thumbGrid}>
                {images.map((img, index) => (
                  <button key={img} onClick={() => setActiveImage(index)} style={{ ...thumbButton, border: activeImage === index ? "2px solid #0f3fae" : "1px solid #d8e1f0" }}>
                    <img src={img} alt={`${product.name} ${index + 1}`} style={thumbImage} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
              {product.category && <Badge text={product.category} />}
              {product.brand && <Badge text={product.brand} />}
            </div>

            <h1 style={productTitle}>{product.name}</h1>
            <p style={productDesc}>{product.description || tt.noDesc}</p>

            <div style={priceBox}>
              <PriceRow label={tt.normalPrice} value={`${formatPrice(normalPrice)} ${tt.currency}`} />
              <PriceRow label={tt.licensedPrice} value={`${formatPrice(licensedPrice)} ${tt.currency}`} />
              <div style={priceTotalRow}>
                <div>
                  <div style={{ fontSize: "13px", color: isLicensed ? "#167344" : "#5d6c88", fontWeight: "800", marginBottom: "4px" }}>
                    {isLicensed ? tt.specialPrice : tt.shownPrice}
                  </div>
                  {hasDiscount && <div style={licensePill}>{tt.licenseActive}</div>}
                </div>
                <strong style={displayPriceStyle}>{formatPrice(displayPrice)} {tt.currency}</strong>
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
              <InfoBox title={tt.brand} value={product.brand || "-"} />
              <InfoBox title={tt.category} value={product.category || "-"} />
              <InfoBox title={tt.userType} value={isLicensed ? tt.licensed : tt.standard} />
            </div>

            <button onClick={handleAddToCart} style={addButton}>{tt.addToCart}</button>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 980px) { .product-detail-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function PageBox({ children }) {
  return <div style={pageWrap}><div style={containerStyle}>{children}</div></div>;
}

function PriceRow({ label, value }) {
  return <div style={priceRow}><span>{label}</span><strong style={{ color: "#0d1b3d" }}>{value}</strong></div>;
}

function InfoBox({ title, value }) {
  return <div style={infoBox}><div style={infoTitle}>{title}</div><div style={infoValue}>{value}</div></div>;
}

function Badge({ text }) {
  return <span style={badgeStyle}>{text}</span>;
}

function formatPrice(value) {
  return new Intl.NumberFormat("tr-TR").format(Number(value) || 0);
}

const pageWrap = { minHeight: "100vh", background: "linear-gradient(180deg, #f7faff 0%, #ffffff 45%, #f6f9ff 100%)" };
const containerStyle = { maxWidth: "1280px", margin: "0 auto", padding: "36px 22px 70px" };
const boxStyle = { background: "#fff", borderRadius: "24px", padding: "24px", border: "1px solid rgba(15,63,174,0.08)", boxShadow: "0 14px 28px rgba(12,33,84,0.06)" };
const cardStyle = { background: "#fff", borderRadius: "28px", padding: "24px", border: "1px solid rgba(15,63,174,0.08)", boxShadow: "0 16px 35px rgba(12,33,84,0.06)", height: "fit-content" };
const backLinkStyle = { textDecoration: "none", color: "#0f3fae", fontWeight: "800" };
const successBox = { marginBottom: "18px", background: "#eaf8ef", color: "#167344", border: "1px solid #bfe7cd", borderRadius: "16px", padding: "14px 18px", fontWeight: "700" };
const detailGrid = { display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "26px" };
const imageFrame = { background: "linear-gradient(180deg, #f4f8ff, #eef3fb)", borderRadius: "22px", padding: "14px", marginBottom: "14px" };
const mainImageStyle = { width: "100%", height: "480px", objectFit: "cover", borderRadius: "18px", display: "block", background: "#fff" };
const emptyImageStyle = { width: "100%", height: "480px", borderRadius: "18px", background: "#dde6f5", color: "#51617f", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" };
const thumbGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))", gap: "10px" };
const thumbButton = { padding: 0, borderRadius: "14px", overflow: "hidden", cursor: "pointer", background: "#fff" };
const thumbImage = { width: "100%", height: "84px", objectFit: "cover", display: "block" };
const productTitle = { fontSize: "clamp(28px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 14px", color: "#0d1b3d", fontWeight: "900" };
const productDesc = { color: "#62708d", fontSize: "16px", lineHeight: 1.8, marginBottom: "20px" };
const priceBox = { background: "#f8fbff", border: "1px solid rgba(15,63,174,0.07)", borderRadius: "20px", padding: "18px", marginBottom: "18px" };
const priceRow = { display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "8px", fontSize: "14px", color: "#5d6c88" };
const priceTotalRow = { marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(15,63,174,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" };
const licensePill = { display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: "999px", background: "#eaf8ef", color: "#167344", fontSize: "12px", fontWeight: "800" };
const displayPriceStyle = { fontSize: "34px", color: "#0f3fae", fontWeight: "900" };
const infoBox = { background: "#fff", border: "1px solid #e4ebf7", borderRadius: "16px", padding: "14px 16px" };
const infoTitle = { fontSize: "12px", color: "#6a7892", fontWeight: "800", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" };
const infoValue = { color: "#0d1b3d", fontWeight: "800", fontSize: "16px" };
const badgeStyle = { display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: "999px", background: "#eef4ff", color: "#0d1b3d", fontSize: "12px", fontWeight: "800" };
const addButton = { width: "100%", padding: "15px 18px", border: "none", borderRadius: "16px", background: "linear-gradient(135deg, #0f3fae, #1e63ff)", color: "#fff", fontWeight: "900", fontSize: "16px", cursor: "pointer", boxShadow: "0 14px 24px rgba(30,99,255,0.20)" };
