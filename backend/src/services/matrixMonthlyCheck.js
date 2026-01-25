// backend/src/services/matrixMonthlyCheck.js
import User from "../models/User.js";
import MatrixNode from "../models/MatrixNode.js";

/**
 * ✅ KURAL:
 * - Kullanıcı bu ay ödeme yapmadıysa pasif (bunu updateUserActiveStatuses yapıyor)
 * - missedMonthsStreak >= 2 ise → Matrix’ten sil
 * - Tekrar ödeme yapınca eski yerine dönmez, en alttan müsait yere sıfırdan yerleştirilir
 */

// Bir parent node'un kaç çocuğu var (L/R)
async function getChildrenMap(matrixId) {
  const children = await MatrixNode.aggregate([
    { $match: { matrixId, status: { $in: ["PENDING", "ACTIVE"] } } },
    { $group: { _id: "$parentNodeId", count: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const c of children) map.set(String(c._id), c.count);
  return map;
}

async function getSideOccupied(parentNodeId) {
  const kids = await MatrixNode.find(
    { parentNodeId, status: { $in: ["PENDING", "ACTIVE"] } },
    { side: 1 }
  ).lean();

  const used = new Set(kids.map((k) => k.side));
  return used; // Set(["L"]) gibi
}

async function getNextIndex(matrixId) {
  const last = await MatrixNode.findOne({ matrixId }).sort({ index: -1 }).select("index").lean();
  return (last?.index ?? 0) + 1;
}

/**
 * ✅ En alttan yerleştirme (binary, soldan sağa)
 * - Tree boşsa root olur
 * - Tree doluysa: BFS sırasına göre ilk boş çocuk olan node bulunur
 */
export async function placeUserAtBottom({ matrixId = "MAIN", userId, now = new Date(), makeActive = true }) {
  // Kullanıcı zaten ACTIVE/PENDING node’a sahipse tekrar ekleme yok
  const existing = await MatrixNode.findOne({
    matrixId,
    userId,
    status: { $in: ["PENDING", "ACTIVE"] },
  }).lean();
  if (existing) return { ok: true, message: "already_in_matrix", nodeId: existing._id };

  // Root var mı?
  const root = await MatrixNode.findOne({ matrixId, parentNodeId: null, status: { $in: ["PENDING", "ACTIVE"] } })
    .sort({ index: 1 })
    .lean();

  const nextIdx = await getNextIndex(matrixId);

  // Root yoksa direkt root olarak koy
  if (!root) {
    const node = await MatrixNode.create({
      matrixId,
      userId,
      parentNodeId: null,
      side: null,
      depth: 0,
      index: nextIdx,
      status: makeActive ? "ACTIVE" : "PENDING",
      joinedAt: now,
      pendingExpiresAt: makeActive ? null : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    });
    return { ok: true, message: "placed_as_root", nodeId: node._id };
  }

  // BFS için ACTIVE/PENDING node’ları sırayla gez, ilk boş çocuğu bul
  const nodes = await MatrixNode.find(
    { matrixId, status: { $in: ["PENDING", "ACTIVE"] } },
    { _id: 1, depth: 1, index: 1 }
  )
    .sort({ index: 1 })
    .lean();

  // Children count map (hız)
  const childrenCountMap = await getChildrenMap(matrixId);

  let chosenParent = null;

  for (const n of nodes) {
    const count = childrenCountMap.get(String(n._id)) || 0;
    if (count < 2) {
      chosenParent = n;
      break;
    }
  }

  if (!chosenParent) {
    // Teorik olarak imkansız (binary sonsuza kadar büyür), ama güvenlik:
    chosenParent = nodes[nodes.length - 1];
  }

  // Parent'ın hangi side'ı boş?
  const usedSides = await getSideOccupied(chosenParent._id);
  const side = usedSides.has("L") ? "R" : "L";

  const node = await MatrixNode.create({
    matrixId,
    userId,
    parentNodeId: chosenParent._id,
    side,
    depth: (chosenParent.depth ?? 0) + 1,
    index: nextIdx,
    status: makeActive ? "ACTIVE" : "PENDING",
    joinedAt: now,
    pendingExpiresAt: makeActive ? null : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  });

  return { ok: true, message: "placed_bottom", nodeId: node._id, parentNodeId: chosenParent._id, side };
}

/**
 * ✅ 2 ay üst üste ödeme yapmayanları Matrix’ten siler (ACTIVE/PENDING ise)
 * Bu fonksiyon senin server.js içindeki günlük job’da çalışıyor.
 */
export async function removeTwoMonthsMissedUsers({ matrixId = "MAIN", now = new Date() }) {
  // 1) 2 ay üst üste kaçıran kullanıcılar
  const candidates = await User.find(
    { missedMonthsStreak: { $gte: 2 } },
    { _id: 1, missedMonthsStreak: 1, lastPaidYm: 1, isActive: 1 }
  ).lean();

  if (candidates.length === 0) {
    return { ok: true, removedUsers: 0, removedNodes: 0 };
  }

  const userIds = candidates.map((u) => u._id);

  // 2) Bu kullanıcıların matrix node’larını REMOVED yap
  const res = await MatrixNode.updateMany(
    {
      matrixId,
      userId: { $in: userIds },
      status: { $in: ["PENDING", "ACTIVE"] },
    },
    {
      $set: {
        status: "REMOVED",
        removedAt: now,
        removedReason: "MISSED_2_MONTHS",
      },
    }
  );

  return {
    ok: true,
    removedUsers: candidates.length,
    removedNodes: res.modifiedCount || 0,
  };
}

/**
 * ✅ Kullanıcı ödeme yapınca (MONTHLY route’unda) çağır:
 * - Eğer matrixte PENDING node varsa -> ACTIVE yap
 * - Hiç yoksa -> en alttan yeniden yerleştir (eski yerine dönmez)
 */
export async function activateOrRejoinMatrix({ matrixId = "MAIN", userId, now = new Date() }) {
  // PENDING varsa ACTIVE yap
  const pending = await MatrixNode.findOne({
    matrixId,
    userId,
    status: "PENDING",
  });

  if (pending) {
    pending.status = "ACTIVE";
    pending.pendingExpiresAt = null;
    await pending.save();
    return { ok: true, message: "pending_promoted_to_active", nodeId: pending._id };
  }

  // ACTIVE varsa zaten tamam
  const active = await MatrixNode.findOne({
    matrixId,
    userId,
    status: "ACTIVE",
  }).lean();
  if (active) return { ok: true, message: "already_active", nodeId: active._id };

  // REMOVED olmuşsa / hiç yoksa -> en altta yeniden yerleştir
  return await placeUserAtBottom({ matrixId, userId, now, makeActive: true });
}
