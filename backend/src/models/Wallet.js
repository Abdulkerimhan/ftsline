// backend/src/models/Wallet.js
import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true, required: true },

    // Onaylanan / çekilebilir bakiye (istersen sonra bekleyen-onaylı ayırırız)
    balance: { type: Number, default: 0 },

    currency: { type: String, default: "USDT" },
    network: { type: String, default: "TRC20" },
  },
  { timestamps: true }
);

export default mongoose.model("Wallet", WalletSchema);
