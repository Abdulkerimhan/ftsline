import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "./I18nContext.jsx";

const trToEn = {
  "Anasayfa": "Home",
  "ÃœrÃ¼nler": "Products",
  "Urunler": "Products",
  "HakkÄ±mÄ±zda": "About",
  "Hakkimizda": "About",
  "Ä°letiÅŸim": "Contact",
  "Iletisim": "Contact",
  "Sepet": "Cart",
  "GiriÅŸ": "Login",
  "Giris": "Login",
  "KayÄ±t Ol": "Register",
  "Kayit Ol": "Register",
  "Ã‡Ä±kÄ±ÅŸ": "Logout",
  "Cikis": "Logout",
  "Panel": "Panel",
  "Admin": "Admin",
  "Super Admin Paneli": "Super Admin Panel",
  "Super Admin": "Super Admin",
  "Admin Paneli": "Admin Panel",
  "Yonetim Paneli": "Management Panel",
  "Toplam KullanÄ±cÄ±": "Total Users",
  "Aktif KullanÄ±cÄ±": "Active Users",
  "LisanslÄ± KullanÄ±cÄ±": "Licensed Users",
  "Toplam ÃœrÃ¼n": "Total Products",
  "Aktif ÃœrÃ¼n": "Active Products",
  "Pasif ÃœrÃ¼n": "Passive Products",
  "Toplam SipariÅŸ": "Total Orders",
  "SipariÅŸ Cirosu": "Order Revenue",
  "Net Bakiye": "Net Balance",
  "KullanÄ±cÄ±lar": "Users",
  "Kullanicilar": "Users",
  "ÃœrÃ¼n YÃ¶netimi": "Product Management",
  "Urun Yonetimi": "Product Management",
  "ÃœrÃ¼nler yÃ¼kleniyor...": "Loading products...",
  "Urunler yukleniyor...": "Loading products...",
  "ÃœrÃ¼n ara...": "Search product...",
  "Urun ara...": "Search product...",
  "KullanÄ±cÄ± ara...": "Search user...",
  "Kullanici ara...": "Search user...",
  "SipariÅŸ ara...": "Search order...",
  "Siparis ara...": "Search order...",
  "DÃ¼zenle": "Edit",
  "Duzenle": "Edit",
  "Sil": "Delete",
  "Kaydet": "Save",
  "VazgeÃ§": "Cancel",
  "Vazgec": "Cancel",
  "Ekle": "Add",
  "Yeni ÃœrÃ¼n": "New Product",
  "Yeni Urun": "New Product",
  "Aktif": "Active",
  "Pasif": "Passive",
  "AktifleÅŸtir": "Activate",
  "Aktiflestir": "Activate",
  "PasifleÅŸtir": "Deactivate",
  "Pasiflestir": "Deactivate",
  "LisanslÄ±": "Licensed",
  "Lisansli": "Licensed",
  "LisanssÄ±z": "Unlicensed",
  "Lisanssiz": "Unlicensed",
  "Lisans Ver": "Grant License",
  "LisansÄ± KaldÄ±r": "Remove License",
  "Lisansi Kaldir": "Remove License",
  "SipariÅŸler": "Orders",
  "Siparisler": "Orders",
  "Finans": "Finance",
  "Ayarlar": "Settings",
  "YÃ¼kleniyor...": "Loading...",
  "Yukleniyor...": "Loading...",
  "GÃ¶rsel Yok": "No Image",
  "Gorsel Yok": "No Image",
  "Sepete Ekle": "Add to Cart",
  "ÃœrÃ¼nleri Ä°ncele": "Browse Products",
  "Urunleri Incele": "Browse Products",
  "AlÄ±ÅŸveriÅŸe Devam Et": "Continue Shopping",
  "Alisverise Devam Et": "Continue Shopping",
  "SipariÅŸi Tamamla": "Complete Order",
  "Siparisi Tamamla": "Complete Order",
  "Sepeti Temizle": "Clear Cart",
  "ÃœrÃ¼nÃ¼ Sil": "Remove Item",
  "Urunu Sil": "Remove Item",
  "Ã–deme SayfasÄ±": "Payment Page",
  "Odeme Sayfasi": "Payment Page",
  "GÃ¼venli Ã–deme": "Secure Payment",
  "Guvenli Odeme": "Secure Payment",
  "Teslimat Bilgileri": "Shipping Information",
  "Kart Bilgileri": "Card Information",
  "SipariÅŸ Ã–zeti": "Order Summary",
  "Siparis Ozeti": "Order Summary",
  "Ad Soyad": "Full Name",
  "Telefon": "Phone",
  "Åehir": "City",
  "Sehir": "City",
  "Ä°lÃ§e": "District",
  "Ilce": "District",
  "Adres": "Address",
  "Toplam": "Total",
  "Ara Toplam": "Subtotal",
  "Kargo": "Shipping",
  "Ãœcretsiz": "Free",
  "Ucretsiz": "Free",
};

const enToTr = {
  ...Object.fromEntries(Object.entries(trToEn).map(([tr, en]) => [en, tr])),
  "Super Admin": "Super Admin",
  "Super Admin Panel": "Super Admin Paneli",
  "Super Admin Paneli": "Super Admin Paneli",
  "Super Admin Center": "Super Admin Merkezi",
  "Users": "Kullanicilar",
  "Products": "Urunler",
  "Orders": "Siparisler",
  "Settings": "Ayarlar",
  "Logout": "Cikis",
  "Total Users": "Toplam Kullanici",
  "Active Users": "Aktif Kullanici",
  "Licensed Users": "Lisansli Kullanici",
  "Total Products": "Toplam Urun",
  "Active Products": "Aktif Urun",
  "Total Orders": "Toplam Siparis",
  "Order Revenue": "Siparis Cirosu",
};

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

