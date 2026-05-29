import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.use(morgan("dev"));

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, message: "FTSLine backend çalışıyor" });
});

app.use("/api/auth", authRoutes);

export default app;