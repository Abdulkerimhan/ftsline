// src/pages/SuperadminDashboard.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/http.js";
import "./SuperadminDashboard.css";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

/* =========================
   FALLBACK PERMISSIONS CATALOG
========================= */
const FALLBACK_PERM_CATALOG = [
  { group: "Muhasebe", items: ["finance.view", "finance.export"] },
  { group: "Ürünler", items: ["products.view", "products.create", "products.update", "products.delete"] },
  { group: "Sipariş", items: ["orders.view", "orders.update_status"] },
  { group: "Kullanıcı", items: ["users.view"] },
  { group: "Network", items: ["network.view_all"] },
  { group: "Loglar", items: ["logs.view"] },
];

const TABS = [
  { key: "overview", label: "Özet", icon: "📌" },
  { key: "users", label: "Kullanıcılar", icon: "👥" },
  { key: "products", label: "Ürünler", icon: "🛍️" },
  { key: "payments", label: "Ödemeler", icon: "💸" },
  { key: "finance", label: "Finans / Ledger", icon: "💳" },
  { key: "network", label: "Matrix / Unilevel", icon: "🧩" },
  { key: "settings", label: "Ayarlar", icon: "⚙️" },
];

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString("tr-TR");
}

function toInputDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtTry(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("tr-TR") + "₺";
}

function Badge({ children, tone = "glass" }) {
  return <span className={`saBadge ${tone}`}>{children}</span>;
}

function Btn({ children, variant = "primary", ...props }) {
  return (
    <button className={`saBtn ${variant}`} {...props}>
      {children}
    </button>
  );
}

function Card({ title, right, children }) {
  return (
    <section className="saCard">
      <div className="saCardHead">
        <div className="saCardTitle">{title}</div>
        {right ? <div className="saCardRight">{right}</div> : null}
      </div>
      <div className="saCardBody">{children}</div>
    </section>
  );
}

function toggleArray(arr, value) {
  const s = new Set(Array.isArray(arr) ? arr : []);
  if (s.has(value)) s.delete(value);
  else s.add(value);
  return Array.from(s);
}

/* =========================
   IMAGE HELPERS
========================= */
function splitLinesToUrls(text) {
  return String(text || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function safeRevoke(urls = []) {
  try {
    urls.forEach((u) => {
      if (typeof u === "string" && u.startsWith("blob:")) URL.revokeObjectURL(u);
    });
  } catch {
    /* ignore */
  }
}

function getAccessToken() {
  try {
    return localStorage.getItem("accessToken") || "";
  } catch {
    return "";
  }
}

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* =========================
   RAW API (POST/PUT/DELETE)
========================= */
async function apiRaw(method, path, body) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const token = getAccessToken();

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = undefined;

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (body instanceof FormData) {
    payload = body;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: payload,
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

// Optional upload (backend'de /api/upload varsa)
async function uploadFilesOptional(files = []) {
  const token = getAccessToken();
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));

  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Upload HTTP ${res.status}`);

  const urls = Array.isArray(data?.urls) ? data.urls : [];
  return urls.map(String).filter(Boolean);
}

/* =========================
   NETWORK HELPERS
========================= */
function buildLevels({ nodes = [], edges = [], rootId }) {
  const byId = new Map((nodes || []).map((n) => [String(n?.id ?? n?._id ?? ""), n]));
  const children = new Map();

  for (const e of edges || []) {
    const from = String(e?.from ?? "");
    const to = String(e?.to ?? "");
    if (!from || !to) continue;
    if (!children.has(from)) children.set(from, []);
    children.get(from).push({ to, slot: e?.slot ?? null });
  }

  for (const [k, arr] of children.entries()) {
    arr.sort((a, b) => {
      const as = a.slot ?? 9999;
      const bs = b.slot ?? 9999;
      if (as !== bs) return as - bs;
      return String(a.to).localeCompare(String(b.to));
    });
    children.set(k, arr);
  }

  const root = String(rootId || "");
  const out = [];
  const seen = new Set();
  const q = [{ id: root, level: 0 }];

  while (q.length) {
    const cur = q.shift();
    const id = String(cur.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const node = byId.get(id);
    if (node) out.push({ ...node, _level: cur.level });

    const kids = children.get(id) || [];
    for (const k of kids) q.push({ id: k.to, level: cur.level + 1 });
  }

  return out;
}

function treeToGraph(tree) {
  const nodes = [];
  const edges = [];

  function walk(node, parentId = null, slot = null) {
    if (!node) return;

    const id = String(node.id || node._id || "");
    if (!id) return;

    nodes.push({
      id,
      _id: id,
      username: node.username || "",
      fullName: node.fullName || "",
      email: node.email || "",
      role: node.role || "user",
      isLicensed: !!node.isLicensed,
      teamCount: Number(node.teamCount || 0),
      sponsor: node.sponsor || null,
      createdAt: node.createdAt || null,
      slot,
    });

    if (parentId) {
      edges.push({
        from: String(parentId),
        to: id,
        slot,
      });
    }

    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach((child, index) => {
      walk(child, id, index + 1);
    });
  }

  walk(tree);

  return {
    nodes,
    edges,
    rootUserId: tree?.id ? String(tree.id) : "",
  };
}

export default function SuperadminDashboard() {
  const nav = useNavigate();

  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const activeTab = useMemo(() => TABS.find((t) => t.key === tab) || TABS[0], [tab]);

  // request cancel
  const abortRef = useRef(null);
  const startRequest = useCallback(() => {
    try {
      abortRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  /* =========================
     PERMS CATALOG (from backend optional)
  ========================= */
  const [permCatalog, setPermCatalog] = useState(FALLBACK_PERM_CATALOG);

  const loadPermCatalog = useCallback(async () => {
    try {
      const r = await apiGet("/api/superadmin/permissions/catalog");
      const cat = Array.isArray(r?.catalog) ? r.catalog : null;
      if (cat?.length) setPermCatalog(cat);
    } catch {
      /* fallback */
    }
  }, []);

  /* =========================
     OVERVIEW (CHARTS) state
  ========================= */
  const [ov, setOv] = useState({
    kpis: {
      usersTotal: 0,
      usersActive: 0,
      productsTotal: 0,
      productsActive: 0,
      revenueTotal: 0,
      ordersTotal: 0,
    },
    revenueSeries: [],
    ordersSeries: [],
    rolePie: [],
    licensePie: [],
    topCategories: [],
  });

  const PIE_COLORS = [
    "rgba(47,107,255,.95)",
    "rgba(31,213,255,.90)",
    "rgba(24,213,139,.90)",
    "rgba(255,176,32,.90)",
    "rgba(255,90,120,.90)",
    "rgba(160,140,255,.90)",
  ];

  const loadOverview = useCallback(async () => {
    const signal = startRequest();
    setBusy(true);
    setError("");

    try {
      let data = null;

      try {
        data = await apiGet("/api/superadmin/overview");
      } catch {
        /* ignore */
      }

      if (signal.aborted) return;

      if (!data) {
        let uItems = [];
        try {
          const ur = await apiGet(`/api/superadmin/users?page=1&limit=500`);
          uItems = Array.isArray(ur?.items) ? ur.items : [];
        } catch {
          /* ignore */
        }

        if (signal.aborted) return;

        let pItems = [];
        try {
          const pr = await apiGet(`/api/superadmin/products?page=1&limit=500`);
          pItems = Array.isArray(pr?.items) ? pr.items : [];
        } catch {
          /* ignore */
        }

        if (signal.aborted) return;

        const usersTotal = uItems.length;
        const usersActive = uItems.filter((x) => x?.isActive !== false).length;

        const productsTotal = pItems.length;
        const productsActive = pItems.filter((x) => x?.isActive !== false).length;

        const roleCounts = uItems.reduce((acc, u) => {
          const r = String(u?.role || "user");
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        }, {});
        const rolePie = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));

        const licCounts = uItems.reduce(
          (acc, u) => {
            if (u?.isLicensed) acc.licensed += 1;
            else acc.unlicensed += 1;
            return acc;
          },
          { licensed: 0, unlicensed: 0 }
        );
        const licensePie = [
          { name: "Lisanslı", value: licCounts.licensed },
          { name: "Lisanssız", value: licCounts.unlicensed },
        ];

        const catCounts = pItems.reduce((acc, p) => {
          const c = String(p?.category || "Diğer");
          acc[c] = (acc[c] || 0) + 1;
          return acc;
        }, {});
        const topCategories = Object.entries(catCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

        const revenueSeries = [
          { label: "Pzt", value: 0 },
          { label: "Sal", value: 0 },
          { label: "Çar", value: 0 },
          { label: "Per", value: 0 },
          { label: "Cum", value: 0 },
          { label: "Cmt", value: 0 },
          { label: "Paz", value: 0 },
        ];

        const ordersSeries = [
          { label: "Pzt", value: 0 },
          { label: "Sal", value: 0 },
          { label: "Çar", value: 0 },
          { label: "Per", value: 0 },
          { label: "Cum", value: 0 },
          { label: "Cmt", value: 0 },
          { label: "Paz", value: 0 },
        ];

        data = {
          kpis: {
            usersTotal,
            usersActive,
            productsTotal,
            productsActive,
            revenueTotal: 0,
            ordersTotal: 0,
          },
          revenueSeries,
          ordersSeries,
          rolePie,
          licensePie,
          topCategories,
        };
      }

      if (signal.aborted) return;

      setOv((prev) => ({
        ...prev,
        ...data,
        kpis: { ...prev.kpis, ...(data?.kpis || {}) },
      }));
    } catch (e) {
      if (!String(e?.name || "").includes("Abort")) setError(e?.message || "Overview load failed");
    } finally {
      if (!abortRef.current?.signal?.aborted) setBusy(false);
    }
  }, [startRequest]);

  /* =========================
     USERS state
  ========================= */
  const [uq, setUq] = useState("");
  const [uRole, setURole] = useState("");
  const [uLicensed, setULicensed] = useState("");
  const [uActive, setUActive] = useState("");
  const [uPage, setUPage] = useState(1);
  const [uLimit] = useState(20);

  const [users, setUsers] = useState([]);
  const [uTotal, setUTotal] = useState(0);
  const [uPages, setUPages] = useState(1);

  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // edit user form
  const [editRole, setEditRole] = useState("user");
  const [editActive, setEditActive] = useState(true);
  const [editExpires, setEditExpires] = useState("");
  const [editPerms, setEditPerms] = useState([]);
  const [licenseMonths, setLicenseMonths] = useState(12);

  const selectedId = selected?._id ? String(selected._id) : "";

  const openUser = useCallback((u) => {
    setSelected(u);
    setPanelOpen(true);

    setEditRole(u?.role || "user");
    setEditActive(u?.isActive !== false);
    setEditExpires(toInputDate(u?.licenseExpiresAt));
    setEditPerms(Array.isArray(u?.permissions) ? u.permissions : []);
    setLicenseMonths(12);
  }, []);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const loadUsers = useCallback(async () => {
    const signal = startRequest();
    setBusy(true);
    setError("");
    try {
      const sp = new URLSearchParams();
      if (uq.trim()) sp.set("q", uq.trim());
      if (uRole) sp.set("role", uRole);
      if (uLicensed) sp.set("licensed", uLicensed);
      if (uActive) sp.set("active", uActive);

      sp.set("page", String(uPage));
      sp.set("limit", String(uLimit));

      const r = await apiGet(`/api/superadmin/users?${sp.toString()}`);
      if (signal.aborted) return;

      const items = Array.isArray(r?.items) ? r.items : [];
      const total = Number(r?.total || items.length || 0);
      const pages = Number(r?.pages || Math.max(1, Math.ceil(total / uLimit)) || 1);

      setUsers(items);
      setUTotal(total);
      setUPages(pages);

      if (selectedId) {
        const fresh = items.find((x) => String(x?._id || "") === selectedId);
        if (fresh) {
          setSelected(fresh);
          setEditRole(fresh.role || "user");
          setEditActive(fresh.isActive !== false);
          setEditExpires(toInputDate(fresh.licenseExpiresAt));
          setEditPerms(Array.isArray(fresh.permissions) ? fresh.permissions : []);
        }
      }
    } catch (e) {
      if (!String(e?.name || "").includes("Abort")) setError(e?.message || "Users load failed");
    } finally {
      if (!abortRef.current?.signal?.aborted) setBusy(false);
    }
  }, [startRequest, uq, uRole, uLicensed, uActive, uPage, uLimit, selectedId]);

  const saveUserBasics = useCallback(async () => {
    if (!selected?._id) return;
    setBusy(true);
    setError("");
    try {
      await apiRaw("PUT", `/api/superadmin/users/${selected._id}`, {
        role: editRole,
        isActive: editActive,
      });
      await loadUsers();
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }, [selected, editRole, editActive, loadUsers]);

  const grantLicense = useCallback(async () => {
    if (!selected?._id) return;
    setBusy(true);
    setError("");
    try {
      const months = Math.max(1, Number(licenseMonths || 12));

      await apiRaw("PUT", `/api/superadmin/users/${selected._id}/license`, {
        isLicensed: true,
        months,
      });

      await loadUsers();
      await loadOverview();
    } catch (e) {
      setError(e?.message || "Lisans verme başarısız");
    } finally {
      setBusy(false);
    }
  }, [selected, licenseMonths, loadUsers, loadOverview]);

  const removeLicense = useCallback(async () => {
    if (!selected?._id) return;
    setBusy(true);
    setError("");
    try {
      await apiRaw("PUT", `/api/superadmin/users/${selected._id}/license`, {
        isLicensed: false,
      });

      await loadUsers();
      await loadOverview();
    } catch (e) {
      setError(e?.message || "Lisans kaldırma başarısız");
    } finally {
      setBusy(false);
    }
  }, [selected, loadUsers, loadOverview]);

  const saveLicenseDateDirect = useCallback(async () => {
    if (!selected?._id) return;
    setBusy(true);
    setError("");
    try {
      await apiRaw("PUT", `/api/superadmin/users/${selected._id}`, {
        isLicensed: true,
        licenseExpiresAt: editExpires ? new Date(editExpires).toISOString() : null,
      });

      await loadUsers();
      await loadOverview();
    } catch (e) {
      setError(e?.message || "Lisans tarihi kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }, [selected, editExpires, loadUsers, loadOverview]);

  const saveAdminPerms = useCallback(async () => {
    if (!selected?._id) return;
    setBusy(true);
    setError("");
    try {
      await apiRaw("PUT", `/api/superadmin/admin-perms/${selected._id}`, {
        permissions: editPerms,
      });
      await loadUsers();
    } catch (e) {
      setError(e?.message || "Perm save failed");
    } finally {
      setBusy(false);
    }
  }, [selected, editPerms, loadUsers]);

  /* =========================
     PAYMENTS state
  ========================= */
  const [payQ, setPayQ] = useState("");
  const [payStatus, setPayStatus] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payPage, setPayPage] = useState(1);
  const [payLimit] = useState(20);

  const [payments, setPayments] = useState([]);
  const [payTotal, setPayTotal] = useState(0);
  const [payPages, setPayPages] = useState(1);

  const [paySelected, setPaySelected] = useState(null);
  const [payPanelOpen, setPayPanelOpen] = useState(false);
  const [payAdminNote, setPayAdminNote] = useState("");

  const closePaymentPanel = useCallback(() => {
    setPayPanelOpen(false);
    setPaySelected(null);
    setPayAdminNote("");
  }, []);

  const openPayment = useCallback((p) => {
    setPaySelected(p);
    setPayPanelOpen(true);
    setPayAdminNote(p?.adminNote || "");
  }, []);

  const loadPayments = useCallback(async () => {
    const signal = startRequest();
    setBusy(true);
    setError("");

    try {
      const sp = new URLSearchParams();
      if (payQ.trim()) sp.set("q", payQ.trim());
      if (payStatus) sp.set("status", payStatus);
      if (payMethod) sp.set("method", payMethod);
      sp.set("page", String(payPage));
      sp.set("limit", String(payLimit));

      const r = await apiGet(`/api/superadmin/payments?${sp.toString()}`);
      if (signal.aborted) return;

      const items = Array.isArray(r?.items) ? r.items : [];
      const total = Number(r?.total || 0);
      const pages = Number(r?.pages || 1);

      setPayments(items);
      setPayTotal(total);
      setPayPages(Math.max(1, pages));

      if (paySelected?._id) {
        const fresh = items.find((x) => String(x?._id || "") === String(paySelected?._id || ""));
        if (fresh) {
          setPaySelected(fresh);
          setPayAdminNote(fresh?.adminNote || "");
        }
      }
    } catch (e) {
      if (!String(e?.name || "").includes("Abort")) {
        setError(e?.message || "Payments load failed");
      }
    } finally {
      if (!abortRef.current?.signal?.aborted) setBusy(false);
    }
  }, [startRequest, payQ, payStatus, payMethod, payPage, payLimit, paySelected]);

  const approvePayment = useCallback(async () => {
    if (!paySelected?._id) return;
    setBusy(true);
    setError("");

    try {
      await apiRaw("PUT", `/api/superadmin/payments/${paySelected._id}/approve`, {
        adminNote: payAdminNote,
      });
      await loadPayments();
      await loadUsers();
      await loadOverview();
    } catch (e) {
      setError(e?.message || "Ödeme onaylanamadı");
    } finally {
      setBusy(false);
    }
  }, [paySelected, payAdminNote, loadPayments, loadUsers, loadOverview]);

  const rejectPayment = useCallback(async () => {
    if (!paySelected?._id) return;
    setBusy(true);
    setError("");

    try {
      await apiRaw("PUT", `/api/superadmin/payments/${paySelected._id}/reject`, {
        adminNote: payAdminNote,
      });
      await loadPayments();
    } catch (e) {
      setError(e?.message || "Ödeme reddedilemedi");
    } finally {
      setBusy(false);
    }
  }, [paySelected, payAdminNote, loadPayments]);

  /* =========================
     PRODUCTS state
  ========================= */
  const [pq, setPq] = useState("");
  const [pPage, setPPage] = useState(1);
  const [pLimit] = useState(30);

  const [productsAll, setProductsAll] = useState([]);
  const [pSelected, setPSelected] = useState(null);
  const [pPanelOpen, setPPanelOpen] = useState(false);

  const [pName, setPName] = useState("");
  const [pBrand, setPBrand] = useState("");
  const [pCategory, setPCategory] = useState("");
  const [pPriceNormal, setPPriceNormal] = useState("");
  const [pPriceLicensed, setPPriceLicensed] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pIsActive, setPIsActive] = useState(true);
  const [pImages, setPImages] = useState("");

  const [pFiles, setPFiles] = useState([]);
  const [pFilePreviews, setPFilePreviews] = useState([]);
  const [pUploading, setPUploading] = useState(false);

  const pTotal = useMemo(() => productsAll.length, [productsAll]);
  const pPages = useMemo(() => Math.max(1, Math.ceil(pTotal / pLimit)), [pTotal, pLimit]);

  const products = useMemo(() => {
    const start = (pPage - 1) * pLimit;
    return productsAll.slice(start, start + pLimit);
  }, [productsAll, pPage, pLimit]);

  const fillProductForm = useCallback(
    (p) => {
      setPName(p?.name || "");
      setPBrand(p?.brand || "");
      setPCategory(p?.category || "");
      setPPriceNormal(p?.priceNormal ?? "");
      setPPriceLicensed(p?.priceLicensed ?? "");
      setPDesc(p?.desc || "");
      setPIsActive(p?.isActive !== false);

      const imgs = Array.isArray(p?.images) ? p.images : [];
      setPImages(imgs.map(String).filter(Boolean).join("\n"));

      safeRevoke(pFilePreviews);
      setPFiles([]);
      setPFilePreviews([]);
    },
    [pFilePreviews]
  );

  const openProduct = useCallback(
    (p) => {
      setPSelected(p);
      setPPanelOpen(true);
      fillProductForm(p);
    },
    [fillProductForm]
  );

  const newProduct = useCallback(() => {
    setPSelected(null);
    setPPanelOpen(true);

    setPName("");
    setPBrand("");
    setPCategory("");
    setPPriceNormal("");
    setPPriceLicensed("");
    setPDesc("");
    setPIsActive(true);
    setPImages("");

    safeRevoke(pFilePreviews);
    setPFiles([]);
    setPFilePreviews([]);
  }, [pFilePreviews]);

  const closeProductPanel = useCallback(() => setPPanelOpen(false), []);

  const loadProducts = useCallback(async () => {
    const signal = startRequest();
    setBusy(true);
    setError("");
    try {
      const sp = new URLSearchParams();
      if (pq.trim()) sp.set("q", pq.trim());
      sp.set("page", "1");
      sp.set("limit", "200");

      const r = await apiGet(`/api/superadmin/products?${sp.toString()}`);
      if (signal.aborted) return;

      const items = Array.isArray(r?.items) ? r.items : [];
      setProductsAll(items);
      setPPage(1);

      if (pSelected?._id) {
        const fresh = items.find((x) => String(x._id) === String(pSelected._id));
        if (fresh) {
          setPSelected(fresh);
          fillProductForm(fresh);
        }
      }
    } catch (e) {
      if (!String(e?.name || "").includes("Abort")) setError(e?.message || "Products load failed");
    } finally {
      if (!abortRef.current?.signal?.aborted) setBusy(false);
    }
  }, [startRequest, pq, pSelected, fillProductForm]);

  const saveProduct = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const priceNormal = Number(pPriceNormal);
      const priceLicensed = Number(pPriceLicensed);

      const payload = {
        name: String(pName || "").trim(),
        brand: String(pBrand || "").trim(),
        category: String(pCategory || "").trim(),
        images: splitLinesToUrls(pImages),
        priceNormal,
        priceLicensed,
        desc: String(pDesc || ""),
        isActive: !!pIsActive,
      };

      if (!payload.name) throw new Error("Ürün adı zorunlu");
      if (!Number.isFinite(priceNormal) || priceNormal <= 0) throw new Error("priceNormal geçersiz");
      if (!Number.isFinite(priceLicensed) || priceLicensed <= 0) throw new Error("priceLicensed geçersiz");

      if (pSelected?._id) {
        await apiRaw("PUT", `/api/superadmin/products/${pSelected._id}`, payload);
      } else {
        const r = await apiRaw("POST", `/api/superadmin/products`, payload);
        const created = r?.product || r || null;
        if (created?._id) setPSelected(created);
      }

      await loadProducts();
      await loadOverview();
    } catch (e) {
      setError(e?.message || "Product save failed");
    } finally {
      setBusy(false);
    }
  }, [pSelected, pName, pBrand, pCategory, pImages, pPriceNormal, pPriceLicensed, pDesc, pIsActive, loadProducts, loadOverview]);

  const deleteProduct = useCallback(async () => {
    if (!pSelected?._id) return;
    setBusy(true);
    setError("");
    try {
      await apiRaw("DELETE", `/api/superadmin/products/${pSelected._id}`);
      setPSelected(null);
      setPPanelOpen(false);
      await loadProducts();
      await loadOverview();
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }, [pSelected, loadProducts, loadOverview]);

  /* =========================
     FILE PICKER (MULTI)
  ========================= */
  const onPickImages = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const key = (f) => `${f.name}-${f.size}`;
      const existingKeys = new Set((pFiles || []).map(key));
      const freshFiles = files.filter((f) => !existingKeys.has(key(f)));
      if (!freshFiles.length) return;

      const freshPreviews = freshFiles.map((f) => URL.createObjectURL(f));
      setPFiles((prev) => [...(prev || []), ...freshFiles]);
      setPFilePreviews((prev) => [...(prev || []), ...freshPreviews]);

      e.target.value = "";
    },
    [pFiles]
  );

  const removePickedImage = useCallback((idx) => {
    setPFilePreviews((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const removed = arr[idx];
      if (removed && String(removed).startsWith("blob:")) {
        try {
          URL.revokeObjectURL(removed);
        } catch {
          /* ignore */
        }
      }
      arr.splice(idx, 1);
      return arr;
    });

    setPFiles((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      arr.splice(idx, 1);
      return arr;
    });
  }, []);

  useEffect(() => {
    return () => safeRevoke(pFilePreviews);
  }, [pFilePreviews]);

  /* =========================
     NETWORK state + loaders
  ========================= */
  const [netUserId, setNetUserId] = useState("");
  const [netUniDepth, setNetUniDepth] = useState(3);
  const [netMatDepth, setNetMatDepth] = useState(4);
  const [netPlan, setNetPlan] = useState("2x");

  const [uniData, setUniData] = useState({ nodes: [], edges: [], rootUserId: "" });
  const [matData, setMatData] = useState({ nodes: [], edges: [], rootUserId: "", plan: "2x" });

  const uniLevels = useMemo(() => {
    return buildLevels({ nodes: uniData.nodes, edges: uniData.edges, rootId: uniData.rootUserId });
  }, [uniData]);

  const matLevels = useMemo(() => {
    return buildLevels({ nodes: matData.nodes, edges: matData.edges, rootId: matData.rootUserId });
  }, [matData]);

  const ensureUsersForNetwork = useCallback(async () => {
    if (users?.length) return;
    try {
      const r = await apiGet(`/api/superadmin/users?page=1&limit=500`);
      const items = Array.isArray(r?.items) ? r.items : [];
      setUsers(items);
      setUTotal(Number(r?.total || items.length || 0));
      setUPages(Number(r?.pages || 1));
    } catch {
      /* ignore */
    }
  }, [users]);

  const loadUnilevel = useCallback(async () => {
    const uid = String(netUserId || selectedId || "");
    if (!uid) return;

    const signal = startRequest();
    setBusy(true);
    setError("");

    try {
      const sp = new URLSearchParams();
      sp.set("root", uid);
      sp.set("depth", String(netUniDepth));

      const r = await apiGet(`/api/superadmin/network/unilevel/tree?${sp.toString()}`);
      if (signal.aborted) return;

      const graph = treeToGraph(r?.tree || null);

      setUniData({
        nodes: graph.nodes,
        edges: graph.edges,
        rootUserId: graph.rootUserId || uid,
      });
    } catch (e) {
      if (!String(e?.name || "").includes("Abort")) {
        setError(e?.message || "Unilevel load failed");
      }
    } finally {
      if (!abortRef.current?.signal?.aborted) setBusy(false);
    }
  }, [startRequest, netUserId, selectedId, netUniDepth]);

  const loadMatrix = useCallback(async () => {
    const uid = String(netUserId || selectedId || "");
    if (!uid) return;

    const signal = startRequest();
    setBusy(true);
    setError("");

    try {
      const sp = new URLSearchParams();
      sp.set("root", uid);
      sp.set("depth", String(netMatDepth));

      let width = 2;
      const planText = String(netPlan || "2x").toLowerCase();

      if (planText.includes("3")) width = 3;
      else if (planText.includes("4")) width = 4;
      else if (planText.includes("5")) width = 5;

      sp.set("width", String(width));

      const r = await apiGet(`/api/superadmin/network/matrix/tree?${sp.toString()}`);
      if (signal.aborted) return;

      const graph = treeToGraph(r?.tree || null);

      setMatData({
        nodes: graph.nodes,
        edges: graph.edges,
        rootUserId: graph.rootUserId || uid,
        plan: `${r?.width || width}x`,
      });
    } catch (e) {
      if (!String(e?.name || "").includes("Abort")) {
        setError(e?.message || "Matrix load failed");
      }
    } finally {
      if (!abortRef.current?.signal?.aborted) setBusy(false);
    }
  }, [startRequest, netUserId, selectedId, netMatDepth, netPlan]);

  useEffect(() => {
    if (tab !== "network") return;

    (async () => {
      await ensureUsersForNetwork();
      const uid = String(netUserId || selectedId || users?.[0]?._id || "");
      if (uid && !netUserId) setNetUserId(uid);

      if (uid) {
        await Promise.allSettled([loadUnilevel(), loadMatrix()]);
      }
    })().catch(() => {});
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* =========================
     REFRESH
  ========================= */
  const refresh = useCallback(async () => {
    if (tab === "overview") return loadOverview();
    if (tab === "users") return loadUsers();
    if (tab === "products") return loadProducts();
    if (tab === "payments") return loadPayments();
    if (tab === "network") return Promise.allSettled([loadUnilevel(), loadMatrix()]);
  }, [tab, loadOverview, loadUsers, loadProducts, loadPayments, loadUnilevel, loadMatrix]);

  useEffect(() => {
    loadPermCatalog();
    refresh();

    return () => {
      try {
        abortRef.current?.abort?.();
      } catch {
        /* ignore */
      }
    };
  }, [refresh, loadPermCatalog]);

  const tRef = useRef(null);
  useEffect(() => {
    if (tab !== "users") return;
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      setUPage(1);
      loadUsers();
    }, 350);
    return () => clearTimeout(tRef.current);
  }, [uq, uRole, uLicensed, uActive, tab, loadUsers]);

  useEffect(() => {
    if (tab !== "users") return;
    loadUsers();
  }, [uPage, tab, loadUsers]);

  const payRef = useRef(null);
  useEffect(() => {
    if (tab !== "payments") return;
    clearTimeout(payRef.current);
    payRef.current = setTimeout(() => {
      setPayPage(1);
      loadPayments();
    }, 350);
    return () => clearTimeout(payRef.current);
  }, [payQ, payStatus, payMethod, tab, loadPayments]);

  useEffect(() => {
    if (tab !== "payments") return;
    loadPayments();
  }, [payPage, tab, loadPayments]);

  const pRef = useRef(null);
  useEffect(() => {
    if (tab !== "products") return;
    clearTimeout(pRef.current);
    pRef.current = setTimeout(() => {
      setPPage(1);
      loadProducts();
    }, 350);
    return () => clearTimeout(pRef.current);
  }, [pq, tab, loadProducts]);

  return (
    <div className="saShell2">
      <header className="saTopbar2">
        <div className="saTopLeft">
          <div className="saBrand">
            <div className="saDot" />
            <div className="saBrandText">
              <div className="saBrandTitle">FTSLine</div>
              <div className="saBrandSub">Superadmin Dashboard</div>
            </div>
          </div>

          <div className="saCrumbs">
            <Badge tone="blue">role: superadmin</Badge>
            <Badge tone="glass">tab: {activeTab.label}</Badge>
          </div>
        </div>

        <div className="saTopRight">
          <div className="saStatus">
            {busy ? <span className="saPulse">Yükleniyor…</span> : <span className="saOk">● Online</span>}
          </div>

          <Btn onClick={refresh} disabled={busy} variant="primary" type="button">
            {busy ? "Yenileniyor…" : "Yenile"}
          </Btn>
        </div>
      </header>

      {error ? <div className="saAlert">⚠️ {error}</div> : null}

      <nav className="saTabs2">
        <div className="saTabsScroll2" role="tablist" aria-label="Superadmin Tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`saTab2 ${tab === t.key ? "active" : ""}`}
              onClick={() => {
                if (t.key === "finance") {
                  nav("/superadmin/finance");
                  return;
                }
                setTab(t.key);
              }}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
            >
              <span className="saTabIcon2">{t.icon}</span>
              <span className="saTabText2">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="saTabsFade2" />
      </nav>

      <main className="saMain2">
        {tab === "overview" && (
          <div className="saGrid2">
            <div className="saOvKpis">
              <div className="saKpi">
                <div className="saMuted2">Toplam Kullanıcı</div>
                <div className="saKpiVal">{Number(ov.kpis.usersTotal || 0).toLocaleString("tr-TR")}</div>
                <div className="saKpiSub">Aktif: {Number(ov.kpis.usersActive || 0).toLocaleString("tr-TR")}</div>
              </div>

              <div className="saKpi">
                <div className="saMuted2">Toplam Ürün</div>
                <div className="saKpiVal">{Number(ov.kpis.productsTotal || 0).toLocaleString("tr-TR")}</div>
                <div className="saKpiSub">Aktif: {Number(ov.kpis.productsActive || 0).toLocaleString("tr-TR")}</div>
              </div>

              <div className="saKpi">
                <div className="saMuted2">Toplam Ciro</div>
                <div className="saKpiVal">{fmtTry(ov.kpis.revenueTotal || 0)}</div>
                <div className="saKpiSub">Sipariş: {Number(ov.kpis.ordersTotal || 0).toLocaleString("tr-TR")}</div>
              </div>
            </div>

            <div className="saOvCharts">
              <Card title="📈 Ciro Trend">
                <div className="saChartBox">
                  <div className="saChartWrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ov.revenueSeries || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" strokeWidth={2} fillOpacity={0.25} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              <Card title="📊 Sipariş Trend">
                <div className="saChartBox">
                  <div className="saChartWrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ov.ordersSeries || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>

            <div className="saOvCharts2">
              <Card title="👤 Roller Dağılımı">
                <div className="saChartBox">
                  <div className="saChartWrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={ov.rolePie || []} dataKey="value" nameKey="name" outerRadius={92} label>
                          {(ov.rolePie || []).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              <Card title="🎫 Lisans Durumu">
                <div className="saChartBox">
                  <div className="saChartWrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={ov.licensePie || []} dataKey="value" nameKey="name" outerRadius={92} label>
                          {(ov.licensePie || []).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              <Card title="🧱 En Çok Ürün Kategorileri">
                <div className="saChartBox">
                  <div className="saChartWrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ov.topCategories || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={90} />
                        <Tooltip />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>

            <div className="saRowBtns">
              <Btn type="button" variant="primary" disabled={busy} onClick={loadOverview}>
                {busy ? "Yükleniyor…" : "Özeti Yenile"}
              </Btn>
              <Btn type="button" variant="ghost" onClick={() => setTab("users")}>
                Kullanıcılar
              </Btn>
              <Btn type="button" variant="ghost" onClick={() => setTab("products")}>
                Ürünler
              </Btn>
              <Btn type="button" variant="ghost" onClick={() => setTab("payments")}>
                Ödemeler
              </Btn>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="saUsersLayout">
            <Card
              title="Kullanıcı Yönetimi"
              right={
                <div className="saMiniRow">
                  <Badge tone="glass">list</Badge>
                  <Badge tone="blue">permissions</Badge>
                  <Badge tone="glass">total: {uTotal}</Badge>
                </div>
              }
            >
              <div className="saFilters">
                <input
                  className="saInput"
                  placeholder="Ara: username / email / ad soyad"
                  value={uq}
                  onChange={(e) => setUq(e.target.value)}
                />

                <select className="saSelect" value={uRole} onChange={(e) => setURole(e.target.value)}>
                  <option value="">Role: Hepsi</option>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="superadmin">superadmin</option>
                </select>

                <select className="saSelect" value={uLicensed} onChange={(e) => setULicensed(e.target.value)}>
                  <option value="">Lisans: Hepsi</option>
                  <option value="true">Lisanslı</option>
                  <option value="false">Lisanssız</option>
                </select>

                <select className="saSelect" value={uActive} onChange={(e) => setUActive(e.target.value)}>
                  <option value="">Durum: Hepsi</option>
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>

              <div className="saTable2">
                <div className="saTR2 saTH2 saUsersTH">
                  <div>Kullanıcı</div>
                  <div>Role</div>
                  <div>Lisans</div>
                  <div>Durum</div>
                  <div>Kayıt</div>
                </div>

                {users.length ? (
                  users.map((u) => {
                    const isSel = String(selected?._id || "") === String(u?._id || "");
                    return (
                      <button
                        key={u._id}
                        type="button"
                        className={`saTR2 saUsersTR saUsersTH ${isSel ? "selected" : ""}`}
                        onClick={() => openUser(u)}
                      >
                        <div className="saUcol">
                          <div className="saStrong2">{u.username || "—"}</div>
                          <div className="saMuted2">{u.email || "—"}</div>
                        </div>

                        <div>
                          <Badge tone={u.role === "superadmin" ? "blue" : "glass"}>{u.role || "user"}</Badge>
                        </div>

                        <div>
                          <Badge tone={u.isLicensed ? "green" : "amber"}>{u.isLicensed ? "Lisanslı" : "Lisanssız"}</Badge>
                        </div>

                        <div>
                          <Badge tone={u.isActive === false ? "amber" : "green"}>
                            {u.isActive === false ? "Pasif" : "Aktif"}
                          </Badge>
                        </div>

                        <div className="saMuted2">{fmtDate(u.createdAt)}</div>
                      </button>
                    );
                  })
                ) : (
                  <div className="saEmpty2">Kullanıcı yok.</div>
                )}
              </div>

              <div className="saPager">
                <div className="saMuted2">
                  Sayfa: <b>{uPage}</b> / {uPages} • Toplam: <b>{uTotal}</b>
                </div>

                <div className="saPagerBtns">
                  <button
                    className="saBtn ghost"
                    type="button"
                    disabled={uPage <= 1 || busy}
                    onClick={() => setUPage((p) => Math.max(1, p - 1))}
                  >
                    ◀ Önceki
                  </button>
                  <button
                    className="saBtn ghost"
                    type="button"
                    disabled={uPage >= uPages || busy}
                    onClick={() => setUPage((p) => Math.min(uPages, p + 1))}
                  >
                    Sonraki ▶
                  </button>
                </div>
              </div>
            </Card>

            <div className={`saSidePanel ${panelOpen ? "open" : ""}`}>
              <div className="saSidePanelHead">
                <div>
                  <div className="saSideTitle">Kullanıcı Detay</div>
                  <div className="saSideSub">
                    {selected ? (
                      <>
                        <span className="saStrong2">{selected.username}</span>
                        <span className="saDotSep">•</span>
                        <span className="saMuted2">{selected.email}</span>
                      </>
                    ) : (
                      <span className="saMuted2">Soldan kullanıcı seç</span>
                    )}
                  </div>
                </div>

                <button className="saIconBtn" type="button" onClick={closePanel} aria-label="Close">
                  ✕
                </button>
              </div>

              {!panelOpen || !selected ? (
                <div className="saSideEmpty">
                  <div className="saPHbig2">Kullanıcı seç</div>
                  <div className="saPHsub2">Soldan kullanıcıya tıkla, burada düzenle.</div>
                </div>
              ) : (
                <div className="saSideBody">
                  <div className="saBlock">
                    <div className="saBlockTitle">Genel</div>

                    <div className="saMiniInfo">
                      <div className="saMuted2">
                        ID: <span className="saStrong2">{selected._id}</span>
                      </div>
                      <div className="saMuted2">
                        Ad Soyad: <span className="saStrong2">{selected.fullName || "—"}</span>
                      </div>
                      <div className="saMuted2">
                        Kayıt: <span className="saStrong2">{fmtDate(selected.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="saBlock">
                    <div className="saBlockTitle">Rol / Durum / Lisans</div>

                    <div className="saFormRow">
                      <label className="saLabel">Role</label>
                      <select className="saSelect" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                      <div className="saHelp">
                        Not: Backend kuralına göre başka superadmin’in rolünü düşürme/pasif yapma engellenir.
                      </div>
                    </div>

                    <label className="saCheck">
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                      <span>Aktif</span>
                    </label>

                    <div className="saFormRow" style={{ marginTop: 10 }}>
                      <label className="saLabel">Lisans Durumu</label>
                      <div className="saMiniRow">
                        <Badge tone={selected?.isLicensed ? "green" : "amber"}>
                          {selected?.isLicensed ? "Lisanslı" : "Lisanssız"}
                        </Badge>
                        <Badge tone="glass">
                          Bitiş: {selected?.licenseExpiresAt ? fmtDate(selected.licenseExpiresAt) : "—"}
                        </Badge>
                      </div>
                    </div>

                    <div className="saFormRow" style={{ marginTop: 10 }}>
                      <label className="saLabel">Kaç Ay Lisans Verilsin?</label>
                      <input
                        className="saInput"
                        type="number"
                        min={1}
                        max={60}
                        value={licenseMonths}
                        onChange={(e) => setLicenseMonths(e.target.value)}
                        placeholder="12"
                      />
                    </div>

                    <div className="saRowBtns">
                      <Btn type="button" variant="primary" disabled={busy} onClick={grantLicense}>
                        Lisans Ver
                      </Btn>

                      <Btn type="button" variant="ghost" disabled={busy || !selected?.isLicensed} onClick={removeLicense}>
                        Lisansı Kaldır
                      </Btn>
                    </div>

                    <div className="saFormRow" style={{ marginTop: 12 }}>
                      <label className="saLabel">Lisans Bitiş Tarihi (manuel)</label>
                      <input
                        className="saInput"
                        type="date"
                        value={editExpires}
                        onChange={(e) => {
                          setEditExpires(e.target.value);
                        }}
                      />
                      <div className="saHelp">Buradan direkt bitiş tarihi verebilirsin. Bu işlem kullanıcıyı lisanslı yapar.</div>
                    </div>

                    <div className="saRowBtns">
                      <Btn type="button" variant="ghost" disabled={busy || !editExpires} onClick={saveLicenseDateDirect}>
                        Tarihi Kaydet
                      </Btn>
                    </div>

                    <div className="saRowBtns">
                      <Btn type="button" variant="primary" disabled={busy} onClick={saveUserBasics}>
                        Rol / Durum Kaydet
                      </Btn>
                      <Btn type="button" variant="ghost" disabled={busy} onClick={() => openUser(selected)}>
                        Geri Al
                      </Btn>
                    </div>
                  </div>

                  <div className="saBlock">
                    <div className="saBlockTitle">Admin Yetkileri</div>
                    <div className="saHelp" style={{ marginTop: -2 }}>
                      • Yetkiler sadece <b>admin</b> rolü için anlamlı. <br />
                      • Kaydedince backend bu kullanıcıyı admin yapabilir.
                    </div>

                    <div className="saPermGroups" style={{ marginTop: 10 }}>
                      {permCatalog.map((g) => (
                        <div className="saPermGroup" key={g.group}>
                          <div className="saPermGroupTitle">{g.group}</div>
                          <div className="saPermList">
                            {g.items.map((p) => {
                              const checked = (editPerms || []).includes(p);
                              return (
                                <label
                                  key={p}
                                  className="saPermItem"
                                  onClick={(e) => {
                                    if (e.target?.tagName?.toLowerCase() === "input") return;
                                    setEditPerms((prev) => toggleArray(prev, p));
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => setEditPerms((prev) => toggleArray(prev, p))}
                                  />
                                  <span className="saPermText">{p}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="saRowBtns">
                      <Btn type="button" variant="primary" disabled={busy} onClick={saveAdminPerms}>
                        Yetkileri Kaydet
                      </Btn>
                      <Btn type="button" variant="ghost" disabled={busy} onClick={() => setEditPerms([])}>
                        Temizle
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`saPanelOverlay ${panelOpen ? "show" : ""}`}
              onClick={closePanel}
              aria-label="Overlay"
            />
          </div>
        )}

        {tab === "products" && (
          <div className="saUsersLayout">
            <Card
              title="Ürün Yönetimi"
              right={
                <div className="saMiniRow">
                  <Badge tone="glass">CRUD</Badge>
                  <Badge tone="blue">images</Badge>
                  <Badge tone="glass">total: {pTotal}</Badge>
                </div>
              }
            >
              <div className="saFilters saFiltersProducts">
                <input className="saInput" placeholder="Ara: ürün adı / marka" value={pq} onChange={(e) => setPq(e.target.value)} />

                <button
                  className="saBtn primary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPPage(1);
                    newProduct();
                  }}
                >
                  + Yeni Ürün
                </button>

                <button
                  className="saBtn ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPPage(1);
                    loadProducts();
                  }}
                >
                  Listele
                </button>

                <div className="saMuted2 saRightTiny">
                  Sayfa: <b style={{ marginLeft: 6 }}>{pPage}</b> / {pPages}
                </div>
              </div>

              <div className="saTable2">
                <div className="saTR2 saTH2 saProductsTH">
                  <div>Ürün</div>
                  <div>Kategori</div>
                  <div>Normal</div>
                  <div>Lisans</div>
                  <div>Durum</div>
                </div>

                {products.length ? (
                  products.map((p) => {
                    const isSel = String(pSelected?._id || "") === String(p._id);
                    return (
                      <button
                        key={p._id}
                        type="button"
                        className={`saTR2 saUsersTR saProductsTH ${isSel ? "selected" : ""}`}
                        onClick={() => openProduct(p)}
                      >
                        <div className="saUcol">
                          <div className="saStrong2">{p.name}</div>
                          <div className="saMuted2">{p.brand || "—"}</div>
                        </div>

                        <div className="saMuted2">{p.category || "—"}</div>
                        <div className="saStrong2">{Number(p.priceNormal || 0).toLocaleString("tr-TR")}₺</div>
                        <div className="saStrong2">{Number(p.priceLicensed || 0).toLocaleString("tr-TR")}₺</div>

                        <div>
                          <Badge tone={p.isActive === false ? "amber" : "green"}>{p.isActive === false ? "Pasif" : "Aktif"}</Badge>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="saEmpty2">Ürün yok.</div>
                )}
              </div>

              <div className="saPager">
                <div className="saMuted2">
                  Toplam: <b>{pTotal}</b>
                </div>

                <div className="saPagerBtns">
                  <button
                    className="saBtn ghost"
                    type="button"
                    disabled={pPage <= 1 || busy}
                    onClick={() => setPPage((p) => Math.max(1, p - 1))}
                  >
                    ◀ Önceki
                  </button>
                  <button
                    className="saBtn ghost"
                    type="button"
                    disabled={pPage >= pPages || busy}
                    onClick={() => setPPage((p) => Math.min(pPages, p + 1))}
                  >
                    Sonraki ▶
                  </button>
                </div>
              </div>
            </Card>

            <div className={`saSidePanel ${pPanelOpen ? "open" : ""}`}>
              <div className="saSidePanelHead">
                <div>
                  <div className="saSideTitle">Ürün Detay</div>
                  <div className="saSideSub">
                    {pSelected ? (
                      <>
                        <span className="saStrong2">{pSelected.name}</span>
                        <span className="saDotSep">•</span>
                        <span className="saMuted2">{pSelected.brand || "—"}</span>
                      </>
                    ) : (
                      <span className="saMuted2">Yeni ürün ekle veya listeden seç</span>
                    )}
                  </div>
                </div>

                <button className="saIconBtn" type="button" onClick={closeProductPanel} aria-label="Close">
                  ✕
                </button>
              </div>

              {!pPanelOpen ? (
                <div className="saSideEmpty">
                  <div className="saPHbig2">Ürün seç / Yeni ürün</div>
                  <div className="saPHsub2">Soldan ürüne tıkla veya “+ Yeni Ürün” ile eklemeye başla.</div>
                </div>
              ) : (
                <div className="saSideBody">
                  <div className="saBlock">
                    <div className="saBlockTitle">Ürün Formu</div>

                    <div className="saFormRow">
                      <label className="saLabel">Ürün Adı</label>
                      <input className="saInput" value={pName} onChange={(e) => setPName(e.target.value)} />
                    </div>

                    <div className="saFormRow">
                      <label className="saLabel">Marka</label>
                      <input className="saInput" value={pBrand} onChange={(e) => setPBrand(e.target.value)} />
                    </div>

                    <div className="saFormRow">
                      <label className="saLabel">Kategori</label>
                      <input className="saInput" value={pCategory} onChange={(e) => setPCategory(e.target.value)} />
                    </div>

                    <div className="saFormRow">
                      <label className="saLabel">Normal Fiyat</label>
                      <input className="saInput" type="number" value={pPriceNormal} onChange={(e) => setPPriceNormal(e.target.value)} />
                    </div>

                    <div className="saFormRow">
                      <label className="saLabel">Lisanslı Fiyat</label>
                      <input className="saInput" type="number" value={pPriceLicensed} onChange={(e) => setPPriceLicensed(e.target.value)} />
                    </div>

                    <div className="saFormRow">
                      <label className="saLabel">Açıklama</label>
                      <textarea className="saInput" rows={5} value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
                    </div>

                    <label className="saCheck">
                      <input type="checkbox" checked={pIsActive} onChange={(e) => setPIsActive(e.target.checked)} />
                      <span>Aktif</span>
                    </label>

                    <div className="saFormRow" style={{ marginTop: 12 }}>
                      <label className="saLabel">Görsel URL'leri (satır satır)</label>
                      <textarea className="saInput" rows={5} value={pImages} onChange={(e) => setPImages(e.target.value)} />
                    </div>

                    <div className="saFormRow" style={{ marginTop: 12 }}>
                      <label className="saLabel">Yerelden Görsel Yükle</label>
                      <input className="saInput" type="file" multiple accept="image/*" onChange={onPickImages} />
                    </div>

                    {pFilePreviews.length > 0 && (
                      <div className="saBlock" style={{ marginTop: 12 }}>
                        <div className="saBlockTitle">Seçilen Görseller</div>
                        <div className="saMiniInfo">
                          {pFilePreviews.map((src, idx) => (
                            <div key={src} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                              <img
                                src={src}
                                alt={`preview-${idx}`}
                                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12 }}
                              />
                              <button className="saBtn ghost" type="button" onClick={() => removePickedImage(idx)}>
                                Kaldır
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="saRowBtns">
                          <Btn
                            type="button"
                            variant="ghost"
                            disabled={busy || pUploading || !pFiles.length}
                            onClick={async () => {
                              try {
                                setPUploading(true);
                                const urls = await uploadFilesOptional(pFiles);
                                const merged = [...splitLinesToUrls(pImages), ...urls].filter(Boolean);
                                setPImages(merged.join("\n"));
                                safeRevoke(pFilePreviews);
                                setPFiles([]);
                                setPFilePreviews([]);
                              } catch (e) {
                                setError(e?.message || "Upload başarısız");
                              } finally {
                                setPUploading(false);
                              }
                            }}
                          >
                            {pUploading ? "Yükleniyor…" : "Seçilenleri Upload Et"}
                          </Btn>
                        </div>
                      </div>
                    )}

                    <div className="saRowBtns" style={{ marginTop: 14 }}>
                      <Btn type="button" variant="primary" disabled={busy} onClick={saveProduct}>
                        {pSelected?._id ? "Ürünü Kaydet" : "Ürün Oluştur"}
                      </Btn>

                      <Btn type="button" variant="ghost" disabled={busy || !pSelected?._id} onClick={deleteProduct}>
                        Ürünü Sil
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`saPanelOverlay ${pPanelOpen ? "show" : ""}`}
              onClick={closeProductPanel}
              aria-label="Overlay"
            />
          </div>
        )}

        {tab === "payments" && (
          <div className="saUsersLayout">
            <Card
              title="Ödeme Yönetimi"
              right={
                <div className="saMiniRow">
                  <Badge tone="glass">pending / approved / rejected</Badge>
                  <Badge tone="blue">total: {payTotal}</Badge>
                </div>
              }
            >
              <div className="saFilters">
                <input
                  className="saInput"
                  placeholder="Ara: kullanıcı / mail / txHash"
                  value={payQ}
                  onChange={(e) => setPayQ(e.target.value)}
                />

                <select className="saSelect" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                  <option value="">Durum: Hepsi</option>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>

                <select className="saSelect" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="">Yöntem: Hepsi</option>
                  <option value="USDT_TRC20">USDT_TRC20</option>
                  <option value="BANK">BANK</option>
                  <option value="CASH">CASH</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="saTable2">
                <div className="saTR2 saTH2" style={{ gridTemplateColumns: "1.2fr .8fr .6fr .6fr .7fr .7fr" }}>
                  <div>Kullanıcı</div>
                  <div>Yöntem</div>
                  <div>Tutar</div>
                  <div>Ay</div>
                  <div>Durum</div>
                  <div>Tarih</div>
                </div>

                {payments.length ? (
                  payments.map((p) => {
                    const isSel = String(paySelected?._id || "") === String(p?._id || "");
                    const u = p?.user || {};
                    return (
                      <button
                        key={p._id}
                        type="button"
                        className={`saTR2 saUsersTR ${isSel ? "selected" : ""}`}
                        style={{ gridTemplateColumns: "1.2fr .8fr .6fr .6fr .7fr .7fr" }}
                        onClick={() => openPayment(p)}
                      >
                        <div className="saUcol">
                          <div className="saStrong2">{u.username || "—"}</div>
                          <div className="saMuted2">{u.email || "—"}</div>
                        </div>

                        <div className="saMuted2">{p.method || "—"}</div>
                        <div className="saStrong2">
                          {Number(p.amount || 0).toLocaleString("tr-TR")} {p.currency || ""}
                        </div>
                        <div className="saMuted2">{p.months || "—"}</div>

                        <div>
                          <Badge
                            tone={
                              p.status === "approved"
                                ? "green"
                                : p.status === "rejected"
                                ? "amber"
                                : "blue"
                            }
                          >
                            {p.status || "pending"}
                          </Badge>
                        </div>

                        <div className="saMuted2">{fmtDate(p.createdAt)}</div>
                      </button>
                    );
                  })
                ) : (
                  <div className="saEmpty2">Ödeme yok.</div>
                )}
              </div>

              <div className="saPager">
                <div className="saMuted2">
                  Sayfa: <b>{payPage}</b> / {payPages} • Toplam: <b>{payTotal}</b>
                </div>

                <div className="saPagerBtns">
                  <button
                    className="saBtn ghost"
                    type="button"
                    disabled={payPage <= 1 || busy}
                    onClick={() => setPayPage((p) => Math.max(1, p - 1))}
                  >
                    ◀ Önceki
                  </button>
                  <button
                    className="saBtn ghost"
                    type="button"
                    disabled={payPage >= payPages || busy}
                    onClick={() => setPayPage((p) => Math.min(payPages, p + 1))}
                  >
                    Sonraki ▶
                  </button>
                </div>
              </div>
            </Card>

            <div className={`saSidePanel ${payPanelOpen ? "open" : ""}`}>
              <div className="saSidePanelHead">
                <div>
                  <div className="saSideTitle">Ödeme Detay</div>
                  <div className="saSideSub">
                    {paySelected ? (
                      <>
                        <span className="saStrong2">{paySelected?.user?.username || "—"}</span>
                        <span className="saDotSep">•</span>
                        <span className="saMuted2">{paySelected?.method || "—"}</span>
                      </>
                    ) : (
                      <span className="saMuted2">Soldan ödeme seç</span>
                    )}
                  </div>
                </div>

                <button className="saIconBtn" type="button" onClick={closePaymentPanel} aria-label="Close">
                  ✕
                </button>
              </div>

              {!payPanelOpen || !paySelected ? (
                <div className="saSideEmpty">
                  <div className="saPHbig2">Ödeme seç</div>
                  <div className="saPHsub2">Soldan ödeme kaydına tıkla, burada incele ve onayla.</div>
                </div>
              ) : (
                <div className="saSideBody">
                  <div className="saBlock">
                    <div className="saBlockTitle">Genel</div>

                    <div className="saMiniInfo">
                      <div className="saMuted2">
                        Kullanıcı: <span className="saStrong2">{paySelected?.user?.username || "—"}</span>
                      </div>
                      <div className="saMuted2">
                        Mail: <span className="saStrong2">{paySelected?.user?.email || "—"}</span>
                      </div>
                      <div className="saMuted2">
                        Tür: <span className="saStrong2">{paySelected?.type || "—"}</span>
                      </div>
                      <div className="saMuted2">
                        Yöntem: <span className="saStrong2">{paySelected?.method || "—"}</span>
                      </div>
                      <div className="saMuted2">
                        Tutar: <span className="saStrong2">{Number(paySelected?.amount || 0).toLocaleString("tr-TR")} {paySelected?.currency || ""}</span>
                      </div>
                      <div className="saMuted2">
                        Ay: <span className="saStrong2">{paySelected?.months || "—"}</span>
                      </div>
                      <div className="saMuted2">
                        Durum: <span className="saStrong2">{paySelected?.status || "pending"}</span>
                      </div>
                      <div className="saMuted2">
                        TxHash: <span className="saStrong2">{paySelected?.txHash || "—"}</span>
                      </div>
                      <div className="saMuted2">
                        Not: <span className="saStrong2">{paySelected?.note || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="saBlock">
                    <div className="saBlockTitle">Admin Notu</div>

                    <textarea
                      className="saInput"
                      rows={5}
                      value={payAdminNote}
                      onChange={(e) => setPayAdminNote(e.target.value)}
                      placeholder="Onay / red açıklaması..."
                    />
                  </div>

                  <div className="saRowBtns">
                    <Btn
                      type="button"
                      variant="primary"
                      disabled={busy || paySelected?.status === "approved"}
                      onClick={approvePayment}
                    >
                      Ödemeyi Onayla
                    </Btn>

                    <Btn
                      type="button"
                      variant="ghost"
                      disabled={busy || paySelected?.status === "approved"}
                      onClick={rejectPayment}
                    >
                      Ödemeyi Reddet
                    </Btn>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`saPanelOverlay ${payPanelOpen ? "show" : ""}`}
              onClick={closePaymentPanel}
              aria-label="Overlay"
            />
          </div>
        )}

        {tab === "network" && (
          <div className="saGrid2">
            <Card
              title="🧩 Matrix / Unilevel"
              right={
                <div className="saMiniRow">
                  <Badge tone="glass">unilevel: {uniData.nodes.length}</Badge>
                  <Badge tone="glass">matrix: {matData.nodes.length}</Badge>
                  <Btn type="button" variant="ghost" disabled={busy} onClick={() => Promise.allSettled([loadUnilevel(), loadMatrix()])}>
                    Yenile
                  </Btn>
                </div>
              }
            >
              <div className="saFilters saFiltersProducts">
                <select className="saSelect" value={netUserId} onChange={(e) => setNetUserId(e.target.value)}>
                  <option value="">Kullanıcı seç…</option>
                  {(users || []).map((u) => (
                    <option key={String(u._id)} value={String(u._id)}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>

                <input
                  className="saInput"
                  type="number"
                  min={1}
                  max={10}
                  value={netUniDepth}
                  onChange={(e) => setNetUniDepth(Number(e.target.value || 3))}
                  placeholder="Unilevel depth"
                />

                <input
                  className="saInput"
                  type="number"
                  min={1}
                  max={10}
                  value={netMatDepth}
                  onChange={(e) => setNetMatDepth(Number(e.target.value || 4))}
                  placeholder="Matrix depth"
                />

                <input className="saInput" value={netPlan} onChange={(e) => setNetPlan(e.target.value)} placeholder="plan (default)" />

                <Btn type="button" variant="primary" disabled={busy || !netUserId} onClick={loadUnilevel}>
                  Unilevel Yükle
                </Btn>
                <Btn type="button" variant="primary" disabled={busy || !netUserId} onClick={loadMatrix}>
                  Matrix Yükle
                </Btn>
              </div>

              <div className="saOvCharts" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Card title="Unilevel (Sponsor Ağacı)" right={<Badge tone="glass">depth {netUniDepth}</Badge>}>
                  {uniLevels.length === 0 ? (
                    <div className="saEmpty2">Veri yok. “Unilevel Yükle” de.</div>
                  ) : (
                    <div className="saTable2">
                      {uniLevels.map((n) => {
                        const id = String(n?.id ?? n?._id ?? "");
                        const name = n?.username || n?.name || "—";
                        const sub = n?.fullName || n?.email || "";
                        const role = n?.role || "";
                        return (
                          <div
                            key={id || `${name}-${n._level}`}
                            className="saTR2"
                            style={{
                              gridTemplateColumns: "1fr .5fr .5fr",
                              paddingLeft: 14 + n._level * 18,
                            }}
                          >
                            <div className="saUcol">
                              <div className="saStrong2">{name}</div>
                              <div className="saMuted2">{sub || "—"}</div>
                            </div>
                            <div className="saMuted2">{role}</div>
                            <div className="saMuted2">lvl {n._level}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card
                  title="Matrix (Yerleşke)"
                  right={
                    <div className="saMiniRow">
                      <Badge tone="glass">plan {matData.plan || netPlan}</Badge>
                      <Badge tone="glass">depth {netMatDepth}</Badge>
                    </div>
                  }
                >
                  {matLevels.length === 0 ? (
                    <div className="saEmpty2">Veri yok. “Matrix Yükle” de.</div>
                  ) : (
                    <div className="saTable2">
                      {matLevels.map((n) => {
                        const id = String(n?.id ?? n?._id ?? "");
                        const name = n?.username || n?.name || "—";
                        const sub = n?.fullName || n?.email || "";
                        const role = n?.role || "";
                        const slot = n?.slot ?? n?.position ?? "—";
                        return (
                          <div
                            key={id || `${name}-${n._level}`}
                            className="saTR2"
                            style={{
                              gridTemplateColumns: "1fr .5fr .5fr .5fr",
                              paddingLeft: 14 + n._level * 18,
                            }}
                          >
                            <div className="saUcol">
                              <div className="saStrong2">{name}</div>
                              <div className="saMuted2">{sub || "—"}</div>
                            </div>
                            <div className="saMuted2">slot {String(slot)}</div>
                            <div className="saMuted2">lvl {n._level}</div>
                            <div className="saMuted2">{role}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              <div className="saHelp" style={{ marginTop: 10 }}>
                Not: Matrix/Unilevel modelleri backend’de yoksa bile endpointleri ekleyince UI hazır. Şu an sadece görüntüleme tarafı kurulu.
              </div>
            </Card>
          </div>
        )}

        {tab !== "overview" &&
          tab !== "users" &&
          tab !== "products" &&
          tab !== "payments" &&
          tab !== "finance" &&
          tab !== "network" && (
            <div className="saGrid2">
              <Card title={`${activeTab.icon} ${activeTab.label}`} right={<Badge tone="glass">yakında</Badge>}>
                <div className="saPlaceholder2">
                  <div className="saPHbig2">{activeTab.label}</div>
                  <div className="saPHsub2">Bu sekmeyi sonraki adımda gerçek endpointlerle dolduracağız.</div>
                  <div className="saPHbtns2">
                    <Btn type="button" onClick={() => setTab("overview")} variant="primary">
                      Özet
                    </Btn>
                    <Btn type="button" onClick={() => setTab("users")} variant="ghost">
                      Kullanıcı Yönetimi
                    </Btn>
                    <Btn type="button" onClick={() => setTab("products")} variant="ghost">
                      Ürün Yönetimi
                    </Btn>
                  </div>
                </div>
              </Card>
            </div>
          )}
      </main>
    </div>
  );
}