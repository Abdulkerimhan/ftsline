// backend/src/seed/resetPassword.js
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function main() {
  const identifier = (process.argv[2] || "").trim().toLowerCase();
  const newPass = (process.argv[3] || "").trim();

  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");
  if (!identifier || !newPass) {
    console.log("Kullanım: node src/seed/resetPassword.js <emailOrUsername> <newPassword>");
    process.exit(1);
  }
  if (newPass.length < 6) {
    console.log("Şifre en az 6 karakter olmalı");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select("+passwordHash");
  if (!user) {
    console.log("User not found:", identifier);
    process.exit(1);
  }

  user.passwordHash = await bcrypt.hash(newPass, 10);
  await user.save();

  console.log("✅ Password reset ok for:", user.email, "role:", user.role);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ resetPassword error:", e.message);
  process.exit(1);
});
