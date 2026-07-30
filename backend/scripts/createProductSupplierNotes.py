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
from reportlab.platypus import (
    Flowable, Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
)

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "backend" / "data" / "productSupplierContent.json"
LOGO = ROOT / "frontend" / "src" / "assets" / "ftsline.png"
OUTPUT = ROOT / "output" / "pdf" / "FTSLine_Dogru_Urun_ve_Tedarikci_Bulma_Ders_Notlari.pdf"
PUBLIC = ROOT / "frontend" / "public" / "documents" / OUTPUT.name

NAVY = colors.HexColor("#0B1F46")
BLUE = colors.HexColor("#2057D4")
CYAN = colors.HexColor("#13B7E8")
GOLD = colors.HexColor("#F4B740")
GREEN = colors.HexColor("#20A66A")
RED = colors.HexColor("#E45D5D")
PALE = colors.HexColor("#EAF2FF")
PALE_GOLD = colors.HexColor("#FFF6DD")
TEXT = colors.HexColor("#24344D")
MUTED = colors.HexColor("#66758A")
LINE = colors.HexColor("#D8E1EF")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("FTSArial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("FTSArialBold", r"C:\Windows\Fonts\arialbd.ttf"))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Cover", fontName="FTSArialBold", fontSize=27, leading=32,
                          textColor=WHITE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="CoverSub", fontName="FTSArial", fontSize=11, leading=17,
                          textColor=colors.HexColor("#DCE8FF"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="SectionTR", fontName="FTSArialBold", fontSize=21, leading=26,
                          textColor=NAVY, spaceAfter=9))
styles.add(ParagraphStyle(name="LessonTR", fontName="FTSArialBold", fontSize=17, leading=22,
                          textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name="H3TR", fontName="FTSArialBold", fontSize=11.5, leading=15,
                          textColor=BLUE, spaceBefore=5, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyTR2", fontName="FTSArial", fontSize=9.7, leading=14.5,
                          textColor=TEXT, spaceAfter=7))
styles.add(ParagraphStyle(name="BulletTR2", fontName="FTSArial", fontSize=8.6, leading=11.7,
                          textColor=TEXT, leftIndent=11, firstLineIndent=-7, spaceAfter=4))
styles.add(ParagraphStyle(name="TinyTR", fontName="FTSArial", fontSize=7.5, leading=10,
                          textColor=MUTED, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="TableHead2", fontName="FTSArialBold", fontSize=8, leading=10,
                          textColor=WHITE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="TableCell2", fontName="FTSArial", fontSize=7.8, leading=10,
                          textColor=TEXT))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, 192 * mm, 15 * mm)
    canvas.setFont("FTSArial", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10 * mm, "FTSLine Akademi - Doğru Ürün ve Tedarikçi Bulma")
    canvas.drawRightString(192 * mm, 10 * mm, f"Sayfa {canvas.getPageNumber()}")
    canvas.restoreState()


class Funnel(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = 164 * mm, 61 * mm

    def draw(self):
        c = self.canv
        labels = ["ÜRÜN FİKRİ", "VERİ ARAŞTIRMASI", "NUMUNE", "PİLOT SATIŞ", "ÖLÇEKLEME"]
        cols = [NAVY, BLUE, colors.HexColor("#3979DF"), CYAN, GREEN]
        top, base, step = self.height - 9 * mm, 9 * mm, 5 * mm
        for i, (label, col) in enumerate(zip(labels, cols)):
            left = (14 + i * step) * mm
            right = self.width - left
            y_top = top - i * 10 * mm
            y_bottom = y_top - 8 * mm
            c.setFillColor(col)
            c.roundRect(left, y_bottom, right - left, 8 * mm, 2 * mm, fill=1, stroke=0)
            c.setFillColor(WHITE)
            c.setFont("FTSArialBold", 8)
            c.drawCentredString(self.width / 2, y_bottom + 2.7 * mm, label)
        c.setFillColor(MUTED)
        c.setFont("FTSArial", 7.5)
        c.drawCentredString(self.width / 2, base - 4 * mm,
                            "Her aşamada kanıt güçlenir, yatırılan para kontrollü biçimde artar.")


class Quadrant(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = 164 * mm, 72 * mm

    def draw(self):
        c = self.canv
        x, y, w, h = 27 * mm, 12 * mm, 118 * mm, 50 * mm
        fills = [[colors.HexColor("#FFF0F0"), colors.HexColor("#FFF6DD")],
                 [colors.HexColor("#EEF2F7"), colors.HexColor("#E2F7EC")]]
        for row in range(2):
            for col in range(2):
                c.setFillColor(fills[row][col])
                c.rect(x + col*w/2, y + row*h/2, w/2, h/2, fill=1, stroke=0)
        c.setStrokeColor(NAVY)
        c.setLineWidth(1)
        c.line(x, y+h/2, x+w, y+h/2)
        c.line(x+w/2, y, x+w/2, y+h)
        c.setFillColor(TEXT)
        c.setFont("FTSArialBold", 8)
        labels = [
            (x+w*.25, y+h*.75, "DÜŞÜK TALEP\nDÜŞÜK REKABET"),
            (x+w*.75, y+h*.75, "YÜKSEK TALEP\nDÜŞÜK REKABET"),
            (x+w*.25, y+h*.25, "DÜŞÜK TALEP\nYÜKSEK REKABET"),
            (x+w*.75, y+h*.25, "YÜKSEK TALEP\nYÜKSEK REKABET"),
        ]
        for px, py, label in labels:
            for j, line in enumerate(label.split("\n")):
                c.drawCentredString(px, py + (1-j)*4*mm, line)
        c.setFillColor(GREEN)
        c.circle(x+w*.75, y+h*.75, 3 * mm, fill=1, stroke=0)
        c.setFillColor(MUTED)
        c.setFont("FTSArial", 7)
        c.drawCentredString(x+w/2, 3*mm, "REKABET  →")
        c.saveState()
        c.translate(8*mm, y+h/2)
        c.rotate(90)
        c.drawCentredString(0, 0, "TALEP  →")
        c.restoreState()


class ScoreBars(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = 164 * mm, 47 * mm

    def draw(self):
        c = self.canv
        rows = [("Kalite", 30, BLUE), ("Toplam maliyet", 22, CYAN), ("Teslimat", 20, GREEN),
                ("Güvenilirlik", 15, GOLD), ("İletişim", 8, colors.HexColor("#8B6EDB")),
                ("Esneklik", 5, colors.HexColor("#9BA9BA"))]
        c.setFont("FTSArialBold", 9)
        c.setFillColor(NAVY)
        c.drawString(6*mm, self.height-7*mm, "ÖRNEK TEDARİKÇİ PUAN AĞIRLIKLARI")
        y = self.height - 11*mm
        for label, value, col in rows:
            c.setFont("FTSArial", 8)
            c.setFillColor(TEXT)
            c.drawString(7*mm, y, label)
            c.setFillColor(colors.HexColor("#EEF2F7"))
            c.roundRect(49*mm, y-1*mm, 92*mm, 5*mm, 2*mm, fill=1, stroke=0)
            c.setFillColor(col)
            c.roundRect(49*mm, y-1*mm, 92*mm*value/30, 5*mm, 2*mm, fill=1, stroke=0)
            c.setFillColor(NAVY)
            c.setFont("FTSArialBold", 8)
            c.drawRightString(155*mm, y, f"%{value}")
            y -= 6.1*mm


class CostStack(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = 164 * mm, 37 * mm

    def draw(self):
        c = self.canv
        items = [("Ürün", 48, BLUE), ("Navlun", 16, CYAN), ("Vergi", 14, GOLD),
                 ("Ambalaj", 8, GREEN), ("Fire", 6, RED), ("Diğer", 8, colors.HexColor("#8B6EDB"))]
        c.setFont("FTSArialBold", 9)
        c.setFillColor(NAVY)
        c.drawString(6*mm, self.height-5*mm, "TOPLAM TESLİM MALİYETİ - ÖRNEK DAĞILIM")
        x, y, total_w = 6*mm, 17*mm, 152*mm
        for label, value, col in items:
            seg = total_w * value / 100
            c.setFillColor(col)
            c.rect(x, y, seg, 10*mm, fill=1, stroke=0)
            if seg > 16*mm:
                c.setFillColor(WHITE)
                c.setFont("FTSArialBold", 7)
                c.drawCentredString(x+seg/2, y+3.7*mm, f"{label} %{value}")
            x += seg
        x, y2 = 7*mm, 7*mm
        for label, value, col in items:
            c.setFillColor(col)
            c.circle(x, y2, 1.4*mm, fill=1, stroke=0)
            c.setFillColor(TEXT)
            c.setFont("FTSArial", 7)
            c.drawString(x+3*mm, y2-1*mm, label)
            x += 25*mm


class RiskMatrix(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = 164 * mm, 62 * mm

    def draw(self):
        c = self.canv
        x, y, cell = 45*mm, 9*mm, 14*mm
        palette = [
            [colors.HexColor("#E4F6EA"), colors.HexColor("#E4F6EA"), colors.HexColor("#FFF3C9"),
             colors.HexColor("#FFD7AE"), colors.HexColor("#FFC8C8")],
            [colors.HexColor("#E4F6EA"), colors.HexColor("#FFF3C9"), colors.HexColor("#FFF3C9"),
             colors.HexColor("#FFD7AE"), colors.HexColor("#FFC8C8")],
            [colors.HexColor("#E4F6EA"), colors.HexColor("#FFF3C9"), colors.HexColor("#FFD7AE"),
             colors.HexColor("#FFC8C8"), colors.HexColor("#FFC8C8")],
            [colors.HexColor("#FFF3C9"), colors.HexColor("#FFD7AE"), colors.HexColor("#FFD7AE"),
             colors.HexColor("#FFC8C8"), colors.HexColor("#F29A9A")],
            [colors.HexColor("#FFF3C9"), colors.HexColor("#FFD7AE"), colors.HexColor("#FFC8C8"),
             colors.HexColor("#F29A9A"), colors.HexColor("#E45D5D")],
        ]
        for row in range(5):
            for col in range(5):
                c.setFillColor(palette[row][col])
                c.setStrokeColor(WHITE)
                c.rect(x+col*cell, y+row*cell/1.55, cell, cell/1.55, fill=1, stroke=1)
                c.setFillColor(TEXT)
                c.setFont("FTSArialBold", 7)
                c.drawCentredString(x+col*cell+cell/2, y+row*cell/1.55+cell/3.8,
                                    str((row+1)*(col+1)))
        c.setFillColor(MUTED)
        c.setFont("FTSArial", 7)
        c.drawCentredString(x+2.5*cell, 3*mm, "OLASILIK  →")
        c.saveState()
        c.translate(22*mm, y+1.55*cell)
        c.rotate(90)
        c.drawCentredString(0, 0, "ETKİ  →")
        c.restoreState()
        c.setFillColor(NAVY)
        c.setFont("FTSArialBold", 9)
        c.drawString(6*mm, self.height-5*mm, "TEDARİK RİSK MATRİSİ")


def info_box(title, items, bg=PALE):
    data = [[Paragraph(title, styles["H3TR"])]] + [
        [Paragraph(f"• {item}", styles["BulletTR2"])] for item in items
    ]
    table = Table(data, colWidths=[164*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), .7, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]))
    return table


def worksheet(title, intro, headers, widths, rows):
    data = [[Paragraph(h, styles["TableHead2"]) for h in headers]]
    data += [["" for _ in headers] for _ in range(rows)]
    table = Table(data, colWidths=widths, rowHeights=[10*mm]+[17*mm]*rows, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE), ("GRID", (0, 0), (-1, -1), .6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return [Paragraph(title, styles["SectionTR"]), Paragraph(intro, styles["BodyTR2"]),
            Spacer(1, 4*mm), table, PageBreak()]


def build():
    content = json.loads(DATA.read_text(encoding="utf-8"))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=23*mm, rightMargin=23*mm,
                            topMargin=21*mm, bottomMargin=22*mm,
                            title="FTSLine Doğru Ürün ve Tedarikçi Bulma Ders Notları",
                            author="FTSLine Akademi")
    story = []

    logo = Image(str(LOGO), width=43*mm, height=43*mm)
    logo_box = Table([[logo]], colWidths=[164*mm], rowHeights=[54*mm])
    logo_box.setStyle(TableStyle([("ALIGN", (0,0), (-1,-1), "CENTER"),
                                  ("VALIGN", (0,0), (-1,-1), "MIDDLE")]))
    cover = Table([[
        Paragraph("DOĞRU ÜRÜN<br/>VE TEDARİKÇİ BULMA", styles["Cover"]),
        Paragraph("Ders Notları<br/><br/>Araştır • Doğrula<br/>Puanla • Güvenceye Al",
                  styles["CoverSub"])
    ]], colWidths=[100*mm, 64*mm], rowHeights=[87*mm])
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), NAVY), ("BACKGROUND", (1,0), (1,0), BLUE),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ALIGN", (0,0), (-1,-1), "CENTER")
    ]))
    story += [Spacer(1, 13*mm), logo_box, Spacer(1, 8*mm), cover, Spacer(1, 10*mm),
              Paragraph("FTSLine Akademi", ParagraphStyle(
                  "Brand", parent=styles["CoverSub"], fontName="FTSArialBold",
                  textColor=BLUE, fontSize=13)),
              Paragraph("ftsline.net  |  Geleceğe yön ver.", ParagraphStyle(
                  "Web", parent=styles["CoverSub"], textColor=MUTED, fontSize=9)), PageBreak()]

    story += [Paragraph("Ürün Seçiminden Güvenli Tedarike", styles["SectionTR"]),
              Paragraph("Bu çalışma kitabı, ürün fikrinden ilk satın alma siparişine kadar kararları "
                        "kanıta dayandırmanız için hazırlanmıştır. Her aşamada kontrol listesini "
                        "tamamlayın; yeterli kanıt oluşmadan bir sonraki yatırım seviyesine geçmeyin.",
                        styles["BodyTR2"]), Spacer(1, 3*mm), Funnel(), Spacer(1, 3*mm),
              info_box("Temel ilke", [
                  "Önce müşteri sorununu, sonra ürünü doğrulayın.",
                  "Büyük stoktan önce numune ve küçük pilot satış yapın.",
                  "Tedarikçiyi yalnız fiyatla değil toplam risk ve performansla ölçün.",
                  "Belge, ürün güvenliği, sözleşme ve vergi konularını uzmanlarla doğrulayın."
              ], PALE_GOLD), PageBreak()]

    visual_for_lesson = {1: Quadrant, 4: ScoreBars, 5: RiskMatrix}
    for i, lesson in enumerate(content["lessons"]):
        story += [Paragraph(f"DERS {i+1}", styles["H3TR"]),
                  Paragraph(lesson["title"], styles["LessonTR"]),
                  Paragraph(lesson["description"], styles["BodyTR2"])]
        for paragraph in lesson["content"].split("\n\n"):
            story.append(Paragraph(paragraph, styles["BodyTR2"]))
        if i in visual_for_lesson:
            story += [Spacer(1, 2*mm), visual_for_lesson[i](), Spacer(1, 2*mm)]
        if i == 4:
            story += [CostStack(), Spacer(1, 2*mm)]
        story += [info_box("Dikkat edilecekler", lesson["keyPoints"], PALE_GOLD),
                  Spacer(1, 4*mm),
                  info_box("Uygulama kontrol listesi", [f"□ {x}" for x in lesson["checklist"]]),
                  PageBreak()]

    story += worksheet("Çalışma Sayfası 1 - Ürün Adayı Puan Kartı",
                       "Her ürünü 1 (zayıf) ile 5 (çok güçlü) arasında puanlayın.",
                       ["Ürün adayı", "Talep", "Marj", "Rekabet", "Operasyon", "Risk", "Toplam"],
                       [39*mm, 20*mm, 20*mm, 22*mm, 23*mm, 20*mm, 20*mm], 6)
    story += worksheet("Çalışma Sayfası 2 - Tedarikçi Karşılaştırması",
                       "Tekliflerin aynı ürün standardını ve teslim kapsamını içerdiğinden emin olun.",
                       ["Tedarikçi", "Kalite", "Toplam maliyet", "Termin", "Ödeme", "Puan / Not"],
                       [31*mm, 24*mm, 31*mm, 24*mm, 24*mm, 30*mm], 5)
    story += worksheet("Çalışma Sayfası 3 - Numune Kontrol Formu",
                       "Kabul ölçütlerini numune gelmeden önce yazın ve fotoğrafla kayıt altına alın.",
                       ["Kontrol noktası", "Beklenen standart", "Sonuç", "Kusur / Fotoğraf notu"],
                       [39*mm, 48*mm, 25*mm, 52*mm], 7)
    story += worksheet("Çalışma Sayfası 4 - Pazarlık Hazırlığı",
                       "Görüşmeden önce hedefinizi, karşılığında sunacağınız hacmi ve vazgeçme sınırını netleştirin.",
                       ["Konu", "Hedef", "Kabul edilebilir sınır", "Karşı teklif / Sonuç"],
                       [36*mm, 39*mm, 43*mm, 46*mm], 6)

    story += [Paragraph("İlk Sipariş Öncesi Son Kontrol", styles["SectionTR"]),
              info_box("Sipariş onayı", [
                  "Ürün teknik özellikleri ve onaylı numune eşleştirildi.",
                  "Adet, fiyat, vergi, teslim şekli ve toplam maliyet yazılı.",
                  "Teslim tarihi, gecikme ve kusurlu ürün çözümü kararlaştırıldı.",
                  "Ödeme yöntemi ve ödeme basamakları güvenli.",
                  "Sevk öncesi kalite kontrol planlandı.",
                  "Alternatif tedarikçi ve gecikme planı hazır.",
                  "Gerekli belge, izin, marka ve ürün güvenliği kontrolleri yapıldı."
              ]), Spacer(1, 9*mm),
              Paragraph("Uzman kontrolü", styles["H3TR"]),
              Paragraph("Bu eğitim genel bilgilendirme amaçlıdır. Ürün güvenliği, ithalat, marka, "
                        "sözleşme ve tüketici hukuku konularını avukat veya ilgili uzmanla; vergi, "
                        "fatura ve maliyet uygulamalarını mali müşavirle işletmenize özel netleştirin.",
                        styles["BodyTR2"]), Spacer(1, 15*mm),
              Paragraph("Doğru karar, güçlü kanıtla başlar.", ParagraphStyle(
                  "Final2", parent=styles["Cover"], textColor=BLUE, fontSize=22)),
              Paragraph("FTSLine Akademi  •  ftsline.net", ParagraphStyle(
                  "FinalWeb2", parent=styles["CoverSub"], textColor=MUTED, fontSize=10))]

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    shutil.copy2(OUTPUT, PUBLIC)
    print(OUTPUT)
    print(PUBLIC)


if __name__ == "__main__":
    build()
