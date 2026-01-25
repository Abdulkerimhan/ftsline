// src/services/matrixActivation.js
import { db } from "../db/db.js";

export async function activatePendingNode(matrixId, userId, paidAt = new Date()) {
  const node = await db.matrix_nodes.findOne({
    matrix_id: matrixId,
    user_id: userId,
    status: "pending",
  });

  if (!node) return { ok: false, reason: "no_pending_node" };

  await db.matrix_nodes.updateOne(
    { id: node.id },
    { $set: { status: "active", activated_at: paidAt } }
  );

  return { ok: true };
}
