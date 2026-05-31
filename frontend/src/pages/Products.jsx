import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api.js";
import { addToCart } from "../utils/cart.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Products.css";

function formatPrice(value, language) {
  const locale = language === "en" ? "en-US" : "tr-TR";
  return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

function pickByLanguage(product, language, base) {
  if (language === "en") {
    return product[`${base}En`] || product[base] || product[`${base}Tr`] || "";
  }

  return product[`${base}Tr`] || product[base] || product[`${base}En`] || "";
}

function ProductCard({ product, id, isLicensed, handleAddToCart, productsPage, language }) {
  const productName = pickByLanguage(product, language, "name");
  const productCategory = pickByLanguage(product, language, "category");
  const productDescription = pickByLanguage(product, language, "description");

  const imageList =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : ["/ftsline.png"];

  const [selectedImage, setSelectedImage] = useState(imageList[0]);

  useEffect(() => {
    setSelectedImage(imageList[0]);
  }, [imageList[0], product._id]);

  const normalPrice = Number(product.priceNormal || product.price || 0);
  const licensedPrice = Number(product.priceLicensed || product.price || 0);
  const shownPrice = isLicensed && licensedPrice > 0 ? licensedPrice : normalPrice;
  const hasDiscount = isLicensed && licensedPrice > 0 && normalPrice > 0 && licensedPrice < normalPrice;
  const savings = hasDiscount ? normalPrice - licensedPrice : 0;
  const stockText = product.stock || productsPage.unlimited;

  return (
    <article className="product-card">
      <div className="product-media">
        <Link to={`/products/${id}`} className="product-image-link" aria-label={productName}>
          <img
            src={selectedImage}
            alt={productName || "FTSLine product"}
            className="product-image"
            onError={(e) => {
              e.currentTarget.src = "/ftsline.png";
            }}
          />
        </Link>

        <div className="product-badge-row">
          {productCategory && <span className="product-pill category">{productCategory}</span>}
          {isLicensed && <span className="product-pill licensed">{productsPage.licensedPrice}</span>}
        </div>

        {product.stock && product.stock !== productsPage.unlimited && (
          <span className="product-stock">{productsPage.stock}: {stockText}</span>
        )}
      </div>

      {imageList.length > 1 && (
        <div className="product-thumbnails" aria-label={productsPage.gallery}>
          {imageList.slice(0, 5).map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              className={`product-thumb-btn ${selectedImage === img ? "active" : ""}`}
              onClick={() => setSelectedImage(img)}
              aria-label={`${productsPage.image} ${index + 1}`}
            >
              <img
                src={img}
                alt=""
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
        <div className="product-heading-row">
          <div>
            <h3>{productName || productsPage.untitled}</h3>
            <p className="product-brand">{product.brand || productsPage.noBrand}</p>
          </div>
        </div>

        <p className="product-desc">{productDescription || productsPage.noDescription}</p>

        <div className="product-price-panel">
          <div>
            <span className="product-price-label">{isLicensed ? productsPage.yourPrice : productsPage.price}</span>
            <div className="product-main-price">
              {shownPrice > 0 ? `${formatPrice(shownPrice, language)} TL` : productsPage.noPrice}
            </div>
          </div>

          {hasDiscount && (
            <div className="product-savings">
              <span>{productsPage.saving}</span>
              <strong>{formatPrice(savings, language)} TL</strong>
            </div>
          )}

          {hasDiscount && <div className="product-old-price">{formatPrice(normalPrice, language)} TL</div>}
        </div>

        <div className="product-actions">
          <Link to={`/products/${id}`} className="detail-btn">
            {productsPage.detail}
          </Link>

          <button type="button" className="cart-btn" onClick={() => handleAddToCart(product)}>
            {productsPage.addToCart}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Products() {
  const { t, language } = useI18n();

  const common = t?.common || {};
  const productsPageRaw = t?.productsPage || {};

  const text = {
    storeBadge: productsPageRaw.storeBadge || (language === "en" ? "FTSLine Store" : "FTSLine Magaza"),
    title: productsPageRaw.title || (language === "en" ? "Products" : "Urunler"),
    subtitle:
      productsPageRaw.subtitle ||
      (language === "en"
        ? "Browse products, compare licensed prices and add items to your cart."
        : "Urunleri incele, lisansli fiyatlari karsilastir ve sepete ekle."),
    detail: productsPageRaw.detail || (language === "en" ? "View" : "Incele"),
    addToCart: productsPageRaw.addToCart || (language === "en" ? "Add to Cart" : "Sepete Ekle"),
    added: productsPageRaw.added || (language === "en" ? "added to cart" : "sepete eklendi"),
    loading: productsPageRaw.loading || (language === "en" ? "Loading products..." : "Urunler yukleniyor..."),
    empty: productsPageRaw.empty || (language === "en" ? "No products found" : "Urun bulunamadi"),
    error: productsPageRaw.error || (language === "en" ? "Products could not be loaded" : "Urunler alinamadi"),
    errorLoad: productsPageRaw.errorLoad || (language === "en" ? "Products could not be loaded" : "Urunler yuklenemedi"),
    category: productsPageRaw.category || (language === "en" ? "Category" : "Kategori"),
    brand: productsPageRaw.brand || (language === "en" ? "Brand" : "Marka"),
    productCount: productsPageRaw.productCount || (language === "en" ? "products listed" : "urun listeleniyor"),
    all: productsPageRaw.all || (language === "en" ? "All" : "Tumu"),
    noBrand: productsPageRaw.noBrand || "FTSLine",
    noDescription:
      productsPageRaw.noDescription ||
      (language === "en" ? "No product description has been added yet." : "Urun aciklamasi henuz eklenmemis."),
    noPrice: productsPageRaw.noPrice || (language === "en" ? "No price" : "Fiyat yok"),
    search: common.search || (language === "en" ? "Search" : "Ara"),
    searchPlaceholder: language === "en" ? "Search product, brand or category" : "Urun, marka veya kategori ara",
    sort: language === "en" ? "Sort" : "Siralama",
    defaultSort: language === "en" ? "Featured" : "One Cikan",
    newest: language === "en" ? "Newest" : "En Yeni",
    priceAsc: language === "en" ? "Price: Low to High" : "Ucuzdan Pahaliya",
    priceDesc: language === "en" ? "Price: High to Low" : "Pahalidan Ucuza",
    nameAsc: language === "en" ? "Name A-Z" : "Isme Gore A-Z",
    licensedPrice: language === "en" ? "Licensed" : "Lisansli",
    licensedActive: language === "en" ? "Licensed account prices are active" : "Lisansli fiyatlar aktif",
    standardPrices: language === "en" ? "Standard prices" : "Standart fiyatlar",
    price: language === "en" ? "Price" : "Fiyat",
    yourPrice: language === "en" ? "Your Price" : "Sana Ozel",
    saving: language === "en" ? "Saving" : "Avantaj",
    unlimited: language === "en" ? "Unlimited" : "Sinirsiz",
    stock: language === "en" ? "Stock" : "Stok",
    gallery: language === "en" ? "Product gallery" : "Urun galerisi",
    image: language === "en" ? "Image" : "Gorsel",
    untitled: language === "en" ? "Untitled product" : "Isimsiz urun",
    clear: language === "en" ? "Clear" : "Temizle",
  };

  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("user") || "null");
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

  const getProductName = (product) => pickByLanguage(product, language, "name");
  const getProductCategory = (product) => pickByLanguage(product, language, "category");
  const getProductDescription = (product) => pickByLanguage(product, language, "description");

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
    const values = products.map((p) => getProductCategory(p)?.trim()).filter(Boolean);
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
        const productDesc = getProductDescription(product).toLowerCase();

        return (
          productName.includes(q) ||
          productCategory.includes(q) ||
          productBrand.includes(q) ||
          productDesc.includes(q)
        );
      });
    }

    if (selectedCategory !== text.all) {
      result = result.filter((p) => getProductCategory(p) === selectedCategory);
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
      result.sort((a, b) => getProductName(a).localeCompare(getProductName(b), language === "en" ? "en" : "tr"));
    }

    if (sort === "newest") {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [products, search, selectedCategory, selectedBrand, sort, text.all, language, isLicensed]);

  const hasActiveFilters = search.trim() || selectedCategory !== text.all || selectedBrand !== text.all || sort !== "default";

  function clearFilters() {
    setSearch("");
    setSelectedCategory(text.all);
    setSelectedBrand(text.all);
    setSort("default");
  }

  return (
    <main className="products-page">
      <div className="products-container">
        <section className="products-hero">
          <div className="products-hero-copy">
            <span className="products-badge">{text.storeBadge}</span>
            <h1>{text.title}</h1>
            <p className="products-subtitle">{text.subtitle}</p>
          </div>

          <div className="products-hero-panel" aria-label={text.productCount}>
            <span>{isLicensed ? text.licensedActive : text.standardPrices}</span>
            <strong>{products.length}</strong>
            <small>{text.productCount}</small>
          </div>
        </section>

        {message && <div className="products-message">{message}</div>}

        <section className="products-toolbar" aria-label="Product filters">
          <div className="filter-group search-group">
            <label>{text.search}</label>
            <input
              placeholder={text.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>{text.category}</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {categories.map((category, index) => (
                <option key={`${category}-${index}`} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{text.brand}</label>
            <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
              {brands.map((brand, index) => (
                <option key={`${brand}-${index}`} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{text.sort}</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">{text.defaultSort}</option>
              <option value="newest">{text.newest}</option>
              <option value="price_asc">{text.priceAsc}</option>
              <option value="price_desc">{text.priceDesc}</option>
              <option value="name_asc">{text.nameAsc}</option>
            </select>
          </div>
        </section>

        <div className="products-result-bar">
          <div>
            <strong>{filteredProducts.length}</strong> {text.productCount}
          </div>

          {hasActiveFilters && (
            <button type="button" className="products-clear" onClick={clearFilters}>
              {text.clear}
            </button>
          )}
        </div>

        {loading ? (
          <div className="products-state">{text.loading}</div>
        ) : errorMsg ? (
          <div className="products-state error">{errorMsg}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="products-state empty">
            <strong>{text.empty}</strong>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters}>
                {text.clear}
              </button>
            )}
          </div>
        ) : (
          <section className="products-grid" aria-label={text.title}>
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
          </section>
        )}
      </div>
    </main>
  );
}