import mongoose from "mongoose";

const visitorEventSchema = new mongoose.Schema(
  {
    visitorKey: { type: String, required: true, index: true },
    ipHash: { type: String, required: true, index: true },
    maskedIp: { type: String, default: "-" },
    path: { type: String, required: true, maxlength: 300 },
    referrer: { type: String, default: "Direkt", maxlength: 500 },
    country: { type: String, default: "Bilinmiyor", maxlength: 100 },
    city: { type: String, default: "Bilinmiyor", maxlength: 120 },
    device: { type: String, default: "Bilinmiyor", maxlength: 40 },
    browser: { type: String, default: "Bilinmiyor", maxlength: 50 },
  },
  { timestamps: true }
);

// Ziyaret kayitlari KVKK veri minimizasyonu icin 90 gun sonra otomatik silinir.
visitorEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
visitorEventSchema.index({ createdAt: -1, visitorKey: 1 });

export default mongoose.model("VisitorEvent", visitorEventSchema);
