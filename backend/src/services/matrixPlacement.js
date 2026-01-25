// backend/src/services/matrixPlacement.js
import MatrixNode from "../models/MatrixNode.js";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * ✅ KURAL:
 * - Kullanıcı kayıt olur → Matrix’e PENDING girer
 * - Sponsorun altındaki ilk uygun boş kola (Binary soldan sağa) yerleşir
 * - 7 gün içinde ödeme yapmazsa → PENDING_EXPIRED_7_DAYS ile REMOVED olur (matrixCleanup.js zaten yapıyor)
 *
 * Not:
 * - Sponsor matrixte yoksa ROOT altına atarız
 */
export async function placeUserPendingInMatrix({
  matrixId = "MAIN",
  userId,
  sponsorId,
  now = new Date(),
  pendingDays = 7,
}) {
  if (!userId) throw new Error("userId required");

  // Kullanıcı zaten matrix node’u varsa tekrar koyma
  const existing = await MatrixNode.findOne({ matrixId, userId });
  if (existing) {
    return { ok: true, alreadyExists: true, nodeId: existing._id };
  }

  // Sponsor node’u bul (ACTIVE/PENDING)
  let sponsorNode = null;
  if (sponsorId) {
    sponsorNode = await MatrixNode.findOne({
      matrixId,
      userId: sponsorId,
      status: { $in: ["ACTIVE", "PENDING"] },
    });
  }

  // Sponsor yoksa ROOT oluştur/çek
  if (!sponsorNode) {
    sponsorNode = await MatrixNode.findOne({ matrixId, userId: null, parentId: null });
    if (!sponsorNode) {
      sponsorNode = await MatrixNode.create({
        matrixId,
        userId: null,
        parentId: null,
        side: null,
        status: "ACTIVE",
        joinedAt: now,
        activatedAt: now,
      });
    }
  }

  // BFS ile sponsorNode altındaki ilk boş (L sonra R) yeri bul
  const queue = [sponsorNode];

  while (queue.length) {
    const current = queue.shift();

    // L dolu mu?
    const left = await MatrixNode.findOne({
      matrixId,
      parentId: current._id,
      side: "L",
      status: { $in: ["ACTIVE", "PENDING"] }, // REMOVED slot boş sayılır
    });

    if (!left) {
      const newNode = await MatrixNode.create({
        matrixId,
        userId,
        parentId: current._id,
        side: "L",
        status: "PENDING",
        pendingExpiresAt: addDays(now, pendingDays),
        joinedAt: now,
      });

      return { ok: true, placed: true, nodeId: newNode._id, parentId: current._id, side: "L" };
    }

    // R dolu mu?
    const right = await MatrixNode.findOne({
      matrixId,
      parentId: current._id,
      side: "R",
      status: { $in: ["ACTIVE", "PENDING"] },
    });

    if (!right) {
      const newNode = await MatrixNode.create({
        matrixId,
        userId,
        parentId: current._id,
        side: "R",
        status: "PENDING",
        pendingExpiresAt: addDays(now, pendingDays),
        joinedAt: now,
      });

      return { ok: true, placed: true, nodeId: newNode._id, parentId: current._id, side: "R" };
    }

    // İkisi de doluysa BFS devam
    queue.push(left, right);
  }

  throw new Error("Matrix placement failed");
}
