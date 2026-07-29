import Order from "../models/Order.js";
import User from "../models/User.js";
import EarningTransaction from "../models/EarningTransaction.js";
import { CAREER_LEVELS, isActiveMember } from "./careerService.js";
import {
  PRODUCT_NETWORK_DEPTH_BY_CAREER,
  calculateProductNetworkAmounts,
  roundProductNetworkMoney,
} from "./productNetworkRules.js";

export async function distributeProductNetworkBonus(orderId) {
  const order = await Order.findById(orderId).lean();

  if (
    !order ||
    order.orderType !== "product" ||
    order.paymentStatus !== "paid" ||
    order.status === "cancelled" ||
    !order.user
  ) {
    return { skipped: true, totalDistributed: 0, beneficiaries: [] };
  }

  const buyer = await User.findById(order.user).select("username sponsor").lean();
  if (!buyer?.sponsor) {
    return { skipped: true, reason: "NO_SPONSOR", totalDistributed: 0, beneficiaries: [] };
  }

  const bonusBase = roundProductNetworkMoney(
    (order.items || []).reduce(
      (sum, item) =>
        sum + Number(item.networkBonusBase || 0) * Number(item.quantity || 1),
      0
    )
  );
  if (bonusBase <= 0 || !["normal_gap", "licensed_sale"].includes(order.productNetworkMode)) {
    return { skipped: true, reason: "NO_PRODUCT_NETWORK_BASE", totalDistributed: 0, beneficiaries: [] };
  }

  const amounts = calculateProductNetworkAmounts(bonusBase, order.productNetworkMode);
  const beneficiaries = [];
  let sponsorId = buyer.sponsor;

  for (const payout of amounts) {
    if (!sponsorId) break;

    const sponsor = await User.findById(sponsorId).select(
      "username fullName email sponsor career isActive isLicensed licenseExpiresAt"
    );
    if (!sponsor) break;

    const career = sponsor.career?.level || CAREER_LEVELS.NONE;
    const unlockedDepth = PRODUCT_NETWORK_DEPTH_BY_CAREER[career] || 1;

    if (unlockedDepth >= payout.depth && isActiveMember(sponsor) && payout.amount > 0) {
      const ledgerResult = await EarningTransaction.updateOne(
        {
          beneficiary: sponsor._id,
          sourceType: "product_network",
          sourceOrder: order._id,
          depth: payout.depth,
        },
        {
          $setOnInsert: {
            sourceUser: buyer._id,
            sourceUsername: buyer.username,
            amount: payout.amount,
            currency: "TL",
            rate: payout.rate,
            description:
              order.productNetworkMode === "licensed_sale"
                ? `${buyer.username} indirimli urun siparisi - Network ${payout.depth}. seviye`
                : `${buyer.username} normal fiyatli urun siparisi - Network ${payout.depth}. seviye`,
            status: "earned",
            metadata: {
              trackingCode: order.trackingCode,
              bonusBase,
              mode: order.productNetworkMode,
            },
          },
        },
        { upsert: true }
      );

      if (ledgerResult.upsertedCount === 1) {
        await User.findByIdAndUpdate(sponsor._id, {
          $inc: {
            walletBalance: payout.amount,
            totalEarning: payout.amount,
            monthlyEarning: payout.amount,
          },
        });
        beneficiaries.push({
          userId: sponsor._id,
          username: sponsor.username,
          career,
          depth: payout.depth,
          rate: payout.rate,
          amount: payout.amount,
          currency: "TL",
        });
      }
    }

    sponsorId = sponsor.sponsor;
  }

  await Order.findByIdAndUpdate(order._id, { productNetworkDistributedAt: new Date() });

  return {
    skipped: false,
    bonusBase,
    mode: order.productNetworkMode,
    totalDistributed: roundProductNetworkMoney(
      beneficiaries.reduce((sum, item) => sum + item.amount, 0)
    ),
    beneficiaries,
  };
}

export async function cancelProductNetworkBonus(orderId) {
  const transactions = await EarningTransaction.find({
    sourceType: "product_network",
    sourceOrder: orderId,
    status: { $ne: "cancelled" },
  });

  for (const transaction of transactions) {
    const cancelled = await EarningTransaction.findOneAndUpdate(
      { _id: transaction._id, status: { $ne: "cancelled" } },
      { $set: { status: "cancelled" } },
      { new: true }
    );
    if (!cancelled) continue;

    await User.findByIdAndUpdate(transaction.beneficiary, {
      $inc: {
        walletBalance: -transaction.amount,
        totalEarning: -transaction.amount,
        monthlyEarning: -transaction.amount,
      },
    });
  }

  await Order.findByIdAndUpdate(orderId, { productNetworkCancelledAt: new Date() });
  return { cancelled: transactions.length };
}
