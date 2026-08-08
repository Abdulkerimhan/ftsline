import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    textTr: { type: String, required: true, trim: true, maxlength: 160 },
    textEn: { type: String, trim: true, maxlength: 160, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    announcements: { type: [announcementSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("SiteSetting", siteSettingSchema);
