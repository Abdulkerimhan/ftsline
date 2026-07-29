import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import Order from "../models/Order.js";
import EarningTransaction from "../models/EarningTransaction.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import PendingRegistration from "../models/PendingRegistration.js";

dotenv.config();

const CONFIRMATION = "RESET-FTSLINE-LIVE";
const execute = process.argv.includes(`--execute=${CONFIRMATION}`);

async function getScope() {
  const survivor = await User.findOne({
    username: "ftsline",
    role: "superadmin",
  }).select("_id username email role");

  if (!survivor) {
    throw new Error(
      "Guvenlik durdurmasi: username=ftsline ve role=superadmin hesabi bulunamadi."
    );
  }

  const otherSuperadmins = await User.find({
    role: "superadmin",
    _id: { $ne: survivor._id },
  }).select("_id username email");

  if (otherSuperadmins.length > 0) {
    throw new Error(
      `Guvenlik durdurmasi: ftsline disinda ${otherSuperadmins.length} superadmin bulundu.`
    );
  }

  const [users, orders, earnings, withdrawals, pendingRegistrations] =
    await Promise.all([
      User.countDocuments({ _id: { $ne: survivor._id } }),
      Order.countDocuments({}),
      EarningTransaction.countDocuments({}),
      WithdrawalRequest.countDocuments({}),
      PendingRegistration.countDocuments({}),
    ]);

  return {
    survivor,
    counts: { users, orders, earnings, withdrawals, pendingRegistrations },
  };
}

async function resetData({ survivor, session }) {
  const options = { session };

  const results = await Promise.all([
    Order.deleteMany({}, options),
    EarningTransaction.deleteMany({}, options),
    WithdrawalRequest.deleteMany({}, options),
    PendingRegistration.deleteMany({}, options),
    User.deleteMany({ _id: { $ne: survivor._id } }, options),
  ]);

  await User.updateOne(
    { _id: survivor._id },
    {
      $set: {
        sponsor: null,
        matrixParent: null,
        matrixPosition: "",
        matrixDepth: 0,
        teamCount: 0,
        career: { level: "NONE", updatedAt: new Date() },
        careerLevel: "NONE",
        isLicensed: false,
        licenseStartedAt: null,
        licenseExpiresAt: null,
        unilevelInitialBonusPaidAt: null,
        licensePlan: "",
        licensePlanPaidAmountUsdt: 0,
        licenseMatrixPayoutsTotal: 0,
        licenseMatrixPayoutsPaid: 0,
        licenseNextMatrixPayoutAt: null,
        licenseLastMatrixPayoutAt: null,
        walletBalance: 0,
        totalEarning: 0,
        monthlyEarning: 0,
        totalWithdrawn: 0,
      },
    },
    options
  );

  return {
    orders: results[0].deletedCount,
    earnings: results[1].deletedCount,
    withdrawals: results[2].deletedCount,
    pendingRegistrations: results[3].deletedCount,
    users: results[4].deletedCount,
  };
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI tanimli degil.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const scope = await getScope();

  console.log("KORUNACAK HESAP:", {
    id: String(scope.survivor._id),
    username: scope.survivor.username,
    email: scope.survivor.email,
    role: scope.survivor.role,
  });
  console.log("SILINECEK KAYITLAR:", scope.counts);

  if (!execute) {
    console.log("ONIZLEME TAMAMLANDI. Hicbir veri silinmedi.");
    console.log(`Uygulamak icin: node src/scripts/resetLiveData.js --execute=${CONFIRMATION}`);
    return;
  }

  const session = await mongoose.startSession();
  let deleted;
  try {
    await session.withTransaction(async () => {
      deleted = await resetData({ survivor: scope.survivor, session });
    });
  } finally {
    await session.endSession();
  }

  const after = await getScope();
  console.log("SILINEN KAYITLAR:", deleted);
  console.log("ISLEM SONRASI:", after.counts);
  console.log("CANLI VERI TEMIZLIGI TAMAMLANDI.");
}

main()
  .catch((error) => {
    console.error("RESET_ABORTED:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
