import User from "../models/User.js";
import { CAREER_LEVELS, CAREER_RULES, careerRank } from "./careerService.js";

export const CAREER_LICENSE_BONUS_RATE = 0.03;

const CAREER_BONUS_DEPTH = {
  BRONZ: CAREER_RULES.BRONZ.bonusDepth,
  GUMUS: CAREER_RULES.BRONZ.bonusDepth,
  ALTIN: CAREER_RULES.BRONZ.bonusDepth,
  PLATIN: CAREER_RULES.BRONZ.bonusDepth,
  ELMAS: CAREER_RULES.BRONZ.bonusDepth,
  TAC_ELMAS: CAREER_RULES.BRONZ.bonusDepth,
};

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getBonusDepth(level) {
  if (!level || careerRank(level) < careerRank(CAREER_LEVELS.BRONZ)) return 0;
  return CAREER_BONUS_DEPTH[level] || CAREER_RULES.BRONZ.bonusDepth;
}

export async function distributeLicenseCareerBonus({ payerUserId, licenseFee }) {
  const amount = Number(licenseFee || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { totalDistributed: 0, bonusAmount: 0, beneficiaries: [] };
  }

  const payer = await User.findById(payerUserId).select("sponsor username").lean();
  if (!payer?.sponsor) {
    return { totalDistributed: 0, bonusAmount: 0, beneficiaries: [] };
  }

  const bonusAmount = roundMoney(amount * CAREER_LICENSE_BONUS_RATE);
  const beneficiaries = [];

  let sponsorId = payer.sponsor;
  let depth = 1;

  while (sponsorId && depth <= CAREER_RULES.BRONZ.bonusDepth) {
    const sponsor = await User.findById(sponsorId).select("username fullName email sponsor career");
    if (!sponsor) break;

    const level = sponsor?.career?.level || CAREER_LEVELS.NONE;
    const bonusDepth = getBonusDepth(level);

    if (bonusDepth >= depth) {
      await User.findByIdAndUpdate(sponsor._id, {
        $inc: {
          walletBalance: bonusAmount,
          totalEarning: bonusAmount,
          monthlyEarning: bonusAmount,
        },
      });

      beneficiaries.push({
        userId: sponsor._id,
        username: sponsor.username,
        fullName: sponsor.fullName || "",
        email: sponsor.email,
        career: level,
        depth,
        amount: bonusAmount,
      });
    }

    sponsorId = sponsor.sponsor;
    depth += 1;
  }

  return {
    rate: CAREER_LICENSE_BONUS_RATE,
    licenseFee: amount,
    bonusAmount,
    totalDistributed: roundMoney(bonusAmount * beneficiaries.length),
    beneficiaries,
  };
}
