// backend/src/services/careerCron.js
import User from "../models/User.js";
import { updateUserCareer } from "./careerService.js";

export async function runCareerMonthlyUpdate() {
  console.log("🕒 Career monthly update started");

  const users = await User.find({}).select("_id").lean();

  let changed = 0;
  for (const u of users) {
    const res = await updateUserCareer(u._id);
    if (res.changed) changed += 1;
  }

  console.log(`✅ Career monthly update finished. Changed: ${changed}/${users.length}`);
}
