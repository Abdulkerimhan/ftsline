import User from "../models/User.js";
import EarningTransaction from "../models/EarningTransaction.js";
import { CAREER_LEVELS, careerRank, isActiveMember } from "./careerService.js";

// Ilk lisans odemesinin Unilevel dagitim matrahi.
// Sonraki aylik Pro odemeleri bu servise kesinlikle gonderilmez.
export const INITIAL_LICENSE_BONUS_BASE_TL = 3599;
// Eski importlari kirmadan yeni TL kuralina gecis.
export const INITIAL_LICENSE_BONUS_BASE_USDT = INITIAL_LICENSE_BONUS_BASE_TL;

export const UNILEVEL_INITIAL_LICENSE_RATES = [
  0.5,
  0.1,
  0.05,
  0.03,
  0.02,
  0.02,
  0.02,
  0.01,
  0.01,
  0.01,
];

const CAREER_UNILEVEL_DEPTH = {
  NONE: 0,
  BRONZ: 1,
  GUMUS: 3,
  ALTIN: 5,
  PLATIN: 7,
  ELMAS: 10,
  TAC_ELMAS: 10,
};

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getUnlockedDepth(level) {
  if (!level || careerRank(level) < careerRank(CAREER_LEVELS.BRONZ)) return 0;
  return CAREER_UNILEVEL_DEPTH[level] || 0;
}

export async function distributeInitialUnilevelBonus({ payerUserId }) {
  const payer = await User.findById(payerUserId).select(
    "sponsor username unilevelInitialBonusPaidAt"
  );

  if (!payer?.sponsor) {
    return { skipped: true, reason: "NO_SPONSOR", totalDistributed: 0, beneficiaries: [] };
  }

  if (payer.unilevelInitialBonusPaidAt) {
    return { skipped: true, reason: "ALREADY_PAID", totalDistributed: 0, beneficiaries: [] };
  }

  const beneficiaries = [];
  let sponsorId = payer.sponsor;
  let depth = 1;

  while (sponsorId && depth <= UNILEVEL_INITIAL_LICENSE_RATES.length) {
    const sponsor = await User.findById(sponsorId).select(
      "username fullName email sponsor career isActive isLicensed licenseExpiresAt"
    );
    if (!sponsor) break;

    const level = sponsor?.career?.level || CAREER_LEVELS.NONE;
    const unlockedDepth = getUnlockedDepth(level);
    const rate = UNILEVEL_INITIAL_LICENSE_RATES[depth - 1] || 0;

    if (unlockedDepth >= depth && isActiveMember(sponsor) && rate > 0) {
      const amount = roundMoney(INITIAL_LICENSE_BONUS_BASE_TL * rate);

      await User.findByIdAndUpdate(sponsor._id, {
        $inc: {
          walletBalance: amount,
          totalEarning: amount,
          monthlyEarning: amount,
        },
      });

      try {
        await EarningTransaction.create({
          beneficiary: sponsor._id,
          sourceType: "unilevel_initial",
          sourceUser: payer._id,
          sourceUsername: payer.username,
          amount,
          depth,
          rate,
          description: `${payer.username} ilk lisans odemesi - Unilevel ${depth}. seviye`,
          metadata: { baseAmount: INITIAL_LICENSE_BONUS_BASE_TL, career: level },
        });
      } catch (ledgerError) {
        console.error("Unilevel hak edis kaydi olusturulamadi:", ledgerError);
      }

      beneficiaries.push({
        userId: sponsor._id,
        username: sponsor.username,
        fullName: sponsor.fullName || "",
        email: sponsor.email,
        career: level,
        depth,
        source: "unilevel",
        rate,
        amount,
        currency: "TL",
      });
    }

    sponsorId = sponsor.sponsor;
    depth += 1;
  }

  payer.unilevelInitialBonusPaidAt = new Date();
  await payer.save();

  return {
    skipped: false,
    source: "unilevel",
    baseAmount: INITIAL_LICENSE_BONUS_BASE_TL,
    currency: "TL",
    rates: UNILEVEL_INITIAL_LICENSE_RATES,
    totalDistributed: roundMoney(
      beneficiaries.reduce((sum, beneficiary) => sum + beneficiary.amount, 0)
    ),
    beneficiaries,
  };
}
