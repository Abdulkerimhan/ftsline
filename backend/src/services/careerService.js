// backend/src/services/careerService.js
import User from "../models/User.js";
import { CAREER_RULES } from "./careerRules.js";

/**
 * Kullanıcının direkt (1. seviye) üyelerini getirir.
 */
async function getDirects(userId) {
  return User.find({ sponsorId: userId }).select("_id career.level isActive").lean();
}

/**
 * Bir "kol"un (direct üyenin) altındaki toplam AKTİF üye sayısı (direct dahil).
 * BFS ile geziyoruz (ağaç çok büyürse optimize ederiz).
 */
async function countActiveInLeg(rootUserId) {
  let queue = [rootUserId];
  let activeCount = 0;

  while (queue.length) {
    const batch = queue.splice(0, 200);

    const users = await User.find({ sponsorId: { $in: batch } })
      .select("_id isActive")
      .lean();

    for (const u of users) {
      queue.push(u._id);
      if (u.isActive) activeCount += 1;
    }
  }

  // rootUserId (direct) kendisi aktifse onu da saymak istersen:
  const root = await User.findById(rootUserId).select("isActive").lean();
  if (root?.isActive) activeCount += 1;

  return activeCount;
}

/**
 * Kullanıcının toplam aktif ekibi (tüm alt ağaç) ve kol bazlı aktif sayıları.
 */
async function getTeamStats(userId) {
  const directs = await getDirects(userId);

  const directActiveCount = directs.filter((d) => d.isActive).length;

  const legStats = [];
  for (const d of directs) {
    const legActive = await countActiveInLeg(d._id);
    legStats.push({
      directId: d._id,
      directCareer: d.career?.level || "NONE",
      activeInLeg: legActive,
    });
  }

  const totalActive = legStats.reduce((sum, l) => sum + l.activeInLeg, 0);

  return { directs, directActiveCount, legStats, totalActive };
}

/**
 * "tek koldan en fazla X sayılır" kuralı için cap uygular
 */
function capTotalByLegs(legStats, maxPerLeg) {
  return legStats.reduce((sum, l) => sum + Math.min(l.activeInLeg, maxPerLeg), 0);
}

function countLegsByCareer(legStats, wantedCareer) {
  // "farklı koldan X tane ..." demek: direkt üyelerin kariyerine bakıyoruz.
  return legStats.filter((l) => l.directCareer === wantedCareer).length;
}

export async function calculateCareerLevel(userId) {
  const { directActiveCount, legStats, totalActive } = await getTeamStats(userId);

  // Capped totals (kural olan seviyeler için)
  const totalCapped30 = capTotalByLegs(legStats, 30);
  const totalCapped150 = capTotalByLegs(legStats, 150);
  const totalCapped600 = capTotalByLegs(legStats, 600);
  const totalCapped10000 = capTotalByLegs(legStats, 10000);

  const bronzLegs = countLegsByCareer(legStats, "BRONZ");
  const gumusLegs = countLegsByCareer(legStats, "GUMUS");
  const altinLegs = countLegsByCareer(legStats, "ALTIN");
  const platinLegs = countLegsByCareer(legStats, "PLATIN");

  // En yüksekten aşağı kontrol (en doğru yöntem)
  // TAÇ ELMAS
  if (
    totalCapped10000 >= CAREER_RULES.TAC_ELMAS.minTotalActiveCapped
  ) {
    return "TAC_ELMAS";
  }

  // ELMAS
  if (
    platinLegs >= CAREER_RULES.ELMAS.minPlatinLegs &&
    totalCapped600 >= CAREER_RULES.ELMAS.minTotalActiveCapped
  ) {
    return "ELMAS";
  }

  // PLATİN
  if (directActiveCount >= CAREER_RULES.PLATIN.optionA.minDirectActive && totalActive >= CAREER_RULES.PLATIN.optionA.minTotalActive) {
    return "PLATIN";
  }
  if (altinLegs >= CAREER_RULES.PLATIN.optionB.minAltinLegs && totalActive >= CAREER_RULES.PLATIN.optionB.minTotalActive) {
    return "PLATIN";
  }
  if (totalCapped150 >= CAREER_RULES.PLATIN.optionC.minTotalActiveCapped) {
    return "PLATIN";
  }

  // ALTIN
  if (directActiveCount >= CAREER_RULES.ALTIN.optionA.minDirectActive && totalActive >= CAREER_RULES.ALTIN.optionA.minTotalActive) {
    return "ALTIN";
  }
  if (gumusLegs >= CAREER_RULES.ALTIN.optionB.minGumusLegs && totalActive >= CAREER_RULES.ALTIN.optionB.minTotalActive) {
    return "ALTIN";
  }
  if (directActiveCount >= CAREER_RULES.ALTIN.optionC.minDirectActive && totalCapped30 >= CAREER_RULES.ALTIN.optionC.minTotalActiveCapped) {
    return "ALTIN";
  }

  // GÜMÜŞ
  if (directActiveCount >= CAREER_RULES.GUMUS.optionA.minDirectActive && totalActive >= CAREER_RULES.GUMUS.optionA.minTotalActive) {
    return "GUMUS";
  }
  if (bronzLegs >= CAREER_RULES.GUMUS.optionB.minBronzLegs && totalActive >= CAREER_RULES.GUMUS.optionB.minTotalActive) {
    return "GUMUS";
  }

  // BRONZ
  if (directActiveCount >= CAREER_RULES.BRONZ.minDirectActive) {
    return "BRONZ";
  }

  return "NONE";
}

/**
 * Kullanıcının kariyerini hesaplar ve DB'ye yazar.
 */
export async function updateUserCareer(userId) {
  const newLevel = await calculateCareerLevel(userId);

  const user = await User.findById(userId).select("career").lean();
  const current = user?.career?.level || "NONE";

  if (current === newLevel) return { changed: false, level: newLevel };

  await User.updateOne(
    { _id: userId },
    { $set: { "career.level": newLevel, "career.updatedAt": new Date() } }
  );

  return { changed: true, from: current, to: newLevel };
}
