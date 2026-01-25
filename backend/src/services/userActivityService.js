// backend/src/services/userActivityService.js
import User from "../models/User.js";

// "YYYY-MM"
function getYmKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// lastPaidYm -> nowYm arası kaç ay fark var? (0,1,2,...)
function monthDiff(lastPaidYm, nowYm) {
  if (!lastPaidYm) return null;
  const [y1, m1] = lastPaidYm.split("-").map(Number);
  const [y2, m2] = nowYm.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

// Kullanıcının payments içinden en güncel MONTHLY monthKey’i bul
function findLatestMonthlyYmFromPayments(payments = []) {
  const monthly = payments
    .filter((p) => p?.type === "MONTHLY" && p?.monthKey)
    .map((p) => p.monthKey);

  if (monthly.length === 0) return null;

  // "YYYY-MM" stringleri lexicographic olarak da sıralanır
  monthly.sort();
  return monthly[monthly.length - 1];
}

// Bu ay monthly ödeme var mı? (monthKey öncelik, yedek olarak paidAt)
function hasMonthlyPaymentInMonth(payments = [], nowYm) {
  return payments.some((p) => {
    if (p?.type !== "MONTHLY") return false;

    // 1) monthKey varsa direkt kontrol
    if (p?.monthKey) return p.monthKey === nowYm;

    // 2) monthKey yoksa paidAt'tan ay çıkar
    if (p?.paidAt) return getYmKey(new Date(p.paidAt)) === nowYm;

    return false;
  });
}

/**
 * ✅ KURAL:
 * - Bu AY (takvim ayı) MONTHLY ödeme yaptıysa: isActive=true, missedMonthsStreak=0, lastPaidYm=bu ay
 * - Bu ay ödeme yoksa: isActive=false, missedMonthsStreak = min(2, ayFarkı)
 *
 * Not:
 * - İlk ödeme (SIGNUP) aktif saydırmaz (senin kurala göre MONTHLY şart)
 * - İlk kez kayıt olup 1 hafta matrixte kalma kuralını removeExpiredPending halleder
 */
export async function updateUserActiveStatuses(now = new Date()) {
  const nowYm = getYmKey(now);

  const users = await User.find(
    {},
    {
      payments: 1,
      lastPaidYm: 1,
      missedMonthsStreak: 1,
      isActive: 1,
      lastMonthlyPaidAt: 1,
    }
  );

  const bulkOps = [];

  for (const u of users) {
    const payments = u.payments || [];

    // ✅ Bu ay monthly ödeme var mı?
    const hasMonthlyThisMonth = hasMonthlyPaymentInMonth(payments, nowYm);

    // Eğer lastPaidYm boş ama payments içinde monthly varsa, lastPaidYm'yi dolduralım
    let effectiveLastPaidYm =
      u.lastPaidYm || findLatestMonthlyYmFromPayments(payments);

    // Bu ay ödeme yaptıysa -> aktif
    if (hasMonthlyThisMonth) {
      const needActiveFix = u.isActive !== true;
      const needStreakFix = u.missedMonthsStreak !== 0;
      const needLastPaidFix = effectiveLastPaidYm !== nowYm;

      // Bu ayın ödeme zamanını log amaçlı yazalım (en güncel paidAt)
      const latestMonthlyPaidAt = payments
        .filter((p) => p?.type === "MONTHLY" && (p?.monthKey === nowYm || getYmKey(new Date(p.paidAt)) === nowYm))
        .map((p) => new Date(p.paidAt))
        .sort((a, b) => a - b)
        .pop() || now;

      const needPaidAtFix =
        !u.lastMonthlyPaidAt ||
        new Date(u.lastMonthlyPaidAt).getTime() !== latestMonthlyPaidAt.getTime();

      if (needActiveFix || needStreakFix || needLastPaidFix || needPaidAtFix) {
        bulkOps.push({
          updateOne: {
            filter: { _id: u._id },
            update: {
              $set: {
                isActive: true,
                missedMonthsStreak: 0,
                lastPaidYm: nowYm,
                lastMonthlyPaidAt: latestMonthlyPaidAt,
              },
            },
          },
        });
      }
      continue;
    }

    // Bu ay ödeme yoksa -> pasif
    const diff = monthDiff(effectiveLastPaidYm, nowYm);

    // Hiç monthly ödeme yapmamışsa: pasif kalsın, streak 0 kalsın
    if (diff === null) {
      if (u.isActive !== false || u.missedMonthsStreak !== 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: u._id },
            update: { $set: { isActive: false, missedMonthsStreak: 0 } },
          },
        });
      }
      continue;
    }

    // diff >= 1: 1 ay kaçırdıysa 1, 2+ ise 2
    const newStreak = Math.min(2, diff);

    const needActiveFix = u.isActive !== false;
    const needStreakFix = u.missedMonthsStreak !== newStreak;

    if (needActiveFix || needStreakFix) {
      bulkOps.push({
        updateOne: {
          filter: { _id: u._id },
          update: { $set: { isActive: false, missedMonthsStreak: newStreak } },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await User.bulkWrite(bulkOps, { ordered: false });
  }

  return { nowYm, updated: bulkOps.length };
}
