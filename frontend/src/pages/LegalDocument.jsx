import { Link, useLocation } from "react-router-dom";
import "./LegalDocument.css";

const documents = {
  "/legal/terms": {
    eyebrow: "Hesap ve üyelik",
    title: "Üyelik ve Kullanım Koşulları",
    intro: "Bu metin, FTSLine hesabının oluşturulması ve platformun kullanımına ilişkin temel kuralları açıklar.",
    sections: [
      ["Hesap oluşturma", "Kullanıcı, verdiği bilgilerin doğru ve güncel olduğunu; hesabının güvenliğini koruyacağını kabul eder. Hesap başkasına devredilemez ve hukuka aykırı amaçlarla kullanılamaz."],
      ["Platform kullanımı", "FTSLine ürün, sipariş, eğitim ve kullanıcı paneli hizmetleri sunar. İçerik ve özellikler mevzuata ve hizmet gerekliliklerine uygun biçimde güncellenebilir."],
      ["Sipariş ve ödeme", "Hesap açılması tek başına satış sözleşmesi kurmaz. Her siparişte ürün, fiyat, teslimat ve cayma bilgileri ödeme adımında ayrıca gösterilir ve onaylanır."],
      ["Fikri haklar", "Platform tasarımı, marka unsurları ve eğitim içerikleri izin verilmedikçe kopyalanamaz, çoğaltılamaz veya ticari olarak kullanılamaz."],
      ["İletişim", "Hesap ve kullanım koşullarıyla ilgili taleplerinizi ftsline@ftsline.net adresine veya İletişim sayfasına iletebilirsiniz."],
    ],
  },
  "/legal/kvkk": {
    eyebrow: "Kişisel veriler",
    title: "KVKK Aydınlatma Metni",
    intro: "Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizin işlenmesi hakkında bilgi verir.",
    sections: [
      ["İşlenen veriler", "Kimlik ve iletişim bilgileri, hesap ve güvenlik kayıtları, sipariş ve ödeme bildirimleri, teslimat adresi, destek talepleri ve platform kullanım kayıtları işlenebilir."],
      ["İşleme amaçları", "Hesabın kurulması, kimlik doğrulama, sipariş ve teslimat süreçlerinin yürütülmesi, faturalama, müşteri desteği, güvenlik, yasal yükümlülükler ve hakların korunması amaçlarıyla işlenir."],
      ["Hukuki sebepler ve aktarım", "Veriler; sözleşmenin kurulması veya ifası, hukuki yükümlülük, meşru menfaat ve gerektiğinde açık rıza hukuki sebeplerine dayanılarak işlenir. Yalnızca gerekli olduğu ölçüde altyapı, e-posta, kargo, ödeme, mali müşavirlik ve yetkili kamu kurumlarıyla paylaşılabilir."],
      ["Saklama ve güvenlik", "Kişisel veriler işleme amacı ve yasal saklama süreleri boyunca muhafaza edilir; süre sonunda mevzuata uygun biçimde silinir, yok edilir veya anonimleştirilir."],
      ["Haklarınız", "KVKK'nın 11. maddesindeki bilgi alma, düzeltme, silme, itiraz ve zararın giderilmesini isteme haklarınız için kimliğinizi doğrulayan başvurunuzu ftsline@ftsline.net adresine iletebilirsiniz."],
    ],
  },
  "/legal/pre-information": {
    eyebrow: "Sipariş öncesi",
    title: "Ön Bilgilendirme Formu",
    intro: "Sipariş vermeden önce ürün, fiyat, ödeme, teslimat ve cayma koşullarını dikkatle inceleyin.",
    sections: [
      ["Ürün ve toplam bedel", "Ürünün temel nitelikleri, adedi, vergiler dâhil satış bedeli, varsa 150 TL kargo ücreti ve toplam tutar sipariş özeti alanında gösterilir. 1.000 TL ve üzerindeki fiziksel ürün siparişlerinde kargo ücretsizdir."],
      ["Ödeme", "Ödeme yöntemi sipariş ekranında seçilir. Havale/EFT ile verilen siparişler ödeme onayı tamamlanana kadar ödeme bekliyor durumundadır."],
      ["Teslimat", "Fiziksel ürünler siparişte belirtilen adrese, stok ve taşıma koşullarına göre teslim edilir. Kargo firması ve takip bilgileri oluştuğunda kullanıcıya bildirilir."],
      ["Cayma ve iade", "Tüketici, yasal istisnalar dışında, malı teslim aldığı tarihten itibaren 14 gün içinde gerekçe göstermeden cayma hakkını kullanabilir. Talep, sipariş numarasıyla İletişim sayfasından yazılı olarak iletilmelidir."],
      ["Dijital içerik ve istisnalar", "Tüketicinin önceden açık onayıyla cayma süresi dolmadan ifasına başlanan hizmetler ve anında sunulan dijital içerikler ile mevzuatta sayılan diğer ürünlerde cayma hakkı sınırlanabilir."],
    ],
  },
  "/legal/distance-sales": {
    eyebrow: "Sipariş sözleşmesi",
    title: "Mesafeli Satış Sözleşmesi",
    intro: "Bu sözleşme, ödeme ekranında bilgileri yer alan alıcı ile FTSLine arasında elektronik ortamda kurulan satışın esaslarını düzenler.",
    sections: [
      ["Taraflar ve sipariş", "Alıcının adı, iletişim ve teslimat bilgileri sipariş formunda; satıcı iletişim adresi ftsline@ftsline.net olarak gösterilir. Sipariş edilen ürünler, miktarlar ve bedeller sipariş özetinin ayrılmaz parçasıdır."],
      ["Sözleşmenin kurulması", "Alıcı, Ön Bilgilendirme Formu ile bu sözleşmeyi okuyup ayrı kutuları işaretleyerek elektronik ortamda kabul ettiğinde sipariş oluşturulur. Ödeme bekleyen sipariş, ödeme onayından sonra işleme alınır."],
      ["Teslimat ve sorumluluk", "Satıcı, ürünü taahhüt edilen süre içinde ve her hâlükârda mevzuattaki azami süreyi aşmadan teslim etmekle yükümlüdür. Mücbir sebep veya ifayı engelleyen durumlarda alıcı bilgilendirilir."],
      ["Cayma hakkı", "Alıcı, yasal istisnalar dışında 14 günlük cayma hakkını yazılı bildirimle kullanabilir. İade ürünün mevzuata uygun süre ve koşullarda gönderilmesi; varsa standart teslimat masraflarının ve ödemenin mevzuata uygun şekilde iadesi sağlanır."],
      ["Uyuşmazlık", "Başvurular İletişim sayfasından iletilebilir. Tüketici, parasal sınırlara göre Tüketici Hakem Heyeti veya Tüketici Mahkemesine başvurabilir."],
    ],
  },
};

export default function LegalDocument() {
  const { pathname } = useLocation();
  const document = documents[pathname] || documents["/legal/terms"];

  return (
    <main className="legal-page">
      <article className="legal-document">
        <span className="legal-eyebrow">{document.eyebrow}</span>
        <h1>{document.title}</h1>
        <p className="legal-intro">{document.intro}</p>
        <div className="legal-version">Metin sürümü: 11.08.2026</div>

        <div className="legal-sections">
          {document.sections.map(([title, content]) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{content}</p>
            </section>
          ))}
        </div>

        <div className="legal-actions">
          <button type="button" onClick={() => window.close()}>Pencereyi Kapat</button>
          <Link to="/contact">Bize Ulaşın</Link>
        </div>
      </article>
    </main>
  );
}
