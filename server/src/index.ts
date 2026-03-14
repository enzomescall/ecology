import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import gameRouter from "./routes/games.js";
import authRouter from "./routes/auth.js";
import { initEmailService } from "./services/emailService.js";

dotenv.config();

await initEmailService();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/game", gameRouter);
app.use("/api/auth", authRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
