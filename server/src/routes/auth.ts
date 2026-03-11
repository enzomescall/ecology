import { Router } from "express";
import { z } from "zod";
import { generateOTC, verifyOTC } from "../services/authService.js";

const router = Router();

const sendCodeSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
});

const verifySchema = z.object({
  email: z.email(),
  code: z.string().length(6),
});

router.post("/send-code", async (req, res) => {
  const result = sendCodeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", issues: result.error.issues });
    return;
  }
  await generateOTC(result.data.email, result.data.name);
  res.json({ success: true });
});

router.post("/verify", (req, res) => {
  const result = verifySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", issues: result.error.issues });
    return;
  }
  const user = verifyOTC(result.data.email, result.data.code);
  if (!user) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }
  res.json(user);
});

export default router;
