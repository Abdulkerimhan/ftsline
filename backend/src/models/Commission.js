// backend/src/models/Commission.js
import mongoose from "mongoose";

const CommissionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["MATRIX_MONTHLY", "UNILEVEL"], // ✅ UNILEVEL EKLENDİ
      required: true,
      index: true,
    },

    matrixId: { type: String, default: "MAIN", index: true },

    // ödemeyi yapan kişi (downline)
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // kazancı alan üst sponsor
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: "USDT" },
    network: { type: String, default: "TRC20" },

    // 🔐 tekrar dağıtımı engeller
    payoutKey: { type: String, required: true, unique: true, index: true },

    // MATRIX için ay bazlı, UNILEVEL için orderId / txId bazlı kullanılacak
    paidAt: { type: Date, required: true },
    monthKey: { type: String, required: true }, // UNILEVEL’de "ONCE"

    // ekstra bilgi
    meta: {
      level: Number,      // unilevel seviyesi
      rate: Number,       // %
      source: String,     // "LICENSE", "ORDER"
    },
  },
  { timestamps: true }
);

export default mongoose.model("Commission", CommissionSchema);
