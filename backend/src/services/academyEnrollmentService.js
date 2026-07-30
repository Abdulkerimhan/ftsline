import AcademyCourse from "../models/AcademyCourse.js";
import AcademyEnrollment from "../models/AcademyEnrollment.js";
import Order from "../models/Order.js";

export async function syncAcademyEnrollmentsForOrder(order) {
  const orderId = order?._id;
  const userId = order?.user?._id || order?.user;
  if (!orderId || !userId || order?.orderType !== "product") {
    return { granted: 0, revoked: 0 };
  }

  const productIds = (order.items || [])
    .map((item) => item?.productId)
    .filter(Boolean);
  const courses = productIds.length
    ? await AcademyCourse.find({
        $or: [
          { product: { $in: productIds } },
          { products: { $in: productIds } },
        ],
      }).select("_id").lean()
    : [];
  const courseIds = courses.map((course) => course._id);
  const shouldGrant =
    order.paymentStatus === "paid" && order.status !== "cancelled";

  if (shouldGrant && courseIds.length) {
    await Promise.all(
      courseIds.map((courseId) =>
        AcademyEnrollment.findOneAndUpdate(
          { user: userId, course: courseId, order: orderId },
          { $set: { revokedAt: null }, $setOnInsert: { grantedAt: new Date() } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );
  }

  const revokeResult = await AcademyEnrollment.updateMany(
    {
      order: orderId,
      ...(shouldGrant ? { course: { $nin: courseIds } } : {}),
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } }
  );

  return {
    granted: shouldGrant ? courseIds.length : 0,
    revoked: Number(revokeResult.modifiedCount || 0),
  };
}

export async function getPurchasedAcademyCourseIds(userId) {
  const rows = await AcademyEnrollment.find({
    user: userId,
    revokedAt: null,
  })
    .distinct("course");
  return rows.map(String);
}

export async function userCanAccessAcademyCourse({ user, courseId }) {
  if (!user || !courseId) return false;
  if (user.role === "superadmin") return true;
  const enrollment = await AcademyEnrollment.exists({
    user: user._id,
    course: courseId,
    revokedAt: null,
  });
  return Boolean(enrollment);
}

export async function syncAcademyEnrollmentsForCourse(course) {
  if (!course?._id) return { granted: 0, revoked: 0 };

  const revokeResult = await AcademyEnrollment.updateMany(
    { course: course._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  const linkedProductIds = [
    ...(course.products || []),
    ...(course.product ? [course.product] : []),
  ];
  if (!linkedProductIds.length) {
    return { granted: 0, revoked: Number(revokeResult.modifiedCount || 0) };
  }

  const paidOrders = await Order.find({
    user: { $ne: null },
    orderType: "product",
    paymentStatus: "paid",
    status: { $ne: "cancelled" },
    "items.productId": { $in: linkedProductIds },
  }).lean();

  await Promise.all(paidOrders.map((order) => syncAcademyEnrollmentsForOrder(order)));
  return {
    granted: paidOrders.length,
    revoked: Number(revokeResult.modifiedCount || 0),
  };
}
