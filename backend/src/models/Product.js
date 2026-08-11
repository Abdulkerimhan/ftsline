import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    nameTr: {
      type: String,
      default: "",
      trim: true,
    },

    nameEn: {
      type: String,
      default: "",
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    categoryTr: {
      type: String,
      default: "",
      trim: true,
    },

    categoryEn: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    descriptionTr: {
      type: String,
      default: "",
      trim: true,
    },

    descriptionEn: {
      type: String,
      default: "",
      trim: true,
    },

    images: {
      type: [String],
      default: [],
    },

    priceNormal: {
      type: Number,
      required: true,
      min: 0,
    },

    priceLicensed: {
      type: Number,
      required: true,
      min: 0,
    },

    // Urun ve satis masraflari dusuldukten sonra yonetimin kabul ettigi,
    // ag dagitimlarina esas birim net kar tutari.
    networkProfitBase: {
      type: Number,
      default: 0,
      min: 0,
    },

    stock: {
      type: String,
      default: "Sınırsız",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
