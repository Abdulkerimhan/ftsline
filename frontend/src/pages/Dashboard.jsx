import { useEffect, useMemo, useState } from "react";
import {
  createWithdrawalRequest,
  getMatrixTree,
  getMe,
  getMyEarnings,
  getMyWithdrawals,
  getReferrals,
  updateMyProfile,
  uploadMyAvatar,
} from "../api.js";
import { useI18n } from "../i18n/I18nContext.jsx";
import FAQ from "./FAQ.jsx";
import Academy from "./Academy.jsx";
import "./Dashboard.css";

const API = import.meta.env.VITE_API_URL || "/api";

const UNILEVEL_CAREER_LABELS = {
  NONE: "Başlangıç",
  starter: "Başlangıç",
  BRONZ: "Bronz",
  bronze: "Bronz",
  GUMUS: "Gümüş",
  silver: "Gümüş",
  ALTIN: "Altın",
  gold: "Altın",
  PLATIN: "Platin",
  platinum: "Platin",
  ELMAS: "Elmas",
  diamond: "Elmas",
  TAC_ELMAS: "Taç Elmas",
};

function isUnilevelMemberActive(member) {
  if (member?.isActive !== true || member?.isLicensed !== true) return false;
  if (!member?.licenseExpiresAt) return true;
  return new Date(member.licenseExpiresAt).getTime() >= Date.now();
}

function getUnilevelCareer(member) {
  const currentLevel = member?.career?.level;
  const legacyLevel = member?.careerLevel;
  let level = currentLevel && currentLevel !== "NONE"
    ? currentLevel
    : legacyLevel || currentLevel || "NONE";

  const directActiveCount = (member?.children || []).filter(isUnilevelMemberActive).length;
  if (["NONE", "starter"].includes(level) && directActiveCount >= 2) {
    level = "BRONZ";
  }

  return {
    label: UNILEVEL_CAREER_LABELS[level] || "Başlangıç",
    className: String(level).toLowerCase().replaceAll("_", "-"),
  };
}

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
    const rawLevel = typeof career === "object"
      ? career?.level || career?.name || career?.title
      : career;
    const level = String(rawLevel || "NONE");
    const labels = {
      NONE: "Başlangıç",
      starter: "Başlangıç",
      BRONZ: "Bronz",
      bronze: "Bronz",
      GUMUS: "Gümüş",
      silver: "Gümüş",
      ALTIN: "Altın",
      gold: "Altın",
      PLATIN: "Platin",
      platinum: "Platin",
      ELMAS: "Elmas",
      diamond: "Elmas",
      TAC_ELMAS: "Taç Elmas",
    };

    return labels[level] || level;
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
  const [withdrawalData, setWithdrawalData] = useState({ minimumAmount: 5000, requests: [] });
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [payoutBank, setPayoutBank] = useState({
    accountHolder: "",
    bankName: "",
    iban: "",
  });
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState("");
  const earningsChart = earningData.chart || [];

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    password: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const unilevelTree = useMemo(() => {
    const childrenBySponsor = new Map();

    referrals.forEach((referral) => {
      const sponsorId = String(referral.sponsor?._id || referral.sponsor || "");
      const children = childrenBySponsor.get(sponsorId) || [];
      children.push(referral);
      childrenBySponsor.set(sponsorId, children);
    });

    const buildChildren = (sponsorId, visited = new Set()) =>
      (childrenBySponsor.get(String(sponsorId)) || []).flatMap((member) => {
        const memberId = String(member._id);
        if (!memberId || visited.has(memberId)) return [];
        const nextVisited = new Set(visited);
        nextVisited.add(memberId);
        const children = buildChildren(memberId, nextVisited);
        return [{
          id: memberId,
          username: member.username,
          createdAt: member.createdAt,
          isActive: member.isActive,
          isLicensed: member.isLicensed,
          licenseExpiresAt: member.licenseExpiresAt,
          career: member.career,
          careerLevel: member.careerLevel,
          children,
          totalTeamCount: children.reduce(
            (total, child) => total + 1 + Number(child.totalTeamCount || 0),
            0
          ),
        }];
      });

    return {
      id: String(user?._id || "uniRoot"),
      username: user?.username || "sen",
      children: buildChildren(user?._id),
    };
  }, [referrals, user?._id, user?.username]);

  const [matrixFocusPath, setMatrixFocusPath] = useState(["root"]);

  const [expandedUniNodes, setExpandedUniNodes] = useState({});

  const earningTypeLabels = {
    unilevel_initial: "Ilk ay unilevel hak edisi",
    matrix_monthly: "Aylik matrix hak edisi",
    product_network: "Urun satisi network primi",
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
  const visibleUnilevelMembers = useMemo(() => {
    const visible = [];

    const appendVisible = (nodes, level) => {
      nodes.forEach((node) => {
        const networkActive = isUnilevelMemberActive(node);
        visible.push({
          ...node,
          level,
          networkActive,
          careerDisplay: getUnilevelCareer(node),
          joinDate: node.createdAt
            ? new Date(node.createdAt).toLocaleDateString(
                language === "tr" ? "tr-TR" : "en-US"
              )
            : "-",
          status: networkActive
            ? safeText(dashboardT?.active, "Aktif")
            : safeText(dashboardT?.passive, "Pasif"),
        });

        if (expandedUniNodes[node.id]) {
          appendVisible(node.children || [], level + 1);
        }
      });
    };

    appendVisible(unilevelTree.children || [], 1);
    return visible;
  }, [
    dashboardT?.active,
    dashboardT?.passive,
    expandedUniNodes,
    language,
    unilevelTree,
  ]);
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

  async function fetchReferrals() {
    const data = await getReferrals();
    const referralList = Array.isArray(data) ? data : [];
    const currentUserId = String(user?._id || "");
    const directCount = referralList.filter(
      (referral) =>
        String(referral.sponsor?._id || referral.sponsor || "") === currentUserId
    ).length;
    setReferrals(referralList);
    setSummary((prev) => ({
      ...prev,
      directReferrals: directCount,
      teamCount: Math.max(prev.teamCount || 0, referralList.length),
    }));
  }

  async function fetchMatrixTree() {
    const data = await getMatrixTree();
    if (data?.username) setMatrixTree(data);
  }

  async function fetchEarnings() {
    const [data, withdrawals] = await Promise.all([
      getMyEarnings(),
      getMyWithdrawals().catch(() => ({ minimumAmount: 5000, requests: [] })),
    ]);
    setEarningData(data || { summary: {}, sourceSummary: [], movements: [], chart: [] });
    setWithdrawalData(withdrawals || { minimumAmount: 5000, requests: [] });

    if (data?.summary) {
      setSummary((prev) => ({
        ...prev,
        balance: data.summary.availableBalance ?? prev.balance,
        monthEarning: data.summary.monthlyEarning ?? prev.monthEarning,
        totalEarning: data.summary.totalEarning ?? prev.totalEarning,
      }));
    }
  }

  async function submitWithdrawal(event) {
    event.preventDefault();
    setWithdrawalMessage("");
    setWithdrawalSubmitting(true);
    try {
      const result = await createWithdrawalRequest({
        amount: Number(withdrawalAmount),
        accountHolder: payoutBank.accountHolder.trim(),
        bankName: payoutBank.bankName.trim(),
        iban: payoutBank.iban.trim(),
      });
      setWithdrawalAmount("");
      setPayoutBank({ accountHolder: "", bankName: "", iban: "" });
      setWithdrawalMessage(result.message || "Cekim talebiniz alindi");
      await fetchEarnings();
    } catch (error) {
      setWithdrawalMessage(error.message || "Cekim talebi olusturulamadi");
    } finally {
      setWithdrawalSubmitting(false);
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
            city: data?.address?.city || data?.city || "",
            address:
              data?.address?.addressLine ||
              (typeof data?.address === "string" ? data.address : ""),
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
            career: formatCareer(
              data?.career?.level && data.career.level !== "NONE"
                ? data.career
                : data?.careerLevel || data?.career || prev.career
            ),
            licenseEndsAt:
              data?.licenseEndsAt ||
              data?.licenseExpiresAt ||
              prev.licenseEndsAt,
          }));
        }
      } catch (error) {
        console.error("Dashboard kullanÄ±cÄ± verisi alınamadı:", error);
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

  useEffect(() => {
    if (activeSection !== "earnings") return undefined;

    const refreshEarnings = () => {
      fetchEarnings().catch((error) => {
        console.error("Kazanc verileri yenilenemedi:", error);
      });
    };

    refreshEarnings();
    const refreshTimer = window.setInterval(refreshEarnings, 5000);
    window.addEventListener("focus", refreshEarnings);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshEarnings);
    };
  }, [activeSection]);

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

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage("Lütfen bir görsel dosyası seçin.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage("Profil fotoğrafı en fazla 5 MB olabilir.");
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileMessage("");
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");

    try {
      let updatedUser = await updateMyProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone,
        city: profileForm.city,
        address: profileForm.address,
        password: profileForm.password,
      });

      if (avatarFile) {
        updatedUser = await uploadMyAvatar(avatarFile);
      }

      setUser(updatedUser);
      setProfileForm({
        fullName: updatedUser?.fullName || "",
        email: updatedUser?.email || "",
        phone: updatedUser?.phone || "",
        city: updatedUser?.address?.city || "",
        address: updatedUser?.address?.addressLine || "",
        password: "",
      });
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(null);
      setAvatarPreview("");
      setProfileMessage(
        safeText(profileT?.saveAlert, "Profil bilgileri kaydedildi")
      );
    } catch (error) {
      setProfileMessage(error.message || "Profil bilgileri kaydedilemedi");
    } finally {
      setProfileSaving(false);
    }
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
  const toggleUniNode = (nodeId) => {
    setExpandedUniNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const getMatrixFocus = () => {
    const focusId = matrixFocusPath[matrixFocusPath.length - 1] || "root";
    const directions = focusId.split("-").slice(1);
    let node = matrixTree;

    directions.forEach((direction) => {
      node = direction === "L" ? node?.left : node?.right;
    });

    return {
      node: node || matrixTree,
      nodeId: node ? focusId : "root",
      level: node ? directions.length + 1 : 1,
    };
  };

  const focusMatrixBranch = (nodeId) => {
    setMatrixFocusPath((previous) => {
      const currentId = previous[previous.length - 1] || "root";
      const currentParts = currentId.split("-");
      const targetParts = nodeId.split("-");

      if (
        targetParts.length <= currentParts.length ||
        targetParts.slice(0, currentParts.length).join("-") !== currentId
      ) {
        return [...previous, nodeId];
      }

      const pathSteps = [];
      for (let length = currentParts.length + 1; length <= targetParts.length; length += 1) {
        pathSteps.push(targetParts.slice(0, length).join("-"));
      }

      return [...previous, ...pathSteps];
    });
  };

  const closeMatrixBranch = () => {
    setMatrixFocusPath((previous) =>
      previous.length > 1 ? previous.slice(0, -1) : previous
    );
  };

  const countMatrixTeam = (node) => {
    if (!node) return 0;
    return (node.left ? 1 + countMatrixTeam(node.left) : 0) +
      (node.right ? 1 + countMatrixTeam(node.right) : 0);
  };

  const renderMatrixCard = (node, level, nodeId, isFocus = false) => {
    if (!node) {
      return (
        <div className="matrix-empty">
          {safeText(matrixT?.emptySlot, "Boş Slot")}
        </div>
      );
    }

    const hasChildren = !!(node.left || node.right);
    const teamCount = countMatrixTeam(node);

    return (
      <button
        type="button"
        className={`matrix-node ${isFocus ? "matrix-root" : ""} ${
          hasChildren && !isFocus ? "matrix-clickable matrix-has-team" : "matrix-leaf"
        }`}
        onClick={() => hasChildren && !isFocus && focusMatrixBranch(nodeId)}
        disabled={!hasChildren || isFocus}
      >
        <span className="matrix-card-accent" aria-hidden="true" />
        <span className="matrix-person-icon" aria-hidden="true">&#128100;</span>
        <div className="matrix-node-name">{node.username}</div>
        <div className="matrix-status-badge">
          <span aria-hidden="true" />
          {language === "tr" ? "Aktif" : "Active"}
        </div>
        <div className="matrix-level-badge">
          {safeText(matrixT?.level, "Seviye")} {level}
        </div>
        <div className="matrix-team-count">
          <strong>{teamCount}</strong>
          <span>{language === "tr" ? "alt ekip" : "team below"}</span>
        </div>
        {hasChildren && !isFocus && (
          <div className="matrix-toggle-text">
            {language === "tr" ? "Kolu aç" : "Open branch"}
            <span aria-hidden="true">→</span>
          </div>
        )}
      </button>
    );
  };

  const renderMatrixBranchPreview = (node, level, nodeId) => (
    <div className="matrix-focus-slot">
      {renderMatrixCard(node, level, nodeId)}
      {node && (node.left || node.right) && (
        <div className="matrix-preview-children">
          <div className="matrix-preview-slot">
            {renderMatrixCard(node.left, level + 1, `${nodeId}-L`)}
          </div>
          <div className="matrix-preview-slot">
            {renderMatrixCard(node.right, level + 1, `${nodeId}-R`)}
          </div>
        </div>
      )}
    </div>
  );

  const renderFocusedMatrix = () => {
    const { node, nodeId, level } = getMatrixFocus();
    const canGoBack = matrixFocusPath.length > 1;

    return (
      <div className="matrix-focus-view">
        <div className="matrix-focus-toolbar">
          {canGoBack ? (
            <button type="button" className="matrix-back-button" onClick={closeMatrixBranch}>
              <span aria-hidden="true">←</span>
              {language === "tr" ? "Bir üst kola dön" : "Back one level"}
            </button>
          ) : (
            <span className="matrix-focus-hint">
              {language === "tr"
                ? "Detay için bir kola dokun"
                : "Select a branch to view details"}
            </span>
          )}
          <span className="matrix-focus-depth">
            {safeText(matrixT?.level, "Seviye")} {level}
          </span>
        </div>

        <div className="matrix-focused-node">
          {renderMatrixCard(node, level, nodeId, true)}
        </div>

        {node?.left || node?.right ? (
          <div className="matrix-focus-children">
            {renderMatrixBranchPreview(node?.left, level + 1, `${nodeId}-L`)}
            {renderMatrixBranchPreview(node?.right, level + 1, `${nodeId}-R`)}
          </div>
        ) : (
          <div className="matrix-branch-end">
            {language === "tr"
              ? "Bu kolun altında henüz kullanıcı yok."
              : "No users under this branch yet."}
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
        <div className="dashboard-withdrawal-box">
          <div>
            <h2 className="dashboard-section-title">Çekim Talebi</h2>
            <p className="dashboard-section-text">
              Kullanılabilir bakiye: <strong>{formatMoney(summary.balance)} TL</strong>. Minimum çekim tutarı {formatMoney(withdrawalData.minimumAmount)} TL'dir.
            </p>
          </div>
          <form className="dashboard-withdrawal-form" onSubmit={submitWithdrawal}>
            <strong style={{ flexBasis: "100%" }}>Banka ile Hak Ediş Ödeme Talebi</strong>
            <input
              type="text"
              value={payoutBank.accountHolder}
              onChange={(event) => setPayoutBank((previous) => ({ ...previous, accountHolder: event.target.value }))}
              placeholder="Hesap sahibinin adı soyadı"
              disabled={summary.balance < withdrawalData.minimumAmount || withdrawalSubmitting}
              required
            />
            <input
              type="text"
              value={payoutBank.bankName}
              onChange={(event) => setPayoutBank((previous) => ({ ...previous, bankName: event.target.value }))}
              placeholder="Banka adı"
              disabled={summary.balance < withdrawalData.minimumAmount || withdrawalSubmitting}
              required
            />
            <input
              type="text"
              value={payoutBank.iban}
              onChange={(event) => setPayoutBank((previous) => ({ ...previous, iban: event.target.value.toUpperCase() }))}
              placeholder="TR ile başlayan IBAN"
              maxLength={32}
              disabled={summary.balance < withdrawalData.minimumAmount || withdrawalSubmitting}
              required
            />
            <input
              type="number"
              min={withdrawalData.minimumAmount}
              max={summary.balance}
              step="0.01"
              value={withdrawalAmount}
              onChange={(event) => setWithdrawalAmount(event.target.value)}
              placeholder="Tutar (TL)"
              disabled={summary.balance < withdrawalData.minimumAmount || withdrawalSubmitting}
              required
            />
            <button
              type="submit"
              className="dashboard-btn-primary"
              disabled={summary.balance < withdrawalData.minimumAmount || withdrawalSubmitting || withdrawalData.requests.some((request) => request.status === "pending")}
            >
              {withdrawalSubmitting ? "Gönderiliyor..." : "Çekim Talebi Oluştur"}
            </button>
          </form>
          {summary.balance < withdrawalData.minimumAmount && (
            <div className="dashboard-withdrawal-note">Çekim talebi için bakiyeniz en az 5.000 TL olmalıdır.</div>
          )}
          {withdrawalData.requests.some((request) => request.status === "pending") && (
            <div className="dashboard-withdrawal-note">Bekleyen bir çekim talebiniz bulunuyor.</div>
          )}
          {withdrawalMessage && <div className="dashboard-withdrawal-note">{withdrawalMessage}</div>}
          {withdrawalData.requests.length > 0 && (
            <div className="dashboard-withdrawal-history">
              {withdrawalData.requests.slice(0, 5).map((request) => (
                <div key={request._id}>
                  <strong>{formatMoney(request.amount)} TL</strong>
                  <span>{request.status === "pending" ? "Bekliyor" : request.status === "approved" ? "Ödendi" : "Reddedildi"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

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
          {visibleUnilevelMembers.length === 0 ? (
            <div className="dashboard-empty-text">
              {language === "tr"
                ? "Henüz alt ekibinizde kayıtlı üye yok."
                : "There are no registered members in your team yet."}
            </div>
          ) : visibleUnilevelMembers.map((member) => {
            const hasChildren = member.children?.length > 0;
            const isExpanded = !!expandedUniNodes[member.id];

            return (
            <button
              type="button"
              key={member.id}
              className={`dashboard-unilevel-row ${
                member.networkActive ? "is-active" : "is-passive"
              } ${hasChildren ? "is-clickable" : ""}`}
              style={{ "--unilevel-depth": member.level - 1 }}
              onClick={() => hasChildren && toggleUniNode(member.id)}
              aria-expanded={hasChildren ? isExpanded : undefined}
            >
              <div>
                <div className={`dashboard-list-title dashboard-unilevel-name ${
                  member.networkActive ? "is-active" : "is-passive"
                }`}>
                  <span>{member.username}</span>
                  <span className={`dashboard-career-badge ${member.careerDisplay.className}`}>
                    {member.careerDisplay.label}
                  </span>
                  {member.totalTeamCount > 0 && (
                    <span className="dashboard-team-count">
                      {language === "tr" ? "Alt ekip" : "Team"}: {member.totalTeamCount}
                    </span>
                  )}
                </div>
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

            </button>
            );
          })}
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
              {renderFocusedMatrix()}
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
            <div className="dashboard-avatar-editor">
              <label className="dashboard-avatar-preview dashboard-avatar-preview-selectable">
                {avatarPreview || user?.avatar ? (
                  <img
                    src={avatarPreview || user.avatar}
                    alt="Profil fotoğrafı"
                  />
                ) : (
                  <span>{(user?.fullName || user?.username || "K").charAt(0).toUpperCase()}</span>
                )}
                <span className="dashboard-avatar-camera" aria-hidden="true">&#128247;</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                />
              </label>
              <div className="dashboard-avatar-actions">
                <strong>Profil Fotoğrafı</strong>
                <span>JPG, PNG veya WebP · en fazla 5 MB</span>
                <label className="dashboard-avatar-button">
                  Fotoğraf Seç
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
            </div>
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
              disabled={profileSaving}
            >
              {profileSaving
                ? "Kaydediliyor..."
                : safeText(profileT?.saveProfile, "Profili Kaydet")}
            </button>
            {profileMessage && (
              <div className="dashboard-profile-message">{profileMessage}</div>
            )}
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
      case "academy":
        return <Academy language={language} />;
      case "unilevel":
        return renderUnilevel();
      case "matrix":
        return renderMatrix();
      case "orders":
        return renderOrders();
      case "profile":
        return renderProfile();
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
                activeSection === "academy" ? "active" : ""
              }`}
              onClick={() => selectSection("academy")}
            >
              <span className="dashboard-side-icon">E</span>
              {sidebarOpen && <span>{language === "en" ? "Academy" : "Akademi"}</span>}
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
                <span>{safeText(sectionsT?.orders, "Siparişler")}</span>
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

            <a
              className="dashboard-side-link dashboard-presentation-link"
              href="/downloads/FTSLine-Detayli-Sunum.pptx"
              download="FTSLine-Detayli-Sunum.pptx"
              title="FTSLine sunumunu indir"
            >
              <span className="dashboard-side-icon">S</span>
              {sidebarOpen && <span>FTSLine Sunumu</span>}
            </a>
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

          <button
            type="button"
            className="dashboard-topbar-avatar"
            onClick={() => selectSection("profile")}
            title={language === "tr" ? "Profil fotoğrafını ekle veya değiştir" : "Add or change profile photo"}
            aria-label={language === "tr" ? "Profil fotoğrafını düzenle" : "Edit profile photo"}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profil fotoğrafı" />
            ) : (
              <span>{(user?.fullName || user?.username || "K").charAt(0).toUpperCase()}</span>
            )}
            <span className="dashboard-topbar-avatar-edit" aria-hidden="true">+</span>
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



