import { getOrCreateUser } from "../data/userStore.js";
import { sendOTCEmail } from "./emailService.js";

interface OTCEntry {
  code: string;
  name: string;
  expiresAt: Date;
}

const otcStore = new Map<string, OTCEntry>();

export async function generateOTC(email: string, name: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otcStore.set(email, { code, name, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
  console.log(`[DEV] OTC for ${email}: ${code}`);
  await sendOTCEmail(email, code);
  return code;
}

export function verifyOTC(email: string, code: string): { userId: string; email: string; name: string } | null {
  const entry = otcStore.get(email);
  if (!entry || entry.code !== code || entry.expiresAt < new Date()) return null;

  otcStore.delete(email);
  const user = getOrCreateUser(email, entry.name);
  return { userId: user.userId, email: user.email, name: user.name };
}
