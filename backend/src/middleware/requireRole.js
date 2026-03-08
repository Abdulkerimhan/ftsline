export function requireRole(...roles) {
  const allowed = roles.flat().filter(Boolean);

  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    if (allowed.length === 0) return next();

    if (!allowed.includes(role)) {
      return res.status(403).json({ ok: false, message: "Forbidden (role)" });
    }

    next();
  };
}