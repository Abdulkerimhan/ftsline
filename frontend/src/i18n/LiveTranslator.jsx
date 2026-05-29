import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "./I18nContext.jsx";

const trToEn = {
  "Anasayfa": "Home",
  "Ürünler": "Products",
  "Urunler": "Products",
  "Hakkımızda": "About",
  "Hakkimizda": "About",
  "İletişim": "Contact",
  "Iletisim": "Contact",
  "Sepet": "Cart",
  "Giriş": "Login",
  "Giris": "Login",
  "Kayıt Ol": "Register",
  "Kayit Ol": "Register",
  "Çıkış": "Logout",
  "Cikis": "Logout",
  "Panel": "Panel",
  "Admin": "Admin",
  "Süper Admin Paneli": "Super Admin Panel",
  "Super Admin": "Super Admin",
  "Admin Paneli": "Admin Panel",
  "Yönetim Paneli": "Management Panel",
  "Toplam Kullanıcı": "Total Users",
  "Aktif Kullanıcı": "Active Users",
  "Lisanslı Kullanıcı": "Licensed Users",
  "Toplam Ürün": "Total Products",
  "Aktif Ürün": "Active Products",
  "Pasif Ürün": "Passive Products",
  "Toplam Sipariş": "Total Orders",
  "Sipariş Cirosu": "Order Revenue",
  "Net Bakiye": "Net Balance",
  "Kullanıcılar": "Users",
  "Kullanicilar": "Users",
  "Ürün Yönetimi": "Product Management",
  "Urun Yonetimi": "Product Management",
  "Ürünler yükleniyor...": "Loading products...",
  "Urunler yukleniyor...": "Loading products...",
  "Ürün ara...": "Search product...",
  "Urun ara...": "Search product...",
  "Kullanıcı ara...": "Search user...",
  "Kullanici ara...": "Search user...",
  "Sipariş ara...": "Search order...",
  "Siparis ara...": "Search order...",
  "Düzenle": "Edit",
  "Duzenle": "Edit",
  "Sil": "Delete",
  "Kaydet": "Save",
  "Vazgeç": "Cancel",
  "Vazgec": "Cancel",
  "Ekle": "Add",
  "Yeni Ürün": "New Product",
  "Yeni Urun": "New Product",
  "Aktif": "Active",
  "Pasif": "Passive",
  "Aktifleştir": "Activate",
  "Aktiflestir": "Activate",
  "Pasifleştir": "Deactivate",
  "Pasiflestir": "Deactivate",
  "Lisanslı": "Licensed",
  "Lisansli": "Licensed",
  "Lisanssız": "Unlicensed",
  "Lisanssiz": "Unlicensed",
  "Lisans Ver": "Grant License",
  "Lisansı Kaldır": "Remove License",
  "Lisansi Kaldir": "Remove License",
  "Siparişler": "Orders",
  "Siparisler": "Orders",
  "Finans": "Finance",
  "Ayarlar": "Settings",
  "Yükleniyor...": "Loading...",
  "Yukleniyor...": "Loading...",
  "Görsel Yok": "No Image",
  "Gorsel Yok": "No Image",
  "Sepete Ekle": "Add to Cart",
  "Ürünleri İncele": "Browse Products",
  "Urunleri Incele": "Browse Products",
  "Alışverişe Devam Et": "Continue Shopping",
  "Alisverise Devam Et": "Continue Shopping",
  "Siparişi Tamamla": "Complete Order",
  "Siparisi Tamamla": "Complete Order",
  "Sepeti Temizle": "Clear Cart",
  "Ürünü Sil": "Remove Item",
  "Urunu Sil": "Remove Item",
  "Ödeme Sayfası": "Payment Page",
  "Odeme Sayfasi": "Payment Page",
  "Güvenli Ödeme": "Secure Payment",
  "Guvenli Odeme": "Secure Payment",
  "Teslimat Bilgileri": "Shipping Information",
  "Kart Bilgileri": "Card Information",
  "Sipariş Özeti": "Order Summary",
  "Siparis Ozeti": "Order Summary",
  "Ad Soyad": "Full Name",
  "Telefon": "Phone",
  "Şehir": "City",
  "Sehir": "City",
  "İlçe": "District",
  "Ilce": "District",
  "Adres": "Address",
  "Toplam": "Total",
  "Ara Toplam": "Subtotal",
  "Kargo": "Shipping",
  "Ücretsiz": "Free",
  "Ucretsiz": "Free",
};

const enToTr = Object.fromEntries(Object.entries(trToEn).map(([tr, en]) => [en, tr]));

function translateText(value, language) {
  if (!value || typeof value !== "string") return value;
  const dict = language === "en" ? trToEn : enToTr;
  let next = value;

  for (const [from, to] of Object.entries(dict)) {
    if (next === from) return to;
  }

  for (const [from, to] of Object.entries(dict)) {
    next = next.replaceAll(from, to);
  }

  return next;
}

function shouldSkipNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION"].includes(parent.tagName);
}

export default function LiveTranslator() {
  const { language } = useI18n();
  const location = useLocation();

  useEffect(() => {
    const apply = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach((node) => {
        if (shouldSkipNode(node)) return;
        const translated = translateText(node.nodeValue, language);
        if (translated !== node.nodeValue) node.nodeValue = translated;
      });

      document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((el) => {
        const translated = translateText(el.getAttribute("placeholder"), language);
        if (translated !== el.getAttribute("placeholder")) el.setAttribute("placeholder", translated);
      });

      document.querySelectorAll("input[value][type='button'], input[value][type='submit']").forEach((el) => {
        const translated = translateText(el.getAttribute("value"), language);
        if (translated !== el.getAttribute("value")) el.setAttribute("value", translated);
      });
    };

    apply();
    const id = window.setTimeout(apply, 60);
    return () => window.clearTimeout(id);
  }, [language, location.pathname]);

  return null;
}
