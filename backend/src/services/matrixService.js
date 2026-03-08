import mongoose from "mongoose";
import MatrixNode from "../models/MatrixNode.js";

export async function ensureNodeForUser(userId, rootUserId, session) {
  const existing = await MatrixNode.findOne({ user: userId }).session(session || null);
  if (existing) return existing;

  const created = await MatrixNode.create(
    [{ user: userId, parent: null, leftChild: null, rightChild: null, rootUser: rootUserId, level: 0 }],
    session ? { session } : undefined
  );
  return created[0];
}

export async function placeUserBinary({ sponsorUserId, newUserId }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // sponsor node yoksa oluştur (root: sponsor)
    const sponsorNode = await ensureNodeForUser(sponsorUserId, sponsorUserId, session);

    // new node şimdilik rootUser = sponsor’un rootUser’ı
    const rootUserId = sponsorNode.rootUser || sponsorUserId;

    // new user node (henüz parent bağlamıyoruz)
    let newNode = await MatrixNode.findOne({ user: newUserId }).session(session);
    if (!newNode) {
      const created = await MatrixNode.create(
        [{ user: newUserId, parent: null, leftChild: null, rightChild: null, rootUser: rootUserId, level: 0 }],
        { session }
      );
      newNode = created[0];
    }

    // ✅ BFS: sponsorNode’dan başlayıp ilk boş slotu bul
    const q = [sponsorNode._id];
    while (q.length) {
      const curId = q.shift();
      const cur = await MatrixNode.findById(curId).session(session);
      if (!cur) continue;

      // sol boşsa sol’a
      if (!cur.leftChild) {
        cur.leftChild = newNode._id;
        await cur.save({ session });

        newNode.parent = cur._id;
        newNode.level = (cur.level || 0) + 1;
        newNode.rootUser = rootUserId;
        await newNode.save({ session });

        await session.commitTransaction();
        session.endSession();
        return { ok: true, placedUnder: cur._id, slot: 1 };
      }

      // sağ boşsa sağ’a
      if (!cur.rightChild) {
        cur.rightChild = newNode._id;
        await cur.save({ session });

        newNode.parent = cur._id;
        newNode.level = (cur.level || 0) + 1;
        newNode.rootUser = rootUserId;
        await newNode.save({ session });

        await session.commitTransaction();
        session.endSession();
        return { ok: true, placedUnder: cur._id, slot: 2 };
      }

      // ikisi de doluysa aşağı in
      q.push(cur.leftChild, cur.rightChild);
    }

    // normalde buraya düşmez
    throw new Error("Matrix placement failed");
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
}