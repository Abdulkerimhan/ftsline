// backend/src/services/unilevelService.js
import User from "../models/User.js";
import Commission from "../models/Commission.js";

/**
 * RÜTBE TABLOSU (career.level) -> unilevel rates (level1..10)
 * Sıralanmamış = NONE
 * Bronz = BRONZ
 * Gümüş = GUMUS
 * Altın = ALTIN
 * Platin = PLATIN
 * Elmas = ELMAS
 */
const UNILEVEL_BY_CAREER = {
  NONE:   [0.50],
  BRONZ:  [0.50, 0.10],
  GUMUS:  [0.50, 0.10, 0.05, 0.05],
  ALTIN:  [0.50, 0.10, 0.05, 0.05, 0.03, 0.02],
  PLATIN: [0.50, 0.10, 0.05, 0.05, 0.03, 0.02, 0.02, 0.01],
  ELMAS:  [0.50, 0.10, 0.05, 0.05, 0.03, 0.02, 0.02, 0.01, 0.01, 0.01],
  TAC_ELMAS: [0.50, 0.10, 0.05, 0.05, 0.03, 0.02, 0.02, 0.01, 0.01, 0.01],
};

function getCareerLevel(user) {
  return String(user?.career?.level || "NONE").toUpperCase();
}

function getRateForEarnerAtLevel(earnerUser, level) {
  const careerLevel = getCareerLevel(earnerUser);
  const arr = UNILEVEL_BY_CAREER[careerLevel] || UNILEVEL_BY_CAREER.NONE;
  return arr[level - 1] || 0;
}

/**
 * Kariyer programına uygunluk (env ile kontrol)
 */
function isEligibleForUnilevelEarning(earnerUser) {
  const requireActive = String(process.env.UNILEVEL_REQUIRE_ACTIVE ?? "true") === "true";
  const requireNoMissed2 = String(process.env.UNILEVEL_REQUIRE_NO_MISSED_2MONTHS ?? "true") === "true";

  if (requireActive && !earnerUser.isActive) return false;
  if (requireNoMissed2 && Number(earnerUser.missedMonthsStreak || 0) >= 2) return false;

  return true;
}

/**
 * sponsor zinciri (maxLevels kadar üst sponsor)
 */
export async function getUplineChain(sourceUserId, maxLevels) {
  const chain = [];
  let current = await User.findById(sourceUserId).select("sponsorId").lean();

  for (let i = 0; i < maxLevels; i++) {
    if (!current?.sponsorId) break;
    chain.push(current.sponsorId);
    current = await User.findById(current.sponsorId).select("sponsorId").lean();
    if (!current) break;
  }

  return chain;
}

/**
 * ✅ UNILEVEL (SADECE İLK SIGNUP ÖDEMESİ)
 *
 * Kurallar:
 * - amount parametresi dikkate alınmaz
 * - hesaplama tabanı: UNILEVEL_BASE_AMOUNT (default 74.99)
 * - payout tekrar etmesin diye "UNILEVEL:SIGNUP:<sourceUserId>" kilidi kullanılır
 * - rütbeye göre level açılır ve oran uygulanır
 */
export async function distributeUnilevelSignup({
  sourceUserId,
  orderId,              // txHash veya licenseId (unique)
  currency = "USDT",
  matrixId = "MAIN",
}) {
  if (!sourceUserId) throw new Error("sourceUserId required");
  if (!orderId) throw new Error("orderId required");

  const baseAmount = Number(process.env.UNILEVEL_BASE_AMOUNT || 74.99);
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    throw new Error("UNILEVEL_BASE_AMOUNT invalid");
  }

  const maxLevels = 10; // Elmas 10 level açıyor

  // 🔐 kullanıcı başına 1 kere çalışsın (kilit)
  const lockKey = `UNILEVEL:SIGNUP:${sourceUserId}`;
  const alreadyDone = await Commission.findOne({ payoutKey: lockKey }).lean();
  if (alreadyDone) {
    return { ok: true, alreadyDone: true, paid: [], skipped: [] };
  }

  const upline = await getUplineChain(sourceUserId, maxLevels);
  const now = new Date();

  // upline kullanıcılarını toplu çek
  const earners = await User.find({ _id: { $in: upline } })
    .select("_id isActive missedMonthsStreak career.level")
    .lean();

  const earnerMap = new Map(earners.map((u) => [String(u._id), u]));

  const paid = [];
  const skipped = [];

  for (let i = 0; i < upline.length; i++) {
    const toUserId = upline[i];
    const level = i + 1;

    const earner = earnerMap.get(String(toUserId));
    if (!earner) {
      skipped.push({ level, toUserId, reason: "earner_not_found" });
      continue;
    }

    // ✅ kariyer şartları
    if (!isEligibleForUnilevelEarning(earner)) {
      skipped.push({ level, toUserId, reason: "not_eligible_by_career_rules" });
      continue;
    }

    // ✅ rütbeye göre rate
    const rate = getRateForEarnerAtLevel(earner, level);
    if (!rate || rate <= 0) {
      skipped.push({
        level,
        toUserId,
        reason: "career_not_eligible_for_level",
        careerLevel: getCareerLevel(earner),
      });
      continue;
    }

    // ✅ sabit taban (74.99) üzerinden
    const commissionAmount = round2(baseAmount * rate);
    if (commissionAmount <= 0) continue;

    // 🔐 aynı order için tekrar yazılmasın
    const payoutKey = `UNILEVEL:${orderId}:${toUserId}:${level}`;
    const exists = await Commission.findOne({ payoutKey }).lean();
    if (exists) continue;

    const row = await Commission.create({
      type: "UNILEVEL",
      matrixId,
      fromUserId: sourceUserId,
      toUserId,
      amount: commissionAmount,
      currency,
      network: "TRC20",
      payoutKey,
      paidAt: now,
      monthKey: "ONCE",
      meta: {
        level,
        rate,
        source: "SIGNUP",
        baseAmount,
        careerLevel: getCareerLevel(earner),
      },
    });

    paid.push({
      level,
      toUserId,
      amount: commissionAmount,
      rate,
      careerLevel: getCareerLevel(earner),
      id: row._id,
    });
  }

  // ✅ Kilit kaydı (0 amount) -> bir daha çalışmasın
  await Commission.create({
    type: "UNILEVEL",
    matrixId,
    fromUserId: sourceUserId,
    toUserId: sourceUserId,
    amount: 0,
    currency,
    network: "TRC20",
    payoutKey: lockKey,
    paidAt: now,
    monthKey: "ONCE",
    meta: { source: "SIGNUP_LOCK" },
  });

  return { ok: true, alreadyDone: false, paid, skipped, baseAmount };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
