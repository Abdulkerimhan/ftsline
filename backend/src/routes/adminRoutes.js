import express from "express";
import multer from "multer";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import EarningTransaction from "../models/EarningTransaction.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import RefundRequest from "../models/RefundRequest.js";
import FinancialAuditEvent from "../models/FinancialAuditEvent.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { uploadProductImages } from "../utils/cloudinaryUpload.js";
import {
  activateLicensePlanForUser,
  retryInitialUnilevelForActivatedLicense,
} from "../services/licensePlanService.js";
import { syncAcademyEnrollmentsForOrder } from "../services/academyEnrollmentService.js";
import { activateMonthlyEducationLicenseForOrder } from "../services/monthlyEducationLicenseService.js";
import {
  buildFinanceOrderUpdate,
  serializeFinanceOrder,
  serializeFinanceUser,
} from "../services/financeContractService.js";
import { restoreOrderStock } from "../services/orderStockService.js";
import {
  cancelProductNetworkBonus,
  distributeProductNetworkBonus,
} from "../services/productNetworkBonusService.js";
import { recordFinancialAudit } from "../services/financialAuditService.js";

const router = express.Router();

/* ================= UPLOAD AYARLARI ================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
  fileFilter(req, file, cb) {
    cb(null, String(file.mimetype || "").startsWith("image/"));
  },
});

/* ================= YETKÄ° KONTROL ================= */

function hasAdminPermission(req, permission) {
  if (req.user?.role === "superadmin") return true;
  if (req.user?.role !== "admin") return false;
  const permissions = Array.isArray(req.user.adminPermissions)
    ? req.user.adminPermissions
    : ["users", "products", "finance", "settings"];
  return permissions.includes(permission);
}

function adminOrSuperadmin(req, res, next) {
  const role = req.user?.role;

  if (role === "admin" || role === "superadmin") {
    return next();
  }

  return res.status(403).json({ message: "Yetki yok" });
}

function requireAdminPermission(permission) {
  return (req, res, next) => {
    if (!hasAdminPermission(req, permission)) {
      return res.status(403).json({ message: "Bu admin alani icin yetkiniz yok" });
    }

    next();
  };
}

/* ================= ADMIN - TÃœM ÃœRÃœNLER ================= */

router.get("/products", authRequired, adminOrSuperadmin, requireAdminPermission("products"), async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("Admin Ã¼rÃ¼nler alÄ±namadÄ±:", error);
    res.status(500).json({ message: "ÃœrÃ¼nler alÄ±namadÄ±" });
  }
});

/* ================= ADMIN - ÃœRÃœN EKLE ================= */

router.post(
  "/products",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("products"),
  upload.array("images"),
  async (req, res) => {
    try {
      const uploadedImages = await uploadProductImages(req.files || []);

      const product = await Product.create({
        name: req.body.name || req.body.nameTr || "",
        nameTr: req.body.nameTr || req.body.name || "",
        nameEn: req.body.nameEn || "",

        brand: req.body.brand || "",

        category: req.body.category || req.body.categoryTr || "",
        categoryTr: req.body.categoryTr || req.body.category || "",
        categoryEn: req.body.categoryEn || "",

        description: req.body.description || req.body.descriptionTr || "",
        descriptionTr: req.body.descriptionTr || req.body.description || "",
        descriptionEn: req.body.descriptionEn || "",

        priceNormal: Number(req.body.priceNormal || 0),
        priceLicensed: Number(req.body.priceLicensed || 0),
        networkProfitBase: Number(req.body.networkProfitBase || 0),

        stock: req.body.stock || "SÄ±nÄ±rsÄ±z",

        isActive:
          req.body.isActive === "true" ||
          req.body.isActive === true ||
          req.body.isActive === "on",

        images: uploadedImages,
        image: uploadedImages[0] || "",
      });

      res.status(201).json({
        message: "ÃœrÃ¼n eklendi",
        product,
      });
    } catch (error) {
      console.error("ÃœrÃ¼n ekleme hatasÄ±:", error);
      res.status(500).json({ message: "ÃœrÃ¼n eklenemedi" });
    }
  }
);

/* ================= ADMIN - ÃœRÃœN GÃœNCELLE ================= */

router.put(
  "/products/:id",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("products"),
  upload.array("images"),
  async (req, res) => {
    try {
      const existingImages = req.body.existingImages
        ? Array.isArray(req.body.existingImages)
          ? req.body.existingImages
          : [req.body.existingImages]
        : [];

      const uploadedImages = await uploadProductImages(req.files || []);

      const allImages = [...existingImages, ...uploadedImages];

      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name || req.body.nameTr || "",
          nameTr: req.body.nameTr || req.body.name || "",
          nameEn: req.body.nameEn || "",

          brand: req.body.brand || "",

          category: req.body.category || req.body.categoryTr || "",
          categoryTr: req.body.categoryTr || req.body.category || "",
          categoryEn: req.body.categoryEn || "",

          description: req.body.description || req.body.descriptionTr || "",
          descriptionTr: req.body.descriptionTr || req.body.description || "",
          descriptionEn: req.body.descriptionEn || "",

          priceNormal: Number(req.body.priceNormal || 0),
          priceLicensed: Number(req.body.priceLicensed || 0),
          networkProfitBase: Number(req.body.networkProfitBase || 0),

          stock: req.body.stock || "SÄ±nÄ±rsÄ±z",

          isActive:
            req.body.isActive === "true" ||
            req.body.isActive === true ||
            req.body.isActive === "on",

          images: allImages,
          image: allImages[0] || "",
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "ÃœrÃ¼n bulunamadÄ±" });
      }

      res.json({
        message: "ÃœrÃ¼n gÃ¼ncellendi",
        product: updated,
      });
    } catch (error) {
      console.error("ÃœrÃ¼n gÃ¼ncelleme hatasÄ±:", error);
      res.status(500).json({ message: "ÃœrÃ¼n gÃ¼ncellenemedi" });
    }
  }
);

/* ================= ADMIN - ÃœRÃœN SÄ°L ================= */

router.delete(
  "/products/:id",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("products"),
  async (req, res) => {
    try {
      const deleted = await Product.findByIdAndDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({ message: "ÃœrÃ¼n bulunamadÄ±" });
      }

      res.json({ message: "ÃœrÃ¼n silindi" });
    } catch (error) {
      console.error("ÃœrÃ¼n silme hatasÄ±:", error);
      res.status(500).json({ message: "ÃœrÃ¼n silinemedi" });
    }
  }
);

/* ================= FINANS YONETIMI ================= */

router.get(
  "/finance/overview",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("finance"),
  async (req, res) => {
    try {
      const [orders, products, users, transactions, withdrawals, refunds, auditEvents] = await Promise.all([
        Order.find()
          .sort({ createdAt: -1 })
          .populate("user", "username fullName email phone")
          .lean(),
        Product.find().sort({ createdAt: -1 }).lean(),
        User.find({ role: { $ne: "superadmin" } })
          .select("username fullName email phone walletBalance totalEarning monthlyEarning totalWithdrawn isActive license")
          .sort({ createdAt: -1 })
          .lean(),
        EarningTransaction.find({ status: { $ne: "cancelled" } })
          .sort({ createdAt: -1 })
          .limit(1000)
          .populate("beneficiary", "username fullName email")
          .populate("sourceUser", "username fullName")
          .lean(),
        WithdrawalRequest.find()
          .sort({ createdAt: -1 })
          .populate("user", "username fullName email")
          .populate("reviewedBy", "username fullName")
          .lean(),
        RefundRequest.find()
          .sort({ createdAt: -1 })
          .limit(250)
          .populate("user", "username fullName email")
          .populate("order", "orderNumber trackingCode total status paymentStatus items")
          .populate("reviewedBy", "username fullName")
          .lean(),
        FinancialAuditEvent.find()
          .sort({ createdAt: -1 })
          .limit(500)
          .populate("actor", "username fullName email")
          .lean(),
      ]);

      const paidOrders = orders.filter(
        (order) => order.paymentStatus === "paid" && order.status !== "cancelled"
      );
      const paidSales = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const pendingSales = orders
        .filter((order) => order.paymentStatus === "pending" && order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total || 0), 0);
      const invoicePending = paidOrders.filter(
        (order) => order.orderType === "product" && order.invoiceStatus !== "issued"
      ).length;

      const earningsByUser = new Map();
      for (const transaction of transactions) {
        const beneficiary = transaction.beneficiary;
        const userId = String(beneficiary?._id || transaction.beneficiary || "");
        if (!userId) continue;
        if (!earningsByUser.has(userId)) {
          earningsByUser.set(userId, { earned: 0, paid: 0, bySource: {}, recentSources: [] });
        }
        const summary = earningsByUser.get(userId);
        const amount = Number(transaction.amount || 0);
        summary.earned += amount;
        if (transaction.status === "paid") summary.paid += amount;
        summary.bySource[transaction.sourceType] =
          Number(summary.bySource[transaction.sourceType] || 0) + amount;
        if (summary.recentSources.length < 8) {
          summary.recentSources.push({
            id: transaction._id,
            sourceType: transaction.sourceType,
            sourceUsername:
              transaction.sourceUser?.username || transaction.sourceUsername || "Sistem",
            description: transaction.description || "",
            amount,
            status: transaction.status,
            createdAt: transaction.createdAt,
          });
        }
      }

      const productSales = new Map();
      for (const order of paidOrders) {
        if (order.orderType !== "product") continue;
        for (const item of order.items || []) {
          const productId = String(item.productId || "");
          if (!productId) continue;
          const current = productSales.get(productId) || { quantity: 0, revenue: 0 };
          current.quantity += Number(item.quantity || 0);
          current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
          productSales.set(productId, current);
        }
      }

      res.json({
        summary: {
          paidSales,
          pendingSales,
          invoicePending,
          totalEarnings: transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
          orderCount: orders.length,
          pendingPayoutCount: withdrawals.filter((item) => item.status === "pending").length,
          pendingPayoutAmount: withdrawals
            .filter((item) => item.status === "pending")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0),
          pendingRefundCount: refunds.filter((item) => item.status === "pending").length,
          pendingRefundAmount: refunds
            .filter((item) => item.status === "pending")
            .reduce((sum, item) => sum + Number(item.requestedAmount || 0), 0),
        },
        orders: orders.map(serializeFinanceOrder),
        products: products.map((product) => ({
          ...product,
          soldQuantity: productSales.get(String(product._id))?.quantity || 0,
          salesRevenue: productSales.get(String(product._id))?.revenue || 0,
        })),
        users: users.map((user) =>
          serializeFinanceUser(user, earningsByUser.get(String(user._id)) || {
            earned: 0,
            paid: 0,
            bySource: {},
            recentSources: [],
          })
        ),
        transactions,
        withdrawals,
        refunds,
        auditEvents,
      });
    } catch (error) {
      console.error("Finans ozeti alinamadi:", error);
      res.status(500).json({ message: "Finans verileri alinamadi" });
    }
  }
);

router.patch(
  "/finance/withdrawals/:id",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("finance"),
  async (req, res) => {
    try {
      const status = String(req.body?.status || "");
      const note = String(req.body?.note || "").trim();
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Geçersiz hak ediş talebi durumu" });
      }

      const request = await WithdrawalRequest.findOneAndUpdate(
        { _id: req.params.id, status: "pending" },
        {
          $set: {
            status,
            note,
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
          },
        },
        { new: true }
      ).populate("user", "username fullName email");

      if (!request) {
        return res.status(409).json({ message: "Talep bulunamadı veya daha önce sonuçlandırıldı" });
      }

      if (status === "rejected") {
        await User.findByIdAndUpdate(request.user._id, {
          $inc: { walletBalance: request.amount },
        });
      } else {
        await User.findByIdAndUpdate(request.user._id, {
          $inc: { totalWithdrawn: request.amount },
        });
      }

      await recordFinancialAudit({
        eventType: "withdrawal_request_updated",
        entityType: "withdrawal",
        entityId: request._id,
        actor: req.user._id,
        actorRole: req.user.role,
        amount: request.amount,
        before: { status: "pending" },
        after: { status, note },
        metadata: { userId: request.user?._id || request.user },
      });

      return res.json({
        message: status === "approved" ? "Hak ediş ödendi olarak işaretlendi" : "Talep reddedildi ve tutar bakiyeye iade edildi",
        request,
      });
    } catch (error) {
      console.error("Hak edis talebi guncelleme hatasi:", error);
      return res.status(500).json({ message: "Hak ediş talebi güncellenemedi" });
    }
  }
);

router.patch(
  "/finance/orders/:id",
  authRequired,
  adminOrSuperadmin,
  requireAdminPermission("finance"),
  async (req, res) => {
    try {
      const update = buildFinanceOrderUpdate(req.body);
      const previousOrder = await Order.findById(req.params.id);
      if (!previousOrder) return res.status(404).json({ message: "Siparis bulunamadi" });
      if (previousOrder.status === "cancelled" && update.status && update.status !== "cancelled") {
        return res.status(409).json({ message: "Iptal edilen siparis yeniden acilamaz" });
      }

      if (
        update.status === "cancelled" &&
        previousOrder.status !== "cancelled" &&
        !previousOrder.stockRestoredAt &&
        previousOrder.stockReservations?.length
      ) {
        await restoreOrderStock(previousOrder.stockReservations);
        update.stockRestoredAt = new Date();
      }

      let licenseActivation = null;
      if (
        update.paymentStatus === "paid" &&
        previousOrder.orderType === "license" &&
        previousOrder.licensePlan
      ) {
        if (previousOrder.licenseActivatedAt) {
          licenseActivation = await retryInitialUnilevelForActivatedLicense({
            userId: previousOrder.user,
          });
        } else if (previousOrder.paymentStatus !== "paid") {
          licenseActivation = await activateLicensePlanForUser({
            userId: previousOrder.user,
            planKey: previousOrder.licensePlan,
            paidAt: new Date(),
          });
          update.status = "completed";
          update.licenseActivatedAt = new Date();
        }
      }

      const order = await Order.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      }).populate("user", "username fullName email phone").lean();

      if (!order) return res.status(404).json({ message: "Siparis bulunamadi" });
      const productNetworkBonus =
        order.orderType === "product"
          ? order.paymentStatus === "refunded" || order.status === "cancelled"
            ? await cancelProductNetworkBonus(order._id)
            : await distributeProductNetworkBonus(order._id)
          : null;
      const academyEnrollment =
        order.orderType === "product"
          ? await syncAcademyEnrollmentsForOrder(order)
          : null;
      const monthlyLicenseActivation =
        order.orderType === "product" && order.paymentStatus === "paid"
          ? await activateMonthlyEducationLicenseForOrder({
              orderId: order._id,
              paidAt: new Date(),
            })
          : null;
      await recordFinancialAudit({
        eventType: "finance_order_updated",
        entityType: "order",
        entityId: order._id,
        actor: req.user._id,
        actorRole: req.user.role,
        amount: order.total,
        before: {
          paymentStatus: previousOrder.paymentStatus,
          status: previousOrder.status,
          invoiceIssued: previousOrder.invoiceIssued,
          invoiceNumber: previousOrder.invoiceNumber,
        },
        after: {
          paymentStatus: order.paymentStatus,
          status: order.status,
          invoiceIssued: order.invoiceIssued,
          invoiceNumber: order.invoiceNumber,
        },
        metadata: { changedFields: Object.keys(update) },
      });
      res.json({
        message: "Finans kaydi guncellendi",
        order: serializeFinanceOrder(order),
        licenseActivation,
        productNetworkBonus,
        academyEnrollment,
        monthlyLicenseActivation,
      });
    } catch (error) {
      console.error("Finans siparis guncelleme hatasi:", error);
      const isContractError = /Gecersiz|Guncellenecek/.test(error.message || "");
      res.status(isContractError ? 400 : 500).json({
        message: isContractError ? error.message : "Siparis guncellenemedi",
      });
    }
  }
);

export default router;

