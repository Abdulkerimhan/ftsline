import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./FAQ.css";

const faqContent = {
  tr: {
    badge: "SSS",
    title: "Sorular ve Cevaplar",
    subtitle: "FTSLine hesap, lisans, siparis ve odeme surecleri hakkinda en cok merak edilenler.",
    search: "Sorularda ara...",
    empty: "Aramana uygun soru bulunamadi.",
    items: [
      {
        q: "FTSLine hesabi nasil olusturulur?",
        a: "Kayit Ol sayfasindan kullanici bilgilerini girerek hesap olusturabilirsin. Guncel oturum bilgilerin tarayici kapaninca temizlenir, tekrar giris yapman gerekir.",
      },
      {
        q: "Lisansli fiyatlardan nasil yararlanirim?",
        a: "Lisans durumun admin veya super admin tarafindan aktif edildiginde urunlerde lisansli fiyatlar gorunur.",
      },
      {
        q: "IBAN ile odeme nasil onaylanir?",
        a: "Havale / EFT secenegiyle siparis olusturursun. Odeme bankadan kontrol edildikten sonra admin panelinde manuel olarak Odendi yapilir.",
      },
      {
        q: "USDT TRC20 odemesi otomatik onaylanir mi?",
        a: "Hayir. TxID bilgisi siparise eklenir, admin odemeyi kontrol ettikten sonra manuel onaylar.",
      },
      {
        q: "Siparisimin odeme durumunu nereden gorurum?",
        a: "Kullanici panelindeki Siparisler bolumunde Odeme Bekliyor, Odendi, Basarisiz veya Iade durumlarini gorebilirsin.",
      },
      {
        q: "Admin yetkileri nasil kisitlanir?",
        a: "Super Admin panelinde admin kullanicilar icin Kullanicilar, Urunler, Finans ve Ayarlar alanlari ayri ayri acilip kapatilabilir.",
      },
    ],
  },
  en: {
    badge: "FAQ",
    title: "Frequently Asked Questions",
    subtitle: "Common questions about FTSLine accounts, licenses, orders and payments.",
    search: "Search questions...",
    empty: "No matching question found.",
    items: [
      {
        q: "How do I create an FTSLine account?",
        a: "You can create an account from the Register page. Session data is cleared when the browser is fully closed, so you need to log in again.",
      },
      {
        q: "How do I use licensed prices?",
        a: "When your license is activated by an admin or super admin, licensed prices become visible on products.",
      },
      {
        q: "How is IBAN payment approved?",
        a: "Create an order with Bank Transfer. After the bank payment is checked, an admin manually marks the payment as paid.",
      },
      {
        q: "Is USDT TRC20 payment approved automatically?",
        a: "No. The TxID is saved with the order, then an admin checks and approves the payment manually.",
      },
      {
        q: "Where can I see my order payment status?",
        a: "In the Orders section of your dashboard, you can see Payment Pending, Paid, Failed or Refunded status.",
      },
      {
        q: "How are admin permissions restricted?",
        a: "In the Super Admin panel, Users, Products, Finance and Settings sections can be enabled or disabled for each admin.",
      },
    ],
  },
};

export default function FAQ() {
  const { language } = useI18n();
  const t = faqContent[language] || faqContent.tr;
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState(0);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return t.items;

    return t.items.filter((item) => {
      return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
    });
  }, [query, t.items]);

  return (
    <main className="faq-page">
      <section className="faq-hero">
        <span>{t.badge}</span>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </section>

      <section className="faq-shell">
        <input
          className="faq-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
        />

        <div className="faq-list">
          {filteredItems.length ? (
            filteredItems.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <article className={isOpen ? "faq-item open" : "faq-item"} key={item.q}>
                  <button type="button" onClick={() => setOpenIndex(isOpen ? -1 : index)}>
                    <span>{item.q}</span>
                    <strong>{isOpen ? "-" : "+"}</strong>
                  </button>

                  {isOpen && <p>{item.a}</p>}
                </article>
              );
            })
          ) : (
            <div className="faq-empty">{t.empty}</div>
          )}
        </div>
      </section>
    </main>
  );
}


