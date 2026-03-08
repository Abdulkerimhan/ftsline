export function requirePerm(...perms) {
  const needed = perms.flat().filter(Boolean);

  return (req, res, next) => {
    if (!req.user || !req.perms) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    if (req.perms.has("*")) return next();
    if (needed.length === 0) return next();

    const ok = needed.every((p) => req.perms.has(p));
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden (perm)" });

    next();
  };
}