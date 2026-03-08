const CART_KEY = "fts_cart_v1";

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  const arr = raw ? safeParse(raw) : [];
  return Array.isArray(arr) ? arr : [];
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(cart) ? cart : []));
  window.dispatchEvent(new Event("cart:updated"));
}

export function addToCart(product, qty = 1) {
  const cart = getCart();

  const id = String(product?._id || product?.id || product?.productId || "");
  if (!id) throw new Error("Ürün ID bulunamadı");

  const found = cart.find((x) => String(x.id) === id);

  const item = {
    id,
    name: product?.name || product?.title || "Ürün",
    brand: product?.brand || "",
    category: product?.category || "",
    image: (product?.images && product.images[0]) || product?.image || product?.cover || "",
    priceNormal: Number(product?.priceNormal ?? product?.normalPrice ?? product?.price ?? 0),
    priceLicensed: Number(product?.priceLicensed ?? product?.licensedPrice ?? 0),
    qty: Math.max(1, Number(qty || 1)),
  };

  if (found) {
    found.qty = Number(found.qty || 0) + item.qty;
  } else {
    cart.push(item);
  }

  saveCart(cart);
}

export function removeFromCart(id) {
  const cart = getCart().filter((x) => String(x.id) !== String(id));
  saveCart(cart);
}

export function updateCartQty(id, qty) {
  const cart = getCart().map((x) =>
    String(x.id) === String(id)
      ? { ...x, qty: Math.max(1, Number(qty || 1)) }
      : x
  );

  saveCart(cart);
}

export function clearCart() {
  saveCart([]);
}

export function getCartCount() {
  return getCart().reduce((sum, x) => sum + Number(x.qty || 0), 0);
}