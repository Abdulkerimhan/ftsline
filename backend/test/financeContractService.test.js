import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFinanceOrderUpdate,
  serializeFinanceOrder,
  serializeFinanceUser,
} from "../src/services/financeContractService.js";

test("fatura UI boolean sozlesmesini kalici modele cevirir", () => {
  const now = new Date("2026-07-19T12:00:00.000Z");
  assert.deepEqual(
    buildFinanceOrderUpdate({ invoiceIssued: true, invoiceNumber: " F-19 " }, now),
    { invoiceStatus: "issued", invoiceIssuedAt: now, invoiceNumber: "F-19" }
  );
  assert.deepEqual(buildFinanceOrderUpdate({ invoiceIssued: false }, now), {
    invoiceStatus: "pending",
    invoiceIssuedAt: null,
  });
});

test("kanonik invoiceStatus sozlesmesini de destekler", () => {
  const now = new Date("2026-07-19T12:00:00.000Z");
  assert.equal(buildFinanceOrderUpdate({ invoiceStatus: "issued" }, now).invoiceIssuedAt, now);
  assert.throws(() => buildFinanceOrderUpdate({ invoiceStatus: "unknown" }), /Gecersiz/);
});

test("gecersiz veya bos siparis guncellemesini reddeder", () => {
  assert.throws(() => buildFinanceOrderUpdate({ paymentStatus: "unknown" }), /Gecersiz/);
  assert.throws(() => buildFinanceOrderUpdate({}), /Guncellenecek/);
});

test("overview siparisine UI fatura aliasi ekler", () => {
  assert.equal(serializeFinanceOrder({ invoiceStatus: "issued" }).invoiceIssued, true);
  assert.equal(serializeFinanceOrder({ invoiceStatus: "pending" }).invoiceIssued, false);
});

test("kazanc ozetini admin ve super-admin sekillerinde sunar", () => {
  const user = serializeFinanceUser(
    { _id: "u1", username: "test", walletBalance: 30 },
    {
      earned: 100.126,
      paid: 40.123,
      bySource: { career_bonus: 100.126 },
      recentSources: [{ id: "t1", sourceType: "career_bonus", sourceUsername: "kaynak", amount: 10 }],
    }
  );

  assert.equal(user.earnedTotal, 100.13);
  assert.equal(user.paidTotal, 40.12);
  assert.equal(user.pendingTotal, 60.01);
  assert.equal(user.earnings.earned, 100.13);
  assert.equal(user.recentSources[0].type, "career_bonus");
  assert.equal(user.recentSources[0].sourceUser.username, "kaynak");
});
