import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?._id || null;
}

/* =========================
   GET CART
========================= */
router.get("/", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    let cart = await Cart.findOne({ user: userId }).lean();

    if (!cart) {
      cart = { user: userId, items: [] };
    }

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   ADD TO CART
========================= */
router.post("/add", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    const productId = String(req.body?.productId || "");
    const qty = Math.max(1, Number(req.body?.qty || 1));

    if (!productId) {
      return res.status(400).json({ ok: false, message: "productId zorunlu" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ ok: false, message: "Ürün bulunamadı" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    const idx = cart.items.findIndex(
      (x) => String(x.product) === String(product._id)
    );

    const itemPayload = {
      product: product._id,
      qty,
      priceNormal: Number(product.priceNormal ?? product.normalPrice ?? product.price ?? 0),
      priceLicensed: Number(product.priceLicensed ?? product.licensedPrice ?? 0),
      name: product.name || "Ürün",
      image: (product.images && product.images[0]) || product.image || "",
      brand: product.brand || "",
      category: product.category || "",
    };

    if (idx >= 0) {
      cart.items[idx].qty = Number(cart.items[idx].qty || 0) + qty;
    } else {
      cart.items.push(itemPayload);
    }

    await cart.save();

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   UPDATE QTY
========================= */
router.put("/item/:productId", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const productId = String(req.params.productId || "");
    const qty = Math.max(1, Number(req.body?.qty || 1));

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ ok: false, message: "Sepet bulunamadı" });
    }

    const idx = cart.items.findIndex(
      (x) => String(x.product) === String(productId)
    );

    if (idx < 0) {
      return res.status(404).json({ ok: false, message: "Sepet ürünü bulunamadı" });
    }

    cart.items[idx].qty = qty;
    await cart.save();

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   REMOVE ITEM
========================= */
router.delete("/item/:productId", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const productId = String(req.params.productId || "");

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ ok: false, message: "Sepet bulunamadı" });
    }

    cart.items = cart.items.filter(
      (x) => String(x.product) !== String(productId)
    );

    await cart.save();

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   CLEAR CART
========================= */
router.delete("/clear", auth, async (req, res) => {
  try {
    const userId = getUserId(req);

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    } else {
      cart.items = [];
      await cart.save();
    }

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

export default router;import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?._id || null;
}

/* =========================
   GET CART
========================= */
router.get("/", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    let cart = await Cart.findOne({ user: userId }).lean();

    if (!cart) {
      cart = { user: userId, items: [] };
    }

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   ADD TO CART
========================= */
router.post("/add", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }

    const productId = String(req.body?.productId || "");
    const qty = Math.max(1, Number(req.body?.qty || 1));

    if (!productId) {
      return res.status(400).json({ ok: false, message: "productId zorunlu" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ ok: false, message: "Ürün bulunamadı" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    const idx = cart.items.findIndex(
      (x) => String(x.product) === String(product._id)
    );

    const itemPayload = {
      product: product._id,
      qty,
      priceNormal: Number(product.priceNormal ?? product.normalPrice ?? product.price ?? 0),
      priceLicensed: Number(product.priceLicensed ?? product.licensedPrice ?? 0),
      name: product.name || "Ürün",
      image: (product.images && product.images[0]) || product.image || "",
      brand: product.brand || "",
      category: product.category || "",
    };

    if (idx >= 0) {
      cart.items[idx].qty = Number(cart.items[idx].qty || 0) + qty;
    } else {
      cart.items.push(itemPayload);
    }

    await cart.save();

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   UPDATE QTY
========================= */
router.put("/item/:productId", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const productId = String(req.params.productId || "");
    const qty = Math.max(1, Number(req.body?.qty || 1));

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ ok: false, message: "Sepet bulunamadı" });
    }

    const idx = cart.items.findIndex(
      (x) => String(x.product) === String(productId)
    );

    if (idx < 0) {
      return res.status(404).json({ ok: false, message: "Sepet ürünü bulunamadı" });
    }

    cart.items[idx].qty = qty;
    await cart.save();

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   REMOVE ITEM
========================= */
router.delete("/item/:productId", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const productId = String(req.params.productId || "");

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ ok: false, message: "Sepet bulunamadı" });
    }

    cart.items = cart.items.filter(
      (x) => String(x.product) !== String(productId)
    );

    await cart.save();

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

/* =========================
   CLEAR CART
========================= */
router.delete("/clear", auth, async (req, res) => {
  try {
    const userId = getUserId(req);

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    } else {
      cart.items = [];
      await cart.save();
    }

    return res.json({ ok: true, cart });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Sunucu hatası" });
  }
});

export default router;