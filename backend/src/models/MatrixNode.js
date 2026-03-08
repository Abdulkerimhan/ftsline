import mongoose from "mongoose";

const MatrixNodeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    // matrix içinde üst node
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "MatrixNode", default: null },

    // ✅ 2 kol (slot1 / slot2)
    leftChild: { type: mongoose.Schema.Types.ObjectId, ref: "MatrixNode", default: null },
    rightChild: { type: mongoose.Schema.Types.ObjectId, ref: "MatrixNode", default: null },

    // opsiyonel: kök takibi (çok işe yarar)
    rootUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // opsiyonel: derinlik cache (hız için)
    level: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("MatrixNode", MatrixNodeSchema);