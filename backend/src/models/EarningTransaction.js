import mongoose from "mongoose";

const earningTransactionSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceType: {
      type: String,
      enum: ["unilevel_initial", "matrix_monthly", "career_bonus", "pool_bonus", "manual_adjustment"],
      required: true,
      index: true,
    },
    sourceUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    sourceUsername: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "TL" },
    depth: { type: Number, default: null },
    rate: { type: Number, default: null },
    description: { type: String, default: "" },
    status: { type: String, enum: ["earned", "paid", "cancelled"], default: "earned", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

earningTransactionSchema.index({ beneficiary: 1, createdAt: -1 });
earningTransactionSchema.index({ beneficiary: 1, sourceType: 1 });

export default mongoose.model("EarningTransaction", earningTransactionSchema);
