// backend/src/services/matrixPayoutService.js
import User from "../models/User.js";
import MatrixNode from "../models/MatrixNode.js";
import Wallet from "../models/Wallet.js";
import Commission from "../models/Commission.js";

// YYYY-MM üretir
function getYm(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Kariyere göre Matrix derinliği
function getMatrixDepthByCareer(careerLevel) {
  switch (careerLevel) {
    case "BRONZ":
    case "GUMUS":
      return 13;
    case "ALTIN":
    case "PLATIN":
      return 14;
    case "ELMAS":
    case "TAC_ELMAS":
      return 15;
    case "NONE":
    default:
      return 12;
  }
}

/**
 * ✅ MATRIX AYLIK %3 DAĞITIMI
 *
 * Kurallar:
 * - payer monthly ödemeyi yaptı (14.99)
 * - payer’ın kariyerine göre depth açılır (12-15)
 * - Matrix uplines zincirinde HER AKTİF üst sponsor → amount * 0.03 alır
 * - Aktiflik: user.isActive === true olmalı (bu ay ödeme yaptı demek)
 * - payoutKey ile aynı ay aynı ödeme 2 kere dağıtılmaz
 */
export async function distributeMatrixMonthlyBonus({
  payerUserId,
  amount, // 14.99
  matrixId = "MAIN",
  paidAt = new Date(),
}) {
  const monthKey = getYm(paidAt);

  // 1) Ödeme yapan kullanıcı + kariyer
  const payer = await User.findById(payerUserId).select("career");
  if (!payer) throw new Error("Payer user not found");

  const depth = getMatrixDepthByCareer(payer?.career?.level || "NONE");
  const bonusPerUpline = Number((amount * 0.03).toFixed(6)); // USDT hassasiyet

  // 2) payer’ın matrix node’unu bul
  const payerNode = await MatrixNode.findOne({ matrixId, userId: payerUserId, status: "ACTIVE" }).select(
    "_id parentNodeId"
  );
  if (!payerNode) {
    // payer matrixte değilse dağıtım yapma
    return { ok: true, reason: "payer_not_in_matrix", distributed: 0, depth };
  }

  // 3) parent zincirini yukarı doğru gez
  let currentParentNodeId = payerNode.parentNodeId;
  let level = 1;
  let distributed = 0;

  while (currentParentNodeId && level <= depth) {
    const parentNode = await MatrixNode.findById(currentParentNodeId).select("userId parentNodeId status");
    if (!parentNode || parentNode.status !== "ACTIVE") break;

    const uplineUserId = parentNode.userId;

    // 4) upline aktif mi? (bu ay ödeme yapmış mı?)
    const upline = await User.findById(uplineUserId).select("isActive");
    if (upline?.isActive === true) {
      // payoutKey: aynı ay aynı payer + aynı level + aynı upline için 1 kere
      const payoutKey = `MATRIX_MONTHLY:${matrixId}:${monthKey}:${payerUserId}:${uplineUserId}:${level}`;

      // Daha önce yazıldıysa tekrar yazma (unique index de korur)
      const exists = await Commission.findOne({ payoutKey }).select("_id");
      if (!exists) {
        await Commission.create({
          type: "MATRIX_MONTHLY",
          matrixId,
          fromUserId: payerUserId,
          toUserId: uplineUserId,
          amount: bonusPerUpline,
          paidAt,
          monthKey,
          payoutKey,
        });

        // Wallet yoksa oluştur, sonra ekle
        await Wallet.updateOne(
          { userId: uplineUserId },
          { $setOnInsert: { userId: uplineUserId }, $inc: { balance: bonusPerUpline } },
          { upsert: true }
        );

        distributed++;
      }
    }

    // 5) bir üste çık
    currentParentNodeId = parentNode.parentNodeId;
    level++;
  }

  return { ok: true, distributed, depth, bonusPerUpline, monthKey };
}
