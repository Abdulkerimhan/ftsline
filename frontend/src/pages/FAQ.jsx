import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import "./FAQ.css";

const faqContent = {
  tr: {
    badge: "Yardım Merkezi",
    title: "Merak ettiğiniz her şey burada",
    subtitle: "Hesap, lisans, Akademi, sipariş, kazanç ve kariyer süreçlerini sade cevaplarla öğrenin.",
    search: "Bir soru veya konu ara...",
    empty: "Aramanıza uygun bir cevap bulunamadı.",
    all: "Tümü",
    categories: {
      account: { label: "Hesap ve güvenlik", icon: "◉" },
      license: { label: "Lisans ve Akademi", icon: "▶" },
      order: { label: "Sipariş ve ödeme", icon: "▣" },
      earning: { label: "Kazanç ve kariyer", icon: "◆" },
      support: { label: "Destek", icon: "✦" },
    },
    highlights: [
      { value: "150 TL", label: "1.000 TL altı fiziki siparişlerde kargo" },
      { value: "5.000 TL", label: "Minimum hak ediş ödeme talebi" },
      { value: "6 haneli", label: "Kayıt ve şifre yenileme doğrulama kodu" },
    ],
    items: [
      { id: "register", category: "account", q: "FTSLine hesabı nasıl oluşturulur?", a: "Kayıt Ol sayfasındaki bilgileri doldurun. Kullanıcı adı en az 5 karakter olmalı, yalnızca harf ve rakam içermeli ve sadece rakamlardan oluşmamalıdır. E-posta adresinize gelen 6 haneli kodu doğruladıktan sonra giriş sayfasına yönlendirilirsiniz." },
      { id: "mail", category: "account", q: "Doğrulama e-postası gelmezse ne yapmalıyım?", a: "Önce Spam, Gereksiz ve Tanıtımlar klasörlerini kontrol edin; adresi doğru yazdığınızdan emin olun. Kod 5 dakika geçerlidir. Süre dolduysa yeni kod isteyin. Sorun devam ederse İletişim sayfasından bize mesaj gönderin." },
      { id: "password", category: "account", q: "Şifremi nasıl yenilerim?", a: "Giriş sayfasındaki Şifremi Unuttum bağlantısını açın. Hesabınıza ait e-posta adresine gönderilen 6 haneli kodu doğrulayarak yeni şifrenizi belirleyebilirsiniz." },

      { id: "license-once", category: "license", q: "İlk lisans bedeli kaç kez alınır?", a: "İlk lisans hakkı hayat boyu bir kez alınır. Bu hakkı kazanan kullanıcı daha sonra aktiflik süresini bir aylık, yıllık veya iki yıllık uygun planlarla istediği zaman yenileyebilir; ilk lisans bedelini yeniden ödemez." },
      { id: "license-active", category: "license", q: "Aktif lisans ne sağlar?", a: "Aktif lisans; lisanslı ürün fiyatlarını, uygun kazanç hesaplamalarını, ekip ve kariyer sayımlarını kullanmanızı sağlar. Süre sona erdiğinde ilk lisans hakkınız kaybolmaz; ancak bu avantajlar yeni süre alınana kadar pasif kalır." },
      { id: "academy", category: "license", q: "Akademi eğitimleri ne zaman açılır?", a: "Akademi erişimi veren lisans veya eğitim paketinin siparişi yönetim panelinde Ödendi olarak onaylandığında ilgili eğitimler otomatik açılır. Yalnızca kayıt olmak Akademi erişimi sağlamaz." },
      { id: "monthly-plan", category: "license", q: "Bir aylık eğitim/aktiflik planını kimler alabilir?", a: "Bir aylık plan yalnızca daha önce ilk lisans hakkını kazanmış kullanıcılar içindir. İlk kez katılan kullanıcı önce uygun ilk lisans paketini almalıdır." },

      { id: "payment", category: "order", q: "Havale/EFT ödemesi nasıl onaylanır?", a: "Siparişinizi Havale/EFT ile oluşturduğunuzda durum Ödeme Bekliyor olur. Banka kontrolünden sonra yönetim tarafından Ödendi olarak işaretlenir ve sipariş, stok, Akademi erişimi ile uygun kazanç işlemleri otomatik güncellenir." },
      { id: "tracking", category: "order", q: "Siparişimi nereden takip ederim?", a: "Üst menüdeki Sipariş Takip alanından veya kullanıcı panelinizdeki Siparişler bölümünden ödeme ve teslimat durumunu görebilirsiniz. Kargoya verilen siparişlerde firma ve takip numarası da burada gösterilir." },
      { id: "shipping", category: "order", q: "Kargo ücreti nasıl hesaplanır?", a: "Fiziki ürün toplamı 1.000 TL'nin altındaysa 150 TL kargo eklenir. 1.000 TL ve üzerindeki fiziki ürün siparişlerinde kargo ücretsizdir. Lisans ve dijital paket siparişlerine kargo eklenmez." },
      { id: "stock", category: "order", q: "Ürün stoğu ne zaman azalır?", a: "Stoklu ürünlerde ödeme Ödendi olarak onaylandığında sipariş miktarı stoktan düşülür. İptal veya iade işlemlerinde sistemde tanımlı geri alma kuralları uygulanır." },

      { id: "earning", category: "earning", q: "Kazançlar hesabıma ne zaman yansır?", a: "Uygun bir siparişin ödemesi Ödendi olarak onaylandığında kazanç hesaplaması çalışır ve hak edilen tutar Kazanç bölümüne yansır. İptal veya iade edilen işlemlerin ilgili kazançları geri alınabilir." },
      { id: "withdrawal", category: "earning", q: "Hak edişimi nasıl talep ederim?", a: "Kullanılabilir bakiyeniz en az 5.000 TL olduğunda Kazanç sayfasından ad soyad, banka ve geçerli Türkiye IBAN bilgisiyle ödeme talebi oluşturabilirsiniz. Aynı anda yalnızca bir bekleyen talep bulunabilir. Talep edilen tutar işlem sırasında kullanılabilir bakiyeden ayrılır; talep reddedilirse iade edilir." },
      { id: "career", category: "earning", q: "FTSLine kariyer seviyeleri nelerdir?", a: "Kariyer sırası Başlangıç, Bronz, Gümüş, Altın, Platin, Elmas ve Taç Elmas şeklindedir. Hesaplama aktif kişisel üyeler, toplam aktif ekip, farklı güçlü kollar ve kol sınırları dikkate alınarak otomatik yapılır." },
      { id: "bronze", category: "earning", q: "Bronz kariyer nasıl kazanılır?", a: "Doğrudan bağlı 2 aktif kullanıcı oluştuğunda Bronz kariyer şartı tamamlanır. Kariyer güncellemesinin ardından kullanıcının görünen tüm kariyer alanları yenilenir ve tebrik bildirimi gönderilir." },
      { id: "advanced-careers", category: "earning", q: "Üst kariyerlerin temel şartları nelerdir?", a: "Gümüş için 10 kişisel ve 20 toplam aktif veya 3 Bronz kol; Altın için 30 kişisel ve 100 toplam aktif veya 3 Gümüş kol; Platin için 100 kişisel ve 500 toplam aktif veya 3 Altın kol seçenekleri uygulanır. Elmas için kol başına en fazla 600 sayılarak 2.400 ekip üyesi ve 3 Platin kol; Taç Elmas için her biri en az 10.000 kişilik 5 ayrı kol gerekir." },

      { id: "contact", category: "support", q: "FTSLine'a nasıl ulaşabilirim?", a: "İletişim sayfasındaki formdan ad, e-posta, konu ve mesaj bilgilerinizi gönderin. Mesajınız doğrudan destek ekibine ulaşır. Siparişle ilgili yazıyorsanız sipariş numaranızı da ekleyin." },
    ],
  },
  en: {
    badge: "Help Center",
    title: "Everything you need to know",
    subtitle: "Clear answers about accounts, licensing, Academy access, orders, earnings and careers.",
    search: "Search for a question or topic...",
    empty: "No answer matched your search.",
    all: "All",
    categories: {
      account: { label: "Account & security", icon: "◉" },
      license: { label: "License & Academy", icon: "▶" },
      order: { label: "Orders & payment", icon: "▣" },
      earning: { label: "Earnings & career", icon: "◆" },
      support: { label: "Support", icon: "✦" },
    },
    highlights: [
      { value: "150 TL", label: "Shipping below 1,000 TL" },
      { value: "5,000 TL", label: "Minimum payout request" },
      { value: "6 digits", label: "Email verification code" },
    ],
    items: [
      { id: "register", category: "account", q: "How do I create an FTSLine account?", a: "Complete the Register form and verify the 6-digit code sent to your email. Usernames must be at least 5 characters, use letters and numbers only, and cannot consist only of numbers." },
      { id: "mail", category: "account", q: "What if the verification email does not arrive?", a: "Check Spam, Junk and Promotions, and confirm the address is correct. The code is valid for 5 minutes. Request a new code if it expires, or contact us through the Contact page." },
      { id: "password", category: "account", q: "How do I reset my password?", a: "Use Forgot Password on the login page, verify the 6-digit code sent to your account email, and choose a new password." },
      { id: "license-once", category: "license", q: "How often is the initial license fee paid?", a: "The initial license right is purchased once for life. Afterwards, eligible monthly, annual or two-year plans can reactivate the account without repurchasing the initial license." },
      { id: "license-active", category: "license", q: "What does an active license provide?", a: "It enables licensed product prices and eligibility for applicable earnings, team and career calculations. The lifetime right remains after expiry, but active benefits pause until renewed." },
      { id: "academy", category: "license", q: "When does Academy access open?", a: "Eligible courses open automatically when payment for a linked license or training package is approved as Paid. Registration alone does not grant Academy access." },
      { id: "monthly-plan", category: "license", q: "Who can buy the one-month plan?", a: "The one-month plan is available only to users who have already acquired the initial license right." },
      { id: "payment", category: "order", q: "How is a bank transfer approved?", a: "The order starts as Payment Pending. After the bank payment is checked, management marks it Paid and the related stock, Academy and eligible earning processes update automatically." },
      { id: "tracking", category: "order", q: "Where can I track my order?", a: "Use Order Tracking in the top menu or Orders in your dashboard. Carrier and tracking details appear when available." },
      { id: "shipping", category: "order", q: "How is shipping calculated?", a: "Physical product orders below 1,000 TL cost 150 TL to ship. Physical orders of 1,000 TL or more ship free. License and digital package orders have no shipping charge." },
      { id: "stock", category: "order", q: "When is product stock reduced?", a: "Stock is reduced when payment for a stock-managed product is approved as Paid. Defined reversal rules apply to cancellations and refunds." },
      { id: "earning", category: "earning", q: "When do earnings appear?", a: "Eligible earnings are calculated when an order payment is approved as Paid. Related earnings may be reversed when an order is cancelled or refunded." },
      { id: "withdrawal", category: "earning", q: "How do I request a payout?", a: "With at least 5,000 TL available, submit account holder, bank and a valid Turkish IBAN from Earnings. Only one request may be pending. The amount is reserved from your balance and restored if rejected." },
      { id: "career", category: "earning", q: "What are the career levels?", a: "Starter, Bronze, Silver, Gold, Platinum, Diamond and Crown Diamond. Levels are calculated automatically from active personal members, total active team, qualified legs and leg caps." },
      { id: "bronze", category: "earning", q: "How is Bronze achieved?", a: "Bronze is achieved with 2 directly connected active users. Career displays are refreshed and a congratulatory notification is sent after recalculation." },
      { id: "advanced-careers", category: "earning", q: "What are the main advanced career requirements?", a: "Silver uses 10 personal and 20 total active members or 3 Bronze legs; Gold uses 30 personal and 100 total or 3 Silver legs; Platinum uses 100 personal and 500 total or 3 Gold legs. Diamond requires 2,400 capped team members and 3 Platinum legs; Crown Diamond requires 5 separate legs of at least 10,000 members each." },
      { id: "contact", category: "support", q: "How can I contact FTSLine?", a: "Send the form on the Contact page. Include your order number when asking about an order." },
    ],
  },
};

export default function FAQ({ embedded = false }) {
  const { language } = useI18n();
  const t = faqContent[language] || faqContent.tr;
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openId, setOpenId] = useState("register");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language === "tr" ? "tr-TR" : "en-US");
    return t.items.filter((item) => {
      const categoryMatches = activeCategory === "all" || item.category === activeCategory;
      const textMatches = !normalizedQuery || `${item.q} ${item.a}`.toLocaleLowerCase(language === "tr" ? "tr-TR" : "en-US").includes(normalizedQuery);
      return categoryMatches && textMatches;
    });
  }, [activeCategory, language, query, t.items]);

  return (
    <main className={embedded ? "faq-page faq-page-embedded" : "faq-page"}>
      <section className="faq-hero">
        <div className="faq-hero-copy">
          <span>{t.badge}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="faq-hero-mark" aria-hidden="true">?</div>
      </section>

      <section className="faq-highlights" aria-label={t.title}>
        {t.highlights.map((item) => <article key={item.label}><strong>{item.value}</strong><span>{item.label}</span></article>)}
      </section>

      <section className="faq-shell">
        <div className="faq-tools">
          <label className="faq-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input className="faq-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          </label>
          <div className="faq-categories">
            <button className={activeCategory === "all" ? "active" : ""} type="button" onClick={() => setActiveCategory("all")}>{t.all}</button>
            {Object.entries(t.categories).map(([key, category]) => (
              <button className={activeCategory === key ? "active" : ""} type="button" onClick={() => setActiveCategory(key)} key={key}>
                <i aria-hidden="true">{category.icon}</i>{category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="faq-list">
          {filteredItems.length ? filteredItems.map((item) => {
            const isOpen = openId === item.id;
            return (
              <article className={isOpen ? "faq-item open" : "faq-item"} key={item.id}>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? "" : item.id)}>
                  <span><small>{t.categories[item.category].label}</small>{item.q}</span>
                  <strong>{isOpen ? "−" : "+"}</strong>
                </button>
                {isOpen && <p>{item.a}</p>}
              </article>
            );
          }) : <div className="faq-empty"><b>⌕</b>{t.empty}</div>}
        </div>
      </section>
    </main>
  );
}
