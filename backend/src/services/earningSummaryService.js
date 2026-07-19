import EarningTransaction from "../models/EarningTransaction.js";
import User from "../models/User.js";

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export async function buildUserEarningSummary(userId, { limit = 100 } = {}) {
  const user = await User.findById(userId).select("walletBalance monthlyEarning totalEarning totalWithdrawn");
  if (!user) {
    const error = new Error("Kullanıcı bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  const allTransactions = await EarningTransaction.find({ beneficiary: userId })
    .sort({ createdAt: -1 })
    .populate("sourceUser", "username fullName email")
    .lean();
  const activeTransactions = allTransactions.filter((item) => item.status !== "cancelled");
  const trackedTotal = roundMoney(activeTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const totalEarning = roundMoney(user.totalEarning);
  const sourceMap = new Map();

  activeTransactions.forEach((item) => {
    const current = sourceMap.get(item.sourceType) || { sourceType: item.sourceType, amount: 0, count: 0 };
    current.amount += Number(item.amount || 0);
    current.count += 1;
    sourceMap.set(item.sourceType, current);
  });

  const now = new Date();
  const chart = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const value = activeTransactions
      .filter((item) => item.createdAt >= start && item.createdAt < end)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    chart.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: start.toLocaleDateString("tr-TR", { month: "short" }),
      value: roundMoney(value),
    });
  }

  return {
    summary: {
      availableBalance: roundMoney(user.walletBalance),
      monthlyEarning: roundMoney(user.monthlyEarning),
      totalEarning,
      totalWithdrawn: roundMoney(user.totalWithdrawn),
      trackedTotal,
      previousUntrackedTotal: roundMoney(Math.max(totalEarning - trackedTotal, 0)),
    },
    sourceSummary: Array.from(sourceMap.values()).map((item) => ({ ...item, amount: roundMoney(item.amount) })),
    movements: allTransactions.slice(0, Math.max(1, Math.min(Number(limit) || 100, 250))),
    chart,
  };
}
