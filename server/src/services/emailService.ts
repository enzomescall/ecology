import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

const FROM = process.env.EMAIL_FROM || "Ecosystem <noreply@ecosystem.game>";

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.log(`[DEV] Email to ${to}: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

export async function sendOTCEmail(to: string, code: string): Promise<void> {
  await send(to, `Your Ecosystem login code: ${code}`, `
    <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 24px;">
      <h2 style="color: #2d5a2d;">Ecosystem</h2>
      <p>Your one-time login code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f5f5f0; border-radius: 8px; text-align: center;">${code}</div>
      <p style="color: #888; font-size: 14px; margin-top: 16px;">This code expires in 15 minutes.</p>
    </div>
  `);
}

export async function sendInviteEmail(to: string, inviterName: string, gameName: string): Promise<void> {
  await send(to, `${inviterName} invited you to play Ecosystem`, `
    <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 24px;">
      <h2 style="color: #2d5a2d;">Ecosystem</h2>
      <p><strong>${inviterName}</strong> invited you to join <strong>${gameName}</strong>!</p>
      <p>Log in to Ecosystem to accept the invite and start playing.</p>
    </div>
  `);
}
