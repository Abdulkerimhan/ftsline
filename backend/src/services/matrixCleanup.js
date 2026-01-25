export async function removeExpiredPending(now = new Date()) {
  console.log("🧹 removeExpiredPending çalıştı:", now.toISOString());
  return true;
}
