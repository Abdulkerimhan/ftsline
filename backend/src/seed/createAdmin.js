import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../db/connect.js";
import User from "../models/User.js";

dotenv.config();

const run = async () => {
  await connectDB();

  const email = "ftsline@ftsline.net";
  const username = "ftsline";
  const password = "ftsline";

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) {
    exists.role = "admin"; // veya "superadmin"
    await exists.save();
    console.log("✅ Updated existing user to admin:", exists.email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email,
    fullName: "FTS Line",
    passwordHash,
    role: "admin", // veya "superadmin"
    isActive: true,
  });

  console.log("✅ Admin created:", user.email);
  process.exit(0);
};

run().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
});
