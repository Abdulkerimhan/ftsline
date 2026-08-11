import { useEffect, useMemo, useState } from "react";
import { getAdminProducts, deleteProduct } from "../api.js";
import "./AdminPanel.css";

const API = import.meta.env.VITE_API_URL || "/api";

const ADMIN_SECTION_PERMISSIONS = ["users", "products", "finance", "settings"];

const initialUsers = [
  {
    id: 1,
    username: "kerimhan",
    fullName: "Abdulkerim Han",
    email: "kerimhan@mail.com",
    role: "admin",
    status: "Aktif",
  },
  {
    id: 2,
    username: "mehmet01",
    fullName: "Mehmet YÄ±lmaz",
    email: "mehmet@mail.com",
    role: "user",
    status: "Aktif",
  },
  {
    id: 3,
    username: "ayse34",
    fullName: "AyÅŸe Demir",
    email: "ayse@mail.com",
    role: "user",
    status: "Pasif",
  },
];

const emptyFinanceData = {
  summary: { paidSales: 0, pendingSales: 0, invoicePending: 0, totalEarnings: 0, orderCount: 0 },
  orders: [],
  users: [],
  products: [],
  transactions: [],
};

const earningSourceLabels = {
  unilevel_initial: "İlk satış unilevel",
  matrix_monthly: "Aylık matrix",
  product_network: "Ürün satışı network primi",
  career_bonus: "Kariyer bonusu",
  pool_bonus: "Havuz bonusu",
  manual_adjustment: "Manuel düzeltme",
};

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("tr-TR") : "-";

const emptyProductForm = {
  name: "",
  brand: "",
  category: "",
  description: "",
  priceNormal: "",
  priceLicensed: "",
  networkProfitBase: "",
  stock: "SÄ±nÄ±rsÄ±z",
  status: "Aktif",
};

export default function AdminPanel() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [users] = useState(initialUsers);
  const [products, setProducts] = useState([]);
  const [financeData, setFinanceData] = useState(emptyFinanceData);
  const [financeTab, setFinanceTab] = useState("sales");
  const [loadingFinance, setLoadingFinance] = useState(false);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [productForm, setProductForm] = useState(emptyProductForm);


  function hasAdminSection(section) {
    if (currentUser?.role === "superadmin") return true;
    if (section === "dashboard") return true;
    const permissions = Array.isArray(currentUser?.adminPermissions)
      ? currentUser.adminPermissions
      : ADMIN_SECTION_PERMISSIONS;
    return permissions.includes(section);
  }

  async function refreshCurrentUser() {
    const token = sessionStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setCurrentUser(data);
        sessionStorage.setItem("user", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Admin kullanici izinleri alinamadi:", error);
    }
  }

  const [settings] = useState({
    siteName: "FTSLine",
    supportEmail: "support@ftsline.net",
    defaultCurrency: "TL",
    maintenanceMode: false,
  });

  async function loadProducts() {
    if (!hasAdminSection("products")) {
      setProducts([]);
      return;
    }
    try {
      setLoadingProducts(true);

      const data = await getAdminProducts();

      if (Array.isArray(data)) {
        setProducts(data);
      } else if (Array.isArray(data?.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Admin Ã¼rÃ¼nleri yÃ¼klenemedi:", error);
      setProducts([]);
      alert(error.message || "ÃœrÃ¼nler alÄ±namadÄ±");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadFinance() {
    if (!hasAdminSection("finance")) return;
    const token = sessionStorage.getItem("accessToken");
    if (!token) return;

    try {
      setLoadingFinance(true);
      const res = await fetch(`${API}/admin/finance/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Finans verileri alınamadı");
      setFinanceData({ ...emptyFinanceData, ...data, summary: { ...emptyFinanceData.summary, ...data?.summary } });
    } catch (error) {
      console.error("Finans verileri alınamadı:", error);
      alert(error.message || "Finans verileri alınamadı");
    } finally {
      setLoadingFinance(false);
    }
  }

  async function updateFinanceOrder(orderId, changes) {
    const token = sessionStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/admin/finance/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(changes),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Sipariş güncellenemedi");
      await loadFinance();
    } catch (error) {
      alert(error.message || "Sipariş güncellenemedi");
    }
  }

  useEffect(() => {
    refreshCurrentUser();
    loadProducts();

    return () => {
      preview.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (hasAdminSection("products")) {
      loadProducts();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeMenu === "finance" && hasAdminSection("finance")) loadFinance();
  }, [activeMenu, currentUser]);

  useEffect(() => {
    if (activeMenu !== "dashboard" && !hasAdminSection(activeMenu)) {
      setActiveMenu("dashboard");
    }
  }, [activeMenu, currentUser]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => u.status === "Aktif").length;

    const activeProducts = products.filter(
      (p) => p.isActive === true || p.status === "Aktif"
    ).length;

    const passiveProducts = products.length - activeProducts;

    const totalIncome = Number(financeData.summary.paidSales || 0);
    const totalExpense = Number(financeData.summary.totalEarnings || 0);

    return [
      { title: "Toplam KullanÄ±cÄ±", value: users.length },
      { title: "Aktif KullanÄ±cÄ±", value: activeUsers },
      { title: "Toplam ÃœrÃ¼n", value: products.length },
      { title: "Aktif ÃœrÃ¼n", value: activeProducts },
      { title: "Pasif ÃœrÃ¼n", value: passiveProducts },
      {
        title: "Net Bakiye",
        value: `${(totalIncome - totalExpense).toFixed(2)} TL`,
      },
    ];
  }, [users, products, financeData]);

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();

    return (
      user.username.toLowerCase().includes(q) ||
      user.fullName.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q) ||
      user.status.toLowerCase().includes(q)
    );
  });

  const filteredProducts = products.filter((product) => {
    const q = searchTerm.toLowerCase();
    const statusText = product.isActive ? "aktif" : "pasif";

    return (
      product.name?.toLowerCase().includes(q) ||
      product.brand?.toLowerCase().includes(q) ||
      product.category?.toLowerCase().includes(q) ||
      product.description?.toLowerCase().includes(q) ||
      statusText.includes(q)
    );
  });

  const financeQuery = searchTerm.trim().toLowerCase();
  const filteredFinanceOrders = financeData.orders.filter((order) =>
    [order.orderNumber, order.user?.username, order.shippingInfo?.fullName, order.shippingInfo?.email,
      ...(order.items || []).map((item) => item.name)]
      .filter(Boolean).join(" ").toLowerCase().includes(financeQuery)
  );
  const filteredFinanceUsers = financeData.users.filter((user) =>
    [user.username, user.fullName, user.email].filter(Boolean).join(" ").toLowerCase().includes(financeQuery)
  );
  const filteredFinanceProducts = financeData.products.filter((product) =>
    [product.name, product.brand, product.category].filter(Boolean).join(" ").toLowerCase().includes(financeQuery)
  );

  function resetProductForm() {
    setProductForm(emptyProductForm);
    setEditingProduct(null);
    setImages([]);

    preview.forEach((url) => URL.revokeObjectURL(url));
    setPreview([]);

    setExistingImages([]);
  }

  function openNewAction() {
    if (activeMenu === "products") {
      resetProductForm();
      setShowProductModal(true);
      return;
    }

    alert("Bu bÃ¶lÃ¼mde yeni ekleme yetkisi yok. ÃœrÃ¼n eklemek iÃ§in ÃœrÃ¼nler bÃ¶lÃ¼mÃ¼ne geÃ§.");
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    setImages((prev) => [...prev, ...files]);

    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setPreview((prev) => [...prev, ...previewUrls]);

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
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  }

  async function handleProductSubmit(e) {
    e.preventDefault();

    if (
      !productForm.name.trim() ||
      productForm.priceNormal === "" ||
      productForm.priceLicensed === ""
    ) {
      alert("LÃ¼tfen Ã¼rÃ¼n adÄ±, normal fiyat ve lisanslÄ± fiyat alanlarÄ±nÄ± doldur.");
      return;
    }

    try {
      setSaving(true);

      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        alert("Oturum bulunamadÄ±. LÃ¼tfen tekrar giriÅŸ yap.");
        window.location.href = "/login";
        return;
      }

      const formData = new FormData();

      formData.append("name", productForm.name.trim());
      formData.append("brand", productForm.brand.trim());
      formData.append("category", productForm.category.trim());
      formData.append("description", productForm.description.trim());
      formData.append("priceNormal", productForm.priceNormal);
      formData.append("priceLicensed", productForm.priceLicensed);
      formData.append("networkProfitBase", productForm.networkProfitBase || 0);
      formData.append("stock", productForm.stock || "SÄ±nÄ±rsÄ±z");
      formData.append("isActive", productForm.status === "Aktif");

      existingImages.forEach((img) => {
        formData.append("existingImages", img);
      });

      images.forEach((img) => {
        formData.append("images", img);
      });

      const productId = editingProduct?._id || editingProduct?.id;

      const url = editingProduct
        ? `${API}/admin/products/${productId}`
        : `${API}/admin/products`;

      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "ÃœrÃ¼n kaydedilemedi");
      }

      setShowProductModal(false);
      resetProductForm();
      await loadProducts();

      alert(editingProduct ? "ÃœrÃ¼n gÃ¼ncellendi." : "ÃœrÃ¼n eklendi.");
    } catch (error) {
      console.error("ÃœrÃ¼n kayÄ±t hatasÄ±:", error);
      alert(error.message || "ÃœrÃ¼n kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  function handleEditProduct(product) {
    setEditingProduct(product);

    setProductForm({
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "",
      description: product.description || "",
      priceNormal: product.priceNormal ?? "",
      priceLicensed: product.priceLicensed ?? "",
      networkProfitBase: product.networkProfitBase ?? "",
      stock: product.stock || "SÄ±nÄ±rsÄ±z",
      status: product.isActive ? "Aktif" : "Pasif",
    });

    setExistingImages(Array.isArray(product.images) ? product.images : []);
    setImages([]);

    preview.forEach((url) => URL.revokeObjectURL(url));
    setPreview([]);

    setShowProductModal(true);
  }

  async function handleDeleteProduct(id) {
    const ok = window.confirm("Bu Ã¼rÃ¼n silinsin mi?");
    if (!ok) return;

    try {
      await deleteProduct(id);
      await loadProducts();
      alert("ÃœrÃ¼n silindi.");
    } catch (error) {
      console.error("ÃœrÃ¼n silme hatasÄ±:", error);
      alert(error.message || "ÃœrÃ¼n silinemedi");
    }
  }

  async function handleToggleProduct(product) {
    try {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        alert("Oturum bulunamadÄ±. LÃ¼tfen tekrar giriÅŸ yap.");
        window.location.href = "/login";
        return;
      }

      const productId = product._id || product.id;

      const formData = new FormData();

      formData.append("name", product.name || "");
      formData.append("brand", product.brand || "");
      formData.append("category", product.category || "");
      formData.append("description", product.description || "");
      formData.append("priceNormal", product.priceNormal ?? 0);
      formData.append("priceLicensed", product.priceLicensed ?? 0);
      formData.append("networkProfitBase", product.networkProfitBase ?? 0);
      formData.append("stock", product.stock || "SÄ±nÄ±rsÄ±z");
      formData.append("isActive", !product.isActive);

      if (Array.isArray(product.images)) {
        product.images.forEach((img) => {
          formData.append("existingImages", img);
        });
      }

      const res = await fetch(`${API}/admin/products/${productId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Durum deÄŸiÅŸtirilemedi");
      }

      await loadProducts();
    } catch (error) {
      console.error("ÃœrÃ¼n durum hatasÄ±:", error);
      alert(error.message || "Durum deÄŸiÅŸtirilemedi");
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    window.location.href = "/login";
  }

  function closeProductModal() {
    setShowProductModal(false);
    resetProductForm();
  }

  function changeProductField(field, value) {
    setProductForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function renderDashboard() {
    return (
      <>
        <div className="admin-stats wide">
          {stats.map((item, index) => (
            <div className="admin-stat-card" key={index}>
              <span>{item.title}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="admin-grid-2">
          <div className="admin-section">
            <h2>Genel BakÄ±ÅŸ</h2>
            <p>
              Admin paneline hoÅŸ geldin. Buradan kullanÄ±cÄ±larÄ± gÃ¶rÃ¼ntÃ¼leyebilir,
              Ã¼rÃ¼nleri yÃ¶netebilir, finans kayÄ±tlarÄ±nÄ± inceleyebilir ve sistem
              ayarlarÄ±nÄ± gÃ¶rebilirsin.
            </p>
          </div>

          <div className="admin-section">
            <h2>HÄ±zlÄ± Bilgi</h2>

            <ul className="admin-list">
              <li>KullanÄ±cÄ± sayÄ±sÄ±: {users.length}</li>
              <li>ÃœrÃ¼n sayÄ±sÄ±: {products.length}</li>
              <li>Finans kaydÄ±: {finance.length}</li>
              <li>BakÄ±m modu: {settings.maintenanceMode ? "AÃ§Ä±k" : "KapalÄ±"}</li>
            </ul>
          </div>
        </div>
      </>
    );
  }

  function renderUsers() {
    return (
      <div className="admin-section wide-section">
        <div className="admin-section-head">
          <div>
            <h2>KullanÄ±cÄ± YÃ¶netimi</h2>
            <p>KullanÄ±cÄ±larÄ± gÃ¶rÃ¼ntÃ¼le. Admin bu alanda dÃ¼zenleme yapamaz.</p>
          </div>

          <input
            className="admin-search"
            type="text"
            placeholder="KullanÄ±cÄ± ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table wide-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>KullanÄ±cÄ± AdÄ±</th>
                <th>Ad Soyad</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Durum</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span
                        className={
                          user.status === "Aktif"
                            ? "status-badge active"
                            : "status-badge passive"
                        }
                      >
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-row">
                    KullanÄ±cÄ± bulunamadÄ±.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderProducts() {
    return (
      <div className="admin-section wide-section">
        <div className="admin-section-head">
          <div>
            <h2>ÃœrÃ¼n YÃ¶netimi</h2>
            <p>ÃœrÃ¼n ekle, dÃ¼zenle, sil, aktif-pasif yap ve Ã§oklu gÃ¶rsel yÃ¶net.</p>
          </div>

          <input
            className="admin-search"
            type="text"
            placeholder="ÃœrÃ¼n ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loadingProducts ? (
          <div className="empty-row">ÃœrÃ¼nler yÃ¼kleniyor...</div>
        ) : (
          <div className="admin-table-wrapper wide-scroll">
            <table className="admin-table wide-table product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>FotoÄŸraflar</th>
                  <th>ÃœrÃ¼n</th>
                  <th>Marka</th>
                  <th>Kategori</th>
                  <th>Normal</th>
                  <th>LisanslÄ±</th>
                  <th>Stok</th>
                  <th>Durum</th>
                  <th>Ä°ÅŸlem</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product._id || product.id}>
                      <td className="admin-id-cell">
                        {String(product._id || product.id).slice(-8)}
                      </td>

                      <td>
                        <div className="admin-product-images">
                          {(product.images?.length
                            ? product.images
                            : [product.image || "/ftsline.png"]
                          ).map((img, i) => (
                            <img
                              key={`${img}-${i}`}
                              src={img}
                              alt="ÃœrÃ¼n"
                              className="admin-product-thumb"
                              onError={(e) => {
                                e.currentTarget.src = "/ftsline.png";
                              }}
                            />
                          ))}
                        </div>
                      </td>

                      <td>{product.name || "-"}</td>
                      <td>{product.brand || "-"}</td>
                      <td>{product.category || "-"}</td>
                      <td>{Number(product.priceNormal || 0).toLocaleString("tr-TR")} TL</td>
                      <td>{Number(product.priceLicensed || 0).toLocaleString("tr-TR")} TL</td>
                      <td>{product.stock || "SÄ±nÄ±rsÄ±z"}</td>

                      <td>
                        <span
                          className={
                            product.isActive
                              ? "status-badge active"
                              : "status-badge passive"
                          }
                        >
                          {product.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-action-buttons">
                          <button
                            className="admin-btn small"
                            onClick={() => handleEditProduct(product)}
                          >
                            DÃ¼zenle
                          </button>

                          <button
                            className={`admin-btn small ${
                              product.isActive ? "warning" : "success"
                            }`}
                            onClick={() => handleToggleProduct(product)}
                          >
                            {product.isActive ? "Pasif Yap" : "Aktif Yap"}
                          </button>

                          <button
                            className="admin-btn danger small"
                            onClick={() =>
                              handleDeleteProduct(product._id || product.id)
                            }
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="empty-row">
                      ÃœrÃ¼n bulunamadÄ±.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderFinance() {
    const summary = financeData.summary;

    return (
      <div className="admin-section wide-section">
        <div className="admin-section-head">
          <div>
            <h2>Finans</h2>
            <p>Satışları, faturaları, kullanıcı hakedişlerini ve ürün hareketlerini yönet.</p>
          </div>
          <div className="finance-head-actions">
            <input
              className="admin-search"
              type="text"
              placeholder="Finans kaydı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="admin-btn small" type="button" onClick={loadFinance} disabled={loadingFinance}>
              {loadingFinance ? "Yükleniyor..." : "Yenile"}
            </button>
          </div>
        </div>

        <div className="admin-stats wide finance-summary">
          <div className="admin-stat-card"><span>Ödenen satış</span><strong>{formatMoney(summary.paidSales)}</strong></div>
          <div className="admin-stat-card"><span>Bekleyen satış</span><strong>{formatMoney(summary.pendingSales)}</strong></div>
          <div className="admin-stat-card"><span>Toplam hakediş</span><strong>{formatMoney(summary.totalEarnings)}</strong></div>
          <div className="admin-stat-card"><span>Fatura bekleyen</span><strong>{summary.invoicePending || 0}</strong></div>
          <div className="admin-stat-card"><span>Sipariş sayısı</span><strong>{summary.orderCount || 0}</strong></div>
        </div>

        <div className="finance-tabs">
          <button className={financeTab === "sales" ? "active" : ""} onClick={() => setFinanceTab("sales")}>Satış ve Fatura</button>
          <button className={financeTab === "earnings" ? "active" : ""} onClick={() => setFinanceTab("earnings")}>Hakedişler ve Kaynakları</button>
          <button className={financeTab === "products" ? "active" : ""} onClick={() => setFinanceTab("products")}>Ürün Takibi</button>
        </div>

        {financeTab === "sales" && <div className="admin-table-wrapper">
          <table className="admin-table wide-table">
            <thead><tr><th>Sipariş</th><th>Müşteri</th><th>Ürünler</th><th>Tutar</th><th>Ödeme</th><th>Sipariş Durumu</th><th>Fatura</th><th>Tarih</th></tr></thead>
            <tbody>{filteredFinanceOrders.length ? filteredFinanceOrders.map((order) => (
              <tr key={order._id}>
                <td>#{order.orderNumber || String(order._id).slice(-8).toUpperCase()}</td>
                <td><strong>{order.user?.username || order.shippingInfo?.fullName || "Misafir"}</strong><small>{order.shippingInfo?.email || order.user?.email || ""}</small></td>
                <td>{(order.items || []).map((item) => `${item.name} x${item.quantity || 1}`).join(", ") || "-"}</td>
                <td>{formatMoney(order.total)}</td>
                <td><select className="finance-select" value={order.paymentStatus || "pending"} onChange={(e) => updateFinanceOrder(order._id, { paymentStatus: e.target.value })}>
                  <option value="pending">Bekliyor</option><option value="paid">Ödendi</option><option value="failed">Başarısız</option><option value="refunded">İade</option>
                </select></td>
                <td><select className="finance-select" value={order.status || "pending"} onChange={(e) => updateFinanceOrder(order._id, { status: e.target.value })}>
                  <option value="pending">Onay bekliyor</option><option value="preparing">Hazırlanıyor</option><option value="shipped">Kargoda</option><option value="completed">Teslim edildi</option><option value="cancelled">İptal</option>
                </select></td>
                <td>{order.invoiceStatus === "issued" ? <div className="finance-invoice"><strong>Kesildi</strong><small>{order.invoiceNumber || formatDate(order.invoiceIssuedAt)}</small><button className="admin-btn small warning" onClick={() => updateFinanceOrder(order._id, { invoiceStatus: "pending", invoiceNumber: "" })}>Geri Al</button></div> : <button className="admin-btn small success" onClick={() => {
                  const invoiceNumber = window.prompt("Fatura numarası (isteğe bağlı)", order.invoiceNumber || "");
                  if (invoiceNumber !== null) updateFinanceOrder(order._id, { invoiceStatus: "issued", invoiceNumber });
                }}>Fatura Kesildi</button>}</td>
                <td>{formatDate(order.createdAt)}</td>
              </tr>
            )) : <tr><td colSpan="8" className="empty-row">Satış kaydı bulunamadı.</td></tr>}</tbody>
          </table>
        </div>}

        {financeTab === "earnings" && <div className="admin-table-wrapper">
          <table className="admin-table wide-table">
            <thead><tr><th>Kullanıcı</th><th>Toplam Hakediş</th><th>Ödenen</th><th>Bekleyen</th><th>Cüzdan</th><th>Hakediş Kaynakları</th></tr></thead>
            <tbody>{filteredFinanceUsers.length ? filteredFinanceUsers.map((user) => {
              const earned = Number(user.earnings?.earned || 0);
              const paid = Number(user.earnings?.paid || 0);
              return <tr key={user._id}>
                <td><strong>{user.username}</strong><small>{user.fullName || "-"}<br />{user.email}</small></td>
                <td>{formatMoney(earned)}</td><td>{formatMoney(paid)}</td><td>{formatMoney(Math.max(0, earned - paid))}</td><td>{formatMoney(user.walletBalance)}</td>
                <td><div className="finance-source-list">{user.earnings?.recentSources?.length ? user.earnings.recentSources.map((source, index) => <div key={`${source._id || index}`}><strong>{earningSourceLabels[source.sourceType] || source.sourceType}</strong><span>{source.sourceUsername ? `${source.sourceUsername} kaynaklı · ` : ""}{formatMoney(source.amount)} · {formatDate(source.createdAt)}</span></div>) : <span>Henüz hakediş yok.</span>}</div></td>
              </tr>;
            }) : <tr><td colSpan="6" className="empty-row">Kullanıcı hakedişi bulunamadı.</td></tr>}</tbody>
          </table>
        </div>}

        {financeTab === "products" && <div className="admin-table-wrapper">
          <table className="admin-table wide-table">
            <thead><tr><th>Ürün</th><th>Marka</th><th>Kategori</th><th>Durum</th><th>Stok</th><th>Satılan Adet</th><th>Satış Geliri</th></tr></thead>
            <tbody>{filteredFinanceProducts.length ? filteredFinanceProducts.map((product) => <tr key={product._id}><td><strong>{product.name}</strong></td><td>{product.brand || "-"}</td><td>{product.category || "-"}</td><td><span className={`status-badge ${product.isActive ? "active" : "passive"}`}>{product.isActive ? "Aktif" : "Pasif"}</span></td><td>{product.stock ?? "Sınırsız"}</td><td>{product.soldQuantity || 0}</td><td>{formatMoney(product.salesRevenue)}</td></tr>) : <tr><td colSpan="7" className="empty-row">Ürün kaydı bulunamadı.</td></tr>}</tbody>
          </table>
        </div>}
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="admin-section wide-section">
        <div className="admin-section-head">
          <div>
            <h2>Sistem AyarlarÄ±</h2>
            <p>Admin bu alanda sadece gÃ¶rÃ¼ntÃ¼leme yapabilir.</p>
          </div>
        </div>

        <form className="admin-form">
          <div className="admin-form-grid">
            <div className="admin-field">
              <label>Site AdÄ±</label>
              <input type="text" value={settings.siteName} readOnly />
            </div>

            <div className="admin-field">
              <label>Destek E-postasÄ±</label>
              <input type="email" value={settings.supportEmail} readOnly />
            </div>

            <div className="admin-field">
              <label>VarsayÄ±lan Para Birimi</label>
              <input type="text" value={settings.defaultCurrency} readOnly />
            </div>

            <div className="admin-field">
              <label>BakÄ±m Modu</label>
              <input
                type="text"
                value={settings.maintenanceMode ? "AÃ§Ä±k" : "KapalÄ±"}
                readOnly
              />
            </div>
          </div>

          <button className="admin-btn" type="button" disabled>
            Ayar Kaydetme Yetkisi Yok
          </button>
        </form>
      </div>
    );
  }

  function renderContent() {
    if (activeMenu === "dashboard") return renderDashboard();
    if (activeMenu === "users" && hasAdminSection("users")) return renderUsers();
    if (activeMenu === "products" && hasAdminSection("products")) return renderProducts();
    if (activeMenu === "finance" && hasAdminSection("finance")) return renderFinance();
    if (activeMenu === "settings" && hasAdminSection("settings")) return renderSettings();

    return renderDashboard();
  }

  return (
    <div className="admin-panel wide-admin-panel">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <img src="/ftsline.png" alt="FTSLine" />
          <div>
            <strong>FTS Admin</strong>
            <span>YÃ¶netim Paneli</span>
          </div>
        </div>

        <button
          className={activeMenu === "dashboard" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("dashboard");
            setSearchTerm("");
          }}
        >
          Panel
        </button>

        <button
          hidden={!hasAdminSection("users")}

          className={activeMenu === "users" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("users");
            setSearchTerm("");
          }}
        >
          KullanÄ±cÄ±lar
        </button>

        <button
          hidden={!hasAdminSection("products")}

          className={activeMenu === "products" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("products");
            setSearchTerm("");
          }}
        >
          ÃœrÃ¼nler
        </button>

        <button
          hidden={!hasAdminSection("finance")}

          className={activeMenu === "finance" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("finance");
            setSearchTerm("");
          }}
        >
          Finans
        </button>

        <button
          hidden={!hasAdminSection("settings")}

          className={activeMenu === "settings" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("settings");
            setSearchTerm("");
          }}
        >
          Ayarlar
        </button>

        <a
          className="admin-menu admin-presentation-link"
          href="/downloads/FTSLine-Detayli-Sunum.pptx"
          download="FTSLine-Detayli-Sunum.pptx"
        >
          FTSLine Sunumu
        </a>

        <button className="admin-menu logout" onClick={handleLogout}>
          Ã‡Ä±kÄ±ÅŸ Yap
        </button>
      </aside>

      <main className="admin-content wide-admin-content">
        <div className="admin-topbar">
          <div>
            <h1>Admin Paneli</h1>
            <p>FTSLine yÃ¶netim ekranÄ±</p>
          </div>

          {hasAdminSection("products") && (
            <button className="admin-btn" onClick={openNewAction}>
              Yeni Ekle
            </button>
          )}
        </div>

        {renderContent()}
      </main>

      {showProductModal && (
        <div className="admin-modal-overlay" onClick={closeProductModal}>
          <div className="admin-modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <h2>{editingProduct ? "ÃœrÃ¼n DÃ¼zenle" : "Yeni ÃœrÃ¼n"}</h2>
                <p>
                  ÃœrÃ¼nÃ¼ tek sefer gir. Dil deÄŸiÅŸimi sadece arayÃ¼z yazÄ±larÄ±nÄ± etkiler.
                  Ã‡oklu gÃ¶rsel seÃ§ebilirsin.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={closeProductModal}
              >
                Ã—
              </button>
            </div>

            <form className="admin-form" onSubmit={handleProductSubmit}>
              <div className="admin-form-grid wide-form-grid">
                <div className="admin-field">
                  <label>ÃœrÃ¼n AdÄ±</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => changeProductField("name", e.target.value)}
                  />
                </div>

                <div className="admin-field">
                  <label>Marka</label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => changeProductField("brand", e.target.value)}
                  />
                </div>

                <div className="admin-field">
                  <label>Kategori</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => changeProductField("category", e.target.value)}
                  />
                </div>

                <div className="admin-field">
                  <label>Normal Fiyat</label>
                  <input
                    type="number"
                    value={productForm.priceNormal}
                    onChange={(e) =>
                      changeProductField("priceNormal", e.target.value)
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>LisanslÄ± Fiyat</label>
                  <input
                    type="number"
                    value={productForm.priceLicensed}
                    onChange={(e) =>
                      changeProductField("priceLicensed", e.target.value)
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>Dağıtıma Esas Net Kâr</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.networkProfitBase}
                    onChange={(e) =>
                      changeProductField("networkProfitBase", e.target.value)
                    }
                  />
                  <small>Masraflar çıktıktan sonra yönetimin kabul ettiği birim net kâr.</small>
                </div>

                <div className="admin-field">
                  <label>Stok</label>
                  <input
                    type="text"
                    value={productForm.stock}
                    onChange={(e) => changeProductField("stock", e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-field">
                <label>ÃœrÃ¼n AÃ§Ä±klamasÄ±</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) =>
                    changeProductField("description", e.target.value)
                  }
                />
              </div>

              <div className="admin-field">
                <label>Resim YÃ¼kle</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                />

                <small className="admin-help-text">
                  Birden fazla Ã¼rÃ¼n fotoÄŸrafÄ± seÃ§ebilirsin.
                </small>
              </div>

              {existingImages.length > 0 && (
                <div className="admin-upload-block">
                  <h4>Mevcut Resimler</h4>

                  <div className="image-preview">
                    {existingImages.map((img, i) => (
                      <div key={`${img}-${i}`} className="preview-box">
                        <img src={img} alt={`Mevcut ${i + 1}`} />

                        <button
                          type="button"
                          onClick={() => removeExistingImage(i)}
                        >
                          Ã—
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.length > 0 && (
                <div className="admin-upload-block">
                  <h4>Yeni SeÃ§ilen Resimler</h4>

                  <div className="image-preview">
                    {preview.map((img, i) => (
                      <div key={`${img}-${i}`} className="preview-box">
                        <img src={img} alt={`Yeni ${i + 1}`} />

                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                        >
                          Ã—
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="admin-field">
                <label>Durum</label>

                <select
                  value={productForm.status}
                  onChange={(e) => changeProductField("status", e.target.value)}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Pasif">Pasif</option>
                </select>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={closeProductModal}
                  disabled={saving}
                >
                  Ä°ptal
                </button>

                <button type="submit" className="admin-btn" disabled={saving}>
                  {saving ? "Kaydediliyor..." : editingProduct ? "Kaydet" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



