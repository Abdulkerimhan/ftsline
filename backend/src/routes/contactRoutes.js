import express from "express";
import {
  notifyContactMessage,
  reportNotificationError,
} from "../services/adminNotificationService.js";

const router = express.Router();
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

router.post("/", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();
    const website = String(req.body?.website || "").trim();

    // Botlarin doldurdugu gorunmez alan. Gercek ziyaretcide her zaman bostur.
    if (website) {
      return res.status(200).json({ message: "Mesajiniz alindi." });
    }
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ message: "Ad soyad 2-100 karakter olmalidir." });
    }
    if (!EMAIL_REGEX.test(email) || email.length > 160) {
      return res.status(400).json({ message: "Gecerli bir e-posta adresi girin." });
    }
    if (phone.length > 30) {
      return res.status(400).json({ message: "Telefon bilgisi cok uzun." });
    }
    if (subject.length < 3 || subject.length > 160) {
      return res.status(400).json({ message: "Konu 3-160 karakter olmalidir." });
    }
    if (message.length < 10 || message.length > 3000) {
      return res.status(400).json({ message: "Mesaj 10-3000 karakter olmalidir." });
    }

    await notifyContactMessage({ name, email, phone, subject, message });
    return res.status(201).json({
      message: "Mesajiniz bize ulasti. En kisa surede size donecegiz.",
    });
  } catch (error) {
    reportNotificationError("CONTACT", error);
    return res.status(502).json({
      message: "Mesaj su anda gonderilemedi. Lutfen daha sonra tekrar deneyin.",
    });
  }
});

export default router;
