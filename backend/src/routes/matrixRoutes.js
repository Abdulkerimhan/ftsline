import express from "express";
import mongoose from "mongoose";
import { auth } from "../middleware/auth.js";
import { attachUser } from "../middleware/attachUser.js";
import User from "../models/User.js";
import MatrixNode from "../models/MatrixNode.js";

const router = express.Router();

function s(v, def = "") { return String(v ?? def).trim(); }
function isObjId(x) { return mongoose.Types.ObjectId.isValid(String(x || "")); }

const SUPERADMIN_USERNAME = "superadmin";

// ✅ helper: user matrix kaydı yoksa oluştur
async function ensureMatrixNodeForUser(userId, plan = "default", width = 2) {
  const exists = await MatrixNode.findOne({ user: userId, plan }).lean();
  if (exists) return exists;

  const u = await User.findById(userId).select("_id sponsor username").lean();
  if (!u) return null;

  // parent adayları: sponsor -> superadmin -> null
  let parentUser = null;

  if (u.sponsor) {
    parentUser = await User.findById(u.sponsor).select("_id").lean();
  }
  if (!parentUser) {
    parentUser = await User.findOne({ username: SUPERADMIN_USERNAME }).select("_id").lean();
  }

  // parent varsa slot bul (width kadar doluluk kontrol)
  let parentId = parentUser?._id || null;
  let slot = 0;

  if (parentId) {
    const children = await MatrixNode.find({ parent: parentId, plan }).select("slot").lean();
    const used = new Set(children.map(x => Number(x.slot)));
    for (let i = 0; i < width; i++) {
      if (!used.has(i)) { slot = i; break; }
      slot = i + 1;
    }

    // parent doluysa: basit BFS ile uygun parent ara
    if (slot >= width) {
      const queue = [parentId];
      const seen = new Set();
      let found = null;

      while (queue.length && !found) {
        const cur = queue.shift();
        const key = String(cur);
        if (seen.has(key)) continue;
        seen.add(key);

        const curKids = await MatrixNode.find({ parent: cur, plan }).select("user slot").lean();
        const usedSlots = new Set(curKids.map(k => Number(k.slot)));

        if (usedSlots.size < width) {
          // boş slot var
          for (let i = 0; i < width; i++) {
            if (!usedSlots.has(i)) {
              found = { parent: cur, slot: i };
              break;
            }
          }
          break;
        }

        // sıraya çocukları ekle
        for (const k of curKids) queue.push(k.user);
      }

      if (found) {
        parentId = found.parent;
        slot = found.slot;
      } else {
        // hiç yer yoksa (pratikte zor), root’a bağla
        parentId = null;
        slot = 0;
      }
    }
  }

  const created = await MatrixNode.create({
    user: userId,
    parent: parentId,
    slot,
    plan,
    width,
  });

  return created.toObject();
}

// ✅ GET /api/matrix/tree?userId=...&plan=default&depth=4
router.get("/tree", auth, attachUser, async (req, res, next) => {
  try {
    const plan = s(req.query.plan, "default");
    const depth = Math.max(1, Math.min(8, Number(req.query.depth || 4)));

    // userId verilmezse kendi ağacı
    const rootUserId = s(req.query.userId, "") || String(req.user?._id || req.user?.id || "");

    if (!isObjId(rootUserId)) {
      return res.status(400).json({ ok: false, message: "Geçersiz userId" });
    }

    // root node yoksa oluştur
    await ensureMatrixNodeForUser(rootUserId, plan, 2);

    // BFS ile depth kadar node çek
    const nodes = [];
    const edges = [];
    const queue = [{ id: rootUserId, level: 0 }];
    const seen = new Set();

    while (queue.length) {
      const { id, level } = queue.shift();
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);

      // user + matrix node
      const [u, mn] = await Promise.all([
        User.findById(id).select("_id username fullName email role sponsor teamCount isLicensed isActive").lean(),
        MatrixNode.findOne({ user: id, plan }).select("parent slot plan width").lean(),
      ]);

      if (!u) continue;

      nodes.push({
        id: String(u._id),
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        sponsor: u.sponsor ? String(u.sponsor) : null,
        teamCount: Number(u.teamCount || 0),
        isLicensed: !!u.isLicensed,
        isActive: u.isActive !== false,
        matrix: mn ? {
          parent: mn.parent ? String(mn.parent) : null,
          slot: Number(mn.slot || 0),
          plan: mn.plan,
          width: Number(mn.width || 2),
        } : null,
      });

      if (mn?.parent) {
        edges.push({ from: String(mn.parent), to: String(u._id), slot: Number(mn.slot || 0) });
      }

      if (level >= depth) continue;

      const kids = await MatrixNode.find({ parent: id, plan }).select("user slot").sort({ slot: 1 }).lean();
      for (const k of kids) queue.push({ id: k.user, level: level + 1 });
    }

    res.json({ ok: true, plan, depth, rootUserId, nodes, edges });
  } catch (e) {
    next(e);
  }
});

export default router;