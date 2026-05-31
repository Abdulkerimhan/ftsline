import User from "../models/User.js";
import { CAREER_LEVELS, hasCareerAtLeast } from "./careerService.js";

export const POOL_RULES = {
  PLATIN: { rate: 0.02, minimumCareer: CAREER_LEVELS.PLATIN },
  ELMAS: { rate: 0.10, minimumCareer: CAREER_LEVELS.ELMAS },
  CONTRACTED_ELMAS: { rate: 0.025, minimumCareer: CAREER_LEVELS.ELMAS },
};

function money(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function buildPool({ name, companyProfit, rate, members }) {
  const totalAmount = members.length ? money(companyProfit * rate) : 0;
  const perMemberAmount = members.length ? money(totalAmount / members.length) : 0;

  return {
    name,
    rate,
    totalAmount,
    memberCount: members.length,
    perMemberAmount,
    members: members.map((user) => ({
      userId: user._id,
      username: user.username,
      fullName: user.fullName || "",
      email: user.email,
      career: user?.career?.level || CAREER_LEVELS.NONE,
      amount: perMemberAmount,
    })),
  };
}

export async function calculateMonthlyPools({ companyProfit }) {
  const profit = Number(companyProfit || 0);

  if (!Number.isFinite(profit) || profit < 0) {
    throw new Error("Company profit must be a positive number");
  }

  const users = await User.find({ isActive: true, isLicensed: true })
    .select("username fullName email career isContractedDiamond")
    .lean();

  const platinMembers = users.filter((user) =>
    hasCareerAtLeast(user?.career?.level, POOL_RULES.PLATIN.minimumCareer)
  );

  const elmasMembers = users.filter((user) =>
    hasCareerAtLeast(user?.career?.level, POOL_RULES.ELMAS.minimumCareer)
  );

  const contractedElmasMembers = elmasMembers.filter((user) =>
    user.isContractedDiamond === true
  );

  return {
    companyProfit: profit,
    currency: "TL",
    generatedAt: new Date(),
    pools: {
      platin: buildPool({
        name: "PLATIN",
        companyProfit: profit,
        rate: POOL_RULES.PLATIN.rate,
        members: platinMembers,
      }),
      elmas: buildPool({
        name: "ELMAS",
        companyProfit: profit,
        rate: POOL_RULES.ELMAS.rate,
        members: elmasMembers,
      }),
      contractedElmas: buildPool({
        name: "CONTRACTED_ELMAS",
        companyProfit: profit,
        rate: POOL_RULES.CONTRACTED_ELMAS.rate,
        members: contractedElmasMembers,
      }),
    },
  };
}
