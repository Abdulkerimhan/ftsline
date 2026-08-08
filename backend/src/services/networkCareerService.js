import User from "../models/User.js";
import {
  calculateCareer,
  careerRank,
  isActiveMember,
  CAREER_LEVELS,
} from "./careerService.js";
import { sendCareerCongratulations } from "./careerNotificationService.js";

async function getDirectUsers(userId) {
  return User.find({ sponsor: userId }).select(
    "_id username isActive isLicensed licenseExpiresAt career"
  );
}

async function collectTreeStats(rootUserId) {
  const directUsers = await getDirectUsers(rootUserId);

  let totalMembers = 0;
  let totalActive = 0;

  const legs = [];

  async function walk(user) {
    let totalCount = 1;
    let activeCount = isActiveMember(user) ? 1 : 0;

    const children = await getDirectUsers(user._id);

    for (const child of children) {
      const childStats = await walk(child);
      totalCount += childStats.totalCount;
      activeCount += childStats.activeCount;
    }

    return {
      totalCount,
      activeCount,
    };
  }

  for (const direct of directUsers) {
    const stats = await walk(direct);

    totalMembers += stats.totalCount;
    totalActive += stats.activeCount;

    legs.push({
      userId: direct._id,
      username: direct.username,
      totalCount: stats.totalCount,
      activeCount: stats.activeCount,
      career: direct?.career?.level || CAREER_LEVELS.NONE,
    });
  }

  const personalActive = directUsers.filter((u) => isActiveMember(u)).length;

  return {
    personalActive,
    totalActive,
    totalMembers,
    legs,
  };
}

export async function updateUserCareer(user) {
  const stats = await collectTreeStats(user._id);

  const careerResult = calculateCareer(stats);
  const newLevel = careerResult.level;
  const oldLevel =
    user?.career?.level && user.career.level !== CAREER_LEVELS.NONE
      ? user.career.level
      : user?.careerLevel || user?.career?.level || CAREER_LEVELS.NONE;

  user.teamCount = stats.totalMembers;
  user.career = {
    level: newLevel,
    updatedAt: new Date(),
  };
  // Keep the legacy field in sync while older screens/clients still use it.
  user.careerLevel = newLevel;

  await user.save();

  const promoted = careerRank(newLevel) > careerRank(oldLevel);
  let notification = { sent: false, reason: "not_promoted" };
  if (promoted) {
    try {
      notification = await sendCareerCongratulations(user, newLevel);
    } catch (error) {
      console.error("CAREER_CONGRATULATIONS_ERR:", user.username, error.message);
      notification = { sent: false, reason: "send_failed" };
    }
  }

  return {
    userId: user._id,
    username: user.username,
    oldLevel,
    newLevel,
    changed: oldLevel !== newLevel,
    promoted,
    notification,
    stats: careerResult.stats,
    matchedRules: careerResult.matchedRules,
  };
}

export async function updateAllCareers() {
  // Descendants are normally newer than sponsors. Updating newest first makes
  // their new career visible to parent leg calculations in the same run.
  const users = await User.find().sort({ createdAt: -1 });

  const results = [];

  for (const user of users) {
    const result = await updateUserCareer(user);
    results.push(result);
  }

  return {
    totalUsers: users.length,
    changedUsers: results.filter((r) => r.changed).length,
    results,
  };
}

