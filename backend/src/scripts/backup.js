import "dotenv/config";
import mongoose from "mongoose";
import { createDatabaseBackup } from "../services/backupService.js";

try {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI tanimli degil.");
  await mongoose.connect(process.env.MONGO_URI);
  const filePath = await createDatabaseBackup();
  console.log(`Yedek tamamlandi: ${filePath}`);
  await mongoose.disconnect();
} catch (error) {
  console.error("Yedekleme basarisiz:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
