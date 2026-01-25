// backend/src/models/MatrixNode.js
import mongoose from "mongoose";

const MatrixNodeSchema = new mongoose.Schema(
  {
    matrixId: { type: String, default: "MAIN", index: true },

    // Eğer ROOT node istersen userId null olabilir
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "MatrixNode", default: null, index: true },

    // Binary: L / R
    side: { type: String, enum: ["L", "R", null], default: null },

    status: { type: String, enum: ["PENDING", "ACTIVE", "REMOVED"], default: "PENDING", index: true },

    // PENDING kullanıcı için: 7 gün süre
    pendingExpiresAt: { type: Date, default: null, index: true },

    joinedAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },

    removedAt: { type: Date, default: null },
    removedReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// Bir kullanıcı bir matrixId içinde 1 kez node sahibi olsun
MatrixNodeSchema.index({ matrixId: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $ne: null } } });

export default mongoose.model("MatrixNode", MatrixNodeSchema);
