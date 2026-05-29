import { useEffect, useMemo, useState } from "react";
import { getMe } from "../api.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./Dashboard.css";

const API = import.meta.env.VITE_API_URL || "/api";

export default function Dashboard() {
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
    if (!career) return "Başlangıç";

    if (typeof career === "object") {
      return career.level || career.name || career.title || "Başlangıç";
    }

    return career;
  };

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [summary, setSummary] = useState({
    balance: 24850,
    monthEarning: 6850,
    totalEarning: 92400,
    teamCount: 27,
    directReferrals: 8,
    career: "Silver",
    licenseStatus: safeText(dashboardT?.active, "Aktif"),
    licenseEndsAt: "2026-12-31",
  });

  const earningsChart = useMemo(
    () => [
      { label: language === "tr" ? "Ocak" : "January", value: 3200 },
      { label: language === "tr" ? "Şubat" : "February", value: 4100 },
      { label: language === "tr" ? "Mart" : "March", value: 5200 },
      { label: language === "tr" ? "Nisan" : "April", value: 6850 },
      { label: language === "tr" ? "Mayıs" : "May", value: 6100 },
      { label: language === "tr" ? "Haziran" : "June", value: 7900 },
    ],
    [language]
  );

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    password: "",
  });

  const [matrixTree] = useState({
    username: user?.username || "sen",
    left: {
      username: "ahmet_team",
      left: {
        username: "elif_network",
        left: { username: "murat_01" },
        right: { username: "zeynep_01" },
      },
      right: {
        username: "kemal_line",
        left: { username: "ayse_01" },
        right: { username: "fatma_01" },
      },
    },
    right: {
      username: "ali_growth",
      left: {
        username: "sena_team",
        left: { username: "burak_01" },
        right: { username: "eda_01" },
      },
      right: {
        username: "kaan_plus",
        left: { username: "emre_01" },
        right: { username: "mine_01" },
      },
    },
  });

  const [unilevelTree] = useState({
    username: user?.username || "sen",
    children: [
      {
        username: "ahmet_team",
        children: [
          {
            username: "elif_network",
            children: [
              { username: "murat_01", children: [] },
              { username: "zeynep_01", children: [] },
            ],
          },
        ],
      },
      {
        username: "ali_growth",
        children: [
          { username: "sena_team", children: [] },
          { username: "kaan_plus", children: [] },
        ],
      },
      {
        username: "mehmet_line",
        children: [{ username: "burak_01", children: [] }],
      },
    ],
  });

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

  const earnings = useMemo(
    () => [
      {
        id: 1,
        title: safeText(
          earningsT?.teamEarning,
          language === "tr" ? "Takım Kazancı" : "Team Earning"
        ),
        source: "ahmet_team",
        amount: 1250,
        date: "2026-04-15",
      },
      {
        id: 2,
        title: safeText(
          earningsT?.directBonus,
          language === "tr" ? "Direkt Bonus" : "Direct Bonus"
        ),
        source: "elif_network",
        amount: 800,
        date: "2026-04-13",
      },
      {
        id: 3,
        title: safeText(
          earningsT?.matrixIncome,
          language === "tr" ? "Matrix Geliri" : "Matrix Income"
        ),
        source: language === "tr" ? "2. seviye dolum" : "2nd level fill",
        amount: 2150,
        date: "2026-04-10",
      },
      {
        id: 4,
        title: safeText(
          earningsT?.salesProfit,
          language === "tr" ? "Satış Kârı" : "Sales Profit"
        ),
        source: language === "tr" ? "fatma_01 siparişi" : "fatma_01 order",
        amount: 640,
        date: "2026-04-08",
      },
    ],
    [earningsT, language]
  );

  const unilevelMembers = useMemo(
    () => [
      {
        username: "ahmet_team",
        level: 1,
        joinDate: "2026-03-18",
        contribution: 850,
        status: safeText(dashboardT?.active, "Aktif"),
      },
      {
        username: "elif_network",
        level: 2,
        joinDate: "2026-03-25",
        contribution: 420,
        status: safeText(dashboardT?.active, "Aktif"),
      },
      {
        username: "ali_growth",
        level: 1,
        joinDate: "2026-03-29",
        contribution: 1200,
        status: safeText(dashboardT?.active, "Aktif"),
      },
      {
        username: "kaan_plus",
        level: 2,
        joinDate: "2026-04-04",
        contribution: 310,
        status: safeText(dashboardT?.passive, "Pasif"),
      },
    ],
    [dashboardT]
  );

  const matrixDailyEarnings = useMemo(
    () => [
      {
        date: "2026-04-10",
        amount: 2150,
        note: language === "tr" ? "2. seviye dolumu" : "2nd level fill",
      },
      {
        date: "2026-04-11",
        amount: 480,
        note: language === "tr" ? "Sol kol hareketi" : "Left branch movement",
      },
      {
        date: "2026-04-12",
        amount: 720,
        note: language === "tr" ? "Sağ kol hareketi" : "Right branch movement",
      },
      {
        date: "2026-04-13",
        amount: 350,
        note: language === "tr" ? "Alt seviye eşleşmesi" : "Lower level match",
      },
      {
        date: "2026-04-14",
        amount: 910,
        note: language === "tr" ? "Matrix bonusu" : "Matrix bonus",
      },
    ],
    [language]
  );

  async function fetchMyOrders() {
    try {
      setOrdersLoading(true);

      const token = localStorage.getItem("accessToken");

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
        throw new Error(data.message || "Siparişler alınamadı");
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Siparişler alınamadı:", error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
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
        console.error("Dashboard kullanıcı verisi alınamadı:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchUser();
    fetchMyOrders();

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
      console.error("Kopyalama hatası:", error);
      alert(safeText(profileT?.copyError, "Kopyalama sırasında hata oluştu"));
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
        language === "tr" ? "Tamamlandı" : "Completed"
      );
    }

    if (status === "shipped") {
      return safeText(
        ordersT?.shipping,
        language === "tr" ? "Kargoda" : "Shipping"
      );
    }

    if (status === "cancelled") {
      return language === "tr" ? "İptal Edildi" : "Cancelled";
    }

    if (status === "pending") {
      return language === "tr" ? "Beklemede" : "Pending";
    }

    return safeText(
      ordersT?.preparing,
      language === "tr" ? "Hazırlanıyor" : "Preparing"
    );
  };

  const getStatusClass = (status) => {
    if (
      status === "completed" ||
      status === safeText(ordersT?.completed, "Tamamlandı")
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
                : safeText(matrixT?.open, "Aç")}
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
                  {safeText(matrixT?.emptySlot, "Boş Slot")}
                </div>
              )}
            </div>

            <div className="matrix-child-slot">
              {node.right ? (
                renderMatrixNode(node.right, level + 1, maxLevel, `${nodeId}-R`)
              ) : (
                <div className="matrix-empty">
                  {safeText(matrixT?.emptySlot, "Boş Slot")}
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
                : safeText(unilevelT?.open, "Aç")}
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
              {safeText(dashboardT?.userPanel, "Kullanıcı Paneli")}
            </div>
            <h1 className="dashboard-hero-title">
              {safeText(dashboardT?.welcome, "Hoş geldin")},{" "}
              {user?.username || user?.fullName || "Kullanıcı"}
            </h1>
            <p className="dashboard-hero-text">
              {safeText(
                dashboardT?.heroText,
                "Paneline hoş geldin. Buradan kazançlarını, ağını ve siparişlerini takip edebilirsin."
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
            {formatMoney(summary.balance)} ₺
          </div>
          <div className="dashboard-stat-sub">
            {safeText(statsT?.balanceSub, "Güncel kullanılabilir bakiyen")}
          </div>
        </div>

        <div className="dashboard-card dashboard-stat-card">
          <div className="dashboard-stat-title">
            {safeText(statsT?.monthEarning, "Aylık Kazanç")}
          </div>
          <div className="dashboard-stat-value">
            {formatMoney(summary.monthEarning)} ₺
          </div>
          <div className="dashboard-stat-sub">
            {safeText(statsT?.monthEarningSub, "Bu ay elde edilen gelir")}
          </div>
        </div>

        <div className="dashboard-card dashboard-stat-card">
          <div className="dashboard-stat-title">
            {safeText(statsT?.totalEarning, "Toplam Kazanç")}
          </div>
          <div className="dashboard-stat-value">
            {formatMoney(summary.totalEarning)} ₺
          </div>
          <div className="dashboard-stat-sub">
            {safeText(
              statsT?.totalEarningSub,
              "Tüm zamanlardaki toplam gelir"
            )}
          </div>
        </div>

        <div className="dashboard-card dashboard-stat-card">
          <div className="dashboard-stat-title">
            {safeText(statsT?.teamCount, "Takım Sayısı")}
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
              ? safeText(profileT?.copied, "Kopyalandı")
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
              {safeText(earningsT?.chartTitle, "Kazanç Grafiği")}
            </h2>
            <p className="dashboard-section-text">
              {safeText(
                earningsT?.chartText,
                "Son aylardaki gelir dağılımını inceleyebilirsin."
              )}
            </p>
          </div>

          <div className="dashboard-pill">
            {safeText(earningsT?.last6Months, "Son 6 Ay")}
          </div>
        </div>

        <div className="dashboard-chart-box">
          {earningsChart.map((item) => (
            <div key={item.label} className="dashboard-chart-item">
              <div className="dashboard-chart-value">
                {formatMoney(item.value)} ₺
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
          {earnings.map((item) => (
            <div key={item.id} className="dashboard-earning-row">
              <div className="dashboard-earning-left">
                <div className="dashboard-list-title">{item.title}</div>
                <div className="dashboard-list-sub">
                  {safeText(earningsT?.source, "Kaynak")}: {item.source}
                </div>
                <div className="dashboard-list-sub">
                  {safeText(earningsT?.date, "Tarih")}: {item.date}
                </div>
              </div>

              <div className="dashboard-amount-positive">
                + {formatMoney(item.amount)} ₺
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
            {safeText(unilevelT?.title, "Ünilevel Ağı")}
          </h2>
          <p className="dashboard-section-text">
            {safeText(
              unilevelT?.text,
              "Alt ekibindeki üyeleri ve katkılarını görüntüleyebilirsin."
            )}
          </p>
        </div>

        <div className="dashboard-unilevel-table">
          {unilevelMembers.map((member, index) => (
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
                  {safeText(unilevelT?.joinDate, "Katılım Tarihi")}:{" "}
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
                + {formatMoney(member.contribution)} ₺
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-card-lite">
          <div className="dashboard-section-head-col">
            <h3 className="dashboard-sub-title">
              {safeText(unilevelT?.treeTitle, "Ünilevel Ağaç")}
            </h3>
            <p className="dashboard-section-text">
              {safeText(
                unilevelT?.treeText,
                "Ağacını katmanlı şekilde görüntüle."
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
            {safeText(matrixT?.title, "Matrix Ağı")}
          </h2>
          <p className="dashboard-section-text">
            {safeText(
              matrixT?.text,
              "2x15 matrix yapını ve günlük gelir hareketlerini takip et."
            )}
          </p>
        </div>

        <div className="network-panel network-panel-blue">
          <div className="network-panel-head">
            <div>
              <h3 className="network-panel-title">
                {safeText(matrixT?.treeTitle, "Matrix Ağacı")}
              </h3>
              <p className="network-panel-text">
                {safeText(
                  matrixT?.treeText,
                  "Ağ yapını katman katman inceleyebilirsin."
                )}
              </p>
            </div>
            <div className="dashboard-pill">
              {safeText(matrixT?.start2, "2 ile Başlar")}
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
                {safeText(matrixT?.maxWidth, "Maksimum Genişlik")}
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
                {safeText(matrixT?.startLevel, "Başlangıç Seviye")}
              </div>
              <div className="network-mini-value">2+</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card-lite">
          <div className="dashboard-section-head-col">
            <h3 className="dashboard-sub-title">
              {safeText(matrixT?.dailyTitle, "Günlük Matrix Geliri")}
            </h3>
            <p className="dashboard-section-text">
              {safeText(
                matrixT?.dailyText,
                "Gün bazlı matrix kazançlarını inceleyebilirsin."
              )}
            </p>
          </div>

          <div className="dashboard-matrix-daily-list">
            {matrixDailyEarnings.map((item, index) => (
              <div
                key={`${item.date}-${index}`}
                className="dashboard-matrix-daily-row"
              >
                <div>
                  <div className="dashboard-list-title">{item.date}</div>
                  <div className="dashboard-list-sub">{item.note}</div>
                </div>

                <div className="dashboard-amount-positive">
                  + {formatMoney(item.amount)} ₺
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
            {safeText(ordersT?.title, "Siparişlerim")}
          </h2>
          <p className="dashboard-section-text">
            {safeText(
              ordersT?.text,
              "Geçmiş ve güncel siparişlerini buradan takip et."
            )}
          </p>
        </div>

        <div className="dashboard-orders">
          {ordersLoading ? (
            <div className="dashboard-empty-text">
              {language === "tr"
                ? "Siparişler yükleniyor..."
                : "Loading orders..."}
            </div>
          ) : orders.length === 0 ? (
            <div className="dashboard-empty-text">
              {language === "tr"
                ? "Henüz siparişin yok."
                : "You do not have any orders yet."}
            </div>
          ) : (
            orders.map((order) => {
              const firstItem = order.items?.[0];
              const productName =
                firstItem?.name || (language === "tr" ? "Sipariş" : "Order");

              const extraCount =
                order.items?.length > 1 ? ` +${order.items.length - 1}` : "";

              const statusText = getStatusText(order.status);

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
                    {formatMoney(order.total)} ₺
                  </div>

                  <div className="dashboard-order-date">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString(
                          language === "tr" ? "tr-TR" : "en-US"
                        )
                      : "-"}
                  </div>

                  <div>
                    <span
                      className={`dashboard-status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {statusText}
                    </span>
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
            {safeText(profileT?.editTitle, "Profili Düzenle")}
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
                {safeText(profileT?.city, "Şehir")}
              </div>
              <input
                name="city"
                value={profileForm.city}
                onChange={handleProfileChange}
                className="dashboard-input"
                placeholder={safeText(profileT?.city, "Şehir")}
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
                {safeText(profileT?.newPassword, "Yeni Şifre")}
              </div>
              <input
                name="password"
                type="password"
                value={profileForm.password}
                onChange={handleProfileChange}
                className="dashboard-input"
                placeholder={safeText(profileT?.newPassword, "Yeni Şifre")}
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
            {safeText(profileT?.summaryTitle, "Profil Özeti")}
          </h2>

          <div className="dashboard-profile-summary">
            <div>
              <div className="dashboard-input-label">
                {safeText(profileT?.username, "Kullanıcı Adı")}
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
            "Hesap ve panel tercihlerini buradan yönetebilirsin."
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
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading-wrap">
        <div className="dashboard-loading-card">
          {safeText(dashboardT?.loading, "Yükleniyor...")}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
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
              onClick={() => setActiveSection("overview")}
            >
              <span>🏠</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.overview, "Genel Bakış")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "earnings" ? "active" : ""
              }`}
              onClick={() => setActiveSection("earnings")}
            >
              <span>💰</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.earnings, "Kazançlar")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "unilevel" ? "active" : ""
              }`}
              onClick={() => setActiveSection("unilevel")}
            >
              <span>🌿</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.unilevel, "Ünilevel")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "matrix" ? "active" : ""
              }`}
              onClick={() => setActiveSection("matrix")}
            >
              <span>🧩</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.matrix, "Matrix")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "orders" ? "active" : ""
              }`}
              onClick={() => setActiveSection("orders")}
            >
              <span>🛒</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.orders, "Siparişler")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "profile" ? "active" : ""
              }`}
              onClick={() => setActiveSection("profile")}
            >
              <span>👤</span>
              {sidebarOpen && (
                <span>{safeText(sectionsT?.profile, "Profil")}</span>
              )}
            </button>

            <button
              type="button"
              className={`dashboard-side-link ${
                activeSection === "settings" ? "active" : ""
              }`}
              onClick={() => setActiveSection("settings")}
            >
              <span>⚙️</span>
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
              : safeText(sidebarT?.expand, "Genişlet")}
          </button>
        </div>
      </aside>

      <main className="dashboard-main-area">
        <div className="dashboard-topbar">
          <button
            type="button"
            className="dashboard-mobile-menu-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            ☰
          </button>

          <div className="dashboard-topbar-title">
            {safeText(dashboardT?.welcome, "Hoş geldin")},{" "}
            {user?.username || "Kullanıcı"}
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