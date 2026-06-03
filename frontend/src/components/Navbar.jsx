import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getCartCount } from "../utils/cart.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Navbar.css";

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

  const isSuperAdmin = user?.role === "superadmin";
  const adminPath = isSuperAdmin ? "/superadmin" : "/admin";

  const isLoggedIn = !!token && !!user;

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login");
  };

  const navLinkClassName = (path) =>
    location.pathname === path ? "navbar-link active" : "navbar-link";

  const LangButtons = () => (
    <div className="navbar-language">
      <button
        type="button"
        onClick={() => changeLanguage("tr")}
        className={language === "tr" ? "active" : ""}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => changeLanguage("en")}
        className={language === "en" ? "active" : ""}
      >
        EN
      </button>
    </div>
  );

  const NavLinks = () => (
    <>
      <Link to="/" className={navLinkClassName("/")}>
        {common.home || "Anasayfa"}
      </Link>
      <Link to="/products" className={navLinkClassName("/products")}>
        {common.products || "Urunler"}
      </Link>
      <Link to="/about" className={navLinkClassName("/about")}>
        {common.about || "Hakkimizda"}
      </Link>
      <Link to="/contact" className={navLinkClassName("/contact")}>
        {common.contact || "Iletisim"}
      </Link>
      <Link to="/faq" className={navLinkClassName("/faq")}>
        {common.faq || "SSS"}
      </Link>

      <Link to="/cart" className={navLinkClassName("/cart")}>
        {common.cart || "Sepet"} ({cartCount})
      </Link>

      {isLoggedIn && isAdmin && (
        <Link to={adminPath} className={navLinkClassName(adminPath)}>
          {isSuperAdmin ? "S\u00fcper Admin" : common.admin || "Admin"}
        </Link>
      )}

      {!isLoggedIn ? (
        <>
          <Link to="/login" className={navLinkClassName("/login")}>
            {common.login || "Giris"}
          </Link>
          <Link to="/register" className={navLinkClassName("/register")}>
            {common.register || "Kayit Ol"}
          </Link>
        </>
      ) : (
        <>
          <Link to="/dashboard" className={navLinkClassName("/dashboard")}>
            {user?.username || common.panel || "Panel"}
          </Link>
          <button type="button" onClick={handleLogout} className="navbar-logout">
            {common.logout || "Cikis"}
          </button>
        </>
      )}

      <LangButtons />
    </>
  );

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-row">
          <Link to="/" className="navbar-brand">
            <img src="/ftsline.png" alt="FTSLine" style={{ width: "40px" }} />
            <div>
              <strong>FTSLine</strong>
              <div style={{ fontSize: "10px" }}>
                {common.slogan || "GELECEÄE YÃ–N VER"}
              </div>
            </div>
          </Link>

          <button
            type="button"
            className="navbar-toggle"
            aria-label={isMobileMenuOpen ? "Menuyu kapat" : "Menuyu ac"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="navbar-menu navbar-menu-desktop">
            <NavLinks />
          </div>
        </div>

        <div className={isMobileMenuOpen ? "navbar-menu navbar-menu-mobile open" : "navbar-menu navbar-menu-mobile"}>
          <NavLinks />
        </div>
      </div>
    </nav>
  );
}



