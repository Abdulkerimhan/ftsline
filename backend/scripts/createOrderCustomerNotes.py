import json
import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from createSocialMediaAdsNotes import (
    ROOT, LOGO, NAVY, BLUE, CYAN, PURPLE, GREEN, GOLD, RED,
    PALE, PALE_GOLD, TEXT, MUTED, LINE, WHITE, styles, box, worksheet
)

DATA = ROOT / "backend" / "data" / "orderCustomerContent.json"
OUTPUT = ROOT / "output" / "pdf" / "FTSLine_Siparis_ve_Musteri_Yonetimi_Ders_Notlari.pdf"
PUBLIC = ROOT / "frontend" / "public" / "documents" / OUTPUT.name

cover_brand_style = ParagraphStyle(
    "OrderCustomerCoverBrand",
    parent=styles["SCoverSub"],
    fontName="SocialArialBold",
    fontSize=13,
    leading=16,
    textColor=BLUE,
    alignment=TA_CENTER,
)
cover_web_style = ParagraphStyle(
    "OrderCustomerCoverWeb",
    parent=styles["SCoverSub"],
    fontName="SocialArial",
    fontSize=9,
    leading=12,
    textColor=MUTED,
    alignment=TA_CENTER,
)
final_title_style = ParagraphStyle(
    "OrderCustomerFinalTitle",
    parent=styles["SSection"],
    fontName="SocialArialBold",
    fontSize=18,
    leading=22,
    textColor=BLUE,
    alignment=TA_CENTER,
)


def footer(canvas, _doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18*mm, 15*mm, 192*mm, 15*mm)
    canvas.setFont("SocialArial", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 10*mm, "FTSLine Akademi - Sipariş ve Müşteri Yönetimi")
    canvas.drawRightString(192*mm, 10*mm, f"Sayfa {canvas.getPageNumber()}")
    canvas.restoreState()


class OrderFlow(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 48*mm
    def draw(self):
        c = self.canv
        items = [("1", "Sipariş", NAVY), ("2", "Ödeme", BLUE), ("3", "Hazırlama", CYAN),
                 ("4", "Kargo", PURPLE), ("5", "Teslimat", GREEN), ("6", "Destek", GOLD)]
        for i, (no, label, col) in enumerate(items):
            x = (2+i*27)*mm
            c.setFillColor(col); c.circle(x+10*mm, 27*mm, 9*mm, fill=1, stroke=0)
            c.setFillColor(WHITE); c.setFont("SocialArialBold", 10)
            c.drawCentredString(x+10*mm, 25.5*mm, no)
            c.setFillColor(TEXT); c.setFont("SocialArialBold", 7.5)
            c.drawCentredString(x+10*mm, 13*mm, label)
            if i < 5:
                c.setFillColor(CYAN); c.setFont("SocialArialBold", 12); c.drawString(x+21*mm, 25*mm, "›")
        c.setFillColor(MUTED); c.setFont("SocialArial", 7.5)
        c.drawCentredString(self.width/2, 3*mm, "Her aşamada sorumlu, hedef süre ve tamamlanma kanıtı bulunmalıdır.")


class ContactTimeline(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 48*mm
    def draw(self):
        c = self.canv
        c.setStrokeColor(BLUE); c.setLineWidth(3); c.line(15*mm, 27*mm, 149*mm, 27*mm)
        points = [("Onay", "Hemen"), ("Hazırlama", "Aynı gün"), ("Kargo", "Sevkte"),
                  ("Gecikme", "Beklemeden"), ("Teslim", "Sonrasında")]
        for i, (title, sub) in enumerate(points):
            x = (15+i*33.5)*mm
            c.setFillColor([NAVY, BLUE, CYAN, PURPLE, GREEN][i]); c.circle(x, 27*mm, 4*mm, fill=1, stroke=0)
            c.setFillColor(TEXT); c.setFont("SocialArialBold", 7.5); c.drawCentredString(x, 16*mm, title)
            c.setFillColor(MUTED); c.setFont("SocialArial", 7); c.drawCentredString(x, 9*mm, sub)


class ResolutionFlow(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 52*mm
    def draw(self):
        c = self.canv
        items = [("DİNLE", "Sorunu kesmeden anla", NAVY), ("KAYDET", "Sipariş ve kanıt", BLUE),
                 ("İNCELE", "Kök nedeni bul", PURPLE), ("ÇÖZ", "Seçenek ve süre", GREEN),
                 ("ÖĞREN", "Tekrarı önle", GOLD)]
        for i, (title, sub, col) in enumerate(items):
            x = (2+i*32.5)*mm
            c.setFillColor(col); c.roundRect(x, 14*mm, 29*mm, 25*mm, 4*mm, fill=1, stroke=0)
            c.setFillColor(WHITE); c.setFont("SocialArialBold", 8); c.drawCentredString(x+14.5*mm, 28*mm, title)
            c.setFont("SocialArial", 6.5); c.drawCentredString(x+14.5*mm, 20*mm, sub)
            if i < 4:
                c.setFillColor(CYAN); c.setFont("SocialArialBold", 12); c.drawString(x+29.5*mm, 25*mm, "›")


class LoyaltyLoop(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 54*mm
    def draw(self):
        c = self.canv
        items = [("Doğru ürün", NAVY), ("İyi teslimat", BLUE), ("Hızlı destek", PURPLE),
                 ("Memnuniyet", GREEN), ("Tekrar / tavsiye", GOLD)]
        for i, (label, col) in enumerate(items):
            x = (3+i*32)*mm
            c.setFillColor(col); c.roundRect(x, 18*mm, 28*mm, 20*mm, 4*mm, fill=1, stroke=0)
            c.setFillColor(WHITE); c.setFont("SocialArialBold", 7)
            c.drawCentredString(x+14*mm, 26*mm, label)
            if i < 4:
                c.setFillColor(CYAN); c.setFont("SocialArialBold", 12); c.drawString(x+29*mm, 24*mm, "›")
        c.setFillColor(MUTED); c.setFont("SocialArial", 7.5)
        c.drawCentredString(self.width/2, 5*mm, "Sadakat, tek seferlik indirimden çok tutarlı deneyimin sonucudur.")


class KPIBars(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 57*mm
    def draw(self):
        c = self.canv
        data = [("Zamanında sevk", 94, GREEN), ("Doğru sipariş", 98, BLUE),
                ("Zamanında teslim", 89, CYAN), ("İlk temasta çözüm", 76, PURPLE),
                ("Memnuniyet", 88, GOLD)]
        c.setFillColor(NAVY); c.setFont("SocialArialBold", 9)
        c.drawString(6*mm, 50*mm, "ÖRNEK HAFTALIK OPERASYON PANELİ")
        y = 40*mm
        for label, value, col in data:
            c.setFillColor(TEXT); c.setFont("SocialArial", 8); c.drawString(7*mm, y, label)
            c.setFillColor(colors.HexColor("#EDF1F7")); c.roundRect(55*mm, y-1*mm, 78*mm, 5*mm, 2*mm, fill=1, stroke=0)
            c.setFillColor(col); c.roundRect(55*mm, y-1*mm, 78*mm*value/100, 5*mm, 2*mm, fill=1, stroke=0)
            c.setFillColor(NAVY); c.setFont("SocialArialBold", 8); c.drawRightString(155*mm, y, f"%{value}")
            y -= 8*mm


def build():
    content = json.loads(DATA.read_text(encoding="utf-8"))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True); PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=(210*mm,297*mm), leftMargin=23*mm, rightMargin=23*mm,
                            topMargin=21*mm, bottomMargin=22*mm,
                            title="FTSLine Sipariş ve Müşteri Yönetimi Ders Notları", author="FTSLine Akademi")
    story = []
    logo = Image(str(LOGO), width=43*mm, height=43*mm)
    logo_box = Table([[logo]], colWidths=[164*mm], rowHeights=[54*mm])
    logo_box.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    banner = Table([[
        Paragraph("SİPARİŞ VE<br/>MÜŞTERİ YÖNETİMİ", styles["SCover"]),
        Paragraph("Ders Notları<br/><br/>Kontrol Et • İletişim Kur<br/>Çöz • Geliştir", styles["SCoverSub"])
    ]], colWidths=[100*mm,64*mm], rowHeights=[87*mm])
    banner.setStyle(TableStyle([("BACKGROUND",(0,0),(0,0),NAVY),("BACKGROUND",(1,0),(1,0),GREEN),
                                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ALIGN",(0,0),(-1,-1),"CENTER")]))
    story += [Spacer(1,13*mm),logo_box,Spacer(1,8*mm),banner,Spacer(1,10*mm),
              Paragraph("FTSLine Akademi", cover_brand_style),
              Paragraph("ftsline.net  |  Geleceğe yön ver.", cover_web_style),PageBreak()]

    story += [Paragraph("Siparişten Sadakate Tek Sistem",styles["SSection"]),
              Paragraph("Müşteri deneyimi, ödeme alındığında değil ilk temasta başlar; teslimat ve satış sonrası destekle devam eder. "
                        "Bu çalışma kitabı siparişleri izlenebilir, iletişimi tutarlı ve sorun çözümünü ölçülebilir hale getirir.",
                        styles["SBody"]),Spacer(1,4*mm),OrderFlow(),Spacer(1,5*mm),
              box("Programın sonunda",[
                  "Siparişin her aşaması için sorumlu ve kontrol noktası belirleyeceksiniz.",
                  "Hazırlama, kargo ve müşteri iletişim standartları oluşturacaksınız.",
                  "İade ve şikâyetleri kayıtlı bir çözüm akışıyla yöneteceksiniz.",
                  "Operasyon sonuçlarını temel göstergelerle izleyeceksiniz."
              ],PALE_GOLD),PageBreak()]

    visuals = {0:[OrderFlow()],2:[ContactTimeline()],3:[ResolutionFlow()],4:[LoyaltyLoop()],5:[KPIBars()]}
    for i, lesson in enumerate(content["lessons"]):
        story += [Paragraph(f"DERS {i+1}",styles["SH3"]),Paragraph(lesson["title"],styles["SLesson"]),
                  Paragraph(lesson["description"],styles["SBody"])]
        for p in lesson["content"].split("\n\n"): story.append(Paragraph(p,styles["SBody"]))
        for visual in visuals.get(i,[]): story += [Spacer(1,2*mm),visual]
        story += [Spacer(1,2*mm),box("Dikkat edilecekler",lesson["keyPoints"],PALE_GOLD),
                  Spacer(1,4*mm),box("Uygulama kontrol listesi",[f"□ {x}" for x in lesson["checklist"]]),PageBreak()]

    story += worksheet("Çalışma Sayfası 1 - Sipariş Süreç Kartı",
                       "Her aşama için sorumlu, hedef süre ve tamamlanma kanıtını yazın.",
                       ["Aşama","Sorumlu","Hedef süre","Kontrol / kanıt","Sorun olursa"],[28*mm,30*mm,27*mm,43*mm,36*mm],7)
    story += worksheet("Çalışma Sayfası 2 - Müşteri İletişim Kaydı",
                       "Kişisel verileri yalnız gerekli alanlarda ve yetkili erişimle kaydedin.",
                       ["Tarih","Sipariş no","Kanal","Talep / sorun","Yapılan işlem","Sonuç tarihi"],[22*mm,27*mm,22*mm,38*mm,35*mm,20*mm],6)
    story += worksheet("Çalışma Sayfası 3 - İade ve Şikâyet Analizi",
                       "Tekrarlanan nedenleri bulabilmek için standart neden kodları kullanın.",
                       ["Kayıt","Neden kodu","Ürün / süreç","Kök neden","Çözüm","Tekrarı önleme"],[23*mm,27*mm,30*mm,31*mm,25*mm,28*mm],6)
    story += worksheet("Çalışma Sayfası 4 - Haftalık Operasyon Raporu",
                       "Oranları adetler ve önceki dönemle birlikte değerlendirin.",
                       ["Gösterge","Hedef","Bu hafta","Önceki hafta","Sapma nedeni","Eylem"],[36*mm,20*mm,24*mm,28*mm,32*mm,24*mm],7)

    story += [Paragraph("30 Günlük Uygulama Planı",styles["SSection"])]
    rows = [
        ["Dönem","Ana hedef","Tamamlanacak çalışma"],
        ["1-7. gün","Sipariş akışı","Aşamalar, sorumlular, süreler ve kontrol listesi"],
        ["8-14. gün","Sevk ve iletişim","Paketleme standardı, kargo ve mesaj şablonları"],
        ["15-21. gün","Sorun çözümü","İade, şikâyet ve ücret iadesi kayıt sistemi"],
        ["22-30. gün","Ölçüm","KPI paneli, darboğaz seçimi ve iyileştirme planı"]
    ]
    table = Table([[Paragraph(str(x),styles["STableHead"] if r==0 else styles["STableCell"]) for x in row]
                   for r,row in enumerate(rows)],colWidths=[28*mm,40*mm,96*mm],rowHeights=[10*mm]+[22*mm]*4)
    table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),BLUE),("BACKGROUND",(0,1),(0,-1),PALE),
                               ("GRID",(0,0),(-1,-1),.6,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                               ("LEFTPADDING",(0,0),(-1,-1),6)]))
    story += [table,Spacer(1,8*mm),box("Son kontrol",[
        "Ödeme, stok, hazırlama, fatura, kargo ve teslimat akışı yazılı.",
        "Müşteriye her kritik aşamada doğru bilgi ulaşıyor.",
        "İade ve şikâyetler süre, sorumlu ve sonuçla kaydediliyor.",
        "Kişisel verilere erişim gerekli kişilerle sınırlı.",
        "Haftalık göstergeler ve iyileştirme planı düzenli takip ediliyor."
    ]),Spacer(1,4*mm),
              Paragraph("Güçlü operasyon, güvenen müşteri oluşturur.",final_title_style),
              Paragraph("FTSLine Akademi  |  ftsline.net",cover_web_style)]
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    shutil.copy2(OUTPUT,PUBLIC)
    print(OUTPUT);print(PUBLIC)


if __name__ == "__main__":
    build()
