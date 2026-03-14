import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import gameRouter from "./routes/games.js";
import authRouter from "./routes/auth.js";
import { initEmailService } from "./services/emailService.js";

dotenv.config();

await initEmailService();

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

const app = express();

// Security headers (disable CSP in dev to avoid blocking Vite HMR)
app.use(isProd ? helmet() : helmet({ contentSecurityPolicy: false }));

// CORS — allow same-origin in prod (no header needed), dev frontend origin otherwise
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: isProd ? clientOrigin : true, credentials: false }));

app.use(express.json());

// Rate limiting on auth endpoints — prevent OTC brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/auth", authLimiter);

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.use("/api/game", gameRouter);
app.use("/api/auth", authRouter);

// Serve React frontend in production
if (isProd) {
  const clientDist = join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_, res) => res.sendFile(join(clientDist, "index.html")));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
