import User from "../models/User.js";
import EarningTransaction from "../models/EarningTransaction.js";
import { CAREER_LEVELS, CAREER_RULES, careerRank, isActiveMember } from "./careerService.js";

export const CAREER_LICENSE_BONUS_RATE = 0.03;
export const CAREER_LICENSE_BONUS_MAX_DEPTH = 15;
// Ilk aydan sonraki aylik Pro paket ucreti. Bunun sadece %3'u
// Matrix kariyer agacinda dagitilir; Unilevel dagitimi yapilmaz.
export const MONTHLY_PRO_PACKAGE_FEE_TL = 799;
// Eski importlari kirmadan yeni TL kuralina gecis.
export const MONTHLY_LICENSE_USAGE_FEE_USDT = MONTHLY_PRO_PACKAGE_FEE_TL;

const CAREER_BONUS_DEPTH = {
  NONE: 12,
  BRONZ: 13,
  GUMUS: 13,
  ALTIN: 14,
  PLATIN: 14,
  ELMAS: 15,
  TAC_ELMAS: 15,
};

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getBonusDepth(level) {
  const normalizedLevel = level || CAREER_LEVELS.NONE;
  if (careerRank(normalizedLevel) < 0) return CAREER_BONUS_DEPTH.NONE;
  return CAREER_BONUS_DEPTH[normalizedLevel] || CAREER_BONUS_DEPTH.NONE;
}

export async function distributeLicenseCareerBonus({ payerUserId, licenseFee }) {
  const amount = Number(licenseFee || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { totalDistributed: 0, bonusAmount: 0, beneficiaries: [] };
  }

  const payer = await User.findById(payerUserId).select("matrixParent username").lean();
  if (!payer?.matrixParent) {
    return { totalDistributed: 0, bonusAmount: 0, beneficiaries: [] };
  }

  const bonusAmount = roundMoney(amount * CAREER_LICENSE_BONUS_RATE);
  const beneficiaries = [];

  let matrixParentId = payer.matrixParent;
  let depth = 1;

  while (matrixParentId && depth <= CAREER_LICENSE_BONUS_MAX_DEPTH) {
    const matrixParent = await User.findById(matrixParentId).select(
      "username fullName email matrixParent career isActive isLicensed licenseExpiresAt"
    );
    if (!matrixParent) break;

    const level = matrixParent?.career?.level || CAREER_LEVELS.NONE;
    const bonusDepth = getBonusDepth(level);

    if (bonusDepth >= depth && isActiveMember(matrixParent)) {
      await User.findByIdAndUpdate(matrixParent._id, {
        $inc: {
          walletBalance: bonusAmount,
          totalEarning: bonusAmount,
          monthlyEarning: bonusAmount,
        },
      });

      try {
        await EarningTransaction.create({
          beneficiary: matrixParent._id,
          sourceType: "matrix_monthly",
          sourceUser: payer._id,
          sourceUsername: payer.username,
          amount: bonusAmount,
          depth,
          rate: CAREER_LICENSE_BONUS_RATE,
          description: `${payer.username} aylik Pro odemesi - Matrix ${depth}. seviye`,
          metadata: { licenseFee: amount, career: level },
        });
      } catch (ledgerError) {
        console.error("Matrix hak edis kaydi olusturulamadi:", ledgerError);
      }

      beneficiaries.push({
        userId: matrixParent._id,
        username: matrixParent.username,
        fullName: matrixParent.fullName || "",
        email: matrixParent.email,
        career: level,
        depth,
        source: "matrix",
        amount: bonusAmount,
        currency: "TL",
      });
    }

    matrixParentId = matrixParent.matrixParent;
    depth += 1;
  }

  return {
    rate: CAREER_LICENSE_BONUS_RATE,
    maxDepth: CAREER_LICENSE_BONUS_MAX_DEPTH,
    licenseFee: amount,
    bonusAmount,
    currency: "TL",
    totalDistributed: roundMoney(bonusAmount * beneficiaries.length),
    beneficiaries,
  };
}
