import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  executeLiveDataReset,
  getLiveResetScope,
  LIVE_RESET_CONFIRMATION,
} from "../services/liveDataResetService.js";

dotenv.config();

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI tanimli degil.");

  await mongoose.connect(process.env.MONGO_URI);
  const execute = process.argv.includes(`--execute=${LIVE_RESET_CONFIRMATION}`);

  if (!execute) {
    const scope = await getLiveResetScope();
    console.log("KORUNACAK HESAP:", scope.survivor);
    console.log("SILINECEK KAYITLAR:", scope.counts);
    console.log("ONIZLEME TAMAMLANDI. Hicbir veri silinmedi.");
    console.log(
      `Uygulamak icin: node src/scripts/resetLiveData.js --execute=${LIVE_RESET_CONFIRMATION}`
    );
    return;
  }

  const result = await executeLiveDataReset(LIVE_RESET_CONFIRMATION);
  console.log("TEMIZLIK SONUCU:", result);
  console.log("CANLI VERI TEMIZLIGI TAMAMLANDI.");
}

main()
  .catch((error) => {
    console.error("RESET_ABORTED:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
