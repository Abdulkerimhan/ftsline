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
        q: "Siparisimin odeme durumunu nereden gorurum?",
        a: "Kullanici panelindeki Siparisler bolumunde Odeme Bekliyor, Odendi, Basarisiz veya Iade durumlarini gorebilirsin.",
      },
      {
        q: "FTSLine kariyer seviyeleri nelerdir?",
        a: "Kariyer seviyeleri Bronz, Gumus, Altin, Platin, Elmas ve Tac Elmas olarak ilerler. Her seviye; direkt aktif uye sayisi, toplam ekip aktifligi, belirli kariyer kollarina sahip olma ve kol limiti gibi sartlara gore hesaplanir.",
      },
      {
        q: "Bronz kariyer sartlari nelerdir?",
        a: "Bronz icin direk bagli 2 aktif uye gerekir. Bronz seviyede bonus derinligi 13 seviyeye kadar acilir ve aylik kazanc ust limiti 245.000 TL'ye kadar tanimlanir.",
      },
      {
        q: "Gumus ve Altin kariyer nasil kazanilir?",
        a: "Gumus icin 10 kisisel aktif + 20 toplam aktif ya da 3 ayri Bronz kolu + ekipte 20 toplam aktif gerekir. Altin icin 30 direkt aktif + 100 toplam aktif, 3 ayri Gumus kolu + 100 toplam aktif veya kol limitiyle direkt 100 aktif sarti uygulanir.",
      },
      {
        q: "Platin, Elmas ve Tac Elmas sartlari nelerdir?",
        a: "Platin icin 100 kisisel aktif + 500 toplam aktif, 3 ayri Altin kolu + 500 toplam aktif veya kol limitiyle 500 toplam aktif aranir. Elmas icin ekipte 2.400 toplam uye ve direk bagli 3 Platin gerekir. Tac Elmas icin 5 ayri kolun her birinde en az 10.000 uye bulunmasi gerekir.",
      },
      {
        q: "Kol limiti ne demektir?",
        a: "Kol limiti, kariyer hesabinda tek bir bacaktan gelen uye sayisinin tamamini saymak yerine belirli bir ust sinira kadar sayilmasidir. Elmas seviyesinde her koldan en fazla 600 uye dikkate alinir. Tac Elmas icin ise 5 ayri kol gerekir ve her kolda en az 10.000 uye bulunmalidir; bir koldaki 10.000'i asan kisim diger kolun eksigini tamamlamaz.",
      },
      {
        q: "Aktif uye ne anlama gelir?",
        a: "Aktif uye, sistemde lisansi veya abonelik suresi gecerli olan kullanicidir. Lisans suresi biten veya odemesi onaylanmayan kullanici aktif sayimlara dahil edilmez.",
      },
      {
        q: "Unilevel ve matrix kazanci arasindaki fark nedir?",
        a: "Unilevel kazanci ilk lisans bedeli uzerinden tek seferlik hesaplanir. Matrix kazanci ise aylik kullanim bedeli uzerinden, kullanici aktif lisansli kaldigi surece belirlenen derinliklerde aylik olarak islenir.",
      },
      {
        q: "Indirimli urun alisverisinde Network primi nasil dagitilir?",
        a: "Aktif lisansli kullanici urunu lisansli indirimli fiyattan aldiginda, odedigi indirimli urun toplam tutarinin %10'u toplam 10 seviyeye dagitilir. Dagitim oranlari 1. seviye %5; 2. ve 3. seviyeler %1; 4. seviye %0,75; 5, 6 ve 7. seviyeler %0,50; 8, 9 ve 10. seviyeler %0,25 seklindedir.",
      },
      {
        q: "Urun indirimsiz normal fiyattan alinirsa Network primi nasil hesaplanir?",
        a: "Kayitli ve lisanssiz kullanici urunu normal fiyattan aldiginda, normal fiyat ile lisansli fiyat arasindaki fark esas alinir. Farkin %25'i dogrudan sponsora, diger %25'i 2-10. seviyelere dagitilir; kalan %50 ve hak kazanilmayan seviye paylari sirkette kalir.",
      },
      {
        q: "Urun satisi Network primi icin hangi sartlar aranir?",
        a: "Siparisin hem Odendi hem Tamamlandi durumunda olmasi gerekir. Kazanacak ust hat kullanicisi aktif lisansli olmali ve ilgili derinligi acan kariyere sahip olmalidir. Kariyersiz 1, Bronz 2, Gumus 3, Altin 5, Platin 7, Elmas ve Tac Elmas 10. seviyeye kadar kazanabilir. Hak edilmeyen pay sonraki kisiye aktarilmaz. Siparis iptal veya iade edilirse prim geri alinir.",
      },
      {
        q: "Matrix bonus derinligi kariyere gore nasil degisir?",
        a: "Kariyer tanimli degilse matrix bonusu 12 derinlige kadar hesaplanir. Bronz ve Gumus icin 13, Altin ve Platin icin 14, Elmas ve Tac Elmas icin 15 derinlige kadar bonus alani acilir.",
      },
      {
        q: "Platin ve Elmas havuzlari nasil dagitilir?",
        a: "Sirket kar aciklamasindan sonra Platin havuzuna %2, Elmas havuzuna %10 oraninda pay ayrilabilir. O ay ilgili kariyerde kac kisi varsa havuz esit pay edilir; ilgili kariyerde kimse yoksa havuz birikmez ve sifirlanir.",
      },
      {
        q: "Sozlesmeli Elmas havuzu nedir?",
        a: "Altin kariyerindeyken sirket ile sozlesme imzalayan ve sonrasinda Elmas olan kullanicilar icin ayrilan ek havuzdur. Bu havuz, sartlari saglayan Elmas kullanicilar arasinda pay edilir.",
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
        q: "Where can I see my order payment status?",
        a: "In the Orders section of your dashboard, you can see Payment Pending, Paid, Failed or Refunded status.",
      },
      {
        q: "What are the FTSLine career levels?",
        a: "Career levels are Bronze, Silver, Gold, Platinum, Diamond and Crown Diamond. Each level is calculated using direct active members, total team activity, qualified legs and leg limit rules.",
      },
      {
        q: "What are the Bronze requirements?",
        a: "Bronze requires 2 directly connected active members. At Bronze level, bonus depth opens up to 13 levels and the monthly earning cap is defined up to 245,000 TL.",
      },
      {
        q: "How are Silver and Gold achieved?",
        a: "Silver requires either 10 personal active + 20 total active members, or 3 separate Bronze legs + 20 total active team members. Gold requires 30 direct active + 100 total active members, 3 separate Silver legs + 100 total active members, or the direct active option with leg limits.",
      },
      {
        q: "What are Platinum, Diamond and Crown Diamond requirements?",
        a: "Platinum requires 100 personal active + 500 total active members, 3 separate Gold legs + 500 total active members, or a 500 total active structure with leg limits. Diamond requires 2,400 total team members and 3 directly connected Platinum members. Crown Diamond requires 5 separate legs, with at least 10,000 members in each leg.",
      },
      {
        q: "What does leg limit mean?",
        a: "A leg limit means that only a defined maximum count from one direct leg is included in career calculations. Diamond counts up to 600 members from each leg. Crown Diamond requires 5 separate legs with at least 10,000 members in every leg; members above 10,000 in one leg cannot cover a shortage in another leg.",
      },
      {
        q: "What is an active member?",
        a: "An active member is a user whose license or subscription period is valid in the system. Users with expired licenses or unapproved payments are not included in active calculations.",
      },
      {
        q: "What is the difference between unilevel and matrix earnings?",
        a: "Unilevel earnings are calculated once from the first license payment. Matrix earnings are calculated monthly from the usage fee while the user remains actively licensed, based on the eligible depth.",
      },
      {
        q: "How is the Network bonus distributed on a discounted product purchase?",
        a: "When an actively licensed user buys at the discounted licensed price, 10% of the discounted product total is distributed across 10 levels. The rates are 5% at level 1; 1% at levels 2 and 3; 0.75% at level 4; 0.50% at levels 5, 6 and 7; and 0.25% at levels 8, 9 and 10.",
      },
      {
        q: "How is the Network bonus calculated when a product is bought at the normal price?",
        a: "When a registered unlicensed user buys at the normal price, the difference between the normal and licensed prices is used. 25% of the difference goes to the direct sponsor, another 25% is distributed across levels 2-10, and the remaining 50% plus unqualified shares stays with the company.",
      },
      {
        q: "What are the requirements for a product sale Network bonus?",
        a: "The order must be both Paid and Completed. Each receiving upline member must have an active license and the career required for that depth. No career opens level 1, Bronze level 2, Silver level 3, Gold level 5, Platinum level 7, and Diamond or Crown Diamond level 10. An unqualified share does not roll up to another member. The bonus is reversed if the order is cancelled or refunded.",
      },
      {
        q: "How does matrix bonus depth change by career?",
        a: "If no career is assigned, matrix bonus depth is calculated up to 12 levels. Bronze and Silver open up to 13 levels, Gold and Platinum up to 14 levels, and Diamond and Crown Diamond up to 15 levels.",
      },
      {
        q: "How are Platinum and Diamond pools distributed?",
        a: "After the company profit announcement, 2% may be allocated to the Platinum pool and 10% to the Diamond pool. The pool is shared equally among qualified users in that month; if there are no qualified users, the pool does not accumulate and is reset.",
      },
      {
        q: "What is the contracted Diamond pool?",
        a: "It is an additional pool for users who signed a company contract while at Gold career level and later became Diamond. This pool is shared among Diamond users who meet the required conditions.",
      },
    ],
  },
};

export default function FAQ({ embedded = false }) {
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
    <main className={embedded ? "faq-page faq-page-embedded" : "faq-page"}>
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


