import Product from "../models/Product.js";

const UNLIMITED_STOCK_VALUES = new Set(["sınırsız", "sinirsiz", "unlimited"]);

export function parseFiniteStock(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || UNLIMITED_STOCK_VALUES.has(normalized.toLocaleLowerCase("tr-TR"))) {
    return null;
  }

  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

async function changeFiniteStock(productId, quantity, direction) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const product = await Product.findById(productId).select("nameTr name stock");
    if (!product) throw new Error("Siparisteki urun bulunamadi");

    const currentStock = parseFiniteStock(product.stock);
    if (currentStock === null) return false;

    const nextStock = currentStock + direction * quantity;
    if (nextStock < 0) {
      const error = new Error(
        `${product.nameTr || product.name || "Urun"} icin yeterli stok yok. Mevcut stok: ${currentStock}`
      );
      error.code = "INSUFFICIENT_STOCK";
      throw error;
    }

    const updated = await Product.updateOne(
      { _id: product._id, stock: product.stock },
      { $set: { stock: String(nextStock) } }
    );
    if (updated.modifiedCount === 1) return true;
  }

  throw new Error("Stok ayni anda degistirildi. Lutfen tekrar deneyin.");
}

export async function reserveOrderStock(items = []) {
  const reservations = [];

  try {
    for (const item of items) {
      const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
      const changed = await changeFiniteStock(item.productId, quantity, -1);
      if (changed) reservations.push({ productId: item.productId, quantity });
    }
    return reservations;
  } catch (error) {
    await restoreOrderStock(reservations);
    throw error;
  }
}

export async function restoreOrderStock(reservations = []) {
  for (const reservation of reservations) {
    await changeFiniteStock(reservation.productId, Number(reservation.quantity || 0), 1);
  }
}
