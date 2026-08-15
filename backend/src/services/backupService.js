import fs from "node:fs/promises";
import path from "node:path";
import { gzip as gzipCallback } from "node:zlib";
import { promisify } from "node:util";
import mongoose from "mongoose";

const gzip = promisify(gzipCallback);

function backupDirectory() {
  return path.resolve(process.env.BACKUP_DIR || "backups");
}

async function enforceRetention(directory) {
  const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS || 14));
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(files
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json.gz"))
    .map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs < cutoff) await fs.unlink(filePath);
    }));
}

export async function createDatabaseBackup() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error("MongoDB baglantisi hazir degil.");
  }
  const directory = backupDirectory();
  await fs.mkdir(directory, { recursive: true });
  const collections = await mongoose.connection.db.listCollections().toArray();
  const data = {};
  for (const collection of collections) {
    data[collection.name] = await mongoose.connection.db
      .collection(collection.name)
      .find({})
      .toArray();
  }
  const createdAt = new Date();
  const payload = {
    format: "ftsline-mongodb-backup-v1",
    database: mongoose.connection.name,
    createdAt: createdAt.toISOString(),
    collections: data,
  };
  const fileName = `ftsline-${createdAt.toISOString().replace(/[:.]/g, "-")}.json.gz`;
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, await gzip(Buffer.from(JSON.stringify(payload))));
  await enforceRetention(directory);
  return filePath;
}

export function startBackupScheduler() {
  if (String(process.env.BACKUP_ENABLED || "").toLowerCase() !== "true") return null;
  const intervalHours = Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS || 24));
  const run = () => createDatabaseBackup()
    .then((filePath) => console.log(`Yedek olusturuldu: ${filePath}`))
    .catch((error) => console.error("Yedekleme hatasi:", error));
  const initialTimer = setTimeout(run, 15_000);
  initialTimer.unref?.();
  const timer = setInterval(run, intervalHours * 60 * 60 * 1000);
  timer.unref?.();
  return timer;
}
