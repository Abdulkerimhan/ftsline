// backend/src/models/AuditLog.js
import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    actorRole: { type: String, default: "user", index: true },
    actorUsername: { type: String, default: "" },

    action: { type: String, required: true, index: true },
    method: { type: String, default: "" },
    path: { type: String, default: "" },

    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    meta: { type: Object, default: {} },

    statusCode: { type: Number, default: 0 },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", AuditLogSchema);
