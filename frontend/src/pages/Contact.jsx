import Navbar from "../components/Navbar.jsx";
import "./Contact.css";

export default function Contact() {
  return (
    <div className="ctPage">
      <Navbar />

      <div className="ctContainer">
        <div className="ctHead">
          <h1 className="ctTitle">İletişim</h1>
          <p className="ctSub">Bize ulaş — destek ve bilgi için buradayız.</p>
        </div>

        <div className="ctGrid">
          <div className="ctCard">
            <h3>📞 Telefon</h3>
            <p>Destek hattı (örnek):</p>
            <a className="ctLink" href="tel:+905000000000">+90 500 000 00 00</a>
          </div>

          <div className="ctCard">
            <h3>💬 WhatsApp</h3>
            <p>Hızlı iletişim:</p>
            <a
              className="ctLink"
              target="_blank"
              rel="noreferrer"
              href="https://wa.me/905000000000?text=Merhaba%20FTSLine%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum"
            >
              WhatsApp’tan yaz
            </a>
          </div>

          <div className="ctCard">
            <h3>✉️ E-posta</h3>
            <p>Mail ile ulaş:</p>
            <a className="ctLink" href="mailto:destek@ftsline.net">destek@ftsline.net</a>
          </div>
        </div>

        <div className="ctNote">
          <b>Not:</b> Bu alanlar şimdilik örnek. İstersen kendi numaranı/mailini yazıp sabitleyelim.
        </div>
      </div>
    </div>
  );
}