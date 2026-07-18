export const CAREER_LEVELS = {
  NONE: "NONE",
  BRONZ: "BRONZ",
  GUMUS: "GUMUS",
  ALTIN: "ALTIN",
  PLATIN: "PLATIN",
  ELMAS: "ELMAS",
  TAC_ELMAS: "TAC_ELMAS",
};

export const CAREER_ORDER = [
  CAREER_LEVELS.NONE,
  CAREER_LEVELS.BRONZ,
  CAREER_LEVELS.GUMUS,
  CAREER_LEVELS.ALTIN,
  CAREER_LEVELS.PLATIN,
  CAREER_LEVELS.ELMAS,
  CAREER_LEVELS.TAC_ELMAS,
];

export const CAREER_RULES = {
  BRONZ: {
    personalActive: 2,
    bonusDepth: 15,
    monthlyIncomeCap: 245000,
  },
  GUMUS: {
    optionA: { personalActive: 10, totalActive: 20 },
    optionB: { bronzLegs: 3, totalActive: 20 },
  },
  ALTIN: {
    optionA: { personalActive: 30, totalActive: 100 },
    optionB: { gumusLegs: 3, totalActive: 100 },
    optionC: { cappedActiveTotal: 100, maxActivePerLeg: 30 },
  },
  PLATIN: {
    optionA: { personalActive: 100, totalActive: 500 },
    optionB: { altinLegs: 3, totalActive: 500 },
    optionC: { cappedActiveTotal: 500, maxActivePerLeg: 150 },
  },
  ELMAS: {
    cappedTotalMembers: 2400,
    platinLegs: 3,
    maxMembersPerLeg: 600,
  },
  TAC_ELMAS: {
    cappedTotalMembers: 50000,
    maxMembersPerLeg: 10000,
    requiredLegs: 5,
  },
};

const labels = {
  NONE: "Baslangic",
  BRONZ: "Bronz",
  GUMUS: "Gumus",
  ALTIN: "Altin",
  PLATIN: "Platin",
  ELMAS: "Elmas",
  TAC_ELMAS: "Tac Elmas",
};

export function getCareerLabel(level) {
  return labels[level] || labels.NONE;
}

export function careerRank(level) {
  return CAREER_ORDER.indexOf(level || CAREER_LEVELS.NONE);
}

export function hasCareerAtLeast(level, minimumLevel) {
  return careerRank(level) >= careerRank(minimumLevel);
}

export function isActiveMember(user, now = new Date()) {
  if (user?.isActive !== true || user?.isLicensed !== true) return false;
  if (!user?.licenseExpiresAt) return true;
  return new Date(user.licenseExpiresAt).getTime() >= now.getTime();
}

function countLegsAtLeast(legs, level) {
  return legs.filter((leg) => hasCareerAtLeast(leg.career, level)).length;
}

function cappedSum(legs, field, maxPerLeg) {
  return legs.reduce((sum, leg) => {
    return sum + Math.min(Number(leg?.[field] || 0), maxPerLeg);
  }, 0);
}

export function calculateCareerStats({ personalActive = 0, totalActive = 0, totalMembers = 0, legs = [] }) {
  const cappedActive30 = cappedSum(legs, "activeCount", 30);
  const cappedActive150 = cappedSum(legs, "activeCount", 150);
  const cappedMembers600 = cappedSum(legs, "totalCount", 600);
  const cappedMembers10000 = cappedSum(legs, "totalCount", 10000);

  const bronzLegs = countLegsAtLeast(legs, CAREER_LEVELS.BRONZ);
  const gumusLegs = countLegsAtLeast(legs, CAREER_LEVELS.GUMUS);
  const altinLegs = countLegsAtLeast(legs, CAREER_LEVELS.ALTIN);
  const platinLegs = countLegsAtLeast(legs, CAREER_LEVELS.PLATIN);
  const tacElmasLegs = legs.filter(
    (leg) => Number(leg?.totalCount || 0) >= CAREER_RULES.TAC_ELMAS.maxMembersPerLeg
  ).length;

  return {
    personalActive,
    totalActive,
    totalMembers,
    cappedActive30,
    cappedActive150,
    cappedMembers600,
    cappedMembers10000,
    bronzLegs,
    gumusLegs,
    altinLegs,
    platinLegs,
    tacElmasLegs,
    legs,
  };
}

export function calculateCareer(input) {
  const stats = calculateCareerStats(input);
  let level = CAREER_LEVELS.NONE;
  const matchedRules = [];

  if (stats.personalActive >= CAREER_RULES.BRONZ.personalActive) {
    level = CAREER_LEVELS.BRONZ;
    matchedRules.push("BRONZ: 2 direct active members");
  } else {
    return { level, matchedRules, stats };
  }

  const gumusA =
    stats.personalActive >= CAREER_RULES.GUMUS.optionA.personalActive &&
    stats.totalActive >= CAREER_RULES.GUMUS.optionA.totalActive;
  const gumusB =
    stats.bronzLegs >= CAREER_RULES.GUMUS.optionB.bronzLegs &&
    stats.totalActive >= CAREER_RULES.GUMUS.optionB.totalActive;

  if (gumusA || gumusB) {
    level = CAREER_LEVELS.GUMUS;
    matchedRules.push(gumusA ? "GUMUS A" : "GUMUS B");
  }

  const altinA =
    stats.personalActive >= CAREER_RULES.ALTIN.optionA.personalActive &&
    stats.totalActive >= CAREER_RULES.ALTIN.optionA.totalActive;
  const altinB =
    stats.gumusLegs >= CAREER_RULES.ALTIN.optionB.gumusLegs &&
    stats.totalActive >= CAREER_RULES.ALTIN.optionB.totalActive;
  const altinC = stats.cappedActive30 >= CAREER_RULES.ALTIN.optionC.cappedActiveTotal;

  if (altinA || altinB || altinC) {
    level = CAREER_LEVELS.ALTIN;
    matchedRules.push(altinA ? "ALTIN A" : altinB ? "ALTIN B" : "ALTIN C");
  }

  const platinA =
    stats.personalActive >= CAREER_RULES.PLATIN.optionA.personalActive &&
    stats.totalActive >= CAREER_RULES.PLATIN.optionA.totalActive;
  const platinB =
    stats.altinLegs >= CAREER_RULES.PLATIN.optionB.altinLegs &&
    stats.totalActive >= CAREER_RULES.PLATIN.optionB.totalActive;
  const platinC = stats.cappedActive150 >= CAREER_RULES.PLATIN.optionC.cappedActiveTotal;

  if (platinA || platinB || platinC) {
    level = CAREER_LEVELS.PLATIN;
    matchedRules.push(platinA ? "PLATIN A" : platinB ? "PLATIN B" : "PLATIN C");
  }

  const elmas =
    stats.cappedMembers600 >= CAREER_RULES.ELMAS.cappedTotalMembers &&
    stats.platinLegs >= CAREER_RULES.ELMAS.platinLegs;

  if (elmas) {
    level = CAREER_LEVELS.ELMAS;
    matchedRules.push("ELMAS: 2400 capped members + 3 Platin legs");
  } else {
    return { level, matchedRules, stats };
  }

  if (
    stats.cappedMembers10000 >= CAREER_RULES.TAC_ELMAS.cappedTotalMembers &&
    stats.tacElmasLegs >= CAREER_RULES.TAC_ELMAS.requiredLegs
  ) {
    level = CAREER_LEVELS.TAC_ELMAS;
    matchedRules.push("TAC_ELMAS: 5 separate legs with at least 10000 members each");
  }

  return { level, matchedRules, stats };
}

