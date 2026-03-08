// frontend/src/pages/AdminDashboard.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDel } from "../api/http.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./AdminDashboard.css";

/* =========================
   PERM HELPERS
========================= */
function hasPerm(user, perm) {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  const p = Array.isArray(user.permissions) ? user.permissions : [];
  return p.includes(perm);
}
function hasAll(user, perms = []) {
  return perms.every((x) => hasPerm(user, x));
}

/* =========================
   TABS (permission-gated)
========================= */
const TABS = [
  { key: "overview", label: "Özet", icon: "📌", perms: [] },

  { key: "finance", label: "Muhasebe", icon: "💳", perms: ["finance.view"] },

  {
    key: "products",
    label: "Ürünler",
    icon: "🛍️",
    perms: ["products.view"],
  },

  { key: "orders", label: "Siparişler", icon: "📦", perms: ["orders.view"] },

  { key: "users", label: "Kullanıcılar", icon: "👥", perms: ["users.view"] },

  { key: "network", label: "Network", icon: "🧩", perms: ["network.view_all"] },

  { key: "logs", label: "Loglar", icon: "🧾", perms: ["logs.view"] },
];

/* =========================
   UI SMALLS
========================= */
function Pill({ children }) {
  return <span className="adPill">{children}</span>;
}
function Btn({ children, variant = "primary", ...props }) {
  return (
    <button className={`adBtn ${variant}`} {...props}>
      {children}
    </button>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // data
  const [financeSummary, setFinanceSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [networkOverview, setNetworkOverview] = useState(null);

  const visibleTabs = useMemo(() => {
    return TABS.filter((t) => (t.perms?.length ? hasAll(user, t.perms) : true));
  }, [user]);

  useEffect(() => {
    // seçili tab izin yoksa ilk izinli tab’a düş
    const ok = visibleTabs.some((t) => t.key === tab);
    if (!ok) setTab(visibleTabs[0]?.key || "overview");
  }, [visibleTabs, tab]);

  const loadPing = useCallback(async () => {
    setError("");
    try {
      await apiGet("/api/admin/ping");
    } catch (e) {
      setError(e?.message || "Admin ping failed");
    }
  }, []);

  const loadFinance = useCallback(async () => {
    if (!hasPerm(user, "finance.view")) return;
    setError("");
    setBusy("finance");
    try {
      const r = await apiGet("/api/admin/finance/summary");
      setFinanceSummary(r?.summary || null);
    } catch (e) {
      setError(e?.message || "Finance load failed");
    } finally {
      setBusy("");
    }
  }, [user]);

  const loadProducts = useCallback(async () => {
    if (!hasPerm(user, "products.view")) return;
    setError("");
    setBusy("products");
    try {
      const r = await apiGet("/api/admin/products");
      setProducts(Array.isArray(r?.items) ? r.items : []);
    } catch (e) {
      setError(e?.message || "Products load failed");
    } finally {
      setBusy("");
    }
  }, [user]);

  const loadUsers = useCallback(async () => {
    if (!hasPerm(user, "users.view")) return;
    setError("");
    setBusy("users");
    try {
      const r = await apiGet("/api/admin/users");
      setUsers(Array.isArray(r?.items) ? r.items : []);
    } catch (e) {
      setError(e?.message || "Users load failed");
    } finally {
      setBusy("");
    }
  }, [user]);

  const loadNetwork = useCallback(async () => {
    if (!hasPerm(user, "network.view_all")) return;
    setError("");
    setBusy("network");
    try {
      const r = await apiGet("/api/admin/network/overview");
      setNetworkOverview(r?.overview || null);
    } catch (e) {
      setError(e?.message || "Network load failed");
    } finally {
      setBusy("");
    }
  }, [user]);

  const refresh = useCallback(async () => {
    await loadPing();
    if (tab === "finance") return loadFinance();
    if (tab === "products") return loadProducts();
    if (tab === "users") return loadUsers();
    if (tab === "network") return loadNetwork();
  }, [tab, loadPing, loadFinance, loadProducts, loadUsers, loadNetwork]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* =========================
     ACTIONS (permission gated)
  ========================= */
  const createProductStub = async () => {
    setError("");
    setBusy("createProduct");
    try {
      await apiPost("/api/admin/products", {
        name: "Yeni Ürün (Stub)",
        price: 100,
      });
      await loadProducts();
    } catch (e) {
      setError(e?.message || "Create product failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="adShell">
      <div className="adTop">
        <div>
          <div className="adTitle">Admin Dashboard</div>
          <div className="adSub">
            Sadece Süperadmin’in verdiği izinlerle çalışır.{" "}
            <Pill>{user?.role || "—"}</Pill>
          </div>
        </div>

        <div className="adTopRight">
          <div className="adPermLine">
            <span className="adPermLabel">İzinler:</span>
            <span className="adPermCount">
              {user?.role === "superadmin"
                ? "∞ (superadmin)"
                : Array.isArray(user?.permissions)
                ? user.permissions.length
                : 0}
            </span>
          </div>

          <Btn onClick={refresh} disabled={!!busy}>
            {busy ? "Yükleniyor…" : "Yenile"}
          </Btn>
        </div>
      </div>

      {error ? <div className="adError">⚠️ {error}</div> : null}

      <div className="adTabs">
        <div className="adTabsScroll">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              className={`adTab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              <span className="adTabIcon">{t.icon}</span>
              <span className="adTabText">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="adTabsFade" />
      </div>

      <div className="adGrid">
        {/* =========================
            OVERVIEW
        ========================= */}
        {tab === "overview" && (
          <>
            <div className="adCard">
              <div className="adCardHead">
                <div className="adCardTitle">Hızlı Durum</div>
                <div className="adCardNote">Panel hazır. Yetkilere göre sekmeler açılır.</div>
              </div>

              <div className="adKpis">
                <div className="adKpi">
                  <div className="adKpiLabel">Muhasebe</div>
                  <div className="adKpiVal">{hasPerm(user, "finance.view") ? "Açık" : "Kapalı"}</div>
                </div>
                <div className="adKpi">
                  <div className="adKpiLabel">Ürünler</div>
                  <div className="adKpiVal">{hasPerm(user, "products.view") ? "Açık" : "Kapalı"}</div>
                </div>
                <div className="adKpi">
                  <div className="adKpiLabel">Network</div>
                  <div className="adKpiVal">{hasPerm(user, "network.view_all") ? "Açık" : "Kapalı"}</div>
                </div>
                <div className="adKpi">
                  <div className="adKpiLabel">Kullanıcılar</div>
                  <div className="adKpiVal">{hasPerm(user, "users.view") ? "Açık" : "Kapalı"}</div>
                </div>
              </div>

              <div className="adInfo">
                <div className="adInfoRow">
                  <span className="adInfoKey">Kural</span>
                  <span className="adInfoVal">İzin yoksa UI gizler + API 403 verir.</span>
                </div>
                <div className="adInfoRow">
                  <span className="adInfoKey">Network</span>
                  <span className="adInfoVal">Read-only (değişiklik yok).</span>
                </div>
              </div>
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <div className="adCardTitle">İzin Listesi</div>
                <div className="adCardNote">Admin’e verilen permission string’leri</div>
              </div>

              <div className="adPermsBox">
                {user?.role === "superadmin" ? (
                  <div className="adMuted">Superadmin: tüm izinler açık.</div>
                ) : Array.isArray(user?.permissions) && user.permissions.length ? (
                  user.permissions.map((p) => (
                    <div className="adPermItem" key={p}>
                      {p}
                    </div>
                  ))
                ) : (
                  <div className="adMuted">Hiç izin yok. Süperadmin vermeli.</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* =========================
            FINANCE
        ========================= */}
        {tab === "finance" && (
          <>
            <div className="adCard">
              <div className="adCardHead">
                <div className="adCardTitle">Muhasebe Özeti</div>
                <div className="adCardNote">finance.view</div>
              </div>

              <div className="adKpis">
                <div className="adKpi">
                  <div className="adKpiLabel">Toplam Giriş</div>
                  <div className="adKpiVal">{financeSummary?.totalIn ?? "—"}</div>
                </div>
                <div className="adKpi">
                  <div className="adKpiLabel">Toplam Çıkış</div>
                  <div className="adKpiVal">{financeSummary?.totalOut ?? "—"}</div>
                </div>
                <div className="adKpi">
                  <div className="adKpiLabel">Pending</div>
                  <div className="adKpiVal">{financeSummary?.pending ?? "—"}</div>
                </div>
                <div className="adKpi">
                  <div className="adKpiLabel">Son 24h</div>
                  <div className="adKpiVal">{financeSummary?.last24h ?? "—"}</div>
                </div>
              </div>

              <div className="adMuted">
                Not: Burayı gerçek Ledger verisine bağlamak için `/api/admin/finance/*` endpointlerini dolduracağız.
              </div>
            </div>
          </>
        )}

        {/* =========================
            PRODUCTS
        ========================= */}
        {tab === "products" && (
          <>
            <div className="adCard">
              <div className="adCardHead">
                <div className="adCardTitle">Ürün Yönetimi</div>
                <div className="adCardNote">products.view</div>

                <div className="adCardActions">
                  {hasPerm(user, "products.create") && (
                    <Btn
                      onClick={createProductStub}
                      disabled={busy === "createProduct"}
                      variant="primary"
                      type="button"
                    >
                      {busy === "createProduct" ? "Ekleniyor…" : "Ürün Ekle"}
                    </Btn>
                  )}
                </div>
              </div>

              <div className="adTable">
                <div className="adTR adTH">
                  <div>Ad</div>
                  <div>Fiyat</div>
                  <div>Durum</div>
                  <div>İşlem</div>
                </div>

                {(products || []).length ? (
                  products.map((p, idx) => (
                    <div className="adTR" key={p?._id || p?.id || idx}>
                      <div className="adStrong">{p?.name || "Ürün"}</div>
                      <div>{p?.price ?? "—"}</div>
                      <div>
                        <Pill>{p?.isActive === false ? "Pasif" : "Aktif"}</Pill>
                      </div>
                      <div className="adRowBtns">
                        {hasPerm(user, "products.update") ? (
                          <button className="adMini" type="button" onClick={() => {}}>
                            Düzenle
                          </button>
                        ) : (
                          <span className="adMuted">—</span>
                        )}

                        {hasPerm(user, "products.delete") ? (
                          <button className="adMini danger" type="button" onClick={() => {}}>
                            Sil
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="adEmpty">Ürün yok (veya backend stub).</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* =========================
            USERS (read-only)
        ========================= */}
        {tab === "users" && (
          <div className="adCard">
            <div className="adCardHead">
              <div className="adCardTitle">Kullanıcılar</div>
              <div className="adCardNote">users.view (read-only)</div>
            </div>

            <div className="adTable">
              <div className="adTR adTH">
                <div>Kullanıcı</div>
                <div>Rol</div>
                <div>Durum</div>
                <div>Not</div>
              </div>

              {(users || []).length ? (
                users.map((u, idx) => (
                  <div className="adTR" key={u?._id || idx}>
                    <div className="adStrong">{u?.username || u?.email || "—"}</div>
                    <div>{u?.role || "—"}</div>
                    <div>
                      <Pill>{u?.isActive === false ? "Kapalı" : "Açık"}</Pill>
                    </div>
                    <div className="adMuted">Admin değişiklik yapamaz.</div>
                  </div>
                ))
              ) : (
                <div className="adEmpty">Liste boş (veya backend stub).</div>
              )}
            </div>
          </div>
        )}

        {/* =========================
            NETWORK (read-only)
        ========================= */}
        {tab === "network" && (
          <div className="adCard">
            <div className="adCardHead">
              <div className="adCardTitle">Network Kontrol</div>
              <div className="adCardNote">network.view_all (read-only)</div>
            </div>

            <div className="adKpis">
              <div className="adKpi">
                <div className="adKpiLabel">Ekip</div>
                <div className="adKpiVal">{networkOverview?.teams ?? "—"}</div>
              </div>
              <div className="adKpi">
                <div className="adKpiLabel">Node</div>
                <div className="adKpiVal">{networkOverview?.nodes ?? "—"}</div>
              </div>
            </div>

            <div className="adMuted">
              Burada sadece görüntüleme: “değişiklik / transfer / silme” butonu yok.
            </div>
          </div>
        )}

        {/* =========================
            ORDERS / LOGS placeholder
        ========================= */}
        {tab === "orders" && (
          <div className="adCard">
            <div className="adCardHead">
              <div className="adCardTitle">Siparişler</div>
              <div className="adCardNote">orders.view</div>
            </div>
            <div className="adEmpty">Bu sekmeyi sonraki adımda gerçek endpointlerle dolduracağız.</div>
          </div>
        )}

        {tab === "logs" && (
          <div className="adCard">
            <div className="adCardHead">
              <div className="adCardTitle">Loglar</div>
              <div className="adCardNote">logs.view</div>
            </div>
            <div className="adEmpty">Bu sekmeyi sonraki adımda gerçek endpointlerle dolduracağız.</div>
          </div>
        )}
      </div>
    </div>
  );
}