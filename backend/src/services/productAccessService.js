function normalizeSearchText(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isMonthlyEducationProduct(product) {
  const names = [product?.name, product?.nameTr, product?.nameEn]
    .map(normalizeSearchText)
    .filter(Boolean);

  return names.some(
    (name) =>
      name.includes("egitim paketi 1 aylik") ||
      name.includes("1 aylik egitim paketi")
  );
}

export function hasPaidActiveLicense(user, now = Date.now()) {
  if (!user?.isLicensed) return false;
  if (!user?.licenseExpiresAt) return true;

  const expiresAt = new Date(user.licenseExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function canViewProduct(product, user) {
  return !isMonthlyEducationProduct(product) || hasPaidActiveLicense(user);
}
