import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

    // snapshot
    name: { type: String, required: true },
    brand: { type: String, default: "" },
    category: { type: String, default: "" },
    image: { type: String, default: "" },

    qty: { type: Number, default: 1, min: 1 },

    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      default: "pending",
      enum: ["pending", "paid", "shipped", "delivered", "canceled", "refunded"],
      index: true,
    },

    items: { type: [OrderItemSchema], default: [] },

    currency: { type: String, default: "TRY" },

    subTotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // kargo
    trackingNo: { type: String, default: "" },
    shippingCompany: { type: String, default: "" },

    // adres (basit)
    address: {
      fullName: { type: String, default: "" },
      phone: { type: String, default: "" },
      city: { type: String, default: "" },
      district: { type: String, default: "" },
      fullAddress: { type: String, default: "" },
      note: { type: String, default: "" },
    },

    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);