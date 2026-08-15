import { useEffect, useMemo, useState } from "react";
import "./SuperAdminPanel.css";
import AcademyAdmin from "./AcademyAdmin.jsx";

const API = import.meta.env.VITE_API_URL || "/api";

const ADMIN_PERMISSION_OPTIONS = [
  { key: "users", label: "Kullanicilar" },
  { key: "products", label: "Urunler" },
  { key: "finance", label: "Finans" },
  { key: "settings", label: "Ayarlar" },
];

const emptyProductForm = {
  name: "",
  brand: "",
  category: "",
  description: "",
  priceNormal: "",
  priceLicensed: "",
  networkProfitBase: "",
  stock: "Sinirsiz",
  status: "Aktif",
};

const emptyFinanceData = {
  summary: { paidSales: 0, pendingSales: 0, invoicePending: 0, totalEarnings: 0, orderCount: 0, pendingPayoutCount: 0, pendingPayoutAmount: 0, pendingRefundCount: 0, pendingRefundAmount: 0 },
  orders: [],
  users: [],
  products: [],
  transactions: [],
  withdrawals: [],
  refunds: [],
  auditEvents: [],
};

function formatLicenseDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getRemainingLicenseTime(expiresAt, isLicensed) {
  if (!expiresAt) return "-";
  const difference = new Date(expiresAt).getTime() - Date.now();
  if (difference <= 0) return "Suresi doldu";
  if (!isLicensed) return "Pasif";

  const days = Math.ceil(difference / (24 * 60 * 60 * 1000));
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    return `${years} yil${remainingDays ? ` ${remainingDays} gun` : ""}`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return `${months} ay${remainingDays ? ` ${remainingDays} gun` : ""}`;
  }
  return `${days} gun`;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("tr-TR")} TL`;
}

function formatEarningType(type) {
  const labels = {
    unilevel_initial: "İlk ay ünilevel hak edişi",
    matrix_monthly: "Aylık matrix hak edişi",
    product_network: "Ürün satışı network primi",
    career_bonus: "Kariyer bonusu",
    pool_bonus: "Havuz bonusu",
    manual_adjustment: "Manuel düzeltme",
  };
  return labels[type] || type || "Hak ediş";
}

function formatEarningStatus(status) {
  const labels = {
    earned: "Hak edildi",
    paid: "Ödendi",
    cancelled: "İptal edildi",
  };
  return labels[status] || status || "-";
}

const CAREER_LABELS = {
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

const emptyVisitorData = {
  summary: { totalViews: 0, todayViews: 0, uniqueVisitors30Days: 0, todayUniqueVisitors: 0, periodViews: 0, periodUniqueVisitors: 0 },
  topPages: [],
  recent: [],
  retentionDays: 90,
  period: "day",
  periodLabel: "Son 24 saat",
};

const CAREER_LEVEL_ALIASES = {
  starter: "NONE",
  bronze: "BRONZ",
  silver: "GUMUS",
  gold: "ALTIN",
  platinum: "PLATIN",
  diamond: "ELMAS",
};

function getUserCareerLevel(user) {
  const currentLevel = user?.career?.level;
  const legacyLevel = user?.careerLevel;
  const rawLevel = currentLevel && currentLevel !== "NONE"
    ? currentLevel
    : legacyLevel || currentLevel || "NONE";

  return CAREER_LEVEL_ALIASES[rawLevel] || rawLevel;
}

function getUserCareerLabel(user) {
  const level = getUserCareerLevel(user);
  return CAREER_LABELS[level] || CAREER_LABELS.NONE;
}

function getCareerClass(user) {
  return String(getUserCareerLevel(user)).toLowerCase().replaceAll("_", "-");
}

export default function SuperAdminPanel() {
  const [activeMenu, setActiveMenu] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth > 980,
  );
  const [search, setSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userCareerFilter, setUserCareerFilter] = useState("all");
  const [userLicenseFilter, setUserLicenseFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [financeData, setFinanceData] = useState(emptyFinanceData);
  const [financeTab, setFinanceTab] = useState("sales");
  const [loadingFinance, setLoadingFinance] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [announcementDrafts, setAnnouncementDrafts] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [visitorData, setVisitorData] = useState(emptyVisitorData);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorPeriod, setVisitorPeriod] = useState("day");

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [licenseDuration, setLicenseDuration] = useState("12");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderEdit, setOrderEdit] = useState({
    status: "pending",
    shippingCarrier: "",
    cargoTrackingNumber: "",
  });

  const token = sessionStorage.getItem("accessToken");

  async function request(path, options = {}, fallback = null) {
    try {
      const isFormData = options.body instanceof FormData;

      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(options.headers || {}),
        },
      });

      const data = await res.json().catch(() => fallback);

      if (!res.ok) {
        throw new Error(data?.message || "Islem basarisiz");
      }

      return data;
    } catch (error) {
      console.error(error);
      setMessage(error.message);
      return fallback;
    }
  }

  async function loadAll() {
    setLoading(true);
    setMessage("");

    const [productData, orderData, userData] = await Promise.all([
      request("/admin/products", {}, []),
      request("/orders/admin/all", {}, []),
      request("/superadmin/users", {}, []),
    ]);

    setProducts(Array.isArray(productData) ? productData : []);
    setOrders(Array.isArray(orderData) ? orderData : []);
    setUsers(Array.isArray(userData) ? userData : []);

    setLoading(false);
  }

  async function loadFinance() {
    setLoadingFinance(true);
    const data = await request("/admin/finance/overview", {}, null);
    if (data) {
      setFinanceData({
        ...emptyFinanceData,
        ...data,
        summary: { ...emptyFinanceData.summary, ...(data.summary || {}) },
      });
    }
    setLoadingFinance(false);
  }

  async function updateFinanceOrder(orderId, changes) {
    setLoadingFinance(true);
    const updated = await request(`/admin/finance/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }, null);
    if (updated) {
      setMessage("Finans kaydi guncellendi.");
      await loadFinance();
    } else {
      setLoadingFinance(false);
    }
  }

  async function updateRefundRequest(refundId, status) {
    const promptLabel = status === "approved" ? "İade onay notu (isteğe bağlı):" : "İade ret gerekçesi:";
    const adminNote = window.prompt(promptLabel, "");
    if (adminNote === null) return;
    setLoadingFinance(true);
    const updated = await request(`/orders/admin/refunds/${refundId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminNote }),
    }, null);
    if (updated) {
      setMessage(status === "approved" ? "İade onaylandı; stok ve kazanç kayıtları güncellendi." : "İade talebi reddedildi.");
      await loadFinance();
    } else {
      setLoadingFinance(false);
    }
  }

  async function loadAnnouncements() {
    setAnnouncementsLoading(true);
    const data = await request("/superadmin/announcements", {}, null);
    if (Array.isArray(data?.announcements)) {
      setAnnouncementDrafts(data.announcements.map((item) => ({
        textTr: item.textTr || "",
        textEn: item.textEn || "",
        isActive: item.isActive !== false,
      })));
    }
    setAnnouncementsLoading(false);
  }

  async function loadVisitors(period = visitorPeriod) {
    setVisitorsLoading(true);
    const data = await request(`/analytics/admin/overview?limit=150&period=${period}`, {}, null);
    if (data) {
      setVisitorData({
        ...emptyVisitorData,
        ...data,
        summary: { ...emptyVisitorData.summary, ...(data.summary || {}) },
      });
    }
    setVisitorsLoading(false);
  }

  function updateAnnouncement(index, field, value) {
    setAnnouncementDrafts((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function addAnnouncement() {
    setAnnouncementDrafts((current) => {
      if (current.length >= 10) {
        setMessage("En fazla 10 duyuru eklenebilir.");
        return current;
      }
      return [...current, { textTr: "", textEn: "", isActive: true }];
    });
  }

  function removeAnnouncement(index) {
    setAnnouncementDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveAnnouncements() {
    if (announcementDrafts.some((item) => !item.textTr.trim())) {
      setMessage("Her duyurunun Turkce metnini yazin.");
      return;
    }

    setAnnouncementsLoading(true);
    const data = await request("/superadmin/announcements", {
      method: "PUT",
      body: JSON.stringify({ announcements: announcementDrafts }),
    }, null);

    if (data) {
      setAnnouncementDrafts(data.announcements || []);
      setMessage(data.message || "Duyurular kaydedildi.");
      window.dispatchEvent(new Event("announcementsUpdated"));
    }
    setAnnouncementsLoading(false);
  }

  async function updateWithdrawal(requestId, status) {
    const promptText = status === "approved"
      ? "Banka ödemesi açıklaması (isteğe bağlı):"
      : "Red nedeni (isteğe bağlı):";
    const note = window.prompt(promptText, "");
    if (note === null) return;

    setLoadingFinance(true);
    const updated = await request(`/admin/finance/withdrawals/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    }, null);
    if (updated) {
      setMessage(updated.message || "Hak ediş talebi güncellendi.");
      await loadFinance();
    } else {
      setLoadingFinance(false);
    }
  }

  useEffect(() => {
    loadAll();

    return () => {
      preview.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (activeMenu === "finance") loadFinance();
    if (activeMenu === "announcements") loadAnnouncements();
    if (activeMenu === "visitors") loadVisitors();
  }, [activeMenu]);

  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => p.isActive).length;
    const activeUsers = users.filter((u) => u.isActive !== false).length;
    const licensedUsers = users.filter((u) => u.isLicensed === true).length;

    const totalOrderAmount = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    return [
      { title: "Toplam Kullanici", value: users.length },
      { title: "Aktif Kullanici", value: activeUsers },
      { title: "Lisansli Kullanici", value: licensedUsers },
      { title: "Toplam Urun", value: products.length },
      { title: "Aktif Urun", value: activeProducts },
      { title: "Toplam Siparis", value: orders.length },
      {
        title: "Siparis Cirosu",
        value: `${totalOrderAmount.toLocaleString("tr-TR")} TL`,
      },
    ];
  }, [users, products, orders]);

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();

    return (
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      u.username?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      getUserCareerLabel(u).toLowerCase().includes(q);
    const matchesStatus =
      userStatusFilter === "all" ||
      (userStatusFilter === "active" && u.isActive !== false) ||
      (userStatusFilter === "passive" && u.isActive === false);
    const matchesCareer =
      userCareerFilter === "all" ||
      getUserCareerLevel(u).toUpperCase() === userCareerFilter;
    const matchesLicense =
      userLicenseFilter === "all" ||
      (userLicenseFilter === "licensed" && u.isLicensed === true) ||
      (userLicenseFilter === "unlicensed" && u.isLicensed !== true);

    return matchesSearch && matchesStatus && matchesCareer && matchesLicense;
  });

  const userSummary = useMemo(() => {
    const active = users.filter((user) => user.isActive !== false).length;
    const passive = users.filter((user) => user.isActive === false).length;
    const licensed = users.filter((user) => user.isLicensed === true).length;
    const unlicensed = users.length - licensed;
    return { total: users.length, active, passive, licensed, unlicensed };
  }, [users]);

  const careerSummary = useMemo(() => {
    const levels = ["NONE", "BRONZ", "GUMUS", "ALTIN", "PLATIN", "ELMAS", "TAC_ELMAS"];
    return levels.map((level) => ({
      level,
      label: CAREER_LABELS[level],
      count: users.filter((user) => getUserCareerLevel(user).toUpperCase() === level).length,
    }));
  }, [users]);

  const filteredOrders = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      String(o._id || "").toLowerCase().includes(q) ||
      o.shippingInfo?.fullName?.toLowerCase().includes(q) ||
      o.shippingInfo?.email?.toLowerCase().includes(q) ||
      o.shippingInfo?.phone?.toLowerCase().includes(q) ||
      o.cargoTrackingNumber?.toLowerCase().includes(q) ||
      o.items?.some((item) => item.name?.toLowerCase().includes(q));

    const matchesOrderStatus =
      orderStatusFilter === "all" ||
      (o.status || "pending") === orderStatusFilter;
    const matchesPaymentStatus =
      paymentStatusFilter === "all" ||
      (o.paymentStatus || "pending") === paymentStatusFilter;

    const createdAt = o.createdAt ? new Date(o.createdAt) : null;
    const from = orderDateFrom ? new Date(`${orderDateFrom}T00:00:00`) : null;
    const to = orderDateTo ? new Date(`${orderDateTo}T23:59:59.999`) : null;
    const matchesDate =
      (!from || (createdAt && createdAt >= from)) &&
      (!to || (createdAt && createdAt <= to));

    return (
      matchesSearch &&
      matchesOrderStatus &&
      matchesPaymentStatus &&
      matchesDate
    );
  });

  function clearOrderFilters() {
    setSearch("");
    setOrderStatusFilter("all");
    setPaymentStatusFilter("all");
    setOrderDateFrom("");
    setOrderDateTo("");
  }

  function menuClick(menu) {
    setActiveMenu(menu);
    setSearch("");
    setMessage("");
    if (window.innerWidth <= 980) setSidebarOpen(false);
  }

  function logout() {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    window.location.href = "/login";
  }

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setImages([]);
    preview.forEach((url) => URL.revokeObjectURL(url));
    setPreview([]);
    setExistingImages([]);
    setProductModalOpen(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);

    setProductForm({
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "",
      description: product.description || "",
      priceNormal: product.priceNormal ?? "",
      priceLicensed: product.priceLicensed ?? "",
      networkProfitBase: product.networkProfitBase ?? "",
      stock: product.stock || "Sinirsiz",
      status: product.isActive ? "Aktif" : "Pasif",
    });

    setExistingImages(Array.isArray(product.images) ? product.images : []);
    setImages([]);
    preview.forEach((url) => URL.revokeObjectURL(url));
    setPreview([]);
    setProductModalOpen(true);
  }

  function closeProductModal() {
    setProductModalOpen(false);
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setImages([]);
    preview.forEach((url) => URL.revokeObjectURL(url));
    setPreview([]);
    setExistingImages([]);
  }

  function handleProductChange(e) {
    const { name, value } = e.target;

    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImages((prev) => [...prev, ...files]);
    setPreview((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);

    e.target.value = "";
  }

  function removeNewImage(index) {
    const nextImages = [...images];
    const nextPreview = [...preview];

    if (nextPreview[index]) {
      URL.revokeObjectURL(nextPreview[index]);
    }

    nextImages.splice(index, 1);
    nextPreview.splice(index, 1);
    setImages(nextImages);
    setPreview(nextPreview);
  }

  function removeExistingImage(index) {
    const next = [...existingImages];
    next.splice(index, 1);
    setExistingImages(next);
  }

  async function saveProduct(e) {
    e.preventDefault();

    if (
      !productForm.name.trim() ||
      productForm.priceNormal === "" ||
      productForm.priceLicensed === ""
    ) {
      setMessage("Urun adi, normal fiyat ve lisansli fiyat zorunlu.");
      return;
    }

    const payload = new FormData();
    payload.append("name", productForm.name.trim());
    payload.append("brand", productForm.brand.trim());
    payload.append("category", productForm.category.trim());
    payload.append("description", productForm.description.trim());
    payload.append("priceNormal", productForm.priceNormal);
    payload.append("priceLicensed", productForm.priceLicensed);
    payload.append("networkProfitBase", productForm.networkProfitBase || 0);
    payload.append("stock", productForm.stock || "Sinirsiz");
    payload.append("isActive", String(productForm.status === "Aktif"));
    existingImages.forEach((imageUrl) => payload.append("existingImages", imageUrl));
    images.forEach((file) => payload.append("images", file));

    const path = editingProduct
      ? `/admin/products/${editingProduct._id}`
      : "/admin/products";

    const method = editingProduct ? "PUT" : "POST";

    const result = await request(
      path,
      {
        method,
        body: payload,
      },
      null
    );

    if (result) {
      setMessage(editingProduct ? "Urun guncellendi" : "Urun eklendi");
      closeProductModal();
      await loadAll();
    }
  }

  async function toggleProduct(product) {
    await request(
      `/admin/products/${product._id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          ...product,
          isActive: !product.isActive,
        }),
      },
      null
    );

    await loadAll();
  }

  async function removeProduct(productId) {
    const ok = window.confirm("Bu urun tamamen silinsin mi?");
    if (!ok) return;

    await request(
      `/admin/products/${productId}`,
      {
        method: "DELETE",
      },
      null
    );

    await loadAll();
  }

  async function toggleUserActive(user) {
    await request(
      `/superadmin/users/${user._id}/active`,
      {
        method: "PUT",
        body: JSON.stringify({
          isActive: user.isActive === false ? true : false,
        }),
      },
      null
    );

    await loadAll();
  }

  async function toggleUserLicense(user, durationMonths = 12) {
    const result = await request(
      `/superadmin/users/${user._id}/license`,
      {
        method: "PUT",
        body: JSON.stringify({
          isLicensed: user.isLicensed === true ? false : true,
          durationMonths,
        }),
      },
      null
    );

    if (result) await loadAll();
    return result;
  }

  async function openUserDetails(user) {
    setUserDetailsLoading(true);
    setSelectedUserDetails(null);
    setLicenseDuration("12");
    const result = await request(`/superadmin/users/${user._id}/details`, {}, null);
    setSelectedUserDetails(result);
    setUserDetailsLoading(false);
  }

  async function updateLicenseFromDetails() {
    const user = selectedUserDetails?.user;
    if (!user) return;

    const result = await request(
      `/superadmin/users/${user._id}/license`,
      {
        method: "PUT",
        body: JSON.stringify({
          isLicensed: true,
          durationMonths: Number(licenseDuration),
        }),
      },
      null
    );
    if (result) {
      await loadAll();
      const refreshed = await request(`/superadmin/users/${user._id}/details`, {}, null);
      setSelectedUserDetails(refreshed);
    }
  }

  async function changeUserRole(user, role) {
    await request(
      `/superadmin/users/${user._id}/role`,
      {
        method: "PUT",
        body: JSON.stringify({ role }),
      },
      null
    );

    await loadAll();
  }

  async function updateAdminPermissions(user, permission, checked) {
    const currentPermissions = Array.isArray(user.adminPermissions)
      ? user.adminPermissions
      : ADMIN_PERMISSION_OPTIONS.map((item) => item.key);

    const nextPermissions = checked
      ? Array.from(new Set([...currentPermissions, permission]))
      : currentPermissions.filter((item) => item !== permission);

    await request(
      `/superadmin/users/${user._id}/admin-permissions`,
      {
        method: "PUT",
        body: JSON.stringify({ adminPermissions: nextPermissions }),
      },
      null
    );

    await loadAll();
  }
  async function deleteUser(user) {
    const ok = window.confirm(`${user.username} kullanicisi silinsin mi?`);
    if (!ok) return;

    await request(
      `/superadmin/users/${user._id}`,
      {
        method: "DELETE",
      },
      null
    );

    await loadAll();
  }

  async function updateCareers() {
    const ok = window.confirm("Tum kullanici kariyerleri guncellensin mi?");
    if (!ok) return;

    const result = await request(
      "/superadmin/careers/update-all",
      {
        method: "POST",
      },
      null
    );

    if (result) {
      setMessage("Kariyerler guncellendi");
    }

    await loadAll();
  }

  function getPaymentStatusLabel(paymentStatus) {
    if (paymentStatus === "paid") return "Odendi";
    if (paymentStatus === "failed") return "Basarisiz";
    if (paymentStatus === "refunded") return "Iade";
    return "Odeme Bekliyor";
  }

  function getPaymentStatusClass(paymentStatus) {
    if (paymentStatus === "paid") return "paid";
    if (paymentStatus === "failed") return "failed";
    if (paymentStatus === "refunded") return "refunded";
    return "pending";
  }
  async function updateOrderPaymentStatus(order, paymentStatus) {
    const result = await request(
      `/orders/admin/${order._id}/payment`,
      {
        method: "PUT",
        body: JSON.stringify({ paymentStatus }),
      },
      null
    );

    if (result) {
      setMessage("Odeme durumu guncellendi");
      await loadAll();
    }
  }

  function openOrderDetails(order) {
    setSelectedOrder(order);
    setOrderEdit({
      status: order.status || "pending",
      shippingCarrier: order.shippingCarrier || "",
      cargoTrackingNumber: order.cargoTrackingNumber || "",
    });
  }

  async function updateOrderStatus() {
    if (!selectedOrder) return;

    const result = await request(
      `/orders/admin/${selectedOrder._id}/status`,
      {
        method: "PUT",
        body: JSON.stringify(orderEdit),
      },
      null
    );

    if (result) {
      setMessage("Siparis ve kargo bilgileri guncellendi");
      setSelectedOrder(null);
      await loadAll();
    }
  }

  function getOrderStatusLabel(status) {
    return {
      pending: "Onay Bekliyor",
      preparing: "Hazirlaniyor",
      shipped: "Kargoya Verildi",
      completed: "Teslim Edildi",
      cancelled: "Iptal Edildi",
    }[status] || "Onay Bekliyor";
  }
  function renderOverview() {
    return (
      <>
        <div className="super-hero">
          <div>
            <span>FTSLine</span>
            <h1>Super Admin Merkezi</h1>
            <p>
              Kullanici, urun, siparis, lisans, rol ve finans kontrolunu tek
              merkezden yonet.
            </p>
          </div>

          <div className="super-hero-actions">
            <button onClick={loadAll} className="super-btn">
              Yenile
            </button>

            <button onClick={updateCareers} className="super-btn success">
              Kariyerleri Guncelle
            </button>
          </div>
        </div>

        <div className="super-stats">
          {stats.map((item, index) => (
            <div className="super-stat-card" key={index}>
              <p>{item.title}</p>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderProducts() {
    return (
      <section className="super-card">
        <div className="super-section-head">
          <div>
            <h2>Urun Yonetimi</h2>
            <p>Urun ekle, duzenle, aktif/pasif yap veya sil.</p>
          </div>

          <div className="super-product-tools">
            <input
              className="super-search"
              placeholder="Urun ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button className="super-btn success" onClick={openAddProduct}>
              + Urun Ekle
            </button>
          </div>
        </div>

        <div className="super-table-wrap">
          <table className="super-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Urun</th>
                <th>Marka</th>
                <th>Kategori</th>
                <th>Normal</th>
                <th>Lisansli</th>
                <th>Stok</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <div className="super-image-row">
                        {(product.images?.length
                          ? product.images.slice(0, 3)
                          : ["/ftsline.png"]
                        ).map((img, i) => (
                          <img
                            key={i}
                            className="super-thumb"
                            src={img}
                            alt={product.name}
                          />
                        ))}
                      </div>
                    </td>

                    <td>{product.name || "-"}</td>
                    <td>{product.brand || "-"}</td>
                    <td>{product.category || "-"}</td>
                    <td>{Number(product.priceNormal || 0).toLocaleString("tr-TR")} TL</td>
                    <td>{Number(product.priceLicensed || 0).toLocaleString("tr-TR")} TL</td>
                    <td>{product.stock || "Sinirsiz"}</td>

                    <td>
                      <span
                        className={
                          product.isActive
                            ? "super-status active"
                            : "super-status passive"
                        }
                      >
                        {product.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>

                    <td>
                      <div className="super-actions">
                        <button
                          className="super-btn small"
                          onClick={() => openEditProduct(product)}
                        >
                          Duzenle
                        </button>

                        <button
                          className="super-btn small"
                          onClick={() => toggleProduct(product)}
                        >
                          {product.isActive ? "Pasiflestir" : "Aktiflestir"}
                        </button>

                        <button
                          className="super-btn danger small"
                          onClick={() => removeProduct(product._id)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="super-empty">
                    Urun bulunamadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderUsers() {
    return (
      <section className="super-card">
        <div className="super-section-head">
          <div>
            <h2>Kullanici Yonetimi</h2>
            <p>Kullanici rolu, aktiflik ve lisans yonetimi.</p>
          </div>

          <div className="super-user-tools">
            <input
              className="super-search"
              placeholder="Kullanici veya kariyer ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className="super-btn success" onClick={updateCareers}>
              Kariyerleri Güncelle
            </button>
          </div>
        </div>

        <div className="super-career-summary" aria-label="Kariyer dağılımı">
          {careerSummary.map((item) => (
            <button
              type="button"
              className={`super-career-summary-item ${item.level.toLowerCase().replaceAll("_", "-")} ${userCareerFilter === item.level ? "selected" : ""}`}
              key={item.level}
              onClick={() => setUserCareerFilter((current) => current === item.level ? "all" : item.level)}
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          ))}
        </div>

        <div className="super-user-overview" aria-label="Kullanıcı özeti ve filtreleri">
          <button
            type="button"
            className={`super-user-stat total ${userStatusFilter === "all" ? "selected" : ""}`}
            onClick={() => setUserStatusFilter("all")}
          >
            <span>Toplam kayıt</span>
            <strong>{userSummary.total}</strong>
          </button>
          <button
            type="button"
            className={`super-user-stat active ${userStatusFilter === "active" ? "selected" : ""}`}
            onClick={() => setUserStatusFilter("active")}
          >
            <span>Aktif kullanıcı</span>
            <strong>{userSummary.active}</strong>
          </button>
          <button
            type="button"
            className={`super-user-stat passive ${userStatusFilter === "passive" ? "selected" : ""}`}
            onClick={() => setUserStatusFilter("passive")}
          >
            <span>Pasif kullanıcı</span>
            <strong>{userSummary.passive}</strong>
          </button>
          <button
            type="button"
            className={`super-user-stat licensed ${userLicenseFilter === "licensed" ? "selected" : ""}`}
            onClick={() => setUserLicenseFilter((current) => current === "licensed" ? "all" : "licensed")}
          >
            <span>Lisanslı kullanıcı</span>
            <strong>{userSummary.licensed}</strong>
          </button>
          <button
            type="button"
            className={`super-user-stat unlicensed ${userLicenseFilter === "unlicensed" ? "selected" : ""}`}
            onClick={() => setUserLicenseFilter((current) => current === "unlicensed" ? "all" : "unlicensed")}
          >
            <span>Lisanssız kullanıcı</span>
            <strong>{userSummary.unlicensed}</strong>
          </button>
        </div>

        <div className="super-user-filterbar">
          <div className="super-user-filter-group" aria-label="Duruma göre filtrele">
            <button type="button" className={userStatusFilter === "all" ? "selected" : ""} onClick={() => setUserStatusFilter("all")}>Tümü</button>
            <button type="button" className={userStatusFilter === "active" ? "selected active" : ""} onClick={() => setUserStatusFilter("active")}>Sadece aktifler</button>
            <button type="button" className={userStatusFilter === "passive" ? "selected passive" : ""} onClick={() => setUserStatusFilter("passive")}>Sadece pasifler</button>
          </div>
          <label className="super-user-career-filter">
            <span>Kariyere göre</span>
            <select value={userCareerFilter} onChange={(event) => setUserCareerFilter(event.target.value)}>
              <option value="all">Tüm kariyerler</option>
              {careerSummary.map((item) => (
                <option value={item.level} key={item.level}>{item.label} ({item.count})</option>
              ))}
            </select>
          </label>
          <div className="super-user-license-filter" aria-label="Lisansa göre filtrele">
            <span>Lisans durumuna göre</span>
            <div>
              <button type="button" className={userLicenseFilter === "all" ? "selected" : ""} onClick={() => setUserLicenseFilter("all")}>Tümü</button>
              <button type="button" className={userLicenseFilter === "licensed" ? "selected licensed" : ""} onClick={() => setUserLicenseFilter("licensed")}>Lisanslı</button>
              <button type="button" className={userLicenseFilter === "unlicensed" ? "selected unlicensed" : ""} onClick={() => setUserLicenseFilter("unlicensed")}>Lisanssız</button>
            </div>
          </div>
          <span className="super-filter-result">{filteredUsers.length} kayıt gösteriliyor</span>
          {(search || userStatusFilter !== "all" || userCareerFilter !== "all" || userLicenseFilter !== "all") && (
            <button
              type="button"
              className="super-clear-user-filters"
              onClick={() => {
                setSearch("");
                setUserStatusFilter("all");
                setUserCareerFilter("all");
                setUserLicenseFilter("all");
              }}
            >
              Filtreleri temizle
            </button>
          )}
        </div>

        <div className="super-table-wrap">
          <table className="super-table">
            <thead>
              <tr>
                <th>Kullanici</th>
                <th>Ad Soyad</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Lisans</th>
                <th>Kariyer</th>
                <th>Lisans Baslangici</th>
                <th>Pasife Dusecegi Tarih</th>
                <th>Kalan Sure</th>
                <th>Admin Alanlari</th>
                <th>Islem</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length ? (
                filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <button
                        type="button"
                        className="super-user-link"
                        onClick={() => openUserDetails(user)}
                      >
                        {user.username}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="super-user-link"
                        onClick={() => openUserDetails(user)}
                      >
                        {user.fullName || "-"}
                      </button>
                    </td>
                    <td>{user.email}</td>

                    <td>
                      <select
                        className="super-select"
                        value={user.role || "user"}
                        onChange={(e) => changeUserRole(user, e.target.value)}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                    </td>

                    <td>
                      <span
                        className={
                          user.isActive === false
                            ? "super-status passive"
                            : "super-status active"
                        }
                      >
                        {user.isActive === false ? "Pasif" : "Aktif"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          user.isLicensed
                            ? "super-status active"
                            : "super-status passive"
                        }
                      >
                        {user.isLicensed ? "Lisansli" : "Lisanssiz"}
                      </span>
                    </td>
                    <td>
                      <span className={`super-career-badge ${getCareerClass(user)}`}>
                        {getUserCareerLabel(user)}
                      </span>
                    </td>
                    <td className="super-license-date">
                      {formatLicenseDate(user.licenseStartedAt)}
                    </td>
                    <td className="super-license-date">
                      {formatLicenseDate(user.licenseExpiresAt)}
                    </td>
                    <td>
                      <span
                        className={
                          user.isLicensed
                            ? "super-license-remaining active"
                            : "super-license-remaining passive"
                        }
                      >
                        {getRemainingLicenseTime(
                          user.licenseExpiresAt,
                          user.isLicensed
                        )}
                      </span>
                    </td>
                    <td>
                      {user.role === "admin" ? (
                        <div className="super-permission-list">
                          {ADMIN_PERMISSION_OPTIONS.map((permission) => {
                            const permissions = Array.isArray(user.adminPermissions)
                              ? user.adminPermissions
                              : ADMIN_PERMISSION_OPTIONS.map((item) => item.key);

                            return (
                              <label key={permission.key} className="super-permission-option">
                                <input
                                  type="checkbox"
                                  checked={permissions.includes(permission.key)}
                                  onChange={(e) =>
                                    updateAdminPermissions(
                                      user,
                                      permission.key,
                                      e.target.checked
                                    )
                                  }
                                />
                                <span>{permission.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="super-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="super-actions">
                        <button
                          className="super-btn small"
                          onClick={() => toggleUserActive(user)}
                        >
                          {user.isActive === false ? "Aktif Et" : "Pasiflestir"}
                        </button>

                        <button
                          className="super-btn small"
                          onClick={() => toggleUserLicense(user)}
                        >
                          {user.isLicensed ? "Lisansi Kaldir" : "Lisans Ver"}
                        </button>

                        <button
                          className="super-btn danger small"
                          onClick={() => deleteUser(user)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12" className="super-empty">
                    Kullanici bulunamadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderOrders() {
    return (
      <section className="super-card">
        <div className="super-section-head">
          <div>
            <h2>Siparis Yonetimi</h2>
            <p>Tum siparisleri goruntule.</p>
          </div>

          <input
            className="super-search"
            placeholder="Siparis ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="super-order-filters">
          <label className="super-filter-field">
            <span>Siparis durumu</span>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
            >
              <option value="all">Tum durumlar</option>
              <option value="pending">Onay Bekliyor</option>
              <option value="preparing">Hazirlaniyor</option>
              <option value="shipped">Kargoya Verildi</option>
              <option value="completed">Teslim Edildi</option>
              <option value="cancelled">Iptal Edildi</option>
            </select>
          </label>

          <label className="super-filter-field">
            <span>Odeme durumu</span>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="all">Tum odemeler</option>
              <option value="pending">Odeme Bekliyor</option>
              <option value="paid">Odendi</option>
              <option value="failed">Basarisiz</option>
              <option value="refunded">Iade Edildi</option>
            </select>
          </label>

          <label className="super-filter-field">
            <span>Baslangic tarihi</span>
            <input
              type="date"
              value={orderDateFrom}
              max={orderDateTo || undefined}
              onChange={(e) => setOrderDateFrom(e.target.value)}
            />
          </label>

          <label className="super-filter-field">
            <span>Bitis tarihi</span>
            <input
              type="date"
              value={orderDateTo}
              min={orderDateFrom || undefined}
              onChange={(e) => setOrderDateTo(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="super-filter-clear"
            onClick={clearOrderFilters}
          >
            Filtreleri Temizle
          </button>

          <span className="super-filter-result">
            {filteredOrders.length} siparis bulundu
          </span>
        </div>

        <div className="super-table-wrap">
          <table className="super-table">
            <thead>
              <tr>
                <th>Siparis</th>
                <th>Musteri</th>
                <th>Urun</th>
                <th>Tutar</th>
                <th>Odeme</th>
                <th>Kanit</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length ? (
                filteredOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <button className="super-order-link" onClick={() => openOrderDetails(order)}>
                        #{String(order._id).slice(-8).toUpperCase()}
                      </button>
                    </td>

                    <td>
                      {order.shippingInfo?.fullName || "-"}
                      <br />
                      <small>{order.shippingInfo?.email || ""}</small>
                    </td>

                    <td>
                      {order.items?.[0]?.name || "Siparis"}
                      {order.items?.length > 1
                        ? ` +${order.items.length - 1}`
                        : ""}
                    </td>

                    <td>
                      {Number(order.total || 0).toLocaleString("tr-TR")}{" "}
                      {order.orderType === "license" ? "USDT" : "TL"}
                    </td>

                    <td>
                      <span
                        className={`super-payment-badge ${getPaymentStatusClass(
                          order.paymentStatus
                        )}`}
                      >
                        {getPaymentStatusLabel(order.paymentStatus)}
                      </span>
                      <select
                        className="super-select super-payment-select"
                        value={order.paymentStatus || "pending"}
                        onChange={(e) => updateOrderPaymentStatus(order, e.target.value)}
                      >
                        <option value="pending">Bekliyor</option>
                        <option value="paid">Odendi</option>
                        <option value="failed">Basarisiz</option>
                        <option value="refunded">Iade</option>
                      </select>
                      <small className="super-payment-method">
                        {order.paymentMethod || "-"}
                      </small>
                    </td>

                    <td>
                      {order.paymentProof ? (
                        <span className="super-proof" title={order.paymentProof}>
                          {order.paymentProof}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      <span className={`super-order-status ${order.status || "pending"}`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </td>

                    <td>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("tr-TR")
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="super-empty">
                    Siparis bulunamadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedOrder ? (
          <div className="super-modal-backdrop" onMouseDown={() => setSelectedOrder(null)}>
            <div className="super-modal super-order-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="super-modal-head">
                <div>
                  <h2>Siparis Detayi</h2>
                  <p>#{String(selectedOrder._id).slice(-8).toUpperCase()}</p>
                </div>
                <button className="super-modal-close" onClick={() => setSelectedOrder(null)}>×</button>
              </div>

              <div className="super-order-detail-grid">
                <div className="super-order-info">
                  <h3>Musteri ve Teslimat</h3>
                  <p><strong>Ad Soyad:</strong> {selectedOrder.shippingInfo?.fullName || "-"}</p>
                  <p><strong>E-posta:</strong> {selectedOrder.shippingInfo?.email || "-"}</p>
                  <p><strong>Telefon:</strong> {selectedOrder.shippingInfo?.phone || "-"}</p>
                  <p><strong>Adres:</strong> {selectedOrder.shippingInfo?.address || "-"}, {selectedOrder.shippingInfo?.district || "-"} / {selectedOrder.shippingInfo?.city || "-"}</p>
                  <p><strong>Not:</strong> {selectedOrder.shippingInfo?.note || "-"}</p>
                  <p><strong>Siparis takip kodu:</strong> {selectedOrder.trackingCode || "-"}</p>
                </div>

                <div className="super-order-info">
                  <h3>Odeme</h3>
                  <p><strong>Yontem:</strong> {selectedOrder.paymentMethod || "-"}</p>
                  <p><strong>Durum:</strong> {getPaymentStatusLabel(selectedOrder.paymentStatus)}</p>
                  <p><strong>Kanit / islem no:</strong> {selectedOrder.paymentProof || "-"}</p>
                  <p><strong>Toplam:</strong> {Number(selectedOrder.total || 0).toLocaleString("tr-TR")} {selectedOrder.orderType === "license" ? "USDT" : "TL"}</p>
                </div>
              </div>

              <div className="super-order-items">
                <h3>Urunler</h3>
                {(selectedOrder.items || []).map((item, index) => (
                  <div className="super-order-item" key={`${item.productId || item.name}-${index}`}>
                    {item.image ? <img src={item.image} alt="" /> : <div className="super-order-item-placeholder">Urun</div>}
                    <div><strong>{item.name}</strong><small>{item.quantity} adet × {Number(item.price || 0).toLocaleString("tr-TR")}</small></div>
                  </div>
                ))}
              </div>

              <div className="super-order-editor">
                <label>Siparis Durumu
                  <select value={orderEdit.status} onChange={(e) => setOrderEdit((old) => ({ ...old, status: e.target.value }))}>
                    <option value="pending">Onay Bekliyor</option>
                    <option value="preparing">Hazirlaniyor</option>
                    <option value="shipped">Kargoya Verildi</option>
                    <option value="completed">Teslim Edildi</option>
                    <option value="cancelled">Iptal Edildi</option>
                  </select>
                </label>
                <label>Kargo Firmasi
                  <input value={orderEdit.shippingCarrier} onChange={(e) => setOrderEdit((old) => ({ ...old, shippingCarrier: e.target.value }))} placeholder="Ornek: Yurtici Kargo" />
                </label>
                <label>Kargo Takip Numarasi
                  <input value={orderEdit.cargoTrackingNumber} onChange={(e) => setOrderEdit((old) => ({ ...old, cargoTrackingNumber: e.target.value }))} placeholder="Takip numarasi" />
                </label>
              </div>

              <div className="super-modal-actions">
                <button className="super-btn secondary" onClick={() => setSelectedOrder(null)}>Vazgec</button>
                <button className="super-btn success" onClick={updateOrderStatus}>Siparisi Guncelle</button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  function renderFinance() {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    const financeOrders = financeData.orders.filter((order) =>
      !q || [order.orderNumber, order.user?.username, order.user?.fullName, order.user?.email,
        ...(order.items || []).map((item) => item.name)].some((value) =>
        String(value || "").toLocaleLowerCase("tr-TR").includes(q))
    );
    const financeUsers = financeData.users.filter((user) =>
      !q || [user.username, user.fullName, user.email].some((value) =>
        String(value || "").toLocaleLowerCase("tr-TR").includes(q))
    );
    const financeProducts = financeData.products.filter((product) =>
      !q || [product.name, product.brand, product.category].some((value) =>
        String(value || "").toLocaleLowerCase("tr-TR").includes(q))
    );
    const paymentLabels = { pending: "Odeme Bekliyor", paid: "Odendi", failed: "Basarisiz", refunded: "Iade Edildi" };
    const orderLabels = { pending: "Onay Bekliyor", preparing: "Hazirlaniyor", shipped: "Kargoda", completed: "Teslim Edildi", cancelled: "Iptal Edildi" };

    return (
      <div className="super-finance-page">
        <section className="super-card">
          <div className="super-section-head">
            <div><h2>Finans Merkezi</h2><p className="super-muted">Satis, fatura, urun ve kullanici hak edislerini tek ekranda yonetin.</p></div>
            <button className="super-btn" onClick={loadFinance} disabled={loadingFinance}>{loadingFinance ? "Yukleniyor..." : "Finansi Yenile"}</button>
          </div>

          <div className="super-finance-grid">
            <div><span>Odenen Satis</span><strong>{formatMoney(financeData.summary.paidSales)}</strong></div>
            <div><span>Bekleyen Odeme</span><strong>{formatMoney(financeData.summary.pendingSales)}</strong></div>
            <div><span>Toplam Hak Edis</span><strong>{formatMoney(financeData.summary.totalEarnings)}</strong></div>
            <div><span>Fatura Bekleyen</span><strong>{financeData.summary.invoicePending}</strong></div>
            <div><span>Toplam Siparis</span><strong>{financeData.summary.orderCount}</strong></div>
            <div><span>Bekleyen Hak Ediş</span><strong>{formatMoney(financeData.summary.pendingPayoutAmount)}</strong></div>
            <div><span>Bekleyen İade</span><strong>{financeData.summary.pendingRefundCount} · {formatMoney(financeData.summary.pendingRefundAmount)}</strong></div>
          </div>

          <div className="super-finance-tabs">
            <button className={financeTab === "sales" ? "active" : ""} onClick={() => setFinanceTab("sales")}>Satis ve Faturalar</button>
            <button className={financeTab === "earnings" ? "active" : ""} onClick={() => setFinanceTab("earnings")}>Hak Edisler ve Kaynaklari</button>
            <button className={financeTab === "payouts" ? "active" : ""} onClick={() => setFinanceTab("payouts")}>Ödeme Talepleri</button>
            <button className={financeTab === "refunds" ? "active" : ""} onClick={() => setFinanceTab("refunds")}>İade Talepleri</button>
            <button className={financeTab === "audit" ? "active" : ""} onClick={() => setFinanceTab("audit")}>Denetim Kayıtları</button>
            <button className={financeTab === "products" ? "active" : ""} onClick={() => setFinanceTab("products")}>Urun Takibi</button>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Finansta ara..." />
          </div>
        </section>

        {financeTab === "sales" && <section className="super-card">
          <h2>Satis ve Fatura Takibi</h2>
          <div className="super-table-wrap"><table className="super-table"><thead><tr><th>Siparis</th><th>Musteri / Urun</th><th>Tutar</th><th>Odeme</th><th>Siparis Durumu</th><th>Fatura</th><th>Tarih</th></tr></thead>
            <tbody>{financeOrders.map((order) => <tr key={order._id}>
              <td>#{order.orderNumber || String(order._id).slice(-8).toUpperCase()}</td>
              <td><strong>{order.user?.fullName || order.user?.username || "Misafir"}</strong><small>{(order.items || []).map((item) => `${item.name} (${item.quantity})`).join(", ")}</small></td>
              <td><strong>{formatMoney(order.total)}</strong></td>
              <td><select className="super-select" value={order.paymentStatus || "pending"} onChange={(e) => updateFinanceOrder(order._id, { paymentStatus: e.target.value })}>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td>
              <td><select className="super-select" value={order.status || "pending"} onChange={(e) => updateFinanceOrder(order._id, { status: e.target.value })}>{Object.entries(orderLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td>
              <td>{order.invoiceIssued ? <button className="super-invoice issued" onClick={() => updateFinanceOrder(order._id, { invoiceIssued: false })}>Kesildi {order.invoiceNumber ? `#${order.invoiceNumber}` : ""}</button> : <button className="super-invoice" onClick={() => { const number = window.prompt("Fatura numarasi (istege bagli):", ""); if (number !== null) updateFinanceOrder(order._id, { invoiceIssued: true, invoiceNumber: number }); }}>Fatura Kesildi</button>}</td>
              <td>{formatLicenseDate(order.createdAt)}</td>
            </tr>)}</tbody></table>{!financeOrders.length && <div className="super-empty">Eslesen satis kaydi yok.</div>}</div>
        </section>}

        {financeTab === "earnings" && <section className="super-card">
          <h2>Kullanici Kazanc ve Hak Edis Kaynaklari</h2>
          <div className="super-table-wrap"><table className="super-table"><thead><tr><th>Kullanici</th><th>Hak Edilen</th><th>Odenen</th><th>Bekleyen</th><th>Cuzdan</th><th>Son Hak Edis Kaynaklari</th></tr></thead>
            <tbody>{financeUsers.map((user) => <tr key={user._id}><td><strong>{user.username}</strong><small>{user.fullName}<br />{user.email}</small></td><td>{formatMoney(user.earnedTotal)}</td><td>{formatMoney(user.paidTotal)}</td><td>{formatMoney(user.pendingTotal)}</td><td>{formatMoney(user.walletBalance)}</td><td><div className="super-earning-sources">{(user.recentSources || []).slice(0, 4).map((source, index) => <span key={`${source.id || index}`}><b>{formatEarningType(source.sourceType)}</b> · {formatMoney(source.amount)} · {formatEarningStatus(source.status)}<small>Kaynak: {source.sourceUsername || "Sistem"} · {formatLicenseDate(source.createdAt)}</small></span>)}{!(user.recentSources || []).length && "Henuz hak edis yok"}</div></td></tr>)}</tbody></table>{!financeUsers.length && <div className="super-empty">Eslesen kullanici finans kaydi yok.</div>}</div>
        </section>}

        {financeTab === "payouts" && <section className="super-card">
          <h2>Hak Ediş Ödeme Talepleri</h2>
          <div className="super-table-wrap"><table className="super-table"><thead><tr><th>Kullanıcı</th><th>Tutar</th><th>Banka Bilgisi</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead>
            <tbody>{(financeData.withdrawals || []).map((item) => <tr key={item._id}>
              <td><strong>{item.user?.username || "-"}</strong><small>{item.user?.fullName}<br />{item.user?.email}</small></td>
              <td><strong>{formatMoney(item.amount)}</strong></td>
              <td><strong>{item.accountHolder}</strong><small>{item.bankName}<br />{item.iban}</small></td>
              <td>{item.status === "pending" ? "Bekliyor" : item.status === "approved" ? "Ödendi" : "Reddedildi"}{item.note ? <small>{item.note}</small> : null}</td>
              <td>{formatLicenseDate(item.createdAt)}</td>
              <td>{item.status === "pending" ? <div className="super-actions"><button className="super-btn" onClick={() => updateWithdrawal(item._id, "approved")}>Ödendi</button><button className="super-btn danger" onClick={() => updateWithdrawal(item._id, "rejected")}>Reddet</button></div> : "-"}</td>
            </tr>)}</tbody></table>{!(financeData.withdrawals || []).length && <div className="super-empty">Henüz hak ediş ödeme talebi yok.</div>}</div>
        </section>}

        {financeTab === "refunds" && <section className="super-card">
          <h2>İptal ve İade Talepleri</h2>
          <div className="super-table-wrap"><table className="super-table"><thead><tr><th>Sipariş</th><th>Kullanıcı</th><th>Tutar</th><th>Neden / Açıklama</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead>
            <tbody>{(financeData.refunds || []).map((item) => <tr key={item._id}>
              <td><strong>#{item.order?.orderNumber || item.trackingCode || String(item.order?._id || "").slice(-8).toUpperCase()}</strong><small>{(item.order?.items || []).map((product) => product.name).join(", ")}</small></td>
              <td><strong>{item.user?.username || "-"}</strong><small>{item.user?.fullName}<br />{item.user?.email}</small></td>
              <td><strong>{formatMoney(item.requestedAmount)}</strong></td>
              <td>{item.reason || "-"}<small>{item.details || "Açıklama yok"}{item.adminNote ? <><br />Not: {item.adminNote}</> : null}</small></td>
              <td>{item.status === "pending" ? "Bekliyor" : item.status === "processing" ? "İşleniyor" : item.status === "approved" ? "Onaylandı" : item.status === "rejected" ? "Reddedildi" : "İptal"}</td>
              <td>{formatLicenseDate(item.createdAt)}</td>
              <td>{item.status === "pending" ? <div className="super-actions"><button className="super-btn" onClick={() => updateRefundRequest(item._id, "approved")}>İadeyi Onayla</button><button className="super-btn danger" onClick={() => updateRefundRequest(item._id, "rejected")}>Reddet</button></div> : "-"}</td>
            </tr>)}</tbody></table>{!(financeData.refunds || []).length && <div className="super-empty">Henüz iptal veya iade talebi yok.</div>}</div>
        </section>}

        {financeTab === "audit" && <section className="super-card">
          <h2>Değiştirilemeyen Finans Denetim Kayıtları</h2>
          <p className="super-muted">Ödeme, fatura, hak ediş ve iade işlemleri hash zinciriyle saklanır.</p>
          <div className="super-table-wrap"><table className="super-table"><thead><tr><th>Tarih</th><th>İşlem</th><th>Varlık</th><th>Yetkili</th><th>Tutar</th><th>Kayıt Özeti</th></tr></thead>
            <tbody>{(financeData.auditEvents || []).map((event) => <tr key={event._id}>
              <td>{formatLicenseDate(event.createdAt)}</td><td><strong>{event.eventType}</strong></td><td>{event.entityType}<small>{event.entityId}</small></td><td>{event.actor?.username || "Sistem"}<small>{event.actorRole}</small></td><td>{formatMoney(event.amount)}</td><td><small>{JSON.stringify(event.after || event.metadata || {})}</small></td>
            </tr>)}</tbody></table>{!(financeData.auditEvents || []).length && <div className="super-empty">Henüz finans denetim kaydı yok.</div>}</div>
        </section>}

        {financeTab === "products" && <section className="super-card">
          <h2>Urun Satis ve Stok Takibi</h2>
          <div className="super-table-wrap"><table className="super-table"><thead><tr><th>Urun</th><th>Kategori</th><th>Stok</th><th>Satilan Adet</th><th>Satis Cirosu</th><th>Durum</th></tr></thead>
            <tbody>{financeProducts.map((product) => <tr key={product._id}><td><strong>{product.name}</strong><small>{product.brand}</small></td><td>{product.category || "-"}</td><td>{product.stock ?? "Sinirsiz"}</td><td>{product.soldQuantity || 0}</td><td>{formatMoney(product.salesRevenue)}</td><td><span className={`super-status ${product.isActive ? "active" : "passive"}`}>{product.isActive ? "Aktif" : "Pasif"}</span></td></tr>)}</tbody></table>{!financeProducts.length && <div className="super-empty">Eslesen urun kaydi yok.</div>}</div>
        </section>}
      </div>
    );
  }

  function renderAnnouncements() {
    return (
      <section className="super-card super-announcement-admin">
        <div className="super-section-heading">
          <div>
            <h2>Kayan Duyurular</h2>
            <p>Navbar altinda gosterilecek duyurulari yalnizca Super Admin yonetebilir.</p>
          </div>
          <button type="button" className="super-btn" onClick={addAnnouncement} disabled={announcementsLoading}>
            + Yeni Duyuru
          </button>
        </div>

        {announcementsLoading && !announcementDrafts.length ? (
          <div className="super-empty">Duyurular yukleniyor...</div>
        ) : (
          <div className="super-announcement-list">
            {announcementDrafts.map((item, index) => (
              <article className={`super-announcement-editor ${item.isActive ? "active" : "passive"}`} key={index}>
                <div className="super-announcement-editor-head">
                  <strong>Duyuru {index + 1}</strong>
                  <div className="super-announcement-editor-actions">
                    <label className="super-announcement-toggle">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(event) => updateAnnouncement(index, "isActive", event.target.checked)}
                      />
                      <span>{item.isActive ? "Yayinda" : "Pasif"}</span>
                    </label>
                    <button type="button" className="super-btn danger" onClick={() => removeAnnouncement(index)}>
                      Sil
                    </button>
                  </div>
                </div>

                <div className="super-announcement-fields">
                  <label>
                    <span>Turkce metin</span>
                    <textarea
                      value={item.textTr}
                      maxLength={160}
                      rows={2}
                      placeholder="Duyuruyu Turkce yazin..."
                      onChange={(event) => updateAnnouncement(index, "textTr", event.target.value)}
                    />
                    <small>{item.textTr.length}/160</small>
                  </label>
                  <label>
                    <span>Ingilizce metin (istege bagli)</span>
                    <textarea
                      value={item.textEn}
                      maxLength={160}
                      rows={2}
                      placeholder="Announcement in English..."
                      onChange={(event) => updateAnnouncement(index, "textEn", event.target.value)}
                    />
                    <small>{item.textEn.length}/160</small>
                  </label>
                </div>
              </article>
            ))}

            {!announcementDrafts.length && (
              <div className="super-empty">Aktif duyuru yok. Yeni duyuru ekleyebilirsiniz.</div>
            )}
          </div>
        )}

        <div className="super-announcement-savebar">
          <span>{announcementDrafts.filter((item) => item.isActive).length} aktif / {announcementDrafts.length} toplam duyuru</span>
          <button type="button" className="super-btn" onClick={saveAnnouncements} disabled={announcementsLoading}>
            {announcementsLoading ? "Kaydediliyor..." : "Duyurulari Kaydet"}
          </button>
        </div>
      </section>
    );
  }

  function renderVisitors() {
    const summary = visitorData.summary || emptyVisitorData.summary;
    const periodLabel = visitorData.periodLabel || "Seçilen dönem";
    return (
      <section className="super-card super-visitors">
        <div className="super-section-head">
          <div>
            <h2>Ziyaretçi Analizi</h2>
            <p>Sayfa ziyaretleri, yaklaşık konum ve cihaz bilgileri. Yalnızca Süper Admin görebilir.</p>
          </div>
          <button type="button" className="super-btn" onClick={() => loadVisitors(visitorPeriod)} disabled={visitorsLoading}>
            {visitorsLoading ? "Yükleniyor..." : "Verileri Yenile"}
          </button>
        </div>

        <div className="super-visitor-periods" aria-label="Ziyaret dönemi">
          {[
            ["hour", "Son 1 saat"],
            ["day", "Son 24 saat"],
            ["month", "Son 30 gün"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={visitorPeriod === value ? "is-active" : ""}
              onClick={() => {
                setVisitorPeriod(value);
                loadVisitors(value);
              }}
              disabled={visitorsLoading}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="super-visitor-stats">
          <div><span>{periodLabel} ziyaret</span><strong>{summary.periodViews}</strong></div>
          <div><span>{periodLabel} tekil ziyaretçi</span><strong>{summary.periodUniqueVisitors}</strong></div>
          <div><span>30 günlük tekil ziyaretçi</span><strong>{summary.uniqueVisitors30Days}</strong></div>
          <div><span>Toplam sayfa görüntüleme</span><strong>{summary.totalViews}</strong></div>
        </div>

        <div className="super-visitor-layout">
          <div className="super-visitor-pages">
            <h3>En çok ziyaret edilen sayfalar</h3>
            {visitorData.topPages?.length ? visitorData.topPages.map((page) => (
              <div className="super-visitor-page" key={page.path}>
                <span title={page.path}>{page.path}</span>
                <strong>{page.views} görüntüleme</strong>
                <small>{page.uniqueVisitors} kişi</small>
              </div>
            )) : <p className="super-empty">Henüz ziyaret kaydı yok.</p>}
          </div>

          <div className="super-visitor-note">
            <strong>Gizlilik koruması açık</strong>
            <p>IP adresleri maskelenir, konum yaklaşık gösterilir ve kayıtlar {visitorData.retentionDays || 90} gün sonra otomatik silinir.</p>
          </div>
        </div>

        <h3 className="super-visitor-recent-title">{periodLabel} içindeki ziyaretler</h3>
        <div className="super-table-wrap">
          <table className="super-table super-visitor-table">
            <thead>
              <tr>
                <th>Tarih</th><th>Ziyaret edilen sayfa</th><th>Ülke / Şehir</th>
                <th>Cihaz</th><th>Tarayıcı</th><th>Kaynak</th><th>Maskeli IP</th>
              </tr>
            </thead>
            <tbody>
              {visitorData.recent?.length ? visitorData.recent.map((visit) => (
                <tr key={visit._id}>
                  <td>{formatLicenseDate(visit.createdAt)}</td>
                  <td><strong>{visit.path}</strong></td>
                  <td>{visit.country || "Bilinmiyor"} / {visit.city || "Bilinmiyor"}</td>
                  <td>{visit.device || "-"}</td>
                  <td>{visit.browser || "-"}</td>
                  <td className="super-visitor-referrer" title={visit.referrer}>{visit.referrer || "Direkt"}</td>
                  <td><code>{visit.maskedIp || "-"}</code></td>
                </tr>
              )) : (
                <tr><td colSpan="7" className="super-empty">Henüz ziyaret kaydı yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderContent() {
    if (loading) {
      return <div className="super-card super-empty">Yukleniyor...</div>;
    }

    if (activeMenu === "overview") return renderOverview();
    if (activeMenu === "users") return renderUsers();
    if (activeMenu === "products") return renderProducts();
    if (activeMenu === "orders") return renderOrders();
    if (activeMenu === "finance") return renderFinance();
    if (activeMenu === "academy") return <AcademyAdmin onMessage={setMessage} />;
    if (activeMenu === "announcements") return renderAnnouncements();
    if (activeMenu === "visitors") return renderVisitors();

    return renderOverview();
  }

  return (
    <div className="super-panel">
      {sidebarOpen && (
        <button
          type="button"
          className="super-sidebar-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`super-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="super-logo">
          <span className="super-logo-mark">
            <img src="/ftsline.png" alt="FTSLine Logo" />
          </span>
          <span className="super-logo-copy">
            <strong>FTSLine</strong>
            <small>Super Admin</small>
          </span>
        </div>

        <button
          className={activeMenu === "overview" ? "active" : ""}
          onClick={() => menuClick("overview")}
        >
          <span className="super-menu-icon">G</span><span>Genel Bakış</span>
        </button>

        <button
          className={activeMenu === "users" ? "active" : ""}
          onClick={() => menuClick("users")}
        >
          <span className="super-menu-icon">K</span><span>Kullanıcılar</span>
        </button>

        <button
          className={activeMenu === "products" ? "active" : ""}
          onClick={() => menuClick("products")}
        >
          <span className="super-menu-icon">Ü</span><span>Ürünler</span>
        </button>

        <button
          className={activeMenu === "orders" ? "active" : ""}
          onClick={() => menuClick("orders")}
        >
          <span className="super-menu-icon">S</span><span>Siparişler</span>
        </button>

        <button
          className={activeMenu === "finance" ? "active" : ""}
          onClick={() => menuClick("finance")}
        >
          <span className="super-menu-icon">F</span><span>Finans</span>
        </button>

        <button
          className={activeMenu === "academy" ? "active" : ""}
          onClick={() => menuClick("academy")}
        >
          <span className="super-menu-icon">A</span><span>Akademi</span>
        </button>

        <button
          className={activeMenu === "announcements" ? "active" : ""}
          onClick={() => menuClick("announcements")}
        >
          <span className="super-menu-icon">D</span><span>Duyurular</span>
        </button>

        <button
          className={activeMenu === "visitors" ? "active" : ""}
          onClick={() => menuClick("visitors")}
        >
          <span className="super-menu-icon">Z</span><span>Ziyaretçiler</span>
        </button>

        <button className="logout" onClick={logout}>
          <span className="super-menu-icon">Ç</span><span>Çıkış Yap</span>
        </button>
      </aside>

      <main className="super-main">
        <div className="super-topbar">
          <button
            type="button"
            className="super-mobile-menu"
            aria-label="Menüyü aç veya kapat"
            onClick={() => setSidebarOpen((current) => !current)}
          >
            <span></span><span></span><span></span>
          </button>
          <div className="super-topbar-copy">
            <h1>Super Admin Paneli</h1>
            <p>Tum sistemi yonetebilecegin ana kontrol alani.</p>
          </div>

          <button className="super-btn" onClick={loadAll}>
            Verileri Yenile
          </button>
        </div>

        {message && <div className="super-alert">{message}</div>}

        {renderContent()}

        {(selectedUserDetails || userDetailsLoading) && (
          <div className="super-modal-backdrop">
            <div className="super-modal super-user-modal">
              <div className="super-modal-head">
                <div>
                  <h2>Kullanici Ayrintilari</h2>
                  <p>Sponsor, telefon, lisans ve alt ekip bilgileri.</p>
                </div>
                <button
                  className="super-modal-close"
                  type="button"
                  onClick={() => {
                    setSelectedUserDetails(null);
                    setUserDetailsLoading(false);
                  }}
                >
                  x
                </button>
              </div>

              {userDetailsLoading ? (
                <div className="super-empty">Yukleniyor...</div>
              ) : (
                <>
                  <div className="super-user-summary">
                    <div><span>Kullanici</span><strong>{selectedUserDetails.user.username}</strong></div>
                    <div><span>Ad Soyad</span><strong>{selectedUserDetails.user.fullName || "-"}</strong></div>
                    <div><span>E-posta</span><strong>{selectedUserDetails.user.email || "-"}</strong></div>
                    <div><span>Telefon</span><strong>{selectedUserDetails.user.phone || "-"}</strong></div>
                    <div>
                      <span>Sponsor</span>
                      <strong>
                        {selectedUserDetails.user.sponsor?.username ||
                          selectedUserDetails.user.sponsor?.fullName ||
                          "Sponsor yok"}
                      </strong>
                    </div>
                    <div><span>Doğrudan Ekip</span><strong>{selectedUserDetails.directTeamCount}</strong></div>
                    <div><span>Toplam Alt Ekip</span><strong>{selectedUserDetails.totalTeamCount}</strong></div>
                    <div><span>Lisans Bitisi</span><strong>{formatLicenseDate(selectedUserDetails.user.licenseExpiresAt)}</strong></div>
                  </div>

                  <section className="super-finance-section">
                    <div className="super-finance-head">
                      <div>
                        <h3>Hak Ediş ve Kazanç Kaynakları</h3>
                        <p>Kazancın kimden, hangi bonus türünden ve ne zaman oluştuğunu gösterir.</p>
                      </div>
                    </div>

                    <div className="super-earning-summary">
                      <div><span>Kullanılabilir Bakiye</span><strong>{formatMoney(selectedUserDetails.financial?.summary?.availableBalance)}</strong></div>
                      <div><span>Bu Ay</span><strong>{formatMoney(selectedUserDetails.financial?.summary?.monthlyEarning)}</strong></div>
                      <div><span>Toplam Hak Ediş</span><strong>{formatMoney(selectedUserDetails.financial?.summary?.totalEarning)}</strong></div>
                      <div><span>Ödenen / Çekilen</span><strong>{formatMoney(selectedUserDetails.financial?.summary?.totalWithdrawn)}</strong></div>
                    </div>

                    {Number(selectedUserDetails.financial?.summary?.previousUntrackedTotal || 0) > 0 && (
                      <div className="super-earning-legacy">
                        Önceki kayıtlardan gelen, kaynak bilgisi bulunmayan tutar: <strong>{formatMoney(selectedUserDetails.financial.summary.previousUntrackedTotal)}</strong>
                      </div>
                    )}

                    {!!selectedUserDetails.financial?.sourceSummary?.length && (
                      <div className="super-earning-sources">
                        {selectedUserDetails.financial.sourceSummary.map((source) => (
                          <div key={source.sourceType}>
                            <span>{formatEarningType(source.sourceType)}</span>
                            <strong>{formatMoney(source.amount)}</strong>
                            <small>{source.count} hareket</small>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedUserDetails.financial?.movements?.length ? (
                      <div className="super-earning-table-wrap">
                        <table className="super-earning-table">
                          <thead>
                            <tr>
                              <th>Tarih</th>
                              <th>Hak Ediş Türü</th>
                              <th>Kaynak Kullanıcı</th>
                              <th>Seviye / Oran</th>
                              <th>Tutar</th>
                              <th>Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUserDetails.financial.movements.map((movement) => (
                              <tr key={movement._id}>
                                <td>{formatLicenseDate(movement.createdAt)}</td>
                                <td>{formatEarningType(movement.sourceType)}</td>
                                <td>
                                  <strong>{movement.sourceUser?.username || movement.sourceUsername || "Önceki kayıtlardan gelen"}</strong>
                                  {movement.sourceUser?.fullName && <small>{movement.sourceUser.fullName}</small>}
                                </td>
                                <td>
                                  {movement.depth ? `Seviye ${movement.depth}` : "-"}
                                  {movement.rate ? ` / %${Number((Number(movement.rate) * 100).toFixed(2))}` : ""}
                                </td>
                                <td className="super-earning-amount">+ {formatMoney(movement.amount)}</td>
                                <td><span className={`super-earning-status ${movement.status}`}>{formatEarningStatus(movement.status)}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="super-empty">Henüz kaynaklandırılmış hak ediş hareketi yok.</div>
                    )}
                  </section>

                  <div className="super-license-editor">
                    <label>
                      <span>Manuel lisans suresi</span>
                      <select
                        className="super-select"
                        value={licenseDuration}
                        onChange={(event) => setLicenseDuration(event.target.value)}
                      >
                        <option value="1">1 Ay</option>
                        <option value="12">1 Yil</option>
                        <option value="24">2 Yil</option>
                      </select>
                    </label>
                    <button className="super-btn" type="button" onClick={updateLicenseFromDetails}>
                      {selectedUserDetails.user.isLicensed ? "Secilen Sureyi Uygula" : "Secilen Sureyle Aktif Et"}
                    </button>
                    {selectedUserDetails.user.isLicensed && (
                      <button
                        className="super-btn"
                        type="button"
                        onClick={async () => {
                          const result = await toggleUserLicense(selectedUserDetails.user);
                          if (result) {
                            const refreshed = await request(
                              `/superadmin/users/${selectedUserDetails.user._id}/details`,
                              {},
                              null
                            );
                            setSelectedUserDetails(refreshed);
                          }
                        }}
                      >
                        Lisansi Kaldir
                      </button>
                    )}
                    <button
                      className="super-btn"
                      type="button"
                      onClick={async () => {
                        await toggleUserActive(selectedUserDetails.user);
                        const refreshed = await request(
                          `/superadmin/users/${selectedUserDetails.user._id}/details`,
                          {},
                          null
                        );
                        setSelectedUserDetails(refreshed);
                      }}
                    >
                      {selectedUserDetails.user.isActive === false ? "Hesabi Aktif Et" : "Hesabi Pasiflestir"}
                    </button>
                  </div>

                  <div className="super-team-section">
                    <h3>Alt Ekip</h3>
                    {selectedUserDetails.team.length ? (
                      <div className="super-team-list">
                        {selectedUserDetails.team.map((member) => (
                          <button
                            type="button"
                            className="super-team-member"
                            key={member._id}
                            onClick={() => openUserDetails(member)}
                          >
                            <span>Seviye {member.level}</span>
                            <strong>{member.username}</strong>
                            <small>{member.fullName || member.email} · {member.phone || "Telefon yok"}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="super-empty">Bu kullanicinin alt ekibi yok.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {productModalOpen && (
          <div className="super-modal-backdrop">
            <div className="super-modal">
              <div className="super-modal-head">
                <div>
                  <h2>{editingProduct ? "Urunu Duzenle" : "Yeni Urun Ekle"}</h2>
                  <p>Urunu tek sefer gir. Dil degisimi sadece arayuz yazilarini etkiler.</p>
                </div>

                <button
                  className="super-modal-close"
                  onClick={closeProductModal}
                  type="button"
                >
                  x
                </button>
              </div>

              <form className="super-product-form" onSubmit={saveProduct}>
                <div className="super-form-grid wide-form-grid">
                  <label className="super-field">
                    <span>Urun Adi</span>
                    <input
                      name="name"
                      placeholder="Urun adi"
                      value={productForm.name}
                      onChange={handleProductChange}
                    />
                  </label>

                  <label className="super-field">
                    <span>Marka</span>
                    <input
                      name="brand"
                      placeholder="Marka"
                      value={productForm.brand}
                      onChange={handleProductChange}
                    />
                  </label>

                  <label className="super-field">
                    <span>Kategori</span>
                    <input
                      name="category"
                      placeholder="Kategori"
                      value={productForm.category}
                      onChange={handleProductChange}
                    />
                  </label>

                  <label className="super-field">
                    <span>Stok</span>
                    <input
                      name="stock"
                      placeholder="Stok"
                      value={productForm.stock}
                      onChange={handleProductChange}
                    />
                  </label>

                  <label className="super-field">
                    <span>Normal Fiyat</span>
                    <input
                      name="priceNormal"
                      type="number"
                      placeholder="Normal fiyat"
                      value={productForm.priceNormal}
                      onChange={handleProductChange}
                    />
                  </label>

                  <label className="super-field">
                    <span>Lisansli Fiyat</span>
                    <input
                      name="priceLicensed"
                      type="number"
                      placeholder="Lisansli fiyat"
                      value={productForm.priceLicensed}
                      onChange={handleProductChange}
                    />
                  </label>

                  <label className="super-field">
                    <span>Dağıtıma Esas Net Kâr</span>
                    <input
                      name="networkProfitBase"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Masraflar sonrası onaylanan birim net kâr"
                      value={productForm.networkProfitBase}
                      onChange={handleProductChange}
                    />
                    <small>Ürün ve satış masrafları çıktıktan sonra yönetimin kabul ettiği birim net kâr.</small>
                  </label>

                  <label className="super-field">
                    <span>Durum</span>
                    <select
                      name="status"
                      value={productForm.status}
                      onChange={handleProductChange}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Pasif">Pasif</option>
                    </select>
                  </label>
                </div>

                <label className="super-field">
                  <span>Urun Aciklamasi</span>
                  <textarea
                    name="description"
                    placeholder="Urun aciklamasi"
                    value={productForm.description}
                    onChange={handleProductChange}
                  />
                </label>

                <label className="super-field">
                  <span>Resim Yukle</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <small>Birden fazla urun fotografi secebilirsin.</small>
                </label>

                {existingImages.length > 0 && (
                  <div className="super-upload-block">
                    <h4>Mevcut Resimler</h4>
                    <div className="super-image-preview">
                      {existingImages.map((img, i) => (
                        <div className="super-preview-box" key={`${img}-${i}`}>
                          <img src={img} alt={`Mevcut ${i + 1}`} />
                          <button type="button" onClick={() => removeExistingImage(i)}>
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {preview.length > 0 && (
                  <div className="super-upload-block">
                    <h4>Yeni Secilen Resimler</h4>
                    <div className="super-image-preview">
                      {preview.map((img, i) => (
                        <div className="super-preview-box" key={`${img}-${i}`}>
                          <img src={img} alt={`Yeni ${i + 1}`} />
                          <button type="button" onClick={() => removeNewImage(i)}>
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="super-modal-actions">
                  <button
                    type="button"
                    className="super-btn danger"
                    onClick={closeProductModal}
                  >
                    Vazgec
                  </button>

                  <button type="submit" className="super-btn success">
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}



