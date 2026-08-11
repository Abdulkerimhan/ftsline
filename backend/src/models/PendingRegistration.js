import mongoose from "mongoose";

const PendingRegistrationSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    fullName: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    sponsor: { type: String, default: "", trim: true, lowercase: true },
    legalAcceptance: {
      termsAcceptedAt: { type: Date, required: true },
      privacyNoticeAcknowledgedAt: { type: Date, required: true },
      termsVersion: { type: String, required: true, default: "2026-08-11" },
      privacyVersion: { type: String, required: true, default: "2026-08-11" },
    },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export default mongoose.model("PendingRegistration", PendingRegistrationSchema);
