import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const exists = await User.findOne({ email: "admin@ftsline.net" });

    if (exists) {
      console.log("Admin zaten var");
      process.exit();
    }

    const passwordHash = await bcrypt.hash("123456", 10);

    await User.create({
      username: "admin",
      fullName: "FTSLine Admin",
      email: "admin@ftsline.net",
      passwordHash,
      role: "admin",
      isActive: true,
      isLicensed: true,
    });

    console.log("Admin oluşturuldu");
    console.log("Email: admin@ftsline.net");
    console.log("Şifre: 123456");

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedAdmin();