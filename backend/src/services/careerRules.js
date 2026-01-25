// backend/src/services/careerRules.js

export const CAREER_ORDER = ["NONE", "BRONZ", "GUMUS", "ALTIN", "PLATIN", "ELMAS", "TAC_ELMAS"];

export const CAREER_RULES = {
  BRONZ: {
    minDirectActive: 2,
  },

  GUMUS: {
    optionA: { minDirectActive: 10, minTotalActive: 20 },
    optionB: { minBronzLegs: 3, minTotalActive: 20 },
  },

  ALTIN: {
    optionA: { minDirectActive: 30, minTotalActive: 100 },
    optionB: { minGumusLegs: 3, minTotalActive: 100 },
    optionC: { minDirectActive: 100, minTotalActiveCapped: 100, maxPerLeg: 30 },
  },

  PLATIN: {
    optionA: { minDirectActive: 100, minTotalActive: 500 },
    optionB: { minAltinLegs: 3, minTotalActive: 500 },
    optionC: { minTotalActiveCapped: 500, maxPerLeg: 150 },
  },

  ELMAS: {
    minTotalActiveCapped: 2400,
    minPlatinLegs: 3,
    maxPerLeg: 600,
  },

  TAC_ELMAS: {
    minTotalActiveCapped: 50000,
    maxPerLeg: 10000,
  },
};
