// src/controllers/authController.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

function normalize(str) {
  return String(str || "").trim();
}

export async function register(req, res) {
  try {
    const username = normalize(req.body.username).toLowerCase();
    const email = normalize(req.body.email).toLowerCase();
    const fullName = normalize(req.body.fullName);
    const password = normalize(req.body.password);

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, password required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({
      $or: [{ username }, { email }],
    }).lean();

    if (exists) {
      return res.status(409).json({ message: "Username or email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      fullName,
      passwordHash,
      role: "user",
    });

    const token = signToken({ id: user._id.toString(), role: user.role, username: user.username });

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function login(req, res) {
  try {
    const identifier = normalize(req.body.identifier).toLowerCase(); // username veya email
    const password = normalize(req.body.password);

    if (!identifier || !password) {
      return res.status(400).json({ message: "identifier and password required" });
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "User is disabled" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user._id.toString(), role: user.role, username: user.username });

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function me(req, res) {
  // requireAuth middleware req.user dolduruyor
  const userId = req.user?.id;
  const user = await User.findById(userId).select("_id username email fullName role isActive").lean();
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({ user });
}
