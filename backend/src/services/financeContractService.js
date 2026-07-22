const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
const ORDER_STATUSES = ["pending", "preparing", "shipped", "completed", "cancelled"];
const INVOICE_STATUSES = ["pending", "issued"];

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export function buildFinanceOrderUpdate(body = {}, now = new Date()) {
  const update = {};

  if (body.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.paymentStatus)) {
      throw new Error("Gecersiz odeme durumu");
    }
    update.paymentStatus = body.paymentStatus;
  }

  if (body.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) {
      throw new Error("Gecersiz siparis durumu");
    }
    update.status = body.status;
  }

  let invoiceStatus = body.invoiceStatus;
  if (body.invoiceIssued !== undefined) {
    if (typeof body.invoiceIssued !== "boolean") {
      throw new Error("Gecersiz fatura durumu");
    }
    invoiceStatus = body.invoiceIssued ? "issued" : "pending";
  }

  if (invoiceStatus !== undefined) {
    if (!INVOICE_STATUSES.includes(invoiceStatus)) {
      throw new Error("Gecersiz fatura durumu");
    }
    update.invoiceStatus = invoiceStatus;
    update.invoiceIssuedAt = invoiceStatus === "issued" ? now : null;
  }

  if (typeof body.invoiceNumber === "string") {
    update.invoiceNumber = body.invoiceNumber.trim();
  }
  if (typeof body.invoiceNote === "string") {
    update.invoiceNote = body.invoiceNote.trim();
  }

  if (Object.keys(update).length === 0) {
    throw new Error("Guncellenecek finans alani bulunamadi");
  }

  return update;
}

export function serializeFinanceOrder(order = {}) {
  return {
    ...order,
    invoiceIssued: order.invoiceStatus === "issued",
  };
}

export function serializeFinanceUser(user = {}, earnings = {}) {
  const earnedTotal = roundMoney(earnings.earned);
  const paidTotal = roundMoney(earnings.paid);
  const recentSources = (earnings.recentSources || []).map((source) => ({
    ...source,
    _id: source._id || source.id,
    type: source.type || source.sourceType,
    sourceUser:
      source.sourceUser ||
      (source.sourceUsername ? { username: source.sourceUsername } : null),
  }));
  const normalizedEarnings = {
    ...earnings,
    earned: earnedTotal,
    paid: paidTotal,
    recentSources,
  };

  return {
    ...user,
    earnings: normalizedEarnings,
    earnedTotal,
    paidTotal,
    pendingTotal: roundMoney(Math.max(earnedTotal - paidTotal, 0)),
    recentSources,
  };
}
