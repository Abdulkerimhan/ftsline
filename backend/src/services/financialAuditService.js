import crypto from "node:crypto";
import FinancialAuditEvent from "../models/FinancialAuditEvent.js";

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}

export async function recordFinancialAudit(payload) {
  const latest = await FinancialAuditEvent.findOne().sort({ createdAt: -1, _id: -1 }).select("hash").lean();
  const createdAt = new Date();
  const event = {
    eventType: payload.eventType,
    entityType: payload.entityType,
    entityId: String(payload.entityId),
    actor: payload.actor || null,
    actorRole: payload.actorRole || "system",
    amount: Number(payload.amount || 0),
    currency: payload.currency || "TRY",
    before: payload.before ?? null,
    after: payload.after ?? null,
    metadata: payload.metadata || {},
    previousHash: latest?.hash || "",
    createdAt,
  };
  event.hash = crypto.createHash("sha256").update(stable(event)).digest("hex");
  return FinancialAuditEvent.create(event);
}
