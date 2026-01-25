import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function run() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.log("❌ MONGO_URI / MONGODB_URI missing in .env");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");

  const email = "ftsline@ftsline.net";
  const newPassword = "YeniSifre123";

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    console.log("❌ User not found:", email);
    process.exit(1);
  }

  user.role = "superadmin";
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  console.log(`✅ Updated: ${email} -> superadmin (password reset ok: ${newPassword})`);
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
});
