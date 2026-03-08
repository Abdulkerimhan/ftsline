import User from "../models/User.js";
import AppError from "../utils/AppError.js";

function toDateOrNull(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function getMyProfile(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError("Kullanıcı bulunamadı", 404);

  // passwordHash dönmesin
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function updateMyProfile(userId, body) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("Kullanıcı bulunamadı", 404);

  const {
    fullName,
    email,
    phone,

    birthDate,
    nationality,

    addressLine,
    city,
    district,
    postalCode,
    country,

    invoiceName,
    invoiceTaxNo,
    invoiceTaxOffice,
    invoiceAddressLine,
    invoiceCity,
    invoiceDistrict,
    invoicePostalCode,
    invoiceCountry,
  } = body || {};

  if (fullName !== undefined) user.fullName = String(fullName || "");
  if (email !== undefined) user.email = String(email || "");
  if (phone !== undefined) user.phone = String(phone || "");

  user.profile = {
    ...(user.profile || {}),
    birthDate: toDateOrNull(birthDate),
    nationality: String(nationality || ""),

    addressLine: String(addressLine || ""),
    city: String(city || ""),
    district: String(district || ""),
    postalCode: String(postalCode || ""),
    country: String(country || "TR"),
  };

  user.invoice = {
    ...(user.invoice || {}),
    name: String(invoiceName || ""),
    taxNo: String(invoiceTaxNo || ""),
    taxOffice: String(invoiceTaxOffice || ""),

    addressLine: String(invoiceAddressLine || ""),
    city: String(invoiceCity || ""),
    district: String(invoiceDistrict || ""),
    postalCode: String(invoicePostalCode || ""),
    country: String(invoiceCountry || "TR"),
  };

  await user.save();

  // safe dönüş
  const fresh = await User.findById(userId).lean();
  const { passwordHash, ...safe } = fresh || {};
  return safe;
}