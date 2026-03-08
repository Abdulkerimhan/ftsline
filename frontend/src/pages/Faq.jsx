import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import "./Faq.css";

const FAQS = [
  {
    q: "Lisanslı fiyat nedir?",
    a: "Lisanslı üyeler, belirli ürünlerde daha avantajlı fiyatlardan alışveriş yapabilir. Normal üyeler standart fiyatı görür.",
  },
  {
    q: "Üyelik nasıl oluşturulur?",
    a: "Kayıt ol sayfasından hesabını oluşturup giriş yapabilirsin. Sonrasında ürünleri inceleyebilir ve paneli kullanabilirsin.",
  },
  {
    q: "Ödeme yöntemleri neler?",
    a: "Şimdilik altyapı kuruluyor. Yakında kart/havale gibi yöntemler eklenecek ve panelden takip edilebilecek.",
  },
  {
    q: "Sipariş ve teslimat süreci nasıl olacak?",
    a: "Ürün tipine göre dijital teslimat veya kargo seçenekleri sunulacak. Sipariş durumu panelden görüntülenebilecek.",
  },
  {
    q: "İade / iptal var mı?",
    a: "Ürün türüne göre iade politikası uygulanır. Detaylar İade & Mesafeli Satış sayfalarıyla netleştirilecek.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="fqPage">
      <Navbar />

      <div className="fqContainer">
        <div className="fqHead">
          <h1 className="fqTitle">Sıkça Sorulan Sorular</h1>
          <p className="fqSub">En çok merak edilenleri hızlıca cevapladık.</p>
        </div>

        <div className="fqList">
          {FAQS.map((x, i) => {
            const active = open === i;
            return (
              <button
                key={i}
                className={`fqItem ${active ? "active" : ""}`}
                onClick={() => setOpen(active ? -1 : i)}
                type="button"
              >
                <div className="fqQ">
                  <span>{x.q}</span>
                  <span className="fqIcon">{active ? "−" : "+"}</span>
                </div>
                {active ? <div className="fqA">{x.a}</div> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}