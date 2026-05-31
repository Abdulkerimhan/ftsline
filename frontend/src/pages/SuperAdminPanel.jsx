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
  imagesText: "",
  priceNormal: "",
  priceLicensed: "",
  stock: "Sinirsiz",
  isActive: true,
};

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
    setProductModalOpen(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);

    setProductForm({
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "",
      description: product.description || "",
      imagesText: Array.isArray(product.images) ? product.images.join("\n") : "",
      priceNormal: product.priceNormal ?? "",
      priceLicensed: product.priceLicensed ?? "",
      stock: product.stock || "Sinirsiz",
      isActive: product.isActive !== false,
    });

    setProductModalOpen(true);
  }

  function closeProductModal() {
    setProductModalOpen(false);
    setEditingProduct(null);
    setProductForm(emptyProductForm);
  }

  function handleProductChange(e) {
    const { name, value, type, checked } = e.target;

    setProductForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

    const images = productForm.imagesText
      .split("\n")
      .map((img) => img.trim())
      .filter(Boolean);

    const payload = {
      name: productForm.name.trim(),
      brand: productForm.brand.trim(),
      category: productForm.category.trim(),
      description: productForm.description.trim(),
      images,
      priceNormal: Number(productForm.priceNormal),
      priceLicensed: Number(productForm.priceLicensed),
      stock: productForm.stock || "Sinirsiz",
      isActive: productForm.isActive,
    };

    const path = editingProduct
      ? `/admin/products/${editingProduct._id}`
      : "/admin/products";

    const method = editingProduct ? "PUT" : "POST";

    const result = await request(
      path,
      {
        method,
        body: JSON.stringify(payload),
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

  async function toggleUserLicense(user) {
    await request(
      `/superadmin/users/${user._id}/license`,
      {
        method: "PUT",
        body: JSON.stringify({
          isLicensed: user.isLicensed === true ? false : true,
        }),
      },
      null
    );

    await loadAll();
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
                                <th>Admin Alanlari</th>
<th>Islem</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length ? (
                filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.fullName || "-"}</td>
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
                  <td colSpan="8" className="super-empty">
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
                    <td>#{String(order._id).slice(-8).toUpperCase()}</td>

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

                    <td>{Number(order.total || 0).toLocaleString("tr-TR")} TL</td>

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
                      <span className="super-status active">
                        {order.status || "pending"}
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
                <input
                  name="name"
                  placeholder="Urun adi"
                  value={productForm.name}
                  onChange={handleProductChange}
                />

                <input
                  name="brand"
                  placeholder="Marka"
                  value={productForm.brand}
                  onChange={handleProductChange}
                />

                <input
                  name="category"
                  placeholder="Kategori"
                  value={productForm.category}
                  onChange={handleProductChange}
                />

                <div className="super-form-row">
                  <input
                    name="priceNormal"
                    type="number"
                    placeholder="Normal fiyat"
                    value={productForm.priceNormal}
                    onChange={handleProductChange}
                  />

                  <input
                    name="priceLicensed"
                    type="number"
                    placeholder="Lisansli fiyat"
                    value={productForm.priceLicensed}
                    onChange={handleProductChange}
                  />
                </div>

                <input
                  name="stock"
                  placeholder="Stok"
                  value={productForm.stock}
                  onChange={handleProductChange}
                />

                <textarea
                  name="description"
                  placeholder="Urun aciklamasi"
                  value={productForm.description}
                  onChange={handleProductChange}
                />

                <textarea
                  name="imagesText"
                  placeholder={`Gorsel URL'leri\nHer satira 1 gorsel linki yaz\nOrnek: /uploads/products/urun1.jpg`}
                  value={productForm.imagesText}
                  onChange={handleProductChange}
                />

                <label className="super-check">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={productForm.isActive}
                    onChange={handleProductChange}
                  />
                  Urun aktif olsun
                </label>

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



