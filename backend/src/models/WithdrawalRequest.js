import mongoose from "mongoose";

const withdrawalRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 5000 },
    currency: { type: String, default: "TL" },
    accountHolder: { type: String, required: true, trim: true, maxlength: 120 },
    iban: { type: String, required: true, trim: true, uppercase: true },
    bankName: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    note: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
