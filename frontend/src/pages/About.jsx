import Navbar from "../components/Navbar.jsx";
import "./About.css";

export default function About() {
  return (
    <div className="abPage">
      <Navbar />

      <div className="abContainer">
        <h1 className="abTitle">Hakkımızda</h1>

        <p className="abText">
          FTSLine, e-ticaret ile ağ sistemlerini birleştiren modern bir dijital platformdur.
          Kullanıcıların hem ürün satın alabileceği hem de kendi ekiplerini kurarak
          kazanç elde edebileceği bir yapı sunar.
        </p>
        <p>değişen dünya ile birlikte yenilikleri yakalamak dijital dünyanın ayrıcalıklarından faydalanabilmek ve dijitalin gücünden yararlanamak
             için ftsline platformunda kendinize bir lisans alarak dijital yolculuğumuz başlasın.</p>
        <p>ftsline ailesinin bir parçası olarak size sunulan eğitim indirim ve birlikte e-ticaretin tüm avantajlarından 
            faydalabilirsiniz.</p>
        <p>lisans alarak neler kazanacaksınız?</p>
            <ul>1. Lisanslı fiyatlardan alışveriş yapma hakkı</ul>
            <ul>2. Kendi ekibinizi kurarak kazanç elde etme fırsatı</ul>
            <ul>3. Panel üzerinden kazanç ve ekip yönetimi</ul>
            <ul>4. Özel eğitim ve destek imkanları</ul> 
        <p>FTSLine, kullanıcılarına sadece ürün satışı değil aynı zamanda bir iş fırsatı da sunar. Lisanslı üyeler, avantajlı fiyatlardan alışveriş yaparken aynı zamanda kendi ekiplerini kurarak kazanç elde etme şansına sahip olurlar. Panel üzerinden kazançlarını ve ekiplerini kolayca yönetebilirler. Ayrıca, özel eğitim ve destek imkanlarıyla kullanıcıların başarılı olmaları için gereken tüm kaynaklar sağlanır.</p>
        <p>FTSLine, dijital dünyanın sunduğu fırsatları en iyi şekilde değerlendirmek isteyenler için ideal bir platformdur. E-ticaretin gücünü, ağ sistemlerinin avantajlarıyla birleştiren bu platformda, kullanıcılar hem alışveriş yapabilir hem de kendi işlerini kurarak kazanç elde edebilirler. FTSLine ile geleceğe yön verin ve dijital dünyada yerinizi alın.</p>
        <h1>unutma</h1>
        <h1>ERKEN KALKAN DEĞİL ERKEN DİJİTALLEŞEN YOL ALIR.</h1>
        
        <div className="abGrid">
          <div className="abCard">
            <h3>🚀 Vizyon</h3>
            <p>
              Global ölçekte çalışan, kullanıcılarına kazanç sağlayan
              ve sürdürülebilir bir dijital platform oluşturmak.
            </p>
          </div>

          <div className="abCard">
            <h3>⚙️ Sistem</h3>
            <p>
              Unilevel + Matrix yapısı ile ekip kurma ve kazanç sistemi.
              Aynı zamanda güçlü bir e-ticaret altyapısı.
            </p>
          </div>

          <div className="abCard">
            <h3>🔐 Güvenlik</h3>
            <p>
              JWT tabanlı giriş sistemi ve güvenli veri yönetimi ile
              kullanıcı bilgilerinin korunması.
            </p>
          </div>
        </div>

        <div className="abBox">
          <h2>Neden FTSLine?</h2>
          <ul>
            <li>✔️ Lisanslı ve normal fiyat sistemi</li>
            <li>✔️ Kullanıcı paneli ve kazanç takibi</li>
            <li>✔️ Modern ve hızlı altyapı</li>
            <li>✔️ Geliştirilebilir modüler yapı</li>
          </ul>
        </div>
      </div>
    </div>
  );
}