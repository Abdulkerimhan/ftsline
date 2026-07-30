import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    videoUrl: { type: String, default: "", trim: true },
    documentUrl: { type: String, default: "", trim: true },
    durationMinutes: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const academyCourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 3000 },
    category: { type: String, default: "E-Ticaret", trim: true, maxlength: 100 },
    coverImage: { type: String, default: "", trim: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    products: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    lessons: { type: [lessonSchema], default: [] },
  },
  { timestamps: true }
);

academyCourseSchema.index({ isPublished: 1, order: 1, createdAt: 1 });

export default mongoose.model("AcademyCourse", academyCourseSchema);
