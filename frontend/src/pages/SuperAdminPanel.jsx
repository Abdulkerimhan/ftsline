import { useEffect, useMemo, useState } from "react";
import "./SuperAdminPanel.css";

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
  stock: "Sinirsiz",
  status: "Aktif",
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

export default function SuperAdminPanel() {
  const [activeMenu, setActiveMenu] = useState("overview");
  const [search, setSearch] = useState("");

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    loadAll();

    return () => {
      preview.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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

    return (
      u.username?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();

    return (
      String(o._id || "").toLowerCase().includes(q) ||
      o.shippingInfo?.fullName?.toLowerCase().includes(q) ||
      o.shippingInfo?.email?.toLowerCase().includes(q)
    );
  });

  function menuClick(menu) {
    setActiveMenu(menu);
    setSearch("");
    setMessage("");
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

          <input
            className="super-search"
            placeholder="Kullanici ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                  <td colSpan="11" className="super-empty">
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
    const total = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    return (
      <section className="super-card">
        <h2>Finans Ozeti</h2>
        <p className="super-muted">Siparis cirosu ve sistem ozeti.</p>

        <div className="super-finance-grid">
          <div>
            <span>Toplam Siparis Cirosu</span>
            <strong>{total.toLocaleString("tr-TR")} TL</strong>
          </div>

          <div>
            <span>Toplam Siparis</span>
            <strong>{orders.length}</strong>
          </div>

          <div>
            <span>Aktif Urun</span>
            <strong>{products.filter((p) => p.isActive).length}</strong>
          </div>

          <div>
            <span>Lisansli Kullanici</span>
            <strong>{users.filter((u) => u.isLicensed).length}</strong>
          </div>
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

    return renderOverview();
  }

  return (
    <div className="super-panel">
      <aside className="super-sidebar">
        <div className="super-logo">
          <strong>FTSLine</strong>
          <span>Super Admin</span>
        </div>

        <button
          className={activeMenu === "overview" ? "active" : ""}
          onClick={() => menuClick("overview")}
        >
          Genel Bakis
        </button>

        <button
          className={activeMenu === "users" ? "active" : ""}
          onClick={() => menuClick("users")}
        >
          Kullanicilar
        </button>

        <button
          className={activeMenu === "products" ? "active" : ""}
          onClick={() => menuClick("products")}
        >
          Urunler
        </button>

        <button
          className={activeMenu === "orders" ? "active" : ""}
          onClick={() => menuClick("orders")}
        >
          Siparisler
        </button>

        <button
          className={activeMenu === "finance" ? "active" : ""}
          onClick={() => menuClick("finance")}
        >
          Finans
        </button>

        <button className="logout" onClick={logout}>
          Cikis Yap
        </button>
      </aside>

      <main className="super-main">
        <div className="super-topbar">
          <div>
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



