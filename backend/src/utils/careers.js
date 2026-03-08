// src/utils/careers.js
export const CAREERS = [
  { key: "starter",  label: "Starter",  minTeam: 0 },
  { key: "bronze",   label: "Bronze",   minTeam: 5 },
  { key: "silver",   label: "Silver",   minTeam: 15 },
  { key: "gold",     label: "Gold",     minTeam: 40 },
  { key: "platinum", label: "Platinum", minTeam: 100 },
];

export function getCareer(teamCount = 0) {
  const t = Number(teamCount || 0);
  let current = CAREERS[0];

  for (const c of CAREERS) {
    if (t >= c.minTeam) current = c;
  }

  const idx = CAREERS.findIndex((x) => x.key === current.key);
  const next = idx >= 0 ? CAREERS[idx + 1] : null;

  return {
    key: current.key,
    label: current.label,
    teamCount: t,
    next: next
      ? { key: next.key, label: next.label, needTeam: Math.max(0, next.minTeam - t) }
      : null,
  };
}