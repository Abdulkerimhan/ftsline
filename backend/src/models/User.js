import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    fullName: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      default: "user",
      enum: ["user", "admin", "superadmin"],
    },

    permissions: {
      type: [String],
      default: [],
    },

    sponsor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    teamCount: {
      type: Number,
      default: 0,
    },

    isLicensed: {
      type: Boolean,
      default: false,
    },

    licenseExpiresAt: {
      type: Date,
      default: null,
    },

    profile: {
      birthDate: { type: Date, default: null },
      nationality: { type: String, default: "" },

      addressLine: { type: String, default: "" },
      city: { type: String, default: "" },
      district: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "TR" },

      stateCode: { type: String, default: "" },
      phoneCode: { type: String, default: "" },
    },

    invoice: {
      name: { type: String, default: "" },
      taxNo: { type: String, default: "" },
      taxOffice: { type: String, default: "" },

      addressLine: { type: String, default: "" },
      city: { type: String, default: "" },
      district: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "TR" },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

UserSchema.index({ sponsor: 1, createdAt: -1 });
UserSchema.index({ role: 1 });
UserSchema.index({ permissions: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);