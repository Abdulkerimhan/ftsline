import mongoose from "mongoose";

const financialAuditEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorRole: { type: String, default: "system" },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: "TRY" },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  previousHash: { type: String, default: "" },
  hash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, immutable: true, index: true },
}, { versionKey: false });

const immutableError = (next) => next(new Error("Finans denetim kayitlari degistirilemez veya silinemez."));
financialAuditEventSchema.pre("save", function protectExistingAuditEvent(next) {
  if (!this.isNew) return immutableError(next);
  return next();
});

financialAuditEventSchema.pre("deleteOne", { document: true, query: false }, immutableError);
for (const hook of ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"]) {
  financialAuditEventSchema.pre(hook, immutableError);
}

export default mongoose.model("FinancialAuditEvent", financialAuditEventSchema);
