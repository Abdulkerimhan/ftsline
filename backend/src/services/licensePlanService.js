import User from "../models/User.js";
import { distributeLicenseCareerBonus, MONTHLY_LICENSE_USAGE_FEE_USDT } from "./careerBonusService.js";
import { distributeInitialUnilevelBonus } from "./unilevelBonusService.js";
import { findNextMatrixSlot, getMatrixPlacementFields } from "./matrixService.js";

export const LICENSE_PLANS = {
  initial: {
    key: "initial",
    label: "Lisans Bedeli",
    priceUsdt: 74.99,
    durationMonths: 1,
    matrixPayoutMonths: 1,
  },
  annual: {
    key: "annual",
    label: "1 Yillik Lisans",
    priceUsdt: 210,
    durationMonths: 12,
    matrixPayoutMonths: 12,
  },
  biennial: {
    key: "biennial",
    label: "2 Yillik Lisans",
    priceUsdt: 360,
    durationMonths: 24,
    matrixPayoutMonths: 24,
  },
};

export function getLicensePlan(planKey) {
  return LICENSE_PLANS[String(planKey || "").trim().toLowerCase()] || null;
}

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + Number(months || 0));

  if (next.getDate() < day) {
    next.setDate(0);
  }

  return next;
}

export async function processDueLicenseMatrixPayoutsForUser({ userId, now = new Date(), maxRuns = 1 }) {
  const user = await User.findById(userId);

  if (!user || !user.isLicensed || !user.licenseNextMatrixPayoutAt) {
    return { processed: 0, results: [] };
  }

  const results = [];
  let processed = 0;

  while (
    processed < maxRuns &&
    Number(user.licenseMatrixPayoutsPaid || 0) < Number(user.licenseMatrixPayoutsTotal || 0) &&
    new Date(user.licenseNextMatrixPayoutAt).getTime() <= now.getTime()
  ) {
    const result = await distributeLicenseCareerBonus({
      payerUserId: user._id,
      licenseFee: MONTHLY_LICENSE_USAGE_FEE_USDT,
    });

    user.licenseMatrixPayoutsPaid = Number(user.licenseMatrixPayoutsPaid || 0) + 1;
    user.licenseLastMatrixPayoutAt = new Date(user.licenseNextMatrixPayoutAt);
    user.licenseNextMatrixPayoutAt =
      user.licenseMatrixPayoutsPaid < user.licenseMatrixPayoutsTotal
        ? addMonths(user.licenseNextMatrixPayoutAt, 1)
        : null;

    results.push(result);
    processed += 1;
  }

  await user.save();

  return {
    processed,
    nextMatrixPayoutAt: user.licenseNextMatrixPayoutAt,
    paid: user.licenseMatrixPayoutsPaid,
    total: user.licenseMatrixPayoutsTotal,
    results,
  };
}

export async function processDueLicenseMatrixPayouts({ now = new Date(), maxUsers = 100 } = {}) {
  const users = await User.find({
    isLicensed: true,
    licenseNextMatrixPayoutAt: { $ne: null, $lte: now },
    $expr: { $lt: ["$licenseMatrixPayoutsPaid", "$licenseMatrixPayoutsTotal"] },
  })
    .select("_id username licenseNextMatrixPayoutAt")
    .sort({ licenseNextMatrixPayoutAt: 1 })
    .limit(maxUsers)
    .lean();

  const results = [];

  for (const user of users) {
    const result = await processDueLicenseMatrixPayoutsForUser({
      userId: user._id,
      now,
      maxRuns: 1,
    });

    results.push({
      userId: user._id,
      username: user.username,
      ...result,
    });
  }

  return {
    checkedAt: now,
    processedUsers: results.length,
    results,
  };
}

export async function activateLicensePlanForUser({ userId, planKey, paidAt = new Date() }) {
  const plan = getLicensePlan(planKey);

  if (!plan) {
    throw new Error("Gecersiz lisans plani");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Kullanici bulunamadi");
  }

  const now = new Date(paidAt);
  const currentExpiry = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : null;
  const extensionBase =
    currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;

  user.isLicensed = true;
  user.licenseStartedAt = user.licenseStartedAt || now;
  user.licenseExpiresAt = addMonths(extensionBase, plan.durationMonths);
  user.licensePlan = plan.key;
  user.licensePlanPaidAmountUsdt = Number(user.licensePlanPaidAmountUsdt || 0) + plan.priceUsdt;
  user.licenseMatrixPayoutsTotal =
    Number(user.licenseMatrixPayoutsTotal || 0) + plan.matrixPayoutMonths;

  if (!user.licenseNextMatrixPayoutAt) {
    user.licenseNextMatrixPayoutAt = now;
  }

  if (user.role !== "superadmin" && !user.matrixParent && user.sponsor) {
    const matrixSlot = await findNextMatrixSlot(user.sponsor);
    Object.assign(user, getMatrixPlacementFields(matrixSlot));
  }

  await user.save();

  const unilevelBonusResult = await distributeInitialUnilevelBonus({ payerUserId: user._id });
  const matrixPayoutResult = await processDueLicenseMatrixPayoutsForUser({
    userId: user._id,
    now,
    maxRuns: 1,
  });

  const updatedUser = await User.findById(user._id).select("-passwordHash").lean();

  return {
    plan,
    user: updatedUser,
    unilevelBonusResult,
    matrixPayoutResult,
  };
}
