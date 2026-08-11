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
      { id: "cancellation-refund", category: "order", q: "Sipariş iptali veya iade talebi nasıl oluşturulur?", a: "Cayma veya iade talebinizi İletişim sayfasından sipariş numarası ve açık beyanınızla yazılı olarak iletin. Mesafeli satışlarda tüketici, yasal istisnalar dışında, malı teslim aldığı tarihten itibaren 14 gün içinde gerekçe göstermeden cayabilir; mal teslim edilmeden önce de cayma bildirimi yapılabilir. Cayma bildiriminin ardından mal mevzuattaki süre içinde geri gönderilir. Onaylanan işlemde stok düzeltilir ve bu siparişten doğan kazançlar geri alınır." },
      { id: "refund-payment", category: "order", q: "İade bedeli ne zaman ve nasıl ödenir?", a: "Cayma bildiriminin satıcıya ulaşmasından itibaren yasal süre içinde, varsa teslimat masrafı dahil tahsil edilen ödemeler satın alırken kullanılan ödeme aracına uygun biçimde ve tüketiciye ek masraf yüklenmeden iade edilir. İade kargo masrafı ve taşıyıcı bilgisi sipariş ön bilgilendirmesinde gösterilir; ayıplı mal iadelerinde tüketici iade masrafından sorumlu tutulamaz." },
      { id: "withdrawal-exceptions", category: "order", q: "Hangi ürün ve hizmetlerde cayma hakkı sınırlı olabilir?", a: "Kişiye özel hazırlanan ürünler, çabuk bozulabilen mallar, koruyucu unsurları açılmış ve hijyen açısından iadesi uygun olmayan ürünler ile tüketicinin önceden açık onayıyla cayma süresi dolmadan ifasına başlanan bazı hizmet ve anında sunulan dijital içerikler yasal istisnalara girebilir. Kesin değerlendirme ürünün niteliğine ve Mesafeli Sözleşmeler Yönetmeliğine göre yapılır." },

      { id: "earning", category: "earning", q: "Kazançlar hesabıma ne zaman yansır?", a: "Uygun bir siparişin ödemesi Ödendi olarak onaylandığında kazanç hesaplaması çalışır ve hak edilen tutar Kazanç bölümüne yansır. İptal veya iade edilen işlemlerin ilgili kazançları geri alınabilir." },
      { id: "earning-types", category: "earning", q: "Sistemde hangi kazanç türleri bulunur?", a: "Kazanç hareketleri ilk lisans ödemesinden doğan Unilevel kazancı, sonraki aylık aktiflik ödemelerinden doğan Matrix kazancı ve uygun fiziki ürün siparişlerinden doğan ürün satış kazancı olarak ayrı izlenir. Her hareket Kazanç sayfasında kaynağı, seviyesi ve tutarıyla gösterilir." },
      { id: "unilevel-earning", category: "earning", q: "İlk lisans ödemesindeki Unilevel dağıtımı nasıl çalışır?", a: "İlk lisans ödemesinde dağıtım tabanı 3.599 TL'dir. Yukarı doğru 10 seviyelik oran sırası %50, %10, %5, %3, %2, %2, %2, %1, %1 ve %1'dir. Ödeme alacak kişinin aktif lisanslı olması ve kariyerinin ilgili derinliği açması gerekir; şartı sağlamayan seviye başka bir kişiye aktarılmaz." },
      { id: "matrix-earning", category: "earning", q: "Aylık aktiflik ödemesindeki Matrix kazancı nasıl oluşur?", a: "İlk lisans sonrasındaki 799 TL aylık aktiflik ödemesinde Unilevel dağıtımı yapılmaz. Ödemenin %3'ü Matrix hattında kariyerin izin verdiği derinliğe kadar her uygun aktif lisanslı üyeye ayrı ayrı yansır. Başlangıç 12, Bronz ve Gümüş 13, Altın ve Platin 14, Elmas ve Taç Elmas 15 Matrix seviyesine kadar hak açar." },
      { id: "product-earning", category: "earning", q: "Ürün satış kazancı nasıl hesaplanır?", a: "Yalnızca Ödendi olarak onaylanan ve dağıtım tabanı tanımlı fiziki ürün siparişleri hesaplanır. Normal fiyatlı satışta taban normal fiyat ile lisanslı fiyat arasındaki farktır; ilk seviyeye bu farkın %25'i, sonraki seviyelere tanımlı azalan oranlar uygulanır. Lisanslı fiyatla alışverişte toplam ağ dağıtımı tanımlı tabanın %10'udur ve 10 seviyeye paylaştırılır." },
      { id: "career-depth", category: "earning", q: "Kariyer kazanç derinliğini nasıl etkiler?", a: "Unilevel ve ürün satış kazançlarında Başlangıç 1, Bronz 2, Gümüş 3, Altın 5, Platin 7, Elmas ve Taç Elmas 10 seviyeye kadar hak açar. Derinlik hakkının yanında kazanç anında hesabın ve lisansın aktif olması gerekir." },
      { id: "active-member", category: "earning", q: "Kariyer hesabında aktif kullanıcı kimdir?", a: "Hesabı aktif, ilk lisans hakkı tanımlı ve lisans/aktiflik süresi dolmamış kullanıcı aktif kabul edilir. Süresi dolan kullanıcı ilk lisans hakkını kaybetmez; ancak yeniden aktiflik süresi alana kadar kariyer ve uygun kazanç sayımlarına dahil edilmez." },
      { id: "zero-earning", category: "earning", q: "Bir ekip hareketinde neden 0 TL görünebilir?", a: "Kullanıcının ekipte görünmesi tek başına kazanç oluşturmaz. Sipariş henüz Ödendi olmayabilir, üründe dağıtım tabanı bulunmayabilir, ilgili üst kullanıcının lisansı pasif olabilir veya kariyer derinliği o seviyeyi açmıyor olabilir." },
      { id: "withdrawal", category: "earning", q: "Hak edişimi nasıl talep ederim?", a: "Kullanılabilir bakiyeniz en az 5.000 TL olduğunda Kazanç sayfasından ad soyad, banka ve geçerli Türkiye IBAN bilgisiyle ödeme talebi oluşturabilirsiniz. Aynı anda yalnızca bir bekleyen talep bulunabilir. Talep edilen tutar işlem sırasında kullanılabilir bakiyeden ayrılır; talep reddedilirse iade edilir." },
      { id: "career", category: "earning", q: "FTSLine kariyer seviyeleri nelerdir?", a: "Kariyer sırası Başlangıç, Bronz, Gümüş, Altın, Platin, Elmas ve Taç Elmas şeklindedir. Hesaplama aktif kişisel üyeler, toplam aktif ekip, farklı güçlü kollar ve kol sınırları dikkate alınarak otomatik yapılır." },
      { id: "bronze", category: "earning", q: "Bronz kariyer nasıl kazanılır?", a: "Doğrudan bağlı 2 aktif kullanıcı oluştuğunda Bronz kariyer şartı tamamlanır. Kariyer güncellemesinin ardından kullanıcının görünen tüm kariyer alanları yenilenir ve tebrik bildirimi gönderilir." },
      { id: "silver-career", category: "earning", q: "Gümüş kariyer şartları nelerdir?", a: "Bronz şartından sonra iki yoldan biri yeterlidir: 10 kişisel aktif ve toplam 20 aktif ekip üyesi veya 3 ayrı Bronz kariyerli kol ve toplam 20 aktif ekip üyesi." },
      { id: "gold-career", category: "earning", q: "Altın kariyer şartları nelerdir?", a: "Gümüş sonrasında şu seçeneklerden biri uygulanır: 30 kişisel aktif ve toplam 100 aktif; 3 ayrı Gümüş kol ve toplam 100 aktif; ya da her koldan en fazla 30 aktif sayılarak toplam 100 dengeli aktif." },
      { id: "platinum-career", category: "earning", q: "Platin kariyer şartları nelerdir?", a: "Altın sonrasında şu seçeneklerden biri uygulanır: 100 kişisel aktif ve toplam 500 aktif; 3 ayrı Altın kol ve toplam 500 aktif; ya da her koldan en fazla 150 aktif sayılarak toplam 500 dengeli aktif." },
      { id: "diamond-career", category: "earning", q: "Elmas kariyer şartları nelerdir?", a: "En az 3 ayrı Platin kariyerli kol gerekir. Ekip toplamında her koldan en fazla 600 kişi sayılır ve dengeli toplamın en az 2.400 olması gerekir." },
      { id: "crown-diamond-career", category: "earning", q: "Taç Elmas kariyer şartları nelerdir?", a: "En az 5 ayrı güçlü kolun her birinde 10.000 veya daha fazla ekip üyesi bulunmalıdır. Kol başına en fazla 10.000 sayılarak dengeli toplam en az 50.000 olmalıdır." },
      { id: "career-update", category: "earning", q: "Kariyerim ne zaman güncellenir?", a: "Aktif üye ve kol koşulları oluştuğunda kariyer hesaplaması otomatik yenilenir; yönetim panelinden toplu güncelleme de yapılabilir. Yeni seviyeye çıkan kullanıcının tüm kariyer alanları eşitlenir ve tebrik bildirimi gönderilir." },

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
      { id: "cancellation-refund", category: "order", q: "How do I request a cancellation or refund?", a: "Send a written cancellation or withdrawal statement with your order number through Contact. Except for statutory exclusions, distance-sale consumers may withdraw within 14 days after delivery and may also withdraw before delivery. Approved reversals correct stock and reverse earnings generated by that order." },
      { id: "refund-payment", category: "order", q: "When and how is a refund paid?", a: "Within the statutory period after receipt of the withdrawal notice, collected payments, including applicable delivery charges, are returned using a method compatible with the original payment instrument and without additional consumer cost. Return-carrier terms are shown in pre-contract information; consumers are not charged return costs for defective goods." },
      { id: "withdrawal-exceptions", category: "order", q: "When can the right of withdrawal be restricted?", a: "Statutory exclusions may cover personalized or perishable goods, unsealed hygiene-sensitive products, certain services begun before the withdrawal period with prior consent, and instantly supplied digital content. The exact result depends on the product and Turkish distance-contract rules." },
      { id: "earning", category: "earning", q: "When do earnings appear?", a: "Eligible earnings are calculated when an order payment is approved as Paid. Related earnings may be reversed when an order is cancelled or refunded." },
      { id: "earning-types", category: "earning", q: "Which earning types are available?", a: "Movements are separated into initial-license Unilevel earnings, Matrix earnings from later monthly activity payments, and eligible physical-product sales earnings. Each movement shows its source, depth and amount in Earnings." },
      { id: "unilevel-earning", category: "earning", q: "How does initial-license Unilevel distribution work?", a: "The distribution base is 3,599 TL. Ten depth rates are 50%, 10%, 5%, 3%, 2%, 2%, 2%, 1%, 1% and 1%. A beneficiary must have an active license and a career that unlocks that depth." },
      { id: "matrix-earning", category: "earning", q: "How do monthly Matrix earnings work?", a: "Later 799 TL monthly activity payments do not create Unilevel earnings. Three percent is credited separately along the Matrix line to eligible active licensed users: Starter up to 12, Bronze/Silver 13, Gold/Platinum 14 and Diamond/Crown Diamond 15 Matrix levels." },
      { id: "product-earning", category: "earning", q: "How are product-sale earnings calculated?", a: "Only Paid physical orders with a defined bonus base qualify. For normal-price sales the base is the gap between normal and licensed price, with 25% at depth one and declining defined rates above. For licensed-price purchases, total network distribution is 10% of the defined base across ten depths." },
      { id: "career-depth", category: "earning", q: "How does career affect earning depth?", a: "For Unilevel and product sales, Starter unlocks 1, Bronze 2, Silver 3, Gold 5, Platinum 7, and Diamond/Crown Diamond 10 depths. The account and license must also be active at earning time." },
      { id: "active-member", category: "earning", q: "Who counts as an active member?", a: "The account must be active, licensed and not expired. The lifetime initial-license right remains after expiry, but the member is excluded from active career and earning calculations until activity is renewed." },
      { id: "zero-earning", category: "earning", q: "Why can an activity show 0 TL?", a: "Team visibility alone does not create earnings. Payment may not yet be Paid, the product may have no bonus base, the beneficiary license may be inactive, or the career may not unlock that depth." },
      { id: "withdrawal", category: "earning", q: "How do I request a payout?", a: "With at least 5,000 TL available, submit account holder, bank and a valid Turkish IBAN from Earnings. Only one request may be pending. The amount is reserved from your balance and restored if rejected." },
      { id: "career", category: "earning", q: "What are the career levels?", a: "Starter, Bronze, Silver, Gold, Platinum, Diamond and Crown Diamond. Levels are calculated automatically from active personal members, total active team, qualified legs and leg caps." },
      { id: "bronze", category: "earning", q: "How is Bronze achieved?", a: "Bronze is achieved with 2 directly connected active users. Career displays are refreshed and a congratulatory notification is sent after recalculation." },
      { id: "silver-career", category: "earning", q: "What are the Silver requirements?", a: "After Bronze: either 10 personal active and 20 total active members, or 3 separate Bronze legs and 20 total active members." },
      { id: "gold-career", category: "earning", q: "What are the Gold requirements?", a: "After Silver: 30 personal and 100 total active; or 3 Silver legs and 100 total active; or 100 balanced active members counting at most 30 from each leg." },
      { id: "platinum-career", category: "earning", q: "What are the Platinum requirements?", a: "After Gold: 100 personal and 500 total active; or 3 Gold legs and 500 total active; or 500 balanced active members counting at most 150 from each leg." },
      { id: "diamond-career", category: "earning", q: "What are the Diamond requirements?", a: "At least 3 Platinum legs and 2,400 balanced team members, counting no more than 600 from any one leg." },
      { id: "crown-diamond-career", category: "earning", q: "What are the Crown Diamond requirements?", a: "At least 5 separate legs with 10,000 or more members each, reaching a 50,000 balanced total with a 10,000 cap per leg." },
      { id: "career-update", category: "earning", q: "When is my career updated?", a: "Career recalculates when active-member and leg conditions change and can also be refreshed by management. All career displays are synchronized and a congratulatory notification is sent for a new level." },
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
