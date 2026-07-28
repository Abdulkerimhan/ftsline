export const PRODUCT_NETWORK_RATES = [
  0.25,
  0.05,
  0.05,
  0.0375,
  0.025,
  0.025,
  0.025,
  0.0125,
  0.0125,
  0.0125,
];

export const PRODUCT_NETWORK_DEPTH_BY_CAREER = {
  NONE: 1,
  BRONZ: 2,
  GUMUS: 3,
  ALTIN: 5,
  PLATIN: 7,
  ELMAS: 10,
  TAC_ELMAS: 10,
};

export const roundProductNetworkMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export function calculateProductNetworkAmounts(priceDifference) {
  return PRODUCT_NETWORK_RATES.map((rate, index) => ({
    depth: index + 1,
    rate,
    amount: roundProductNetworkMoney(Number(priceDifference || 0) * rate),
  }));
}
