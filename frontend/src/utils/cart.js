function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.error("User parse hatası:", error);
    return null;
  }
}

function getCartKey() {
  const user = getCurrentUser();

  if (user?._id) {
    return `cart_${user._id}`;
  }

  if (user?.username) {
    return `cart_${user.username}`;
  }

  return "cart_guest";
}

function saveCart(cart) {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
  window.dispatchEvent(new Event("cartUpdated"));
}

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(getCartKey()) || "[]");
  } catch (error) {
    console.error("Cart parse hatası:", error);
    return [];
  }
}

export function getCartCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
}

export function getCartTotal() {
  const cart = getCart();

  return cart.reduce((total, item) => {
    const fallbackPrice =
      Number(item.selectedPrice) ||
      Number(item.price) ||
      Number(item.priceNormal) ||
      0;

    const qty = Number(item.quantity || 1);

    return total + fallbackPrice * qty;
  }, 0);
}

export function addToCart(product, isLicensed = false) {
  if (!product || !product._id) return;

  const cart = getCart();

  const selectedPrice =
    isLicensed && Number(product.priceLicensed) > 0
      ? Number(product.priceLicensed)
      : Number(product.priceNormal) || 0;

  const existingIndex = cart.findIndex((item) => item._id === product._id);

  if (existingIndex !== -1) {
    cart[existingIndex].quantity = Number(cart[existingIndex].quantity || 1) + 1;
  } else {
    cart.push({
      ...product,
      quantity: 1,
      selectedPrice,
    });
  }

  saveCart(cart);
}

export function removeFromCart(productId) {
  const cart = getCart().filter((item) => item._id !== productId);
  saveCart(cart);
}

export function increaseQty(productId) {
  const cart = getCart().map((item) =>
    item._id === productId
      ? { ...item, quantity: Number(item.quantity || 1) + 1 }
      : item
  );

  saveCart(cart);
}

export function decreaseQty(productId) {
  let cart = getCart().map((item) =>
    item._id === productId
      ? { ...item, quantity: Number(item.quantity || 1) - 1 }
      : item
  );

  cart = cart.filter((item) => item.quantity > 0);

  saveCart(cart);
}

export function clearCart() {
  saveCart([]);
}