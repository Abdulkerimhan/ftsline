import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { isMonthlyEducationProduct } from "./productAccessService.js";

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + Number(months || 0));

  if (next.getDate() < day) next.setDate(0);
  return next;
}

async function getPurchasedMonths(order) {
  const productIds = (order.items || [])
    .map((item) => item.productId)
    .filter(Boolean);
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).lean()
    : [];
  const productMap = new Map(
    products.map((product) => [String(product._id), product])
  );

  return (order.items || []).reduce((total, item) => {
    const product = item.productId
      ? productMap.get(String(item.productId))
      : null;
    const accessProduct = product || { name: item.name };

    return isMonthlyEducationProduct(accessProduct)
      ? total + Math.max(1, Math.floor(Number(item.quantity || 1)))
      : total;
  }, 0);
}

export async function activateMonthlyEducationLicenseForOrder({
  orderId,
  paidAt = new Date(),
}) {
  const order = await Order.findById(orderId).lean();

  if (
    !order ||
    order.orderType !== "product" ||
    order.paymentStatus !== "paid" ||
    order.monthlyLicenseActivatedAt
  ) {
    return null;
  }

  const months = await getPurchasedMonths(order);
  if (months < 1) return null;

  const claimedAt = new Date(paidAt);
  const claimedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      paymentStatus: "paid",
      monthlyLicenseActivatedAt: null,
    },
    {
      $set: {
        monthlyLicenseActivatedAt: claimedAt,
        monthlyLicenseMonths: months,
      },
    },
    { new: true }
  ).lean();

  if (!claimedOrder) return null;

  try {
    const user = await User.findById(order.user);

    if (!user?.licenseStartedAt) {
      throw new Error("Aylik lisans aktivasyonu icin once ilk lisans alinmalidir.");
    }

    const now = new Date(paidAt);
    const currentExpiry = user.licenseExpiresAt
      ? new Date(user.licenseExpiresAt)
      : null;
    const extensionBase =
      currentExpiry && currentExpiry.getTime() > now.getTime()
        ? currentExpiry
        : now;

    user.isLicensed = true;
    user.licenseExpiresAt = addMonths(extensionBase, months);
    await user.save();

    return {
      months,
      isLicensed: user.isLicensed,
      licenseExpiresAt: user.licenseExpiresAt,
    };
  } catch (error) {
    await Order.updateOne(
      { _id: order._id, monthlyLicenseActivatedAt: claimedAt },
      {
        $set: { monthlyLicenseActivatedAt: null, monthlyLicenseMonths: 0 },
      }
    );
    throw error;
  }
}
