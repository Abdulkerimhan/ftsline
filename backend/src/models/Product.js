import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },

    images: { type: [String], default: [] },

    priceNormal: { type: Number, required: true },
    priceLicensed: { type: Number, required: true },

    desc: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 🔥 default export şart
export default mongoose.model("Product", ProductSchema);