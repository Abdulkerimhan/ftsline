import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getCartCount } from "../utils/cart.js";
import { useI18n } from "../i18n/I18nContext.jsx";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, changeLanguage } = useI18n();

  const common = t?.common || {};

  const [token, setToken] = useState(sessionStorage.getItem("accessToken"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [cartCount, setCartCount] = useState(getCartCount());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const syncAuth = () => {
    setToken(sessionStorage.getItem("accessToken"));
    try {
      setUser(JSON.parse(sessionStorage.getItem("user") || "null"));
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const updateCart = () => setCartCount(getCartCount());

    window.addEventListener("cartUpdated", updateCart);
    window.addEventListener("authChanged", syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener("cartUpdated", updateCart);
      window.removeEventListener("authChanged", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isAdmin = useMemo(() => {
    return user?.role === "admin" || user?.role === "superadmin";
  }, [user]);

  const isLoggedIn = !!token && !!user;

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login");
  };

  const navLinkStyle = (path) => ({
    textDecoration: "none",
    color: location.pathname === path ? "#0f3fae" : "#1a1a1a",
    fontWeight: location.pathname === path ? "700" : "500",
    fontSize: "15px",
    padding: "10px 14px",
    borderRadius: "12px",
    background:
      location.pathname === path
        ? "rgba(15,63,174,0.08)"
        : "transparent",
  });

  const mobileLinkStyle = {
    textDecoration: "none",
    color: "#1a1a1a",
    fontWeight: "600",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#f5f7fc",
  };

  const LangButtons = () => (
    <div style={{ display: "flex", gap: "5px", marginLeft: "8px" }}>
      <button
        type="button"
        onClick={() => changeLanguage("tr")}
        style={{
          padding: "6px 10px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          background: language === "tr" ? "#0f3fae" : "#eee",
          color: language === "tr" ? "#fff" : "#000",
          fontWeight: "700",
        }}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => changeLanguage("en")}
        style={{
          padding: "6px 10px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          background: language === "en" ? "#0f3fae" : "#eee",
          color: language === "en" ? "#fff" : "#000",
          fontWeight: "700",
        }}
      >
        EN
      </button>
    </div>
  );

  return (
    <nav style={{ background: "#fff", borderBottom: "1px solid #eee" }}>
      <div style={{ maxWidth: "1280px", margin: "auto", padding: "15px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            to="/"
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              textDecoration: "none",
              color: "#111",
            }}
          >
            <img src="/ftsline.png" alt="FTSLine" style={{ width: "40px" }} />
            <div>
              <strong>FTSLine</strong>
              <div style={{ fontSize: "10px" }}>
                {common.slogan || "GELECEĞE YÖN VER"}
              </div>
            </div>
          </Link>

          <div className="menu" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link to="/" style={navLinkStyle("/")}>
              {common.home || "Anasayfa"}
            </Link>
            <Link to="/products" style={navLinkStyle("/products")}>
              {common.products || "Ürünler"}
            </Link>
            <Link to="/about" style={navLinkStyle("/about")}>
              {common.about || "Hakkımızda"}
            </Link>
            <Link to="/contact" style={navLinkStyle("/contact")}>
              {common.contact || "İletişim"}
            </Link>

            <Link to="/cart" style={navLinkStyle("/cart")}>
              {common.cart || "Sepet"} ({cartCount})
            </Link>

            {isLoggedIn && isAdmin && (
              <Link to="/admin" style={navLinkStyle("/admin")}>
                {common.admin || "Admin"}
              </Link>
            )}

            {!isLoggedIn ? (
              <>
                <Link to="/login" style={navLinkStyle("/login")}>
                  {common.login || "Giriş"}
                </Link>
                <Link to="/register" style={navLinkStyle("/register")}>
                  {common.register || "Kayıt Ol"}
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" style={navLinkStyle("/dashboard")}>
                  {user?.username || common.panel || "Panel"}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    border: "none",
                    background: "#0f3fae",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  {common.logout || "Çıkış"}
                </button>
              </>
            )}

            <LangButtons />
          </div>
        </div>
      </div>
    </nav>
  );
}