import mongoose from "mongoose";

const { Schema } = mongoose;

const LedgerSchema = new Schema(
  {
    // 👤 Kullanıcı
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 💰 İşlem tipi
    // adjust | commission | order | payout | deposit | refund
    type: {
      type: String,
      default: "adjust",
      index: true,
    },

    // 📊 Durum
    // pending | paid | success | failed | canceled
    status: {
      type: String,
      default: "paid",
      index: true,
    },

    // 💵 Tutar
    amount: {
      type: Number,
      required: true,
    },

    // 💱 Para birimi
    currency: {
      type: String,
      default: "USDT",
    },

    // 📝 Başlık (zorunlu)
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // 🗒️ Açıklama
    note: {
      type: String,
      default: "",
      trim: true,
    },

    // 🔗 Referans (sipariş, ödeme vs)
    refType: {
      type: String,
      default: "manual",
    },

    refId: {
      type: String,
      default: "",
    },

    // 🔐 Blockchain / ödeme hash
    txHash: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

/* =========================
   INDEXES (performans)
========================= */
LedgerSchema.index({ user: 1, createdAt: -1 });
LedgerSchema.index({ status: 1, createdAt: -1 });
LedgerSchema.index({ type: 1, createdAt: -1 });

/* =========================
   VIRTUALS (opsiyonel)
========================= */
LedgerSchema.virtual("isPositive").get(function () {
  return this.amount > 0;
});

/* =========================
   EXPORT (EN KRİTİK)
========================= */
const Ledger = mongoose.model("Ledger", LedgerSchema);

export default Ledger;