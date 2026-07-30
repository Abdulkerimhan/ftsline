import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "backend" / "data" / "academyStarterContent.json"
LOGO = ROOT / "frontend" / "src" / "assets" / "ftsline.png"
OUTPUT = ROOT / "output" / "pdf" / "FTSLine_E-Ticarete_Baslangic_Ders_Notlari.pdf"

NAVY = colors.HexColor("#0B1F46")
BLUE = colors.HexColor("#2057D4")
CYAN = colors.HexColor("#1CB8E8")
PALE_BLUE = colors.HexColor("#EAF2FF")
PALE_GOLD = colors.HexColor("#FFF6DD")
TEXT = colors.HexColor("#24344D")
MUTED = colors.HexColor("#66758A")
LINE = colors.HexColor("#D8E1EF")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("FTSArial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("FTSArialBold", r"C:\Windows\Fonts\arialbd.ttf"))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle", fontName="FTSArialBold", fontSize=28, leading=34,
    textColor=WHITE, alignment=TA_CENTER, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="CoverSub", fontName="FTSArial", fontSize=12, leading=18,
    textColor=colors.HexColor("#DCE8FF"), alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="Section", fontName="FTSArialBold", fontSize=22, leading=27,
    textColor=NAVY, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="Lesson", fontName="FTSArialBold", fontSize=18, leading=23,
    textColor=NAVY, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="H3", fontName="FTSArialBold", fontSize=12, leading=16,
    textColor=BLUE, spaceBefore=7, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="BodyTR", fontName="FTSArial", fontSize=10.3, leading=16,
    textColor=TEXT, alignment=TA_LEFT, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="SmallTR", fontName="FTSArial", fontSize=8.5, leading=12,
    textColor=MUTED,
))
styles.add(ParagraphStyle(
    name="BulletTR", fontName="FTSArial", fontSize=9.5, leading=14,
    textColor=TEXT, leftIndent=12, firstLineIndent=-8, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="TableHead", fontName="FTSArialBold", fontSize=8.5, leading=11,
    textColor=WHITE, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="TableCell", fontName="FTSArial", fontSize=8.2, leading=11,
    textColor=TEXT,
))


def footer(canvas, doc):
    canvas.saveState()
    page = canvas.getPageNumber()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, 192 * mm, 15 * mm)
    canvas.setFont("FTSArial", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10 * mm, "FTSLine Akademi - E-Ticarete Başlangıç")
    canvas.drawRightString(192 * mm, 10 * mm, f"Sayfa {page}")
    canvas.restoreState()


def box(title, items, background, symbol):
    rows = [[Paragraph(f"<b>{title}</b>", styles["H3"])]]
    for item in items:
        rows.append([Paragraph(f"{symbol} {item}", styles["BulletTR"])])
    table = Table(rows, colWidths=[164 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def write_lines(count=4):
    data = [[""] for _ in range(count)]
    table = Table(data, colWidths=[164 * mm], rowHeights=[9 * mm] * count)
    table.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.7, LINE),
    ]))
    return table


def worksheet(title, prompt, headers, widths, rows=5):
    story = [
        Paragraph(title, styles["Section"]),
        Paragraph(prompt, styles["BodyTR"]),
        Spacer(1, 5 * mm),
    ]
    data = [[Paragraph(h, styles["TableHead"]) for h in headers]]
    for _ in range(rows):
        data.append(["" for _ in headers])
    table = Table(data, colWidths=widths, rowHeights=[11 * mm] + [18 * mm] * rows, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("GRID", (0, 0), (-1, -1), 0.65, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([table, PageBreak()])
    return story


def build():
    content = json.loads(DATA.read_text(encoding="utf-8"))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4,
        rightMargin=23 * mm, leftMargin=23 * mm,
        topMargin=22 * mm, bottomMargin=22 * mm,
        title="FTSLine E-Ticarete Başlangıç Ders Notları",
        author="FTSLine Akademi",
    )
    story = []

    cover = Table(
        [[
            Image(str(LOGO), width=48 * mm, height=48 * mm),
        ]],
        colWidths=[164 * mm],
        rowHeights=[58 * mm],
    )
    cover.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 0, WHITE),
    ]))
    banner = Table(
        [[
            Paragraph("E-TİCARETE<br/>BAŞLANGIÇ", styles["CoverTitle"]),
            Paragraph(
                "Ders Notları<br/><br/>Bilgiden uygulamaya,<br/>adım adım çalışma kitabı",
                styles["CoverSub"],
            ),
        ]],
        colWidths=[94 * mm, 70 * mm],
        rowHeights=[82 * mm],
    )
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("BACKGROUND", (1, 0), (1, 0), BLUE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOX", (0, 0), (-1, -1), 0, NAVY),
    ]))
    story.extend([
        Spacer(1, 16 * mm), cover, Spacer(1, 10 * mm), banner,
        Spacer(1, 12 * mm),
        Paragraph("FTSLine Akademi", ParagraphStyle(
            "CoverBrand", parent=styles["CoverSub"], textColor=BLUE,
            fontName="FTSArialBold", fontSize=13,
        )),
        Paragraph("ftsline.net  |  Geleceğe yön ver.", ParagraphStyle(
            "CoverWeb", parent=styles["CoverSub"], textColor=MUTED, fontSize=9,
        )),
        PageBreak(),
    ])

    story.extend([
        Paragraph("Bu çalışma kitabı nasıl kullanılır?", styles["Section"]),
        Paragraph(
            "Her dersi sırayla okuyun. Dikkat edilecek noktaları kendi iş fikrinizle "
            "karşılaştırın, kontrol listesini tamamlayın ve çalışma sayfalarını doldurun. "
            "Bir adım netleşmeden sonraki adıma geçmek yerine eksikleri not alın.",
            styles["BodyTR"],
        ),
        box("Bu programın sonunda", [
            "İş modelinizi ve hedef müşterinizi açıklayabileceksiniz.",
            "Ürün fikrini veri, rakip ve tedarik açısından değerlendireceksiniz.",
            "Gerçek maliyeti ve sürdürülebilir satış fiyatını hesaplayacaksınız.",
            "Güven veren ürün ve mağaza sayfalarını hazırlayacaksınız.",
            "Test siparişinden ilk 30 güne kadar bir açılış planı oluşturacaksınız.",
        ], PALE_BLUE, "•"),
        Spacer(1, 6 * mm),
        Paragraph("Önemli not", styles["H3"]),
        Paragraph(
            "Bu içerik genel eğitim amacı taşır. Vergi ve muhasebe süreçlerini mali müşavir, "
            "sözleşme ve tüketici hukuku metinlerini avukat ile işletmenize özel olarak netleştirin.",
            styles["BodyTR"],
        ),
        PageBreak(),
    ])

    for index, lesson in enumerate(content["lessons"], start=1):
        story.extend([
            Paragraph(f"DERS {index}", styles["H3"]),
            Paragraph(lesson["title"], styles["Lesson"]),
            Paragraph(lesson["description"], styles["BodyTR"]),
            Spacer(1, 2 * mm),
        ])
        paragraphs = [p.strip() for p in lesson["content"].split("\n\n") if p.strip()]
        for paragraph in paragraphs:
            story.append(Paragraph(paragraph, styles["BodyTR"]))
        story.extend([
            Spacer(1, 3 * mm),
            box("Dikkat edilecekler", lesson["keyPoints"], PALE_GOLD, "•"),
            Spacer(1, 5 * mm),
            box("Uygulama kontrol listesi", lesson["checklist"], PALE_BLUE, "□"),
            Spacer(1, 5 * mm),
            Paragraph("Kendi notlarım", styles["H3"]),
            write_lines(1),
            PageBreak(),
        ])

    story.extend(worksheet(
        "Çalışma Sayfası 1 - Hedef Müşteri",
        "Gerçek veya olası müşterinizden hareketle aşağıdaki alanları doldurun.",
        ["Müşteri profili", "Sorunu / ihtiyacı", "Satın alma nedeni", "En büyük itirazı"],
        [34 * mm, 44 * mm, 44 * mm, 42 * mm],
        rows=4,
    ))
    story.extend(worksheet(
        "Çalışma Sayfası 2 - Rakip Analizi",
        "En az beş rakibi yalnızca fiyat değil, bütün müşteri deneyimi açısından karşılaştırın.",
        ["Rakip", "Fiyat", "Güçlü yanı", "Zayıf yanı", "Bizim farkımız"],
        [28 * mm, 22 * mm, 39 * mm, 39 * mm, 36 * mm],
        rows=5,
    ))
    story.extend(worksheet(
        "Çalışma Sayfası 3 - Birim Maliyet",
        "Bir sipariş için oluşan tüm değişken giderleri yazın. Boş gider bırakmayın.",
        ["Gider kalemi", "Tutar (TL)", "Hesaplama notu"],
        [58 * mm, 35 * mm, 71 * mm],
        rows=8,
    ))

    story.extend([
        Paragraph("30 Günlük Uygulama Planı", styles["Section"]),
        Paragraph(
            "Her haftanın sonunda tamamlanan işleri ve öğrendiklerinizi değerlendirin.",
            styles["BodyTR"],
        ),
    ])
    plan = [
        ["Dönem", "Ana hedef", "Tamamlanacak işler"],
        ["1-7. gün", "Temel ve müşteri", "İş modeli, bütçe, müşteri profili, değer önerisi"],
        ["8-14. gün", "Ürün doğrulama", "Rakip analizi, yorum inceleme, tedarikçi ve numune"],
        ["15-21. gün", "Fiyat ve mağaza", "Maliyet tablosu, fiyat, görseller, ürün sayfası"],
        ["22-30. gün", "Test ve açılış", "Test siparişi, süreç kontrolü, küçük kampanya, ölçüm"],
    ]
    plan_table = Table(
        [[Paragraph(str(cell), styles["TableHead"] if r == 0 else styles["TableCell"])
          for cell in row] for r, row in enumerate(plan)],
        colWidths=[28 * mm, 44 * mm, 92 * mm],
        rowHeights=[11 * mm, 22 * mm, 22 * mm, 22 * mm, 22 * mm],
    )
    plan_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("BACKGROUND", (0, 1), (0, -1), PALE_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.7, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([
        plan_table,
        Spacer(1, 8 * mm),
        Paragraph("30. gün değerlendirmesi", styles["H3"]),
        Paragraph("En iyi çalışan şey:", styles["BodyTR"]), write_lines(2),
        Paragraph("Düzeltilmesi gereken şey:", styles["BodyTR"]), write_lines(2),
        Paragraph("Gelecek ayın ana hedefi:", styles["BodyTR"]), write_lines(2),
        PageBreak(),
        Paragraph("FTSLine Akademi", styles["Section"]),
        Paragraph(
            "E-ticaret bir defalık kurulum değil; ölçme, öğrenme ve iyileştirme sürecidir. "
            "Kontrol listenizi düzenli güncelleyin, müşterinin sesini dinleyin ve kararlarınızı "
            "mümkün olduğunca veriye dayandırın.",
            styles["BodyTR"],
        ),
        Spacer(1, 10 * mm),
        box("Son kontrol", [
            "Ürün ve müşteri uyumu doğrulandı.",
            "Maliyet ve fiyat tablosu hazırlandı.",
            "Mağaza ve hukuki sayfalar kontrol edildi.",
            "Ödeme, stok, e-posta ve sipariş akışı test edildi.",
            "İlk 30 günlük hedef ve ölçüm planı belirlendi.",
        ], PALE_BLUE, "□"),
        Spacer(1, 18 * mm),
        Paragraph("Geleceğe yön ver.", ParagraphStyle(
            "Final", parent=styles["CoverTitle"], textColor=BLUE, fontSize=24,
        )),
        Paragraph("ftsline.net", ParagraphStyle(
            "FinalWeb", parent=styles["CoverSub"], textColor=MUTED, fontSize=11,
        )),
    ])

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()
