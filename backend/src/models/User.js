// backend/src/models/User.js
import mongoose from "mongoose";

// ===============================
// PAYMENT SCHEMA (Embedded)
// ===============================
const PaymentSchema = new mongoose.Schema(
  {
    // SIGNUP = ilk lisans/ilk giriş ödemesi
    // MONTHLY = aylık pro paket ödemesi
    type: { type: String, enum: ["SIGNUP", "MONTHLY"], required: true },

    amount: { type: Number, required: true }, // örn: 74.99 / 14.99
    currency: { type: String, default: "USDT" },
    network: { type: String, default: "TRC20" },

    paidAt: { type: Date, required: true },

    // MONTHLY için: "2026-01"
    monthKey: { type: String, default: null },
  },
  { _id: false }
);

// ===============================
// USER SCHEMA
// ===============================
const UserSchema = new mongoose.Schema(
  {
    // Kimlik
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },

    // JWT register'da isim tutmak istersen
    fullName: { type: String, default: "" },

    // ✅ JWT için şart: şifre hash (plain şifre tutulmaz)
    // select:false -> normal query'de gelmez, login'de .select("+passwordHash") ile çekilir
    passwordHash: { type: String, required: true, select: false },

    // ✅ Rol (admin/superadmin vs)
    role: { type: String, enum: ["user", "admin", "superadmin"], default: "user" },

    // Ünilevel sponsor (kayıtta her zaman sponsorun altına)
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ✅ AKTİFLİK (SENİN KURAL)
    // Bu ay MONTHLY ödeme yaptıysa aktif say
    isActive: { type: Boolean, default: false },

    // Son MONTHLY ödeme zamanı (log amaçlı)
    lastMonthlyPaidAt: { type: Date, default: null },

    // ✅ Son ödeme yapılan ay (YYYY-MM) → "2026-01"
    // Bu ay ile eşitse aktif demektir
    lastPaidYm: { type: String, default: null },

    // ✅ Kaç ay üst üste MONTHLY kaçırdı
    // 2 olursa matrix silme servisinde kullanacağız
    missedMonthsStreak: { type: Number, default: 0 },

    // Kariyer
    career: {
      level: {
        type: String,
        enum: ["NONE", "BRONZ", "GUMUS", "ALTIN", "PLATIN", "ELMAS", "TAC_ELMAS"],
        default: "NONE",
      },
      updatedAt: { type: Date, default: null },
    },

    // TRC20 adres (kullanıcının verdiği) - ödeme buraya yapılır
    trc20Address: { type: String, default: "" },

    // Ödemeler kayıtları (SIGNUP + MONTHLY)
    payments: { type: [PaymentSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
