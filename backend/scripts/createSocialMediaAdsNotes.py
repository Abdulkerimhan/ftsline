import json
import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Flowable, Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "backend" / "data" / "socialMediaAdsContent.json"
LOGO = ROOT / "frontend" / "src" / "assets" / "ftsline.png"
OUTPUT = ROOT / "output" / "pdf" / "FTSLine_Sosyal_Medya_ve_Reklam_Ders_Notlari.pdf"
PUBLIC = ROOT / "frontend" / "public" / "documents" / OUTPUT.name

NAVY, BLUE, CYAN = colors.HexColor("#0B1F46"), colors.HexColor("#2057D4"), colors.HexColor("#18B9E8")
PURPLE, PINK = colors.HexColor("#7657D8"), colors.HexColor("#E85B9A")
GREEN, GOLD, RED = colors.HexColor("#20A66A"), colors.HexColor("#F4B740"), colors.HexColor("#E45D5D")
PALE, PALE_GOLD = colors.HexColor("#EAF2FF"), colors.HexColor("#FFF6DD")
TEXT, MUTED, LINE, WHITE = colors.HexColor("#24344D"), colors.HexColor("#66758A"), colors.HexColor("#D8E1EF"), colors.white

pdfmetrics.registerFont(TTFont("SocialArial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("SocialArialBold", r"C:\Windows\Fonts\arialbd.ttf"))
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="SCover", fontName="SocialArialBold", fontSize=28, leading=33, textColor=WHITE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="SCoverSub", fontName="SocialArial", fontSize=11, leading=17, textColor=colors.HexColor("#E4E9FF"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="SSection", fontName="SocialArialBold", fontSize=21, leading=26, textColor=NAVY, spaceAfter=9))
styles.add(ParagraphStyle(name="SLesson", fontName="SocialArialBold", fontSize=17, leading=22, textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name="SH3", fontName="SocialArialBold", fontSize=11.5, leading=15, textColor=BLUE, spaceBefore=5, spaceAfter=5))
styles.add(ParagraphStyle(name="SBody", fontName="SocialArial", fontSize=9.6, leading=14.2, textColor=TEXT, spaceAfter=7))
styles.add(ParagraphStyle(name="SBullet", fontName="SocialArial", fontSize=8.6, leading=11.7, textColor=TEXT, leftIndent=11, firstLineIndent=-7, spaceAfter=4))
styles.add(ParagraphStyle(name="STableHead", fontName="SocialArialBold", fontSize=8, leading=10, textColor=WHITE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="STableCell", fontName="SocialArial", fontSize=7.8, leading=10, textColor=TEXT))


def footer(canvas, _doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18*mm, 15*mm, 192*mm, 15*mm)
    canvas.setFont("SocialArial", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 10*mm, "FTSLine Akademi - Sosyal Medya ve Reklam")
    canvas.drawRightString(192*mm, 10*mm, f"Sayfa {canvas.getPageNumber()}")
    canvas.restoreState()


class ContentPillars(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 49*mm
    def draw(self):
        c = self.canv
        data = [("EĞİTİM", BLUE, "Bilgi ve çözüm"), ("GÜVEN", PURPLE, "Kanıt ve süreç"),
                ("ÜRÜN", CYAN, "Fayda ve kullanım"), ("TOPLULUK", PINK, "Soru ve konuşma")]
        for i, (title, col, sub) in enumerate(data):
            x = (3+i*41)*mm
            c.setFillColor(col); c.roundRect(x, 11*mm, 37*mm, 31*mm, 4*mm, fill=1, stroke=0)
            c.setFillColor(WHITE); c.setFont("SocialArialBold", 9)
            c.drawCentredString(x+18.5*mm, 29*mm, title)
            c.setFont("SocialArial", 7); c.drawCentredString(x+18.5*mm, 20*mm, sub)
        c.setFillColor(MUTED); c.setFont("SocialArial", 7.5)
        c.drawCentredString(self.width/2, 3*mm, "Dengeli içerik, yalnız satış paylaşımına bağımlılığı azaltır.")


class SalesFunnel(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 58*mm
    def draw(self):
        c = self.canv
        rows = [("GÖRÜNÜRLÜK", "Dikkat çek", NAVY, 148), ("İLGİ", "Faydayı anlat", BLUE, 118),
                ("GÜVEN", "Kanıt göster", PURPLE, 88), ("EYLEM", "Net çağrı yap", GREEN, 58)]
        y = 43*mm
        for title, sub, col, width in rows:
            x = (164-width)/2*mm
            c.setFillColor(col); c.roundRect(x, y, width*mm, 9*mm, 2*mm, fill=1, stroke=0)
            c.setFillColor(WHITE); c.setFont("SocialArialBold", 8)
            c.drawCentredString(82*mm, y+4.8*mm, f"{title}  •  {sub}")
            y -= 11*mm


class WeeklyMix(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 45*mm
    def draw(self):
        c = self.canv
        values = [("Eğitim", 35, BLUE), ("Güven", 25, PURPLE), ("Ürün", 25, CYAN), ("Topluluk", 15, PINK)]
        c.setFillColor(NAVY); c.setFont("SocialArialBold", 9)
        c.drawString(6*mm, 39*mm, "ÖRNEK HAFTALIK İÇERİK DENGESİ")
        x, y, total = 6*mm, 21*mm, 152*mm
        for label, value, col in values:
            w = total*value/100
            c.setFillColor(col); c.rect(x, y, w, 11*mm, fill=1, stroke=0)
            c.setFillColor(WHITE); c.setFont("SocialArialBold", 7)
            c.drawCentredString(x+w/2, y+4.2*mm, f"{label} %{value}")
            x += w
        x = 10*mm
        for label, _value, col in values:
            c.setFillColor(col); c.circle(x, 8*mm, 1.5*mm, fill=1, stroke=0)
            c.setFillColor(TEXT); c.setFont("SocialArial", 7); c.drawString(x+3*mm, 7*mm, label)
            x += 38*mm


class BudgetChart(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 52*mm
    def draw(self):
        c = self.canv
        rows = [("Test kreatifleri", 40, BLUE), ("Kazanan reklam", 35, GREEN),
                ("Yeniden hedefleme", 15, PURPLE), ("Öğrenme payı", 10, GOLD)]
        c.setFillColor(NAVY); c.setFont("SocialArialBold", 9)
        c.drawString(6*mm, 45*mm, "ÖRNEK TEST BÜTÇESİ DAĞILIMI")
        y = 35*mm
        for label, value, col in rows:
            c.setFillColor(TEXT); c.setFont("SocialArial", 8); c.drawString(7*mm, y, label)
            c.setFillColor(colors.HexColor("#EDF1F7")); c.roundRect(53*mm, y-1*mm, 85*mm, 5*mm, 2*mm, fill=1, stroke=0)
            c.setFillColor(col); c.roundRect(53*mm, y-1*mm, 85*mm*value/40, 5*mm, 2*mm, fill=1, stroke=0)
            c.setFillColor(NAVY); c.setFont("SocialArialBold", 8); c.drawRightString(156*mm, y, f"%{value}")
            y -= 8*mm


class MetricsFlow(Flowable):
    def __init__(self):
        super().__init__(); self.width, self.height = 164*mm, 48*mm
    def draw(self):
        c = self.canv
        items = [("10.000", "Gösterim", NAVY), ("300", "Tıklama", BLUE), ("30", "Sepet", PURPLE), ("8", "Satış", GREEN)]
        for i, (value, label, col) in enumerate(items):
            x = (3+i*41)*mm
            c.setFillColor(col); c.roundRect(x, 12*mm, 34*mm, 25*mm, 4*mm, fill=1, stroke=0)
            c.setFillColor(WHITE); c.setFont("SocialArialBold", 13); c.drawCentredString(x+17*mm, 26*mm, value)
            c.setFont("SocialArial", 7.5); c.drawCentredString(x+17*mm, 18*mm, label)
            if i < 3:
                c.setFillColor(CYAN); c.setFont("SocialArialBold", 13); c.drawString(x+36*mm, 23*mm, "›")
        c.setFillColor(MUTED); c.setFont("SocialArial", 7.5)
        c.drawCentredString(self.width/2, 3*mm, "Örnek akış: Tıklama oranı %3, satış dönüşümü yaklaşık %2,7")


def box(title, items, bg=PALE):
    data = [[Paragraph(title, styles["SH3"])]] + [[Paragraph(f"• {x}", styles["SBullet"])] for x in items]
    table = Table(data, colWidths=[164*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg), ("BOX", (0,0), (-1,-1), .7, LINE),
        ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 3.5), ("BOTTOMPADDING", (0,0), (-1,-1), 3.5)
    ]))
    return table


def worksheet(title, intro, headers, widths, rows):
    data = [[Paragraph(x, styles["STableHead"]) for x in headers]] + [["" for _ in headers] for _ in range(rows)]
    table = Table(data, colWidths=widths, rowHeights=[10*mm]+[17*mm]*rows, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), BLUE), ("GRID", (0,0), (-1,-1), .6, LINE),
        ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 4)
    ]))
    return [Paragraph(title, styles["SSection"]), Paragraph(intro, styles["SBody"]), Spacer(1, 4*mm), table, PageBreak()]


def build():
    content = json.loads(DATA.read_text(encoding="utf-8"))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True); PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=23*mm, rightMargin=23*mm,
                            topMargin=21*mm, bottomMargin=22*mm,
                            title="FTSLine Sosyal Medya ve Reklam Ders Notları", author="FTSLine Akademi")
    story = []
    logo = Image(str(LOGO), width=43*mm, height=43*mm)
    logo_box = Table([[logo]], colWidths=[164*mm], rowHeights=[54*mm])
    logo_box.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    banner = Table([[
        Paragraph("SOSYAL MEDYA<br/>VE REKLAM", styles["SCover"]),
        Paragraph("Ders Notları<br/><br/>Planla • Üret<br/>Test Et • Ölç", styles["SCoverSub"])
    ]], colWidths=[100*mm,64*mm], rowHeights=[87*mm])
    banner.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,0),NAVY),("BACKGROUND",(1,0),(1,0),PURPLE),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ALIGN",(0,0),(-1,-1),"CENTER")
    ]))
    story += [Spacer(1,13*mm),logo_box,Spacer(1,8*mm),banner,Spacer(1,10*mm),
              Paragraph("FTSLine Akademi", ParagraphStyle("SBrand", parent=styles["SCoverSub"], fontName="SocialArialBold", textColor=BLUE, fontSize=13)),
              Paragraph("ftsline.net  |  Geleceğe yön ver.", ParagraphStyle("SWeb", parent=styles["SCoverSub"], textColor=MUTED, fontSize=9)),PageBreak()]

    story += [Paragraph("İçerikten Ölçülebilir Sonuca", styles["SSection"]),
              Paragraph("Bu çalışma kitabı, sosyal medyayı rastgele paylaşım alanı olmaktan çıkarıp "
                        "müşteriyi tanıyan, güven oluşturan ve sonuçları ölçen bir sisteme dönüştürmek için hazırlandı.",
                        styles["SBody"]), Spacer(1,3*mm), SalesFunnel(), Spacer(1,4*mm),
              box("Programın sonunda", [
                  "Marka dili ve hedef kitle kartı oluşturacaksınız.",
                  "İçerik sütunlarıyla 30 günlük paylaşım planı hazırlayacaksınız.",
                  "Küçük bütçeli reklam testini kontrollü kuracaksınız.",
                  "ROAS, dönüşüm ve müşteri edinme maliyetini birlikte okuyacaksınız."
              ], PALE_GOLD), PageBreak()]

    visuals = {2: [ContentPillars(), WeeklyMix()], 4: [BudgetChart()], 5: [MetricsFlow()]}
    for i, lesson in enumerate(content["lessons"]):
        story += [Paragraph(f"DERS {i+1}",styles["SH3"]),Paragraph(lesson["title"],styles["SLesson"]),
                  Paragraph(lesson["description"],styles["SBody"])]
        for paragraph in lesson["content"].split("\n\n"):
            story.append(Paragraph(paragraph, styles["SBody"]))
        for visual in visuals.get(i, []):
            story += [Spacer(1,2*mm), visual]
        story += [Spacer(1,2*mm),box("Dikkat edilecekler",lesson["keyPoints"],PALE_GOLD),
                  Spacer(1,4*mm),box("Uygulama kontrol listesi",[f"□ {x}" for x in lesson["checklist"]]),PageBreak()]

    story += worksheet("Çalışma Sayfası 1 - Hedef Kitle Kartı",
                       "Tek bir ana müşteri profili için alanları gerçek gözlem ve görüşmelerle doldurun.",
                       ["Sorun / ihtiyaç","Satın alma nedeni","İtiraz","Kullandığı kanal"],[42*mm,42*mm,38*mm,42*mm],5)
    story += worksheet("Çalışma Sayfası 2 - Haftalık İçerik Takvimi",
                       "Her içerikte tek amaç ve tek ana eylem çağrısı kullanın.",
                       ["Gün","İçerik sütunu","Format / konu","Amaç","Eylem çağrısı"],[20*mm,32*mm,50*mm,28*mm,34*mm],7)
    story += worksheet("Çalışma Sayfası 3 - Reklam Test Planı",
                       "Karşılaştırılabilir sonuç için her satırda yalnız bir ana değişkeni değiştirin.",
                       ["Test","Hedef kitle","Kreatif / mesaj","Bütçe","Başarı / durdurma ölçütü"],[20*mm,35*mm,48*mm,23*mm,38*mm],5)
    story += worksheet("Çalışma Sayfası 4 - Haftalık Reklam Raporu",
                       "Ciroyu maliyet, iade ve katkı payıyla birlikte değerlendirin.",
                       ["Kampanya","Harcama","Tıklama","Satış","Gelir","CAC / ROAS","Karar"],[29*mm,22*mm,22*mm,20*mm,22*mm,27*mm,22*mm],6)

    story += [Paragraph("30 Günlük Uygulama Planı",styles["SSection"])]
    plan = [
        ["Dönem","Ana hedef","Tamamlanacak çalışma"],
        ["1-7. gün","Temel","Marka dili, hedef kitle, ana kanal ve profil düzeni"],
        ["8-14. gün","İçerik sistemi","İçerik sütunları, 20 fikir, ilk haftalık takvim"],
        ["15-21. gün","Organik test","Düzenli yayın, yorum yönetimi ve metrik takibi"],
        ["22-30. gün","Reklam testi","Sayfa kontrolü, küçük bütçe, iki kreatif ve haftalık rapor"]
    ]
    table = Table([[Paragraph(str(x),styles["STableHead"] if r==0 else styles["STableCell"]) for x in row]
                   for r,row in enumerate(plan)], colWidths=[28*mm,40*mm,96*mm],
                  rowHeights=[10*mm]+[22*mm]*4)
    table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),BLUE),("BACKGROUND",(0,1),(0,-1),PALE),
                               ("GRID",(0,0),(-1,-1),.6,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                               ("LEFTPADDING",(0,0),(-1,-1),6)]))
    story += [table,Spacer(1,8*mm),box("Son kontrol",[
        "İçerik ve reklam mesajları gerçek, açık ve kanıtlanabilir.",
        "Telif, müşteri izni ve kişisel veri kontrolleri yapıldı.",
        "Satış sayfası ve test siparişi sorunsuz çalışıyor.",
        "Bütçe, başarı ve durdurma sınırları yazılı.",
        "İade sonrası gerçek gelir ve katkı payı raporlanıyor."
    ]),Spacer(1,10*mm),
              Paragraph("Yaratıcılık dikkat çeker; ölçüm büyütür.",ParagraphStyle(
                  "SFinal",parent=styles["SCover"],textColor=PURPLE,fontSize=21)),
              Paragraph("FTSLine Akademi  •  ftsline.net",ParagraphStyle(
                  "SFinalWeb",parent=styles["SCoverSub"],textColor=MUTED,fontSize=10))]

    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    shutil.copy2(OUTPUT,PUBLIC)
    print(OUTPUT); print(PUBLIC)


if __name__ == "__main__":
    build()
