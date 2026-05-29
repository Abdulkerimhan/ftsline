export const CAREER_LEVELS = {
  NONE: "NONE",
  BRONZ: "BRONZ",
  GUMUS: "GUMUS",
  ALTIN: "ALTIN",
  PLATIN: "PLATIN",
  ELMAS: "ELMAS",
  TAC_ELMAS: "TAC_ELMAS",
};

export function getCareerLabel(level) {
  const labels = {
    NONE: "Başlangıç",
    BRONZ: "Bronz",
    GUMUS: "Gümüş",
    ALTIN: "Altın",
    PLATIN: "Platin",
    ELMAS: "Elmas",
    TAC_ELMAS: "Taç Elmas",
  };

  return labels[level] || "Başlangıç";
}

/* ================= TEMEL ================= */

export function isActiveMember(user) {
  return user?.isActive === true && user?.isLicensed === true;
}

/* ================= ANA HESAPLAMA ================= */

export function calculateCareer({
  personalActive = 0,
  totalActive = 0,
  totalMembers = 0,
  legs = [], // her kol için: { activeCount, career }
}) {
  /* ========= BRONZ ========= */
  if (personalActive >= 2) {
    var level = CAREER_LEVELS.BRONZ;
  } else {
    return CAREER_LEVELS.NONE;
  }

  /* ========= GÜMÜŞ ========= */
  const gumusA = personalActive >= 10 && totalActive >= 20;

  const gumusB =
    legs.filter((l) => l.career === CAREER_LEVELS.BRONZ).length >= 3 &&
    totalActive >= 20;

  if (gumusA || gumusB) {
    level = CAREER_LEVELS.GUMUS;
  } else {
    return level;
  }

  /* ========= ALTIN ========= */
  const altinA = personalActive >= 30 && totalActive >= 100;

  const altinB =
    legs.filter((l) => l.career === CAREER_LEVELS.GUMUS).length >= 3 &&
    totalActive >= 100;

  const altinC = personalActive >= 100;

  if (altinA || altinB || altinC) {
    level = CAREER_LEVELS.ALTIN;
  } else {
    return level;
  }

  /* ========= PLATİN ========= */
  const platinA = personalActive >= 100 && totalActive >= 500;

  const platinB =
    legs.filter((l) => l.career === CAREER_LEVELS.ALTIN).length >= 3 &&
    totalActive >= 500;

  if (platinA || platinB) {
    level = CAREER_LEVELS.PLATIN;
  } else {
    return level;
  }

  /* ========= ELMAS ========= */
  const elmas =
    totalMembers >= 2400 &&
    legs.filter((l) => l.career === CAREER_LEVELS.PLATIN).length >= 3;

  if (elmas) {
    level = CAREER_LEVELS.ELMAS;
  } else {
    return level;
  }

  /* ========= TAÇ ELMAS ========= */
  if (totalMembers >= 50000) {
    level = CAREER_LEVELS.TAC_ELMAS;
  }

  return level;
}