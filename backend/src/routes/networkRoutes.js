import express from "express";
import mongoose from "mongoose";
import { auth } from "../middleware/auth.js";
import { attachUser } from "../middleware/attachUser.js";
import User from "../models/User.js";
import MatrixNode from "../models/MatrixNode.js";

const router = express.Router();

function s(v, def = "") { return String(v ?? def).trim(); }
function n(v, def = 0) { const x = Number(v); return Number.isFinite(x) ? x : def; }
function isObjId(x) { return mongoose.Types.ObjectId.isValid(String(x || "")); }

// =========================
// UNILEVEL (sponsor üzerinden)
// GET /api/network/unilevel?userId=...&depth=3
// =========================
router.get("/unilevel", auth, attachUser, async (req, res) => {
  try {
    const depth = Math.min(10, Math.max(1, n(req.query.depth, 3)));

    // superadmin tüm ağı görebilsin
    const requested = s(req.query.userId, "");
    const rootUserId = isObjId(requested) ? requested : String(req.user?._id || req.user?.id || "");

    const rootUser = await User.findById(rootUserId).select("_id username fullName email role").lean();
    if (!rootUser) return res.status(404).json({ ok: false, message: "Root user not found" });

    // BFS: sponsor ilişkisiyle altları çıkar
    const nodes = [];
    const edges = [];

    const q = [{ id: String(rootUser._id), level: 0 }];
    const seen = new Set();

    while (q.length) {
      const cur = q.shift();
      const id = String(cur.id);
      if (seen.has(id)) continue;
      seen.add(id);

      const u = await User.findById(id).select("_id username fullName email role sponsor").lean();
      if (!u) continue;

      nodes.push({
        id: String(u._id),
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        level: cur.level,
      });

      if (cur.level >= depth) continue;

      const kids = await User.find({ sponsor: u._id }).select("_id").lean();
      for (const k of kids) {
        edges.push({ from: String(u._id), to: String(k._id) });
        q.push({ id: String(k._id), level: cur.level + 1 });
      }
    }

    res.json({ ok: true, rootUserId: String(rootUser._id), nodes, edges, total: nodes.length });
  } catch (e) {
    console.error("UNILEVEL_ERR:", e);
    res.status(500).json({ ok: false, message: "Sunucu hatası" });
  }
});

// =========================
// MATRIX 2x (2 kol)
// GET /api/network/matrix?userId=...&depth=4&plan=2x
// =========================
router.get("/matrix", auth, attachUser, async (req, res) => {
  try {
    const plan = s(req.query.plan, "2x"); // ✅ 2 kol
    const depth = Math.min(10, Math.max(1, n(req.query.depth, 4)));

    const requested = s(req.query.userId, "");
    const rootUserId = isObjId(requested) ? requested : String(req.user?._id || req.user?.id || "");

    const rootUser = await User.findById(rootUserId).select("_id username fullName email role").lean();
    if (!rootUser) return res.status(404).json({ ok: false, message: "Root user not found" });

    // root node yoksa oluştur (kök: kendisi)
    let rootNode = await MatrixNode.findOne({ user: rootUser._id }).lean();
    if (!rootNode) {
      const created = await MatrixNode.create({
        user: rootUser._id,
        parent: null,
        leftChild: null,
        rightChild: null,
        rootUser: rootUser._id,
        level: 0,
      });
      rootNode = created.toObject();
    }

    // BFS ile depth kadar node/edge çıkar
    const nodes = [];
    const edges = [];
    const q = [{ nodeId: String(rootNode._id), level: 0 }];
    const seen = new Set();

    while (q.length) {
      const cur = q.shift();
      const nodeId = String(cur.nodeId);
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);

      const node = await MatrixNode.findById(nodeId)
        .select("_id user parent leftChild rightChild level")
        .lean();
      if (!node) continue;

      const u = await User.findById(node.user).select("_id username fullName email role").lean();
      if (!u) continue;

      nodes.push({
        id: String(u._id),
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        level: cur.level,
      });

      if (cur.level >= depth) continue;

      // sol / sağ (slot 1 / slot 2)
      if (node.leftChild) {
        const child = await MatrixNode.findById(node.leftChild).select("_id user").lean();
        if (child) {
          edges.push({ from: String(u._id), to: String(child.user), slot: 1 });
          q.push({ nodeId: String(child._id), level: cur.level + 1 });
        }
      }
      if (node.rightChild) {
        const child = await MatrixNode.findById(node.rightChild).select("_id user").lean();
        if (child) {
          edges.push({ from: String(u._id), to: String(child.user), slot: 2 });
          q.push({ nodeId: String(child._id), level: cur.level + 1 });
        }
      }
    }

    res.json({
      ok: true,
      plan, // "2x"
      rootUserId: String(rootUser._id),
      nodes,
      edges,
      total: nodes.length,
    });
  } catch (e) {
    console.error("MATRIX_ERR:", e);
    res.status(500).json({ ok: false, message: "Sunucu hatası" });
  }
});

export default router;