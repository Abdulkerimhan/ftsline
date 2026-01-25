// backend/src/controllers/paymentController.js
import User from "../models/User.js";
import MatrixNode from "../models/MatrixNode.js";
import { distributeMatrixMonthlyBonus } from "../services/matrixPayoutService.js";
import { verifyTrc20UsdtTransfer } from "../services/verifyTrc20Transfer.js";

function getYm(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function createMonthlyPayment(req, res) {
  try {
    const {
      userId,
      amount = 14.99,
      txHash,
      paidAt, // opsiyonel
    } = req.body;

    if (!userId) return res.status(400).json({ ok: false, message: "userId zorunlu" });
    if (!txHash) return res.status(400).json({ ok: false, message: "txHash zorunlu" });

    const now = paidAt ? new Date(paidAt) : new Date();
    const monthKey = getYm(now);

    // 1) user kontrol
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: "User bulunamadı" });

    // 2) aynı ay double ödeme engeli
    const alreadyPaidThisMonth = user.payments?.some(
      (p) => p.type === "MONTHLY" && p.monthKey === monthKey
    );
    if (alreadyPaidThisMonth) {
      return res.status(409).json({ ok: false, message: `Bu ay (${monthKey}) zaten ödenmiş` });
    }

    // 3) txHash doğrula (şirket adresine gelmiş mi? tutar doğru mu?)
    const verify = await verifyTrc20UsdtTransfer({
      txHash,
      expectedToAddress: process.env.COMPANY_TRC20_USDT_ADDRESS,
      expectedAmount: Number(amount),
      contractAddress: process.env.TRC20_USDT_CONTRACT,
      fullHost: process.env.TRON_FULL_HOST,
      tronApiKey: process.env.TRON_API_KEY,
    });

    if (!verify.ok) {
      return res.status(400).json({
        ok: false,
        message: "Ödeme doğrulanamadı",
        verify,
      });
    }

    // 4) Ödeme kaydı + aktiflik
    user.payments.push({
      type: "MONTHLY",
      amount: Number(amount),
      currency: "USDT",
      network: "TRC20",
      paidAt: now,
      monthKey,
      txHash,
    });

    user.isActive = true;
    user.lastMonthlyPaidAt = now;
    user.lastPaidYm = monthKey;
    user.missedMonthsStreak = 0;

    await user.save();

    // 5) Matrix node PENDING ise ACTIVE yap (1 hafta içinde ödeyen yerini korur)
    const matrixId = process.env.MATRIX_ID || "MAIN";
    await MatrixNode.updateMany(
      { matrixId, userId: user._id, status: "PENDING" },
      { $set: { status: "ACTIVE" } }
    );

    // 6) Matrix %3 dağıtımı
    const payout = await distributeMatrixMonthlyBonus({
      payerUserId: user._id,
      amount: Number(amount),
      matrixId,
      paidAt: now,
    });

    return res.json({
      ok: true,
      message: "MONTHLY ödeme doğrulandı ve işlendi",
      monthKey,
      verify,
      payout,
    });
  } catch (err) {
    console.error("createMonthlyPayment error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
}
