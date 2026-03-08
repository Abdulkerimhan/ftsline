// src/auth/effectivePerms.js
export function effectivePerms(user) {
  const set = new Set();

  // admin permissions
  for (const p of (user?.permissions || [])) set.add(String(p));

  // superadmin her şeye sahip
  if (user?.role === "superadmin") set.add("*");

  return set;
}