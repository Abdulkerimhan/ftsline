import { useEffect, useMemo, useState } from "react";
import { getMatrixTree, getMe, getMyEarnings, getReferrals } from "../api.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import FAQ from "./FAQ.jsx";
import "./Dashboard.css";

const API = import.meta.env.VITE_API_URL || "/api";

export default function Dashboard({ initialSection = "overview" }) {
  const i18n = useI18n() || {};
  const t = i18n.t || {};
  const language = i18n.language || "tr";

  const dashboardT = t?.dashboard || {};
  const earningsT = dashboardT?.earnings || {};
  const ordersT = dashboardT?.orders || {};
  const profileT = dashboardT?.profile || {};
  const matrixT = dashboardT?.matrix || {};
  const unilevelT = dashboardT?.unilevel || {};
  const statsT = dashboardT?.stats || {};
  const settingsT = dashboardT?.settings || {};
  const sidebarT = dashboardT?.sidebar || {};
  const sectionsT = dashboardT?.sections || {};

  const safeText = (value, fallback) =>
    value !== undefined && value !== null && value !== "" ? value : fallback;

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString(language === "tr" ? "tr-TR" : "en-US");

  const formatCareer = (career) => {
    if (!career) return "BaÅŸlangÄ±Ã§";

    if (typeof career === "object") {
      return career.level || career.name || career.title || "BaÅŸlangÄ±Ã§";
    }

    return career;
  };

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth > 980,
  );
  const [activeSection, setActiveSection] = useState(initialSection);

  const selectSection = (section) => {
    setActiveSection(section);
    if (window.innerWidth <= 980) setSidebarOpen(false);
  };

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [matrixTree, setMatrixTree] = useState(() => ({
    username: user?.username || "sen",
    left: null,
    right: null,
  }));

  const [summary, setSummary] = useState({
    balance: 0,
    monthEarning: 0,
    totalEarning: 0,
    teamCount: 0,
    directReferrals: 0,
    career: "",
    licenseStatus: safeText(dashboardT?.passive, "Pasif"),
    licenseEndsAt: null,
  });

  const [earningData, setEarningData] = useState({
    summary: {},
    sourceSummary: [],
    movements: [],
    chart: [],
  });
  const earningsChart = earningData.chart || [];

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    password: "",
  });

  const unilevelTree = useMemo(
    () => ({
      username: user?.username || "sen",
      children: referrals.map((referral) => ({
        username: referral.username,
        children: [],
      })),
    }),
    [referrals, user?.username]
  );

  const [expandedNodes, setExpandedNodes] = useState({
    root: true,
    "root-L": true,
    "root-R": true,
  });

  const [expandedUniNodes, setExpandedUniNodes] = useState({
    uniRoot: true,
    "uniRoot-0": true,
    "uniRoot-1": true,
    "uniRoot-2": true,
  });

  const earningTypeLabels = {
    unilevel_initial: "Ilk ay unilevel hak edisi",
    matrix_monthly: "Aylik matrix hak edisi",
    career_bonus: "Kariyer bonusu",
    pool_bonus: "Havuz bonusu",
    manual_adjustment: "Manuel duzeltme",
  };
  const earnings = (earningData.movements || []).map((item) => ({
    id: item._id,
    title: item.description || earningTypeLabels[item.sourceType] || "Hak edis",
    type: earningTypeLabels[item.sourceType] || item.sourceType || "Hak edis",
    source:
      item.sourceUser?.username ||
      item.sourceUsername ||
      "Onceki kayitlardan gelen",
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleString(language === "tr" ? "tr-TR" : "en-US")
      : "-",
    amount: item.amount,
    depth: item.depth,
    rate: item.rate,
  }));
  const unilevelMembers = useMemo(
    () =>
      referrals.map((referral) => ({
        username: referral.username,
        level: 1,
        joinDate: referral.createdAt
          ? new Date(referral.createdAt).toLocaleDateString(
              language === "tr" ? "tr-TR" : "en-US"
            )
          : "-",
        contribution: 0,
        status: referral.isActive
          ? safeText(dashboardT?.active, "Aktif")
          : safeText(dashboardT?.passive, "Pasif"),
      })),
    [dashboardT?.active, dashboardT?.passive, language, referrals]
  );
  const matrixDailyEarnings = [];

  async function fetchMyOrders() {
    try {
      setOrdersLoading(true);

      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        setOrders([]);
        return;
      }

      const res = await fetch(`${API}/orders/my`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error(data.message || "SipariÅŸler alÄ±namadÄ±");
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("SipariÅŸler alÄ±namadÄ±:", error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function fetchReferrals() {
    const data = await getReferrals();
    const referralList = Array.isArray(data) ? data : [];
    setReferrals(referralList);
    setSummary((prev) => ({
      ...prev,
      directReferrals: referralList.length,
      teamCount: Math.max(prev.teamCount || 0, referralList.length),
    }));
  }

  async function fetchMatrixTree() {
    const data = await getMatrixTree();
    if (data?.username) setMatrixTree(data);
  }

  async function fetchEarnings() {
    const data = await getMyEarnings();
    setEarningData(data || { summary: {}, sourceSummary: [], movements: [], chart: [] });

    if (data?.summary) {
      setSummary((prev) => ({
        ...prev,
        balance: data.summary.availableBalance ?? prev.balance,
        monthEarning: data.summary.monthlyEarning ?? prev.monthEarning,
        totalEarning: data.summary.totalEarning ?? prev.totalEarning,
      }));
    }
  }

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const data = await getMe();
        if (!mounted) return;

        if (data) {
          setUser(data);

          setProfileForm({
            fullName: data?.fullName || "",
            email: data?.email || "",
            phone: data?.phone || "",
            city: data?.city || "",
            address: data?.address || "",
            password: "",
          });

          setSummary((prev) => ({
            ...prev,
            balance: data?.balance ?? prev.balance,
            monthEarning: data?.monthEarning ?? prev.monthEarning,
            totalEarning: data?.totalEarning ?? prev.totalEarning,
            teamCount: data?.teamCount ?? prev.teamCount,
            directReferrals:
              data?.directReferrals ?? data?.directCount ?? prev.directReferrals,
            licenseStatus: data?.isLicensed
              ? safeText(dashboardT?.active, "Aktif")
              : safeText(dashboardT?.passive, "Pasif"),
            career: data?.career ? formatCareer(data.career) : prev.career,
            licenseEndsAt:
              data?.licenseEndsAt ||
              data?.licenseExpiresAt ||
              prev.licenseEndsAt,
          }));
        }
      } catch (error) {
        console.error("Dashboard kullanÄ±cÄ± verisi alÄ±namadÄ±:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchUser();
    fetchMyOrders();
    fetchReferrals();
    fetchMatrixTree();
    fetchEarnings();

    return () => {
      mounted = false;
    };
  }, [dashboardT?.active, dashboardT?.passive]);

  const referralLink = useMemo(() => {
    const username = user?.username || "ftsline";
    return `${window.location.origin}/register?sponsor=${username}`;
  }, [user]);

  const maxChartValue = Math.max(...earningsChart.map((item) => item.value), 1);

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Kopyalama hatasÄ±:", error);
      alert(safeText(profileT?.copyError, "Kopyalama sÄ±rasÄ±nda hata oluÅŸtu"));
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    console.log("Profil kaydet:", profileForm);
    alert(safeText(profileT?.saveAlert, "Profil bilgileri kaydedildi"));
  };

  const getStatusText = (status) => {
    if (status === "completed") {
      return safeText(
        ordersT?.completed,
        language === "tr" ? "TamamlandÄ±" : "Completed"
      );
    }

    if (status === "shipped") {
      return safeText(
        ordersT?.shipping,
        language === "tr" ? "Kargoda" : "Shipping"
      );
    }

    if (status === "cancelled") {
      return language === "tr" ? "Ä°ptal Edildi" : "Cancelled";
    }

    if (status === "pending") {
      return language === "tr" ? "Beklemede" : "Pending";
    }

    return safeText(
      ordersT?.preparing,
      language === "tr" ? "HazÄ±rlanÄ±yor" : "Preparing"
    );
  };

  const getStatusClass = (status) => {
    if (
      status === "completed" ||
      status === safeText(ordersT?.completed, "TamamlandÄ±")
    ) {
      return "status-completed";
    }

    if (
      status === "shipped" ||
      status === safeText(ordersT?.shipping, "Kargoda")
    ) {
      return "status-shipping";
    }

    if (status === "cancelled") {
      return "status-cancelled";
    }

    return "status-preparing";
  };


  const getPaymentStatusText = (paymentStatus) => {
    if (paymentStatus === "paid") return language === "tr" ? "Odendi" : "Paid";
    if (paymentStatus === "failed") return language === "tr" ? "Basarisiz" : "Failed";
    if (paymentStatus === "refunded") return language === "tr" ? "Iade" : "Refunded";
    return language === "tr" ? "Odeme Bekliyor" : "Payment Pending";
  };

  const getPaymentStatusClass = (paymentStatus) => {
    if (paymentStatus === "paid") return "payment-paid";
    if (paymentStatus === "failed") return "payment-failed";
    if (paymentStatus === "refunded") return "payment-refunded";
    return "payment-pending";
  };

  const getPaymentMethodText = (paymentMethod) => {
    if (paymentMethod === "usdt_trc20") return "USDT TRC20";
    if (paymentMethod === "bank_transfer") return language === "tr" ? "Havale / EFT" : "Bank Transfer";
    if (paymentMethod === "cash_on_delivery") return language === "tr" ? "Kapida Odeme" : "Cash on Delivery";
    return language === "tr" ? "Odeme" : "Payment";
  };
  const toggleMatrixNode = (nodeId) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const toggleUniNode = (nodeId) => {
    setExpandedUniNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const renderMatrixNode = (node, level = 1, maxLevel = 15, nodeId = "root") => {
    if (!node || level > maxLevel) return null;

    const hasChildren = !!(node.left || node.right);
    const isExpanded = !!expandedNodes[nodeId];

    return (
      <div className="matrix-node-wrap" key={nodeId}>
        <button
          type="button"
          className={`matrix-node ${level === 1 ? "matrix-root" : ""} ${
            hasChildren ? "matrix-clickable" : ""
          }`}
          onClick={() => hasChildren && toggleMatrixNode(nodeId)}
        >
          <div className="matrix-node-name">{node.username}</div>
          <div className="matrix-level">
            {safeText(matrixT?.level, "Seviye")} {level}
          </div>
          {hasChildren && (
            <div className="matrix-toggle-text">
              {isExpanded
                ? safeText(matrixT?.close, "Kapat")
                : safeText(matrixT?.open, "AÃ§")}
            </div>
          )}
        </button>

        {hasChildren && isExpanded && level < maxLevel && (
          <div className="matrix-children">
            <div className="matrix-child-slot">
              {node.left ? (
                renderMatrixNode(node.left, level + 1, maxLevel, `${nodeId}-L`)
              ) : (
                <div className="matrix-empty">
                  {safeText(matrixT?.emptySlot, "BoÅŸ Slot")}
                </div>
              )}
            </div>

            <div className="matrix-child-slot">
              {node.right ? (
                renderMatrixNode(node.right, level + 1, maxLevel, `${nodeId}-R`)
              ) : (
                <div className="matrix-empty">
                  {safeText(matrixT?.emptySlot, "BoÅŸ Slot")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUniNode = (node, level = 1, nodeId = "uniRoot") => {
    if (!node) return null;

    const hasChildren = !!(node.children && node.children.length > 0);
    const isExpanded = !!expandedUniNodes[nodeId];

    return (
      <div className="uni-node-wrap" key={nodeId}>
        <button
          type="button"
          className={`uni-node ${level === 1 ? "uni-root" : ""} ${
            hasChildren ? "uni-clickable" : ""
          }`}
          onClick={() => hasChildren && toggleUniNode(nodeId)}
        >
          <span className="uni-node-name">{node.username}</span>
          {hasChildren && (
            <span className="uni-toggle-text">
              {isExpanded
                ? safeText(unilevelT?.close, "Kapat")
                : safeText(unilevelT?.open, "AÃ§")}
            </span>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="uni-children">
            {node.children.map((child, index) => (
              <div key={`${child.username}-${index}`}>
                {renderUniNode(child, level + 1, `${nodeId}-${index}`)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOverview = () => (
    <>
      <div className="dashboard-hero">
        <div className="dashboard-hero-top">
          <div>
            <div className="dashboard-hero-badge">
              {safeText(dashboardT?.userPanel, "KullanÄ±cÄ± Paneli")}
            </div>
            <h1 className="dashboard-hero-title">
              {safeText(dashboardT?.welcome, "HoÅŸ geldin")},{" "}
              {user?.username || user?.fullName || "KullanÄ±cÄ±"}
            </h1>
            <p className="dashboard-hero-text">
              {safeText(
                dashboardT?.heroText,
                "Paneline hoÅŸ geldin. Buradan kazanÃ§larÄ±nÄ±, aÄŸÄ±nÄ± ve sipariÅŸlerini takip edebilirsin."
              )}
            </p>
          </div>

          <div className="dashboard-career-box">
            <div className="dashboard-career-label">
              {safeText(dashboardT?.careerLevel, "Kariyer Seviyesi")}
            </div>
            <div className="dashboard-career-value">
              {formatCareer(summary.career)}
            </div>
            <div className="dashboard-career-license">
              {safeText(dashboardT?.license, "Lisans")}:{" "}
              {summary.licenseStatus}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="dashboard-card dashboard-stat-card">
          <div className="dashboard-stat-title">
            {safeText(statsT?.balance, "Bakiye")}
          </div>
          <div className="dashboard-stat-value">
            {formatMoney(summary.balance)} TL
          </div>
          <div className="dashboard-stat-sub">
            {safeText(statsT?.balanceSub, "GÃ¼ncel kullanÄ±labilir bakiyen")}
          </div>
        </div>

        <div className="dashboard-card dashboard-stat-card">
          <div className="dashboard-stat-title">
            {safeText(statsT?.monthEarning, "AylÄ±k KazanÃ§")}
          </div>
          <div className="dashboard-stat-value">
            {formatMoney(summary.monthEarning)} TL
          </div>
          <div className="dashboard-stat-sub">
            {safeText(statsT?.monthEarningSub, "Bu ay elde edilen gelir")}
          </div>
        </div>

        <div className="dashboard-card dashboard-stat-card">
          <div className="dashboard-stat-title">
            {safeText(statsT?.totalEarning, "Toplam KazanÃ§")}
          </div>
          <div className="dashboard-stat-value">
            {formatMoney(summary.totalEarning)} TL
          </div>
          <div className="dashboard-stat-sub">
            {safeText(
              statsT?.totalEarningSub,
              "TÃ¼m zamanlardaki toplam gelir"
            )}
          </div>
        </div>

        <div className="dashboard-card dashboard-stat-card">
          <div className="dashboard-stat-title">
            {safeText(statsT?.teamCount, "TakÄ±m SayÄ±sÄ±")}
          </div>
          <div className="dashboard-stat-value">{summary.teamCount}</div>
          <div className="dashboard-stat-sub">
            {summary.directReferrals}{" "}
            {safeText(statsT?.directReferrals, "direkt referans")}
          </div>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginTop: "20px" }}>
        <div className="dashboard-section-head">
          <div>
            <h2 className="dashboard-section-title">
              {safeText(profileT?.referralTitle, "Referans Linkin")}
            </h2>
            <p className="dashboard-section-text">{referralLink}</p>
          </div>

          <button
            type="button"
            className="dashboard-btn-primary"
            onClick={copyReferral}
          >
            {copied
              ? safeText(profileT?.copied, "KopyalandÄ±")
              : safeText(profileT?.copyLink, "Linki Kopyala")}
          </button>
        </div>
      </div>
    </>
  );

  const renderEarnings = () => (
    <div className="dashboard-content-grid">
      <div className="dashboard-card">
        <div className="dashboard-section-head">
          <div>
            <h2 className="dashboard-section-title">
              {safeText(earningsT?.chartTitle, "KazanÃ§ GrafiÄŸi")}
            </h2>
            <p className="dashboard-section-text">
              {safeText(
                earningsT?.chartText,
                "Son aylardaki gelir daÄŸÄ±lÄ±mÄ±nÄ± inceleyebilirsin."
              )}
            </p>
          </div>

          <div className="dashboard-pill">
            {safeText(earningsT?.last6Months, "Son 6 Ay")}
          </div>
        </div>

        <div className="dashboard-chart-box">
          {earningsChart.length === 0 ? (
            <div className="dashboard-empty-text">
              {language === "tr" ? "Henüz kazanç kaydı yok." : "No earnings yet."}
            </div>
          ) : earningsChart.map((item) => (
            <div key={item.label} className="dashboard-chart-item">
              <div className="dashboard-chart-value">
                {formatMoney(item.value)} TL
              </div>

              <div
                className="dashboard-chart-bar"
                style={{
                  height: `${Math.max((item.value / maxChartValue) * 170, 20)}px`,
                }}
              />

              <div className="dashboard-chart-label">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-list">
          {earnings.length === 0 ? (
            <div className="dashboard-empty-text">
              {language === "tr" ? "Henüz kazanç hareketi yok." : "No earning activity yet."}
            </div>
          ) : earnings.map((item) => (
            <div key={item.id} className="dashboard-earning-row">
              <div className="dashboard-earning-left">
                <div className="dashboard-list-title">{item.title}</div>
                <div className="dashboard-list-sub">
                  {safeText(earningsT?.source, "Kaynak")}: {item.source}
                </div>
                <div className="dashboard-list-sub">Tur: {item.type}</div>
                {(item.depth || item.rate) && (
                  <div className="dashboard-list-sub">
                    {item.depth ? `Seviye: ${item.depth}` : ""}
                    {item.depth && item.rate ? " · " : ""}
                    {item.rate ? `Oran: %${Number((Number(item.rate) * 100).toFixed(2))}` : ""}
                  </div>
                )}
                <div className="dashboard-list-sub">
                  {safeText(earningsT?.date, "Tarih")}: {item.date}
                </div>
              </div>

              <div className="dashboard-amount-positive">
                + {formatMoney(item.amount)} TL
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUnilevel = () => (
    <div className="dashboard-content-grid">
      <div className="dashboard-card">
        <div className="dashboard-section-head-col">
          <h2 className="dashboard-section-title">
            {safeText(unilevelT?.title, "Ãœnilevel AÄŸÄ±")}
          </h2>
          <p className="dashboard-section-text">
            {safeText(
              unilevelT?.text,
              "Alt ekibindeki Ã¼yeleri ve katkÄ±larÄ±nÄ± gÃ¶rÃ¼ntÃ¼leyebilirsin."
            )}
          </p>
        </div>

        <div className="dashboard-unilevel-table">
          {unilevelMembers.length === 0 ? (
            <div className="dashboard-empty-text">
              {language === "tr"
                ? "Henüz alt ekibinizde kayıtlı üye yok."
                : "There are no registered members in your team yet."}
            </div>
          ) : unilevelMembers.map((member, index) => (
            <div
              key={`${member.username}-${index}`}
              className="dashboard-unilevel-row"
            >
              <div>
                <div className="dashboard-list-title">{member.username}</div>
                <div className="dashboard-list-sub">
                  {safeText(unilevelT?.level, "Seviye")}: {member.level}
                </div>
                <div className="dashboard-list-sub">
                  {safeText(unilevelT?.joinDate, "KatÄ±lÄ±m Tarihi")}:{" "}
                  {member.joinDate}
                </div>
              </div>

              <div className="dashboard-unilevel-mid">
                <span
                  className={`dashboard-mini-badge ${
                    member.status === safeText(dashboardT?.active, "Aktif")
                      ? "dashboard-mini-badge-active"
                      : "dashboard-mini-badge-passive"
                  }`}
                >
                  {member.status}
                </span>
              </div>

              <div className="dashboard-amount-positive">
                + {formatMoney(member.contribution)} TL
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-card-lite">
          <div className="dashboard-section-head-col">
            <h3 className="dashboard-sub-title">
              {safeText(unilevelT?.treeTitle, "Ãœnilevel AÄŸaÃ§")}
            </h3>
            <p className="dashboard-section-text">
              {safeText(
                unilevelT?.treeText,
                "AÄŸacÄ±nÄ± katmanlÄ± ÅŸekilde gÃ¶rÃ¼ntÃ¼le."
              )}
            </p>
          </div>

          <div className="uni-scroll">{renderUniNode(unilevelTree, 1, "uniRoot")}</div>
        </div>
      </div>
    </div>
  );

  const renderMatrix = () => (
    <div className="dashboard-content-grid">
      <div className="dashboard-card">
        <div className="dashboard-section-head-col">
          <h2 className="dashboard-section-title">
            {safeText(matrixT?.title, "Matrix AÄŸÄ±")}
          </h2>
          <p className="dashboard-section-text">
            {safeText(
              matrixT?.text,
              "2x15 matrix yapÄ±nÄ± ve gÃ¼nlÃ¼k gelir hareketlerini takip et."
            )}
          </p>
        </div>

        <div className="network-panel network-panel-blue">
          <div className="network-panel-head">
            <div>
              <h3 className="network-panel-title">
                {safeText(matrixT?.treeTitle, "Matrix AÄŸacÄ±")}
              </h3>
              <p className="network-panel-text">
                {safeText(
                  matrixT?.treeText,
                  "AÄŸ yapÄ±nÄ± katman katman inceleyebilirsin."
                )}
              </p>
            </div>
            <div className="dashboard-pill">
              {safeText(matrixT?.start2, "2 ile BaÅŸlar")}
            </div>
          </div>

          <div className="matrix-scroll">
            <div className="matrix-min-width">
              {renderMatrixNode(matrixTree, 1, 15, "root")}
            </div>
          </div>

          <div className="network-stats">
            <div className="network-mini-card">
              <div className="network-mini-label">
                {safeText(matrixT?.maxWidth, "Maksimum GeniÅŸlik")}
              </div>
              <div className="network-mini-value">2</div>
            </div>

            <div className="network-mini-card">
              <div className="network-mini-label">
                {safeText(matrixT?.maxDepth, "Maksimum Derinlik")}
              </div>
              <div className="network-mini-value">15</div>
            </div>

            <div className="network-mini-card">
              <div className="network-mini-label">
                {safeText(matrixT?.startLevel, "BaÅŸlangÄ±Ã§ Seviye")}
              </div>
              <div className="network-mini-value">2+</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card-lite">
          <div className="dashboard-section-head-col">
            <h3 className="dashboard-sub-title">
              {safeText(matrixT?.dailyTitle, "GÃ¼nlÃ¼k Matrix Geliri")}
            </h3>
            <p className="dashboard-section-text">
              {safeText(
                matrixT?.dailyText,
                "GÃ¼n bazlÄ± matrix kazanÃ§larÄ±nÄ± inceleyebilirsin."
              )}
            </p>
          </div>

          <div className="dashboard-matrix-daily-list">
            {matrixDailyEarnings.length === 0 ? (
              <div className="dashboard-empty-text">
                {language === "tr"
                  ? "Henüz matrix kazanç kaydı yok."
                  : "No matrix earnings yet."}
              </div>
            ) : matrixDailyEarnings.map((item, index) => (
              <div
                key={`${item.date}-${index}`}
                className="dashboard-matrix-daily-row"
              >
                <div>
                  <div className="dashboard-list-title">{item.date}</div>
                  <div className="dashboard-list-sub">{item.note}</div>
                </div>

                <div className="dashboard-amount-positive">
                  + {formatMoney(item.amount)} TL
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="dashboard-content-grid">
      <div className="dashboard-card">
        <div className="dashboard-section-head-col">
          <h2 className="dashboard-section-title">
            {safeText(ordersT?.title, "SipariÅŸlerim")}
          </h2>
          <p className="dashboard-section-text">
            {safeText(
              ordersT?.text,
              "GeÃ§miÅŸ ve gÃ¼ncel sipariÅŸlerini buradan takip et."
            )}
          </p>
        </div>

        <div className="dashboard-orders">
          {ordersLoading ? (
            <div className="dashboard-empty-text">
              {language === "tr"
                ? "SipariÅŸler yÃ¼kleniyor..."
                : "Loading orders..."}
            </div>
          ) : orders.length === 0 ? (
            <div className="dashboard-empty-text">
              {language === "tr"
                ? "HenÃ¼z sipariÅŸin yok."
                : "You do not have any orders yet."}
            </div>
          ) : (
            orders.map((order) => {
              const firstItem = order.items?.[0];
              const productName =
                firstItem?.name || (language === "tr" ? "SipariÅŸ" : "Order");

              const extraCount =
                order.items?.length > 1 ? ` +${order.items.length - 1}` : "";

              const statusText = getStatusText(order.status);
              const paymentStatusText = getPaymentStatusText(order.paymentStatus);
              const paymentMethodText = getPaymentMethodText(order.paymentMethod);

              return (
                <div key={order._id} className="dashboard-order-row">
                  <div>
                    <div className="dashboard-list-title">
                      {productName}
                      {extraCount}
                    </div>
                    <div className="dashboard-list-sub">
                      #{String(order._id).slice(-8).toUpperCase()}
                    </div>
                  </div>

                  <div className="dashboard-order-price">
                    {formatMoney(order.total)} TL
                  </div>

                  <div className="dashboard-order-date">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString(
                          language === "tr" ? "tr-TR" : "en-US"
                        )
                      : "-"}
                  </div>

                  <div className="dashboard-order-statuses">
                    <span
                      className={`dashboard-status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {statusText}
                    </span>
                    <span
                      className={`dashboard-payment-status ${getPaymentStatusClass(
                        order.paymentStatus
                      )}`}
                    >
                      {paymentStatusText}
                    </span>
                    <small>{paymentMethodText}</small>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="dashboard-main-grid">
      <div className="dashboard-left-col">
        <div className="dashboard-card">
          <h2 className="dashboard-section-title">
            {safeText(profileT?.editTitle, "Profili DÃ¼zenle")}
          </h2>

          <form onSubmit={handleProfileSave} className="dashboard-form">
            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.fullName, "Ad Soyad")}
              </div>
              <input
                name="fullName"
                value={profileForm.fullName}
                onChange={handleProfileChange}
                className="dashboard-input"
                placeholder={safeText(profileT?.fullName, "Ad Soyad")}
              />
            </div>

            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.email, "E-posta")}
              </div>
              <input
                name="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                className="dashboard-input"
                placeholder={safeText(profileT?.email, "E-posta")}
              />
            </div>

            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.phone, "Telefon")}
              </div>
              <input
                name="phone"
                value={profileForm.phone}
                onChange={handleProfileChange}
                className="dashboard-input"
                placeholder={safeText(profileT?.phone, "Telefon")}
              />
            </div>

            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.city, "Åehir")}
              </div>
              <input
                name="city"
                value={profileForm.city}
                onChange={handleProfileChange}
                className="dashboard-input"
                placeholder={safeText(profileT?.city, "Åehir")}
              />
            </div>

            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.address, "Adres")}
              </div>
              <textarea
                name="address"
                value={profileForm.address}
                onChange={handleProfileChange}
                className="dashboard-input dashboard-textarea"
                placeholder={safeText(profileT?.address, "Adres")}
              />
            </div>

            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.newPassword, "Yeni Åifre")}
              </div>
              <input
                name="password"
                type="password"
                value={profileForm.password}
                onChange={handleProfileChange}
                className="dashboard-input"
                placeholder={safeText(profileT?.newPassword, "Yeni Åifre")}
              />
            </div>

            <button
              type="submit"
              className="dashboard-btn-primary dashboard-btn-full"
            >
              {safeText(profileT?.saveProfile, "Profili Kaydet")}
            </button>
          </form>
        </div>
      </div>

      <div className="dashboard-right-col">
        <div className="dashboard-card">
          <h2 className="dashboard-section-title">
            {safeText(profileT?.summaryTitle, "Profil Ã–zeti")}
          </h2>

          <div className="dashboard-profile-summary">
            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.username, "KullanÄ±cÄ± AdÄ±")}
              </div>
              <div className="dashboard-summary-value">
                {user?.username || "-"}
              </div>
            </div>

            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.fullName, "Ad Soyad")}
              </div>
              <div className="dashboard-summary-value">
                {user?.fullName || "-"}
              </div>
            </div>

            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.email, "E-posta")}
              </div>
              <div className="dashboard-summary-value">
                {user?.email || "-"}
              </div>
            </div>

            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.role, "Rol")}
              </div>
              <div className="dashboard-summary-value">
                {user?.role || "user"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="dashboard-content-grid">
      <div className="dashboard-card">
        <h2 className="dashboard-section-title">
          {safeText(settingsT?.title, "Ayarlar")}
        </h2>
        <p className="dashboard-section-text">
          {safeText(
            settingsT?.text,
            "Hesap ve panel tercihlerini buradan yÃ¶netebilirsin."
          )}
        </p>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "earnings":
        return renderEarnings();
      case "unilevel":
        return renderUnilevel();
      case "matrix":
        return renderMatrix();
      case "orders":
        return renderOrders();
      case "profile":
        return renderProfile();
      case "settings":
        return renderSettings();
      case "faq":
        return <FAQ embedded />;
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading-wrap">
        <div className="dashboard-loading-card">
          {safeText(dashboardT?.loading, "YÃ¼kleniyor...")}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="dashboard-sidebar-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div>
          <div className="dashboard-sidebar-top">
            <div className="dashboard-sidebar-logo">
              <img
                src="/ftsline.png"
                alt="FTSLine Logo"
                className="dashboard-sidebar-logo-img"
              />
            </div>

            {sidebarOpen && (
              <div className="dashboard-sidebar-brand">
                <strong>FTSLine</strong>
                <span>{safeText(sidebarT?.brandSub, "Premium Panel")}</span>
              </div>
            )}
          </div>

          <nav className="dashboard-sidebar-nav">
            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "overview" ? "active" : ""
              }`}
              onClick={() => selectSection("overview")}
            >
              <span className="dashboard-side-icon">G</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.overview, "Genel BakÄ±ÅŸ")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "earnings" ? "active" : ""
              }`}
              onClick={() => selectSection("earnings")}
            >
              <span className="dashboard-side-icon">K</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.earnings, "KazanÃ§lar")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "unilevel" ? "active" : ""
              }`}
              onClick={() => selectSection("unilevel")}
            >
              <span className="dashboard-side-icon">U</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.unilevel, "Ãœnilevel")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "matrix" ? "active" : ""
              }`}
              onClick={() => selectSection("matrix")}
            >
              <span className="dashboard-side-icon">M</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.matrix, "Matrix")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "orders" ? "active" : ""
              }`}
              onClick={() => selectSection("orders")}
            >
              <span className="dashboard-side-icon">S</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.orders, "SipariÅŸler")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "profile" ? "active" : ""
              }`}
              onClick={() => selectSection("profile")}
            >
              <span className="dashboard-side-icon">P</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.profile, "Profil")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "faq" ? "active" : ""
              }`}
              onClick={() => selectSection("faq")}
            >
              <span className="dashboard-side-icon">?</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.faq, "SSS")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "settings" ? "active" : ""
              }`}
              onClick={() => selectSection("settings")}
            >
              <span className="dashboard-side-icon">A</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.settings, "Ayarlar")}</span>
              )}
            </button>
          </nav>
        </div>

        <div className="dashboard-sidebar-bottom">
          <button
            type="button"
            className="dashboard-sidebar-toggle"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            {sidebarOpen
              ? safeText(sidebarT?.collapse, "Daralt")
              : safeText(sidebarT?.expand, "GeniÅŸlet")}
          </button>
        </div>
      </aside>

      <main className="dashboard-main-area">
        <div className="dashboard-topbar">
          <button
            type="button"
            className="dashboard-mobile-menu-btn"
            aria-label="Menu"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="dashboard-topbar-title">
            {safeText(dashboardT?.welcome, "HoÅŸ geldin")},{" "}
            {user?.username || "KullanÄ±cÄ±"}
          </div>
        </div>

        <div className="dashboard-page">
          <div className="dashboard-container dashboard-container-wide">
            {renderSectionContent()}
          </div>
        </div>
      </main>
    </div>
  );
}



