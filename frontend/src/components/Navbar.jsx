// src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "./Navbar.css";

const CART_KEY = "fts_cart_v1";

function isActivePath(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

function readCartCount() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, x) => sum + Math.max(0, Number(x?.qty || 0)), 0);
  } catch {
    return 0;
  }
}

export default function Navbar() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => readCartCount());
  const pathname = loc.pathname;

  const links = useMemo(
    () => [
      { to: "/", label: "Ana Sayfa" },
      { to: "/products", label: "Ürünler" },
      { to: "/about", label: "Hakkımızda" },
      { to: "/faq", label: "SSS" },
      { to: "/contact", label: "İletişim" },
    ],
    []
  );

  function go(to) {
    setMobileOpen(false);
    nav(to);
  }

  function goMyPanel() {
    setMobileOpen(false);

    if (!user) return nav("/login");

    const role = user?.role;
    if (role === "superadmin") return nav("/superadmin");
    if (role === "admin") return nav("/admin");
    return nav("/dashboard");
  }

  useEffect(() => {
    const tick = () => setCartCount(readCartCount());
    tick();

    const onStorage = (e) => {
      if (e.key === CART_KEY) tick();
    };

    const id = window.setInterval(tick, 800);

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", tick);
    window.addEventListener("cart:updated", tick);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", tick);
      window.removeEventListener("cart:updated", tick);
    };
  }, []);

  // ✅ Click güvenliği: olayları tek yerden düzgün keselim
  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <header className="nvWrap">
      <div className="nvInner">
        {/* LEFT / LOGO + SLOGAN */}
        <div
          className="nvLeft"
          onMouseDown={(e) => {
            // sol alana tıklama: normal çalışsın
            // ama başka elementten gelen event karışmasın
            // (sadece güvenlik, asıl fix cart'ta)
          }}
          onClick={() => go("/")}
        >
          <img src="/ftsline.png" alt="FTSLine" className="nvLogoImg" />

          <div className="nvBrandText">
            <div className="nvLogo">FTSLINE</div>
            <div className="nvSlogan">GELECEĞE YÖN VER</div>
          </div>
        </div>

        {/* CENTER (desktop) */}
        <nav className="nvNav">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nvLink ${isActivePath(pathname, l.to) ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT */}
        <div className="nvRight">
          {/* ✅ Sepet ikonu (KESİN /cart) */}
          <button
            className="nvIconBtn"
            type="button"
            title="Sepet"
            onMouseDown={(e) => {
              stop(e); // ✅ click daha oluşmadan kes
            }}
            onClick={(e) => {
              stop(e);
              go("/cart");
            }}
          >
            🛒
            {cartCount > 0 ? <span className="nvCartBadge">{cartCount}</span> : null}
          </button>

          {user ? (
            <div className="nvUser">
              <button
                className="nvChip"
                type="button"
                title={user?.role || ""}
                onMouseDown={stop}
                onClick={(e) => {
                  stop(e);
                  goMyPanel();
                }}
              >
                <span className="nvUserName">{user?.username || "Kullanıcı"}</span>
                <span className="nvUserRole">{user?.role || ""}</span>
              </button>

              <button
                className="nvBtn"
                type="button"
                onMouseDown={stop}
                onClick={(e) => {
                  stop(e);
                  logout();
                  go("/");
                }}
              >
                Çıkış
              </button>
            </div>
          ) : (
            <div className="nvAuth">
              <button
                className="nvBtn ghost"
                type="button"
                onMouseDown={stop}
                onClick={(e) => {
                  stop(e);
                  go("/login");
                }}
              >
                Login
              </button>
              <button
                className="nvBtn"
                type="button"
                onMouseDown={stop}
                onClick={(e) => {
                  stop(e);
                  go("/register");
                }}
              >
                Register
              </button>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            className="nvBurger"
            type="button"
            aria-label="Menü"
            onMouseDown={stop}
            onClick={(e) => {
              stop(e);
              setMobileOpen((v) => !v);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen ? (
        <div className="nvMobile" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          {links.map((l) => (
            <button
              key={l.to}
              className={`nvMobileLink ${isActivePath(pathname, l.to) ? "active" : ""}`}
              type="button"
              onMouseDown={stop}
              onClick={(e) => {
                stop(e);
                go(l.to);
              }}
            >
              {l.label}
            </button>
          ))}

          <div className="nvMobileSep" />

          {/* ✅ Mobil sepet */}
          <button
            className="nvMobileLink"
            type="button"
            onMouseDown={stop}
            onClick={(e) => {
              stop(e);
              go("/cart");
            }}
          >
            🛒 Sepet {cartCount > 0 ? `(${cartCount})` : ""}
          </button>

          <div className="nvMobileSep" />

          {user ? (
            <>
              <button
                className="nvMobileLink"
                type="button"
                onMouseDown={stop}
                onClick={(e) => {
                  stop(e);
                  goMyPanel();
                }}
              >
                👤 Panelim
              </button>

              <button
                className="nvMobileLink danger"
                type="button"
                onMouseDown={stop}
                onClick={(e) => {
                  stop(e);
                  logout();
                  go("/");
                }}
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <button
                className="nvMobileLink"
                type="button"
                onMouseDown={stop}
                onClick={(e) => {
                  stop(e);
                  go("/login");
                }}
              >
                Login
              </button>
              <button
                className="nvMobileLink"
                type="button"
                onMouseDown={stop}
                onClick={(e) => {
                  stop(e);
                  go("/register");
                }}
              >
                Register
              </button>
            </>
          )}
        </div>
      ) : null}
    </header>
  );
}