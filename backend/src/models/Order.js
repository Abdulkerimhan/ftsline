import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    normalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    licensedPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    networkBonusBase: {
      type: Number,
      default: 0,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const shippingInfoSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "Sipariş en az 1 ürün içermelidir.",
      },
    },

    shippingInfo: {
      type: shippingInfoSchema,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    orderType: {
      type: String,
      enum: ["product", "license"],
      default: "product",
      index: true,
    },

    licensePlan: {
      type: String,
      enum: ["", "initial", "annual", "biennial"],
      default: "",
    },

    licenseMonths: {
      type: Number,
      default: 0,
      min: 0,
    },

    licenseAmountUsdt: {
      type: Number,
      default: 0,
      min: 0,
    },

    licenseActivatedAt: {
      type: Date,
      default: null,
    },

    monthlyLicenseActivatedAt: {
      type: Date,
      default: null,
    },

    monthlyLicenseMonths: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "preparing", "shipped", "completed", "cancelled"],
      default: "pending",
    },

    shippingCarrier: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },

    cargoTrackingNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    paymentMethod: {
      type: String,
      enum: ["card", "cash_on_delivery", "bank_transfer", "usdt_trc20"],
      default: "card",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
    },
    paymentProof: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    legalAcceptance: {
      preInformationAcceptedAt: { type: Date, required: true },
      distanceSalesAcceptedAt: { type: Date, required: true },
      preInformationVersion: { type: String, required: true, default: "2026-08-11" },
      distanceSalesVersion: { type: String, required: true, default: "2026-08-11" },
      ipAddress: { type: String, default: "", trim: true },
    },

    paymentNetwork: {
      type: String,
      enum: ["", "TRC20"],
      default: "",
    },

    paymentAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    invoiceStatus: {
      type: String,
      enum: ["pending", "issued"],
      default: "pending",
      index: true,
    },

    invoiceNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    invoiceIssuedAt: {
      type: Date,
      default: null,
    },

    invoiceNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    stockReservations: {
      type: [
        {
          _id: false,
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],
      default: [],
    },

    stockRestoredAt: {
      type: Date,
      default: null,
    },

    productNetworkDistributedAt: {
      type: Date,
      default: null,
    },

    productNetworkMode: {
      type: String,
      enum: ["", "normal_gap", "licensed_sale"],
      default: "",
    },

    productNetworkCancelledAt: {
      type: Date,
      default: null,
    },
    refundRequestedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
