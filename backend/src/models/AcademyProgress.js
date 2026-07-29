import mongoose from "mongoose";

const academyProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademyCourse",
      required: true,
      index: true,
    },
    completedLessonIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    lastLessonId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

academyProgressSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model("AcademyProgress", academyProgressSchema);
