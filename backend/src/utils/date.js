// src/utils/date.js
export function ym(d) {
  const dt = new Date(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ymA / ymB: "2026-01"
export function monthsBetween(ymA, ymB) {
  const [aY, aM] = ymA.split("-").map(Number);
  const [bY, bM] = ymB.split("-").map(Number);
  return (bY - aY) * 12 + (bM - aM);
}
