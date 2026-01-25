// backend/src/models/CommissionLog.js
import mongoose from "mongoose";

const CommissionLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["unilevel"], default: "unilevel" },

    // Komisyonu alan kişi
    earnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Komisyona sebep olan kişi (satışı yapan / lisans alan)
    sourceUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Satış/ödeme kaydı referansı varsa
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },

    level: { type: Number, required: true },          // 1..N
    rate: { type: Number, required: true },           // örn 0.10
    amount: { type: Number, required: true },         // USDT/TL ne kullanıyorsan
    currency: { type: String, default: "USDT" },

    meta: {
      note: { type: String, default: "" },
      plan: { type: String, default: "DEFAULT" },     // hangi planla ödendi
    },
  },
  { timestamps: true }
);

CommissionLogSchema.index({ earnerUserId: 1, createdAt: -1 });
CommissionLogSchema.index({ sourceUserId: 1, createdAt: -1 });

export default mongoose.model("CommissionLog", CommissionLogSchema);
