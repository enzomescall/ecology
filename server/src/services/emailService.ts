import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter;
let from: string;

export async function initEmailService(): Promise<void> {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
    from = process.env.EMAIL_FROM || "Ecology <noreply@ecology.game>";
  } else {
    const account = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    });
    from = "Ecology <dev@ethereal.email>";
    console.log(`[EMAIL] Using Ethereal test account: ${account.user}`);
    console.log(`[EMAIL] View sent emails at https://ethereal.email/login`);
    console.log(`[EMAIL]   User: ${account.user}`);
    console.log(`[EMAIL]   Pass: ${account.pass}`);
  }
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const info = await transporter.sendMail({ from, to, subject, html });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EMAIL] Sent to ${to}: ${previewUrl}`);
  }
}

export async function sendOTCEmail(to: string, code: string): Promise<void> {
  await send(to, `Your Ecology login code: ${code}`, `
    <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 24px;">
      <h2 style="color: #2d5a2d;">Ecology</h2>
      <p>Your one-time login code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f5f5f0; border-radius: 8px; text-align: center;">${code}</div>
      <p style="color: #888; font-size: 14px; margin-top: 16px;">This code expires in 15 minutes.</p>
    </div>
  `);
}

export async function sendInviteEmail(to: string, inviterName: string, gameName: string): Promise<void> {
  await send(to, `${inviterName} invited you to play Ecology`, `
    <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 24px;">
      <h2 style="color: #2d5a2d;">Ecology</h2>
      <p><strong>${inviterName}</strong> invited you to join <strong>${gameName}</strong>!</p>
      <p>Log in to Ecology to accept the invite and start playing.</p>
    </div>
  `);
}
