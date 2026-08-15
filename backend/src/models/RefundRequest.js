import mongoose from "mongoose";

const refundRequestSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    trackingCode: { type: String, required: true, trim: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ["withdrawal", "defective", "wrong_product", "late_delivery", "other"],
      required: true,
    },
    details: { type: String, default: "", trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "processing", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, default: "", trim: true, maxlength: 1000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("RefundRequest", refundRequestSchema);
