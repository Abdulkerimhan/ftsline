import mongoose from "mongoose";

const adminPermissionValues = ["users", "products", "finance", "settings"];

const AddressSchema = new mongoose.Schema(
  {
    country: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true },
    zipCode: { type: String, default: "", trim: true },
    addressLine: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["individual", "company"],
      default: "individual",
    },
    fullName: { type: String, default: "", trim: true },
    companyName: { type: String, default: "", trim: true },
    taxOffice: { type: String, default: "", trim: true },
    taxNumber: { type: String, default: "", trim: true },
    tcNo: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true },
    zipCode: { type: String, default: "", trim: true },
    addressLine: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const CareerSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: [
        "NONE",
        "BRONZ",
        "GUMUS",
        "ALTIN",
        "PLATIN",
        "ELMAS",
        "TAC_ELMAS",
      ],
      default: "NONE",
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_.]+$/,
    },

    fullName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
    },

    legalAcceptance: {
      termsAcceptedAt: { type: Date, default: null },
      privacyNoticeAcknowledgedAt: { type: Date, default: null },
      termsVersion: { type: String, default: "" },
      privacyVersion: { type: String, default: "" },
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

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    loginLockedUntil: {
      type: Date,
      default: null,
      select: false,
    },

    resetCode: {
      type: String,
      default: "",
      select: false,
    },

    resetCodeExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    adminPermissions: {
      type: [String],
      enum: adminPermissionValues,
      default: () => [...adminPermissionValues],
    },

    sponsor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    matrixParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    matrixPosition: {
      type: String,
      enum: ["", "left", "right"],
      default: "",
    },

    matrixDepth: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    teamCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    career: {
      type: CareerSchema,
      default: () => ({}),
    },

    careerLevel: {
      type: String,
      enum: [
        "NONE",
        "BRONZ",
        "GUMUS",
        "ALTIN",
        "PLATIN",
        "ELMAS",
        "TAC_ELMAS",
        "starter",
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
      ],
      default: "NONE",
    },

    isLicensed: {
      type: Boolean,
      default: false,
    },

    licenseStartedAt: {
      type: Date,
      default: null,
    },

    licenseExpiresAt: {
      type: Date,
      default: null,
    },

    unilevelInitialBonusPaidAt: {
      type: Date,
      default: null,
    },

    licensePlan: {
      type: String,
      enum: ["", "initial", "annual", "biennial"],
      default: "",
    },

    licensePlanPaidAmountUsdt: {
      type: Number,
      default: 0,
      min: 0,
    },

    licenseMatrixPayoutsTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    licenseMatrixPayoutsPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    licenseNextMatrixPayoutAt: {
      type: Date,
      default: null,
    },

    licenseLastMatrixPayoutAt: {
      type: Date,
      default: null,
    },

    isContractedDiamond: {
      type: Boolean,
      default: false,
    },

    contractedDiamondSignedAt: {
      type: Date,
      default: null,
    },

    usdtTrc20Address: {
      type: String,
      default: "",
      trim: true,
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalEarning: {
      type: Number,
      default: 0,
      min: 0,
    },

    monthlyEarning: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },

    referralCode: {
      type: String,
      default: undefined,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: AddressSchema,
      default: () => ({}),
    },

    invoice: {
      type: InvoiceSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetCode;
  delete obj.resetCodeExpiresAt;
  delete obj.failedLoginAttempts;
  delete obj.loginLockedUntil;
  return obj;
};

export default mongoose.model("User", UserSchema);


