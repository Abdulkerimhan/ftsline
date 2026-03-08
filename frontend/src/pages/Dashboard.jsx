import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiGet, apiPut } from "../api/http.js";
import "./Dashboard.css";

import { Country, State, City } from "country-state-city";
import { getCountryCallingCode } from "libphonenumber-js";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* =========================
   HELPERS
========================= */
function fmtTry(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("tr-TR") + "₺";
}

function shortId(x) {
  const s = String(x || "");
  if (s.length <= 10) return s;
  return s.slice(0, 6) + "…" + s.slice(-4);
}

function safeDate(x) {
  if (!x) return "—";
  try {
    const d = new Date(x);
    if (Number.isNaN(d.getTime())) return String(x);
    return d.toLocaleDateString("tr-TR");
  } catch {
    return String(x);
  }
}

async function copyText(txt) {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    return false;
  }
}

function buildLevelsFromGraph(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  if (!nodes.length) return [];

  const grouped = new Map();

  for (const node of nodes) {
    const lv = Number(node?.level ?? 0);
    if (!grouped.has(lv)) grouped.set(lv, []);
    grouped.get(lv).push(node);
  }

  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, items]) => ({
      level,
      items,
    }));
}

function buildMatrixTree(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const rootUserId = String(graph?.rootUserId || "");

  if (!nodes.length) return null;

  const map = new Map();

  for (const n of nodes) {
    map.set(String(n.id), {
      ...n,
      children: [],
      left: null,
      right: null,
    });
  }

  for (const e of edges) {
    const from = map.get(String(e.from));
    const to = map.get(String(e.to));
    if (!from || !to) continue;

    if (e.slot === 1) from.left = to;
    else if (e.slot === 2) from.right = to;

    from.children.push(to);
  }

  const root =
    map.get(rootUserId) ||
    nodes.find((x) => Number(x.level) === 0 && map.get(String(x.id))) ||
    map.get(String(nodes[0].id));

  return root || null;
}

function countLevelItems(levels, targetLevel) {
  const found = levels.find((x) => x.level === targetLevel);
  return found ? found.items.length : 0;
}

/* =========================
   TABS
========================= */
const TABS = [
  { key: "overview", label: "Özet", icon: "📌" },
  { key: "earn", label: "Kazanç", icon: "📈" },
  { key: "license", label: "Lisans", icon: "🎫" },
  { key: "team", label: "Ekip / Ağaç", icon: "🧩" },
  { key: "profile", label: "Profil", icon: "👤" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const toastTimerRef = useRef(null);

  const initialTab = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("tab") || "overview";
    return TABS.some((t) => t.key === q) ? q : "overview";
  }, []);

  const [tab, setTab] = useState(initialTab);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "ok", msg: "" });

  const [summary, setSummary] = useState({
    balance: null,
    totalEarning: null,
    monthEarning: null,
    teamCount: null,
    licenseStatus: null,
    licenseEndsAt: null,
  });

  const [earnSeries, setEarnSeries] = useState([]);
  const [unilevel, setUnilevel] = useState({ raw: null, levels: [] });
  const [matrix, setMatrix] = useState({ raw: null, tree: null, levels: [] });

  const [pform, setPform] = useState({
    fullName: "",
    email: "",
    phone: "",

    birthDate: "",

    nationality: "TR",
    country: "TR",
    phoneCode: "+90",

    stateCode: "",
    city: "",
    district: "",

    addressLine: "",
    postalCode: "",

    invoiceName: "",
    invoiceTaxNo: "",
    invoiceTaxOffice: "",
    invoiceAddressLine: "",
    invoiceCity: "",
    invoiceDistrict: "",
    invoicePostalCode: "",
    invoiceCountry: "TR",
  });

  const [invoiceSame, setInvoiceSame] = useState(true);

  const refLink = useMemo(() => {
    const u = user?.username || "";
    return `${window.location.origin}/r/${encodeURIComponent(u)}`;
  }, [user?.username]);

  const showToast = useCallback((msg, type = "ok") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setToast({ show: true, type, msg });

    toastTimerRef.current = setTimeout(() => {
      setToast({ show: false, type: "ok", msg: "" });
      toastTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", tab);
    const next = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState(null, "", next);
  }, [tab]);

  const normalizeSeries = useCallback((data) => {
    const arr = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.series)
      ? data.series
      : [];

    return arr
      .map((x) => ({
        month: x.month || x.ym || x.label || "—",
        earning: Number(x.earning ?? x.amount ?? x.value ?? 0),
      }))
      .slice(-12);
  }, []);

  /* =========================
     COUNTRY / STATE / DISTRICT
  ========================= */
  const countryOptions = useMemo(() => {
    const list = Country.getAllCountries() || [];
    list.sort((a, b) => {
      if (a.isoCode === "TR") return -1;
      if (b.isoCode === "TR") return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, []);

  const stateOptions = useMemo(() => {
    const cc = pform.country || "TR";
    return State.getStatesOfCountry(cc) || [];
  }, [pform.country]);

  const districtOptions = useMemo(() => {
    const cc = pform.country || "TR";
    const sc = pform.stateCode || "";
    if (!cc || !sc) return [];
    return City.getCitiesOfState(cc, sc) || [];
  }, [pform.country, pform.stateCode]);

  const computePhoneCode = useCallback((countryIso2) => {
    try {
      const code = getCountryCallingCode(countryIso2);
      return `+${code}`;
    } catch {
      return "";
    }
  }, []);

  const onChangeCountry = useCallback(
    (iso2) => {
      const phoneCode = computePhoneCode(iso2) || (iso2 === "TR" ? "+90" : "");
      setPform((p) => ({
        ...p,
        country: iso2,
        nationality: iso2,
        phoneCode,
        stateCode: "",
        city: "",
        district: "",
        invoiceCountry: iso2,
      }));
    },
    [computePhoneCode]
  );

  const onChangeState = useCallback(
    (stateIso) => {
      const st = stateOptions.find((x) => x.isoCode === stateIso);
      setPform((p) => ({
        ...p,
        stateCode: stateIso,
        city: st?.name || "",
        district: "",
      }));
    },
    [stateOptions]
  );

  const onChangeDistrict = useCallback((districtName) => {
    setPform((p) => ({ ...p, district: districtName }));
  }, []);

  const applyInvoiceSame = useCallback(() => {
    setPform((p) => ({
      ...p,
      invoiceAddressLine: p.addressLine,
      invoiceCity: p.city,
      invoiceDistrict: p.district,
      invoicePostalCode: p.postalCode,
      invoiceCountry: p.country || "TR",
      invoiceName: p.invoiceName || p.fullName || "",
    }));
  }, []);

  useEffect(() => {
    if (invoiceSame) applyInvoiceSame();
  }, [
    invoiceSame,
    pform.addressLine,
    pform.city,
    pform.district,
    pform.postalCode,
    pform.country,
    pform.fullName,
    applyInvoiceSame,
  ]);

  /* =========================
     FETCH
  ========================= */
  const fetchAll = useCallback(async () => {
    setBusy(true);

    try {
      let s = null;
      try {
        s = await apiGet("/api/user/summary");
      } catch {
        try {
          s = await apiGet("/api/dashboard/summary");
        } catch {}
      }

      let prof = null;
      try {
        prof = await apiGet("/api/user/profile");
      } catch {
        try {
          prof = await apiGet("/api/users/profile");
        } catch {}
      }

      let es = null;
      try {
        es = await apiGet("/api/user/earnings/series");
      } catch {
        try {
          es = await apiGet("/api/ledger/earnings/series");
        } catch {}
      }

      let uni = null;
      try {
        uni = await apiGet("/api/network/unilevel");
      } catch {
        try {
          uni = await apiGet("/api/user/team");
        } catch {}
      }

      let mx = null;
      try {
        mx = await apiGet("/api/network/matrix");
      } catch {
        try {
          mx = await apiGet("/api/matrix/tree");
        } catch {}
      }

      const u = prof?.user || prof || s?.user || s;

      if (u && typeof u === "object") {
        setSummary((prev) => ({
          ...prev,
          balance: u.balance ?? u.wallet ?? u.available ?? prev.balance,
          totalEarning: u.totalEarning ?? u.total ?? prev.totalEarning,
          monthEarning: u.monthEarning ?? u.thisMonth ?? prev.monthEarning,
          teamCount: u.teamCount ?? u.downlineCount ?? prev.teamCount,
          licenseStatus: u.licenseStatus ?? u.license?.status ?? prev.licenseStatus,
          licenseEndsAt: u.licenseEndsAt ?? u.license?.endsAt ?? prev.licenseEndsAt,
        }));

        const birthRaw = u.birthDate ?? u.profile?.birthDate ?? "";
        const birthDate = birthRaw ? String(birthRaw).slice(0, 10) : "";

        const country = String(u.country ?? u.profile?.country ?? "TR").toUpperCase();
        const nationality = String(u.nationality ?? u.profile?.nationality ?? country).toUpperCase();

        const phoneCode =
          u.phoneCode ??
          u.profile?.phoneCode ??
          computePhoneCode(country) ??
          (country === "TR" ? "+90" : "");

        const loaded = {
          fullName: u.fullName ?? user?.fullName ?? "",
          email: u.email ?? user?.email ?? "",
          phone: u.phone ?? user?.phone ?? "",

          birthDate,
          nationality,
          country,
          phoneCode,

          addressLine: u.addressLine ?? u.profile?.addressLine ?? "",
          postalCode: u.postalCode ?? u.profile?.postalCode ?? "",
          stateCode: u.stateCode ?? u.profile?.stateCode ?? "",
          city: u.city ?? u.profile?.city ?? "",
          district: u.district ?? u.profile?.district ?? "",

          invoiceName: u.invoice?.name ?? u.invoiceName ?? "",
          invoiceTaxNo: u.invoice?.taxNo ?? u.invoiceTaxNo ?? "",
          invoiceTaxOffice: u.invoice?.taxOffice ?? u.invoiceTaxOffice ?? "",
          invoiceAddressLine: u.invoice?.addressLine ?? u.invoiceAddressLine ?? "",
          invoiceCity: u.invoice?.city ?? u.invoiceCity ?? "",
          invoiceDistrict: u.invoice?.district ?? u.invoiceDistrict ?? "",
          invoicePostalCode: u.invoice?.postalCode ?? u.invoicePostalCode ?? "",
          invoiceCountry: String(
            u.invoice?.country ?? u.invoiceCountry ?? country
          ).toUpperCase(),
        };

        setPform((prev) => ({ ...prev, ...loaded }));

        const hasInvoiceAddress =
          !!loaded.invoiceAddressLine || !!loaded.invoiceCity || !!loaded.invoiceDistrict;

        if (!hasInvoiceAddress) setInvoiceSame(true);
      } else {
        setPform((prev) => ({
          ...prev,
          fullName: user?.fullName ?? "",
          email: user?.email ?? "",
          phone: user?.phone ?? "",
        }));
      }

      setEarnSeries(normalizeSeries(es));

      const uniLevels = buildLevelsFromGraph(uni);
      const matrixTree = buildMatrixTree(mx);
      const matrixLevels = buildLevelsFromGraph(mx);

      setUnilevel({
        raw: uni || null,
        levels: uniLevels,
      });

      setMatrix({
        raw: mx || null,
        tree: matrixTree,
        levels: matrixLevels,
      });
    } catch (e) {
      showToast(e?.message || "Veri alınamadı.", "err");
    } finally {
      setBusy(false);
    }
  }, [user, showToast, computePhoneCode, normalizeSeries]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function saveProfile() {
    setBusy(true);

    try {
      const payload = {
        ...pform,
        fullName: String(pform.fullName || "").trim(),
        email: String(pform.email || "").trim().toLowerCase(),
        phone: String(pform.phone || "").trim(),
        addressLine: String(pform.addressLine || "").trim(),
        postalCode: String(pform.postalCode || "").trim(),
        city: String(pform.city || "").trim(),
        district: String(pform.district || "").trim(),
        invoiceName: String(pform.invoiceName || "").trim(),
        invoiceTaxNo: String(pform.invoiceTaxNo || "").trim(),
        invoiceTaxOffice: String(pform.invoiceTaxOffice || "").trim(),
        invoiceAddressLine: String(pform.invoiceAddressLine || "").trim(),
        invoiceCity: String(pform.invoiceCity || "").trim(),
        invoiceDistrict: String(pform.invoiceDistrict || "").trim(),
        invoicePostalCode: String(pform.invoicePostalCode || "").trim(),
        ...(invoiceSame
          ? {
              invoiceAddressLine: String(pform.addressLine || "").trim(),
              invoiceCity: String(pform.city || "").trim(),
              invoiceDistrict: String(pform.district || "").trim(),
              invoicePostalCode: String(pform.postalCode || "").trim(),
              invoiceCountry: pform.country || "TR",
              invoiceName: String(pform.invoiceName || pform.fullName || "").trim(),
            }
          : {}),
      };

      try {
        await apiPut("/api/user/profile", payload);
      } catch {
        await apiPut("/api/users/profile", payload);
      }

      await fetchAll();
      showToast("Profil güncellendi ✅", "ok");
    } catch (e) {
      showToast(e?.message || "Profil güncellenemedi.", "err");
    } finally {
      setBusy(false);
    }
  }

  const kpis = useMemo(() => {
    return [
      { label: "Bakiye", value: fmtTry(summary.balance), icon: "💰" },
      { label: "Bu Ay", value: fmtTry(summary.monthEarning), icon: "📅" },
      { label: "Toplam", value: fmtTry(summary.totalEarning), icon: "🏆" },
      { label: "Ekip", value: summary.teamCount ?? "—", icon: "👥" },
    ];
  }, [summary]);

  const licenseTone = useMemo(() => {
    const s = String(summary.licenseStatus || "").toLowerCase();
    if (s.includes("active") || s.includes("aktif")) return "ok";
    if (s.includes("expired") || s.includes("pasif") || s.includes("inaktif")) return "warn";
    if (s.includes("pending")) return "info";
    return "muted";
  }, [summary.licenseStatus]);

  return (
    <div className="udPage">
      <Navbar />

      <div className="udShell">
        <div className="udHeader">
          <div className="udHello">
            <div className="udTitleRow">
              <div>
                <h1 className="udTitle">Kullanıcı Paneli</h1>
                <div className="udSub">
                  Hoşgeldin <b>{user?.username || "Kullanıcı"}</b> • ID:{" "}
                  <span className="udMono">{shortId(user?._id || user?.id)}</span>
                </div>
              </div>

              <button className="udBtn" type="button" onClick={fetchAll} disabled={busy}>
                {busy ? "Yükleniyor..." : "Yenile"}
              </button>
            </div>

            <div className="udQuick">
              <div className={`udPill ${licenseTone}`}>
                <span className="udPillDot" />
                Lisans: <b>{summary.licenseStatus ?? "—"}</b>
                <span className="udPillSep" />
                Bitiş: <b>{safeDate(summary.licenseEndsAt)}</b>
              </div>

              <div className="udPill">
                Referans: <b className="udMono">{user?.username || "—"}</b>
              </div>
            </div>
          </div>

          <div className="udTabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`udTab ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
                type="button"
              >
                <span className="udTabIco">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="udGrid">
          {tab === "overview" && (
            <>
              <section className="udPanel udSpan2">
                <div className="udKpis">
                  {kpis.map((k) => (
                    <div key={k.label} className="udKpi">
                      <div className="udKpiIco">{k.icon}</div>
                      <div className="udKpiMeta">
                        <div className="udKpiLabel">{k.label}</div>
                        <div className="udKpiVal">{k.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="udPanel udSpan2">
                <div className="udPanelHead">
                  <h3 className="udH3">Referans Linkin</h3>
                  <button
                    className="udBtn primary"
                    type="button"
                    onClick={async () => {
                      const ok = await copyText(refLink);
                      showToast(ok ? "Kopyalandı ✅" : "Kopyalanamadı ❌", ok ? "ok" : "err");
                    }}
                  >
                    Kopyala
                  </button>
                </div>

                <div className="udRefRow">
                  <input className="udInput" value={refLink} readOnly />
                </div>

                <div className="udHint">
                  Not: Linkteki sponsor değeri = <span className="udMono">username</span>
                </div>
              </section>

              <section className="udPanel udSpan2">
                <div className="udPanelHead">
                  <h3 className="udH3">Hızlı Kazanç Grafiği</h3>
                  <span className="udMuted">Son 12 dönem</span>
                </div>

                <div className="udChart">
                  {earnSeries.length ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart
                        data={earnSeries}
                        margin={{ top: 10, right: 18, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="earning"
                          name="Kazanç"
                          strokeWidth={2}
                          fillOpacity={0.25}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyBox title="Grafik verisi yok" hint="Endpoint: /api/user/earnings/series" />
                  )}
                </div>
              </section>
            </>
          )}

          {tab === "earn" && (
            <>
              <section className="udPanel udSpan2">
                <div className="udPanelHead">
                  <h3 className="udH3">Kazanç Analizi</h3>
                  <span className="udMuted">{busy ? "Güncelleniyor…" : " "}</span>
                </div>

                <div className="udChart">
                  {earnSeries.length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={earnSeries}
                        margin={{ top: 10, right: 18, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="earning"
                          name="Kazanç"
                          strokeWidth={2}
                          fillOpacity={0.28}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyBox
                      title="Kazanç datası yok"
                      hint="Backend series endpointi eklenince otomatik dolacak."
                    />
                  )}
                </div>
              </section>

              <section className="udPanel">
                <h3 className="udH3">Özet</h3>
                <div className="udList">
                  <div className="udRow">
                    <span>Bu ay</span>
                    <b>{fmtTry(summary.monthEarning)}</b>
                  </div>
                  <div className="udRow">
                    <span>Toplam</span>
                    <b>{fmtTry(summary.totalEarning)}</b>
                  </div>
                  <div className="udRow">
                    <span>Bakiye</span>
                    <b>{fmtTry(summary.balance)}</b>
                  </div>
                </div>
              </section>

              <section className="udPanel">
                <h3 className="udH3">İpucu</h3>
                <div className="udHint">
                  Bu sayfa canlı olunca “günlük/aylık” filtre, gelir türleri
                  (komisyon/bonus/ürün) ekleyeceğiz.
                </div>
              </section>
            </>
          )}

          {tab === "license" && (
            <section className="udPanel udSpan2">
              <div className="udPanelHead">
                <h3 className="udH3">Lisans Durumu</h3>
                <span className={`udBadge ${licenseTone}`}>
                  {String(summary.licenseStatus || "unknown").toUpperCase()}
                </span>
              </div>

              <div className="udLicenseGrid">
                <div className="udRow">
                  <span>Durum</span>
                  <b>{summary.licenseStatus ?? "—"}</b>
                </div>
                <div className="udRow">
                  <span>Bitiş</span>
                  <b>{safeDate(summary.licenseEndsAt)}</b>
                </div>
                <div className="udRow">
                  <span>Ref</span>
                  <b className="udMono">{user?.username || "—"}</b>
                </div>
                <div className="udRow">
                  <span>Ekip</span>
                  <b>{summary.teamCount ?? "—"}</b>
                </div>
              </div>

              <div className="udHint">
                Lisans satın alma/yenileme butonu: ledger + ödeme modülüne bağlayacağız.
              </div>
            </section>
          )}

          {tab === "team" && (
            <>
              <section className="udPanel udSpan2">
                <div className="udPanelHead">
                  <h3 className="udH3">Network Özeti</h3>
                  <span className="udMuted">Unilevel + Matrix görünümü</span>
                </div>

                <div className="udNetStats">
                  <div className="udNetStat">
                    <div className="udNetStatLabel">Toplam Unilevel</div>
                    <div className="udNetStatValue">{unilevel.raw?.total ?? 0}</div>
                  </div>

                  <div className="udNetStat">
                    <div className="udNetStatLabel">Toplam Matrix</div>
                    <div className="udNetStatValue">{matrix.raw?.total ?? 0}</div>
                  </div>

                  <div className="udNetStat">
                    <div className="udNetStatLabel">1. Seviye</div>
                    <div className="udNetStatValue">{countLevelItems(unilevel.levels, 1)}</div>
                  </div>

                  <div className="udNetStat">
                    <div className="udNetStatLabel">Matrix Sol + Sağ</div>
                    <div className="udNetStatValue">
                      {countLevelItems(matrix.levels, 1)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="udPanel">
                <div className="udPanelHead">
                  <h3 className="udH3">Unilevel Ekibim</h3>
                  <span className="udMuted">
                    {unilevel.raw?.total ? `${unilevel.raw.total} kişi` : ""}
                  </span>
                </div>

                {unilevel.levels.length ? (
                  <div className="udLevelWrap">
                    {unilevel.levels.map((group) => (
                      <div key={group.level} className="udLevelBlock">
                        <div className="udLevelHead">
                          <div className="udLevelTitle">Seviye {group.level}</div>
                          <div className="udLevelCount">{group.items.length} kişi</div>
                        </div>

                        <div className="udMemberGrid">
                          {group.items.map((m, i) => (
                            <div key={m.id || i} className="udMemberCard">
                              <div className="udMemberTop">
                                <div className="udMemberAvatar">
                                  {String(m.username || "U").slice(0, 1).toUpperCase()}
                                </div>

                                <div className="udMemberMeta">
                                  <div className="udMemberName">
                                    {m.fullName || m.username || "—"}
                                  </div>
                                  <div className="udMemberUser udMono">
                                    @{m.username || "—"}
                                  </div>
                                </div>
                              </div>

                              <div className="udMemberBottom">
                                <span className="udBadge info">Lv {m.level ?? 0}</span>
                                {m.role ? (
                                  <span className="udBadge muted">{m.role}</span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyBox title="Ekip verisi yok" hint="Endpoint: /api/network/unilevel" />
                )}
              </section>

              <section className="udPanel">
                <div className="udPanelHead">
                  <h3 className="udH3">Matrix Ağacı</h3>
                  <span className="udMuted">2 Kollu görünüm</span>
                </div>

                {matrix.tree ? (
                  <div className="udMatrixWrap">
                    <MatrixCard node={matrix.tree} isRoot />

                    <div className="udMatrixBranch">
                      <div className="udMatrixCol">
                        <div className="udMatrixSlotLabel">Sol Kol</div>
                        {matrix.tree.left ? (
                          <MatrixCard node={matrix.tree.left} />
                        ) : (
                          <EmptySlot label="Sol slot boş" />
                        )}

                        <div className="udMiniChildren">
                          {matrix.tree.left?.left ? (
                            <MatrixMiniCard node={matrix.tree.left.left} />
                          ) : (
                            <EmptySlot small label="Boş" />
                          )}
                          {matrix.tree.left?.right ? (
                            <MatrixMiniCard node={matrix.tree.left.right} />
                          ) : (
                            <EmptySlot small label="Boş" />
                          )}
                        </div>
                      </div>

                      <div className="udMatrixCol">
                        <div className="udMatrixSlotLabel">Sağ Kol</div>
                        {matrix.tree.right ? (
                          <MatrixCard node={matrix.tree.right} />
                        ) : (
                          <EmptySlot label="Sağ slot boş" />
                        )}

                        <div className="udMiniChildren">
                          {matrix.tree.right?.left ? (
                            <MatrixMiniCard node={matrix.tree.right.left} />
                          ) : (
                            <EmptySlot small label="Boş" />
                          )}
                          {matrix.tree.right?.right ? (
                            <MatrixMiniCard node={matrix.tree.right.right} />
                          ) : (
                            <EmptySlot small label="Boş" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="udHint">
                      Bu görünüm ilk 3 katmanı premium şekilde gösterir. Sonraki aşamada zoomlu tam ağaç ekleriz.
                    </div>
                  </div>
                ) : (
                  <EmptyBox title="Matrix verisi yok" hint="Endpoint: /api/network/matrix" />
                )}
              </section>
            </>
          )}

          {tab === "profile" && (
            <section className="udPanel udSpan2">
              <div className="udPanelHead">
                <h3 className="udH3">Bilgilerimi Güncelle</h3>
                <span className="udMuted">Profil</span>
              </div>

              <div className="udFormGrid">
                <div>
                  <label className="udLabel">Ad Soyad</label>
                  <input
                    className="udInput"
                    value={pform.fullName}
                    onChange={(e) => setPform((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Ad Soyad"
                  />
                </div>

                <div>
                  <label className="udLabel">E-posta</label>
                  <input
                    className="udInput"
                    value={pform.email}
                    onChange={(e) => setPform((p) => ({ ...p, email: e.target.value }))}
                    placeholder="mail@..."
                  />
                </div>

                <div>
                  <label className="udLabel">Telefon Ülke Kodu</label>
                  <input className="udInput" value={pform.phoneCode} readOnly />
                </div>

                <div>
                  <label className="udLabel">Telefon</label>
                  <input
                    className="udInput"
                    value={pform.phone}
                    onChange={(e) => setPform((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="5xx xxx xx xx"
                  />
                </div>

                <div className="udSectionTitle">Kişisel Bilgiler</div>

                <div>
                  <label className="udLabel">Doğum Tarihi</label>
                  <input
                    className="udInput"
                    type="date"
                    value={pform.birthDate}
                    onChange={(e) => setPform((p) => ({ ...p, birthDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="udLabel">Uyruk / Ülke</label>
                  <select
                    className="udInput"
                    value={pform.country}
                    onChange={(e) => onChangeCountry(e.target.value)}
                  >
                    {countryOptions.map((c) => (
                      <option key={c.isoCode} value={c.isoCode}>
                        {c.name} ({c.isoCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="udSectionTitle">Adres Bilgileri</div>

                <div className="udSpan2">
                  <label className="udLabel">Adres</label>
                  <input
                    className="udInput"
                    value={pform.addressLine}
                    onChange={(e) => setPform((p) => ({ ...p, addressLine: e.target.value }))}
                    placeholder="Mahalle, sokak, kapı no..."
                  />
                </div>

                <div>
                  <label className="udLabel">İl</label>
                  <select
                    className="udInput"
                    value={pform.stateCode}
                    onChange={(e) => onChangeState(e.target.value)}
                  >
                    <option value="">İl seç</option>
                    {stateOptions.map((st) => (
                      <option key={st.isoCode} value={st.isoCode}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="udLabel">İlçe</label>
                  <select
                    className="udInput"
                    value={pform.district}
                    onChange={(e) => onChangeDistrict(e.target.value)}
                    disabled={!pform.stateCode}
                    title={!pform.stateCode ? "Önce il seç" : ""}
                  >
                    <option value="">{pform.stateCode ? "İlçe seç" : "Önce il seç"}</option>
                    {districtOptions.map((ct) => (
                      <option key={`${ct.name}-${ct.latitude || ""}`} value={ct.name}>
                        {ct.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="udLabel">Posta Kodu</label>
                  <input
                    className="udInput"
                    value={pform.postalCode}
                    onChange={(e) => setPform((p) => ({ ...p, postalCode: e.target.value }))}
                    placeholder="01000"
                  />
                </div>

                <div>
                  <label className="udLabel">Ülke (ISO)</label>
                  <input className="udInput" value={pform.country} readOnly />
                </div>

                <div className="udSectionTitle">Fatura Bilgileri</div>

                <label className="udCheckRow">
                  <input
                    type="checkbox"
                    checked={invoiceSame}
                    onChange={(e) => setInvoiceSame(e.target.checked)}
                  />
                  <span className="udMuted">Fatura adresi, normal adres ile aynı olsun</span>
                </label>

                <div className="udSpan2">
                  <label className="udLabel">Fatura Adı / Ünvan</label>
                  <input
                    className="udInput"
                    value={pform.invoiceName}
                    onChange={(e) => setPform((p) => ({ ...p, invoiceName: e.target.value }))}
                    placeholder="Ad Soyad veya Şirket"
                  />
                </div>

                <div>
                  <label className="udLabel">Vergi No (opsiyonel)</label>
                  <input
                    className="udInput"
                    value={pform.invoiceTaxNo}
                    onChange={(e) => setPform((p) => ({ ...p, invoiceTaxNo: e.target.value }))}
                    placeholder="VKN/TCKN"
                  />
                </div>

                <div>
                  <label className="udLabel">Vergi Dairesi (opsiyonel)</label>
                  <input
                    className="udInput"
                    value={pform.invoiceTaxOffice}
                    onChange={(e) => setPform((p) => ({ ...p, invoiceTaxOffice: e.target.value }))}
                    placeholder="Seyhan VD"
                  />
                </div>

                <div className="udSpan2">
                  <label className="udLabel">Fatura Adresi</label>
                  <input
                    className="udInput"
                    value={pform.invoiceAddressLine}
                    onChange={(e) =>
                      setPform((p) => ({ ...p, invoiceAddressLine: e.target.value }))
                    }
                    placeholder="Fatura adresi satırı..."
                    disabled={invoiceSame}
                    title={invoiceSame ? "Normal adres ile otomatik dolduruluyor" : ""}
                  />
                </div>

                <div>
                  <label className="udLabel">Fatura İl</label>
                  <input
                    className="udInput"
                    value={pform.invoiceCity}
                    onChange={(e) => setPform((p) => ({ ...p, invoiceCity: e.target.value }))}
                    placeholder="Adana"
                    disabled={invoiceSame}
                  />
                </div>

                <div>
                  <label className="udLabel">Fatura İlçe</label>
                  <input
                    className="udInput"
                    value={pform.invoiceDistrict}
                    onChange={(e) =>
                      setPform((p) => ({ ...p, invoiceDistrict: e.target.value }))
                    }
                    placeholder="Seyhan"
                    disabled={invoiceSame}
                  />
                </div>

                <div>
                  <label className="udLabel">Fatura Posta Kodu</label>
                  <input
                    className="udInput"
                    value={pform.invoicePostalCode}
                    onChange={(e) =>
                      setPform((p) => ({ ...p, invoicePostalCode: e.target.value }))
                    }
                    placeholder="01000"
                    disabled={invoiceSame}
                  />
                </div>

                <div>
                  <label className="udLabel">Fatura Ülke</label>
                  <input
                    className="udInput"
                    value={pform.invoiceCountry}
                    onChange={(e) =>
                      setPform((p) => ({ ...p, invoiceCountry: e.target.value }))
                    }
                    placeholder="TR"
                    disabled={invoiceSame}
                  />
                </div>
              </div>

              <div className="udActions">
                <button
                  className="udBtn primary"
                  type="button"
                  onClick={saveProfile}
                  disabled={busy}
                >
                  {busy ? "Kaydediliyor..." : "Kaydet"}
                </button>

                {invoiceSame ? (
                  <button
                    className="udBtn"
                    type="button"
                    onClick={applyInvoiceSame}
                    disabled={busy}
                    title="Normal adresi fatura alanlarına tekrar kopyala"
                  >
                    Adresi Kopyala
                  </button>
                ) : null}
              </div>

              <div className="udHint">
                Sonraki adım: şifre değiştir, profil foto, KVKK onay, 2FA.
              </div>
            </section>
          )}
        </div>
      </div>

      {toast.show ? <div className={`udToast ${toast.type}`}>{toast.msg}</div> : null}
    </div>
  );
}

/* =========================
   EMPTY BOX
========================= */
function EmptyBox({ title, hint }) {
  return (
    <div className="udEmpty">
      <div className="udEmptyTitle">{title}</div>
      {hint ? <div className="udEmptyHint">{hint}</div> : null}
    </div>
  );
}

/* =========================
   MATRIX UI
========================= */
function MatrixCard({ node, isRoot = false }) {
  return (
    <div className={`udMxCard ${isRoot ? "root" : ""}`}>
      <div className="udMxAvatar">
        {String(node?.username || "U").slice(0, 1).toUpperCase()}
      </div>

      <div className="udMxBody">
        <div className="udMxName">{node?.fullName || node?.username || "—"}</div>
        <div className="udMxUser udMono">@{node?.username || "—"}</div>
      </div>

      <div className="udMxBadges">
        <span className="udBadge info">Lv {node?.level ?? 0}</span>
        {node?.role ? <span className="udBadge muted">{node.role}</span> : null}
      </div>
    </div>
  );
}

function MatrixMiniCard({ node }) {
  return (
    <div className="udMxMini">
      <div className="udMxMiniName">{node?.fullName || node?.username || "—"}</div>
      <div className="udMxMiniUser udMono">@{node?.username || "—"}</div>
    </div>
  );
}

function EmptySlot({ label = "Boş", small = false }) {
  return <div className={`udEmptySlot ${small ? "small" : ""}`}>{label}</div>;
}