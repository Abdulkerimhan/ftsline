import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api.js";
import { addToCart } from "../utils/cart.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Products.css";

function ProductCard({
  product,
  id,
  isLicensed,
  handleAddToCart,
  productsPage,
  language,
}) {
  const productName =
    language === "en"
      ? product.nameEn || product.name || product.nameTr
      : product.nameTr || product.name || product.nameEn;

  const productCategory =
    language === "en"
      ? product.categoryEn || product.category || product.categoryTr
      : product.categoryTr || product.category || product.categoryEn;

  const productDescription =
    language === "en"
      ? product.descriptionEn || product.description || product.descriptionTr
      : product.descriptionTr || product.description || product.descriptionEn;

  const imageList =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : ["/ftsline.png"];

  const [selectedImage, setSelectedImage] = useState(imageList[0]);

  useEffect(() => {
    setSelectedImage(imageList[0]);
  }, [product]);

  const price = isLicensed
    ? product.priceLicensed || product.priceNormal || product.price
    : product.priceNormal || product.price;

  const normalPrice = product.priceNormal || product.price;
  const licensedPrice = product.priceLicensed || product.price;

  const hasDiscount =
    isLicensed &&
    Number(normalPrice) > 0 &&
    Number(licensedPrice) > 0 &&
    Number(licensedPrice) < Number(normalPrice);

  return (
    <div className="product-card">
      <div className="product-image-wrap">
        <img
          src={selectedImage}
          alt={productName || "FTSLine Ürün"}
          className="product-image"
          onError={(e) => {
            e.currentTarget.src = "/ftsline.png";
          }}
        />

        {isLicensed && (
          <span className="license-badge">
            {language === "en" ? "Licensed Price" : "Lisanslı Fiyat"}
          </span>
        )}

        {product.stock && product.stock !== "Sınırsız" && (
          <span className="stock-badge">Stok: {product.stock}</span>
        )}

        {productCategory && (
          <span className="product-category-badge">{productCategory}</span>
        )}
      </div>

      {imageList.length > 1 && (
        <div className="product-thumbnails">
          {imageList.map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              className={`product-thumb-btn ${
                selectedImage === img ? "active" : ""
              }`}
              onClick={() => setSelectedImage(img)}
            >
              <img
                src={img}
                alt={`${productName || "Ürün"}-${index + 1}`}
                className="product-thumb-image"
                onError={(e) => {
                  e.currentTarget.src = "/ftsline.png";
                }}
              />
            </button>
          ))}
        </div>
      )}

      <div className="product-content">
        <div className="product-meta">
          <h3>{productName || "-"}</h3>
          <p className="product-brand">
            {product.brand || productsPage.noBrand}
          </p>
        </div>

        <p className="product-desc">
          {productDescription || productsPage.noDescription}
        </p>

        <div className="product-price-box">
          <div>
            <div className="product-main-price">
              {price ? `${price} TL` : productsPage.noPrice}
            </div>

            {hasDiscount && (
              <div className="product-save-text">
                {language === "en" ? "Member saving" : "Lisans avantajı"}
              </div>
            )}
          </div>

          {hasDiscount && (
            <div className="product-old-price">{normalPrice} TL</div>
          )}
        </div>

        <div className="product-actions">
          <Link to={`/products/${id}`} className="detail-btn">
            {productsPage.detail}
          </Link>

          <button
            type="button"
            className="cart-btn"
            onClick={() => handleAddToCart(product)}
          >
            {productsPage.addToCart}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const { t, language } = useI18n();

  const common = t?.common || {};
  const productsPage = t?.productsPage || {};

  const text = {
    storeBadge: productsPage.storeBadge || "FTSLine Store",
    title: productsPage.title || "Ürünler",
    subtitle:
      productsPage.subtitle ||
      "Ürünleri incele, filtrele ve sepete ekle.",
    detail: productsPage.detail || "Detay",
    addToCart: productsPage.addToCart || "Sepete Ekle",
    added: productsPage.added || "sepete eklendi",
    loading: productsPage.loading || "Yükleniyor...",
    empty: productsPage.empty || "Ürün bulunamadı",
    error: productsPage.error || "Ürünler alınamadı",
    errorLoad: productsPage.errorLoad || "Ürünler yüklenemedi",
    category: productsPage.category || "Kategori",
    brand: productsPage.brand || "Marka",
    productCount: productsPage.productCount || "ürün listeleniyor",
    all: productsPage.all || "Tümü",
    noBrand: productsPage.noBrand || "-",
    noDescription:
      productsPage.noDescription || "Ürün açıklaması bulunmuyor.",
    noPrice: productsPage.noPrice || "Fiyat yok",
    search: common.search || "Ara",
  };

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const isLicensed = user?.isLicensed || false;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(text.all);
  const [selectedBrand, setSelectedBrand] = useState(text.all);
  const [sort, setSort] = useState("default");

  useEffect(() => {
    setSelectedCategory(text.all);
    setSelectedBrand(text.all);
  }, [text.all]);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        const data = await getProducts();

        if (Array.isArray(data)) {
          setProducts(data);
        } else if (Array.isArray(data?.products)) {
          setProducts(data.products);
        } else {
          setProducts([]);
          setErrorMsg(text.error);
        }
      } catch {
        setProducts([]);
        setErrorMsg(text.errorLoad);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [text.error, text.errorLoad]);

  const getProductName = (product) =>
    language === "en"
      ? product.nameEn || product.name || product.nameTr || ""
      : product.nameTr || product.name || product.nameEn || "";

  const getProductCategory = (product) =>
    language === "en"
      ? product.categoryEn || product.category || product.categoryTr || ""
      : product.categoryTr || product.category || product.categoryEn || "";

  const getProductPrice = (product) => {
    const value = isLicensed
      ? product.priceLicensed || product.priceNormal || product.price
      : product.priceNormal || product.price;

    return Number(value || 0);
  };

  const handleAddToCart = (product) => {
    const productName = getProductName(product);
    addToCart(product, isLicensed);
    setMessage(`${productName} ${text.added}`);
    setTimeout(() => setMessage(""), 1600);
  };

  const categories = useMemo(() => {
    const values = products
      .map((p) => getProductCategory(p)?.trim())
      .filter(Boolean);

    return [text.all, ...new Set(values)];
  }, [products, text.all, language]);

  const brands = useMemo(() => {
    const values = products.map((p) => p.brand?.trim()).filter(Boolean);
    return [text.all, ...new Set(values)];
  }, [products, text.all]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();

      result = result.filter((product) => {
        const productName = getProductName(product).toLowerCase();
        const productCategory = getProductCategory(product).toLowerCase();
        const productBrand = product.brand?.toLowerCase() || "";
        const productDesc =
          language === "en"
            ? product.descriptionEn || product.description || ""
            : product.descriptionTr || product.description || "";

        return (
          productName.includes(q) ||
          productCategory.includes(q) ||
          productBrand.includes(q) ||
          productDesc.toLowerCase().includes(q)
        );
      });
    }

    if (selectedCategory !== text.all) {
      result = result.filter(
        (p) => getProductCategory(p) === selectedCategory
      );
    }

    if (selectedBrand !== text.all) {
      result = result.filter((p) => p.brand === selectedBrand);
    }

    if (sort === "price_asc") {
      result.sort((a, b) => getProductPrice(a) - getProductPrice(b));
    }

    if (sort === "price_desc") {
      result.sort((a, b) => getProductPrice(b) - getProductPrice(a));
    }

    if (sort === "name_asc") {
      result.sort((a, b) =>
        getProductName(a).localeCompare(getProductName(b), "tr")
      );
    }

    if (sort === "newest") {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [
    products,
    search,
    selectedCategory,
    selectedBrand,
    sort,
    text.all,
    language,
    isLicensed,
  ]);

  return (
    <div className="products-page">
      <div className="products-container">
        <div className="products-header">
          <div>
            <span className="products-badge">{text.storeBadge}</span>
            <h1>{text.title}</h1>
            <p className="products-subtitle">{text.subtitle}</p>
          </div>
        </div>

        {message && <div className="products-message">{message}</div>}

        <div className="products-filters">
          <div className="filter-group search-group">
            <label>{text.search}</label>
            <input
              placeholder={text.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>{text.category}</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category, index) => (
                <option key={`${category}-${index}`} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{text.brand}</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              {brands.map((brand, index) => (
                <option key={`${brand}-${index}`} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{language === "en" ? "Sort" : "Sıralama"}</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">
                {language === "en" ? "Default" : "Varsayılan"}
              </option>
              <option value="newest">
                {language === "en" ? "Newest" : "En Yeni"}
              </option>
              <option value="price_asc">
                {language === "en" ? "Price: Low to High" : "Ucuzdan Pahalıya"}
              </option>
              <option value="price_desc">
                {language === "en" ? "Price: High to Low" : "Pahalıdan Ucuza"}
              </option>
              <option value="name_asc">
                {language === "en" ? "Name A-Z" : "İsme Göre A-Z"}
              </option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="products-state">{text.loading}</div>
        ) : errorMsg ? (
          <div className="products-state error">{errorMsg}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="products-state">{text.empty}</div>
        ) : (
          <>
            <div className="products-topbar">
              <div className="products-count">
                {filteredProducts.length} {text.productCount}
              </div>

              {isLicensed && (
                <div className="licensed-info">
                  {language === "en"
                    ? "Licensed account prices are active"
                    : "Lisanslı fiyatlar aktif"}
                </div>
              )}
            </div>

            <div className="products-grid">
              {filteredProducts.map((product, index) => {
                const id = product._id || product.id || index;

                return (
                  <ProductCard
                    key={id}
                    product={product}
                    id={id}
                    isLicensed={isLicensed}
                    handleAddToCart={handleAddToCart}
                    productsPage={text}
                    language={language}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}