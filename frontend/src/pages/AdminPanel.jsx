import { useEffect, useMemo, useState } from "react";
import { getAdminProducts, deleteProduct } from "../api.js";
import "./AdminPanel.css";

const API = import.meta.env.VITE_API_URL || "/api";

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
    fullName: "Mehmet Yılmaz",
    email: "mehmet@mail.com",
    role: "user",
    status: "Aktif",
  },
  {
    id: 3,
    username: "ayse34",
    fullName: "Ayşe Demir",
    email: "ayse@mail.com",
    role: "user",
    status: "Pasif",
  },
];

const initialFinance = [
  {
    id: 1,
    title: "Komisyon Ödemesi",
    type: "Gelir",
    amount: "1200",
    status: "Tamamlandı",
    date: "2026-04-18",
  },
  {
    id: 2,
    title: "Paket Satışı",
    type: "Gelir",
    amount: "450",
    status: "Tamamlandı",
    date: "2026-04-17",
  },
  {
    id: 3,
    title: "İade İşlemi",
    type: "Gider",
    amount: "90",
    status: "Bekliyor",
    date: "2026-04-16",
  },
];

const emptyProductForm = {
  name: "",
  brand: "",
  category: "",
  description: "",
  priceNormal: "",
  priceLicensed: "",
  stock: "Sınırsız",
  status: "Aktif",
};

export default function AdminPanel() {
  const [activeMenu, setActiveMenu] = useState("dashboard");

  const [users] = useState(initialUsers);
  const [products, setProducts] = useState([]);
  const [finance] = useState(initialFinance);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [productForm, setProductForm] = useState(emptyProductForm);

  const [settings] = useState({
    siteName: "FTSLine",
    supportEmail: "support@ftsline.net",
    defaultCurrency: "TL",
    maintenanceMode: false,
  });

  async function loadProducts() {
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
      console.error("Admin ürünleri yüklenemedi:", error);
      setProducts([]);
      alert(error.message || "Ürünler alınamadı");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();

    return () => {
      preview.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => u.status === "Aktif").length;

    const activeProducts = products.filter(
      (p) => p.isActive === true || p.status === "Aktif"
    ).length;

    const passiveProducts = products.length - activeProducts;

    const totalIncome = finance
      .filter((f) => f.type === "Gelir")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalExpense = finance
      .filter((f) => f.type === "Gider")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return [
      { title: "Toplam Kullanıcı", value: users.length },
      { title: "Aktif Kullanıcı", value: activeUsers },
      { title: "Toplam Ürün", value: products.length },
      { title: "Aktif Ürün", value: activeProducts },
      { title: "Pasif Ürün", value: passiveProducts },
      {
        title: "Net Bakiye",
        value: `${(totalIncome - totalExpense).toFixed(2)} TL`,
      },
    ];
  }, [users, products, finance]);

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

  const filteredFinance = finance.filter((item) => {
    const q = searchTerm.toLowerCase();

    return (
      item.title.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q)
    );
  });

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

    alert("Bu bölümde yeni ekleme yetkisi yok. Ürün eklemek için Ürünler bölümüne geç.");
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
      alert("Lütfen ürün adı, normal fiyat ve lisanslı fiyat alanlarını doldur.");
      return;
    }

    try {
      setSaving(true);

      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        alert("Oturum bulunamadı. Lütfen tekrar giriş yap.");
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
      formData.append("stock", productForm.stock || "Sınırsız");
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
        throw new Error(data.message || "Ürün kaydedilemedi");
      }

      setShowProductModal(false);
      resetProductForm();
      await loadProducts();

      alert(editingProduct ? "Ürün güncellendi." : "Ürün eklendi.");
    } catch (error) {
      console.error("Ürün kayıt hatası:", error);
      alert(error.message || "Ürün kaydedilemedi");
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
      stock: product.stock || "Sınırsız",
      status: product.isActive ? "Aktif" : "Pasif",
    });

    setExistingImages(Array.isArray(product.images) ? product.images : []);
    setImages([]);

    preview.forEach((url) => URL.revokeObjectURL(url));
    setPreview([]);

    setShowProductModal(true);
  }

  async function handleDeleteProduct(id) {
    const ok = window.confirm("Bu ürün silinsin mi?");
    if (!ok) return;

    try {
      await deleteProduct(id);
      await loadProducts();
      alert("Ürün silindi.");
    } catch (error) {
      console.error("Ürün silme hatası:", error);
      alert(error.message || "Ürün silinemedi");
    }
  }

  async function handleToggleProduct(product) {
    try {
      const token = sessionStorage.getItem("accessToken");

      if (!token) {
        alert("Oturum bulunamadı. Lütfen tekrar giriş yap.");
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
      formData.append("stock", product.stock || "Sınırsız");
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
        throw new Error(data.message || "Durum değiştirilemedi");
      }

      await loadProducts();
    } catch (error) {
      console.error("Ürün durum hatası:", error);
      alert(error.message || "Durum değiştirilemedi");
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
            <h2>Genel Bakış</h2>
            <p>
              Admin paneline hoş geldin. Buradan kullanıcıları görüntüleyebilir,
              ürünleri yönetebilir, finans kayıtlarını inceleyebilir ve sistem
              ayarlarını görebilirsin.
            </p>
          </div>

          <div className="admin-section">
            <h2>Hızlı Bilgi</h2>

            <ul className="admin-list">
              <li>Kullanıcı sayısı: {users.length}</li>
              <li>Ürün sayısı: {products.length}</li>
              <li>Finans kaydı: {finance.length}</li>
              <li>Bakım modu: {settings.maintenanceMode ? "Açık" : "Kapalı"}</li>
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
            <h2>Kullanıcı Yönetimi</h2>
            <p>Kullanıcıları görüntüle. Admin bu alanda düzenleme yapamaz.</p>
          </div>

          <input
            className="admin-search"
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table wide-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Kullanıcı Adı</th>
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
                    Kullanıcı bulunamadı.
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
            <h2>Ürün Yönetimi</h2>
            <p>Ürün ekle, düzenle, sil, aktif-pasif yap ve çoklu görsel yönet.</p>
          </div>

          <input
            className="admin-search"
            type="text"
            placeholder="Ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loadingProducts ? (
          <div className="empty-row">Ürünler yükleniyor...</div>
        ) : (
          <div className="admin-table-wrapper wide-scroll">
            <table className="admin-table wide-table product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fotoğraflar</th>
                  <th>Ürün</th>
                  <th>Marka</th>
                  <th>Kategori</th>
                  <th>Normal</th>
                  <th>Lisanslı</th>
                  <th>Stok</th>
                  <th>Durum</th>
                  <th>İşlem</th>
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
                              alt="Ürün"
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
                      <td>{product.stock || "Sınırsız"}</td>

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
                            Düzenle
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
                      Ürün bulunamadı.
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
    return (
      <div className="admin-section wide-section">
        <div className="admin-section-head">
          <div>
            <h2>Finans</h2>
            <p>Finans kayıtlarını görüntüle. Admin bu alanda işlem yapamaz.</p>
          </div>

          <input
            className="admin-search"
            type="text"
            placeholder="Finans kaydı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table wide-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Başlık</th>
                <th>Tür</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>

            <tbody>
              {filteredFinance.length > 0 ? (
                filteredFinance.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.type}</td>
                    <td>{item.amount} TL</td>
                    <td>{item.status}</td>
                    <td>{item.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-row">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="admin-section wide-section">
        <div className="admin-section-head">
          <div>
            <h2>Sistem Ayarları</h2>
            <p>Admin bu alanda sadece görüntüleme yapabilir.</p>
          </div>
        </div>

        <form className="admin-form">
          <div className="admin-form-grid">
            <div className="admin-field">
              <label>Site Adı</label>
              <input type="text" value={settings.siteName} readOnly />
            </div>

            <div className="admin-field">
              <label>Destek E-postası</label>
              <input type="email" value={settings.supportEmail} readOnly />
            </div>

            <div className="admin-field">
              <label>Varsayılan Para Birimi</label>
              <input type="text" value={settings.defaultCurrency} readOnly />
            </div>

            <div className="admin-field">
              <label>Bakım Modu</label>
              <input
                type="text"
                value={settings.maintenanceMode ? "Açık" : "Kapalı"}
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
    if (activeMenu === "users") return renderUsers();
    if (activeMenu === "products") return renderProducts();
    if (activeMenu === "finance") return renderFinance();
    if (activeMenu === "settings") return renderSettings();

    return renderDashboard();
  }

  return (
    <div className="admin-panel wide-admin-panel">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <img src="/ftsline.png" alt="FTSLine" />
          <div>
            <strong>FTS Admin</strong>
            <span>Yönetim Paneli</span>
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
          className={activeMenu === "users" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("users");
            setSearchTerm("");
          }}
        >
          Kullanıcılar
        </button>

        <button
          className={activeMenu === "products" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("products");
            setSearchTerm("");
          }}
        >
          Ürünler
        </button>

        <button
          className={activeMenu === "finance" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("finance");
            setSearchTerm("");
          }}
        >
          Finans
        </button>

        <button
          className={activeMenu === "settings" ? "admin-menu active" : "admin-menu"}
          onClick={() => {
            setActiveMenu("settings");
            setSearchTerm("");
          }}
        >
          Ayarlar
        </button>

        <button className="admin-menu logout" onClick={handleLogout}>
          Çıkış Yap
        </button>
      </aside>

      <main className="admin-content wide-admin-content">
        <div className="admin-topbar">
          <div>
            <h1>Admin Paneli</h1>
            <p>FTSLine yönetim ekranı</p>
          </div>

          <button className="admin-btn" onClick={openNewAction}>
            Yeni Ekle
          </button>
        </div>

        {renderContent()}
      </main>

      {showProductModal && (
        <div className="admin-modal-overlay" onClick={closeProductModal}>
          <div className="admin-modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <h2>{editingProduct ? "Ürün Düzenle" : "Yeni Ürün"}</h2>
                <p>
                  Ürünü tek sefer gir. Dil değişimi sadece arayüz yazılarını etkiler.
                  Çoklu görsel seçebilirsin.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={closeProductModal}
              >
                ×
              </button>
            </div>

            <form className="admin-form" onSubmit={handleProductSubmit}>
              <div className="admin-form-grid wide-form-grid">
                <div className="admin-field">
                  <label>Ürün Adı</label>
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
                  <label>Lisanslı Fiyat</label>
                  <input
                    type="number"
                    value={productForm.priceLicensed}
                    onChange={(e) =>
                      changeProductField("priceLicensed", e.target.value)
                    }
                  />
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
                <label>Ürün Açıklaması</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) =>
                    changeProductField("description", e.target.value)
                  }
                />
              </div>

              <div className="admin-field">
                <label>Resim Yükle</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                />

                <small className="admin-help-text">
                  Birden fazla ürün fotoğrafı seçebilirsin.
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
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.length > 0 && (
                <div className="admin-upload-block">
                  <h4>Yeni Seçilen Resimler</h4>

                  <div className="image-preview">
                    {preview.map((img, i) => (
                      <div key={`${img}-${i}`} className="preview-box">
                        <img src={img} alt={`Yeni ${i + 1}`} />

                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                        >
                          ×
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
                  İptal
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