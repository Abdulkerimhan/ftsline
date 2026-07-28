import test from "node:test";
import assert from "node:assert/strict";
import {
  LICENSED_SALE_NETWORK_RATES,
  PRODUCT_NETWORK_RATES,
  calculateProductNetworkAmounts,
} from "../src/services/productNetworkRules.js";

test("urun fiyat farkini 10 kisi ve sirket kuraliyla hesaplar", () => {
  const payouts = calculateProductNetworkAmounts(200);

  assert.equal(payouts.length, 10);
  assert.equal(payouts[0].amount, 50);
  assert.equal(payouts[1].amount, 10);
  assert.equal(payouts[3].amount, 7.5);
  assert.equal(payouts[9].amount, 2.5);
  assert.equal(payouts.reduce((sum, item) => sum + item.amount, 0), 100);
  assert.equal(PRODUCT_NETWORK_RATES.reduce((sum, rate) => sum + rate, 0), 0.5);
});

test("indirimli urun satisinin yuzde 10'unu 10 seviyeye dagitir", () => {
  const payouts = calculateProductNetworkAmounts(1000, "licensed_sale");

  assert.equal(payouts.length, 10);
  assert.equal(payouts[0].amount, 50);
  assert.equal(payouts[1].amount, 10);
  assert.equal(payouts[9].amount, 2.5);
  assert.equal(payouts.reduce((sum, item) => sum + item.amount, 0), 100);
  assert.ok(
    Math.abs(LICENSED_SALE_NETWORK_RATES.reduce((sum, rate) => sum + rate, 0) - 0.1) <
      Number.EPSILON * 2
  );
});
