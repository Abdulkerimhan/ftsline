import test from "node:test";
import assert from "node:assert/strict";
import {
  hasAcademyAccess,
  isAcademyAccessProduct,
  normalizeAcademyLessons,
} from "../src/services/academyContractService.js";

test("akademi erisimini aktif lisans ve superadmin icin acar", () => {
  const now = new Date("2026-07-29T12:00:00Z").getTime();
  assert.equal(hasAcademyAccess({ role: "superadmin", isLicensed: false }, now), true);
  assert.equal(
    hasAcademyAccess(
      { role: "user", isLicensed: true, licenseExpiresAt: "2026-08-29T12:00:00Z" },
      now
    ),
    true
  );
  assert.equal(
    hasAcademyAccess(
      { role: "user", isLicensed: true, licenseExpiresAt: "2026-06-29T12:00:00Z" },
      now
    ),
    false
  );
  assert.equal(hasAcademyAccess({ role: "user", isLicensed: false }, now), false);
});

test("akademi ders sozlesmesini temizler ve bos basliklari atar", () => {
  assert.deepEqual(
    normalizeAcademyLessons([
      {
        title: " Giris ",
        durationMinutes: "12",
        order: "2",
        content: " Ders metni ",
        keyPoints: [" Hedef belirle ", ""],
        checklist: "Magaza adini sec\n\nButceyi yaz",
      },
      { title: " " },
    ]),
    [
      {
        title: "Giris",
        description: "",
        content: "Ders metni",
        keyPoints: ["Hedef belirle"],
        checklist: ["Magaza adini sec", "Butceyi yaz"],
        videoUrl: "",
        documentUrl: "",
        durationMinutes: 12,
        order: 2,
      },
    ]
  );
});

test("yalnizca lisans ve egitim paketleri akademi erisimi acar", () => {
  assert.equal(isAcademyAccessProduct({ nameTr: "eğitim paketi 2 yıllık" }), true);
  assert.equal(
    isAcademyAccessProduct({ name: "giriş lisans ve ilk premium üyelik bedeli" }),
    true
  );
  assert.equal(isAcademyAccessProduct({ categoryTr: "Eğitim" }), true);
  assert.equal(isAcademyAccessProduct({ nameTr: "BİLEKLİK" }), false);
  assert.equal(isAcademyAccessProduct({ nameTr: "sabun" }), false);
  assert.equal(isAcademyAccessProduct({ nameTr: "SU ARITMA" }), false);
  assert.equal(isAcademyAccessProduct({ nameTr: "BARDAK" }), false);
});
