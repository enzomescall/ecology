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
    console.log(`[EMAIL] Using Ethereal test account for development mail delivery.`);
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

function getLoginUrl(): string {
  return process.env.ECOLOGY_PUBLIC_URL ?? "https://enzom.duckdns.org/ecology/";
}

export function buildInviteEmailHtml(inviterName: string, gameName: string): string {
  const loginUrl = getLoginUrl();
  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 24px;">
      <h2 style="color: #2d5a2d;">Ecology</h2>
      <p><strong>${inviterName}</strong> invited you to join <strong>${gameName}</strong>!</p>
      <p>Log in to Ecology to accept the invite and start playing.</p>
      <p><a href="${loginUrl}" style="display: inline-block; padding: 12px 16px; background: #2d5a2d; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Log in to Ecology</a></p>
      <p style="color: #666; font-size: 14px;">If the button does not work, copy and paste this link into your browser: <a href="${loginUrl}">${loginUrl}</a></p>
    </div>
  `;
}

export async function sendInviteEmail(to: string, inviterName: string, gameName: string): Promise<void> {
  await send(to, `${inviterName} invited you to play Ecology`, buildInviteEmailHtml(inviterName, gameName));
}

export function buildTurnReminderEmailHtml(gameName: string, round: number, turn: number): string {
  const loginUrl = getLoginUrl();
  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 24px;">
      <h2 style="color: #2d5a2d;">Ecology</h2>
      <p>It is time to play your move in <strong>${gameName}</strong>.</p>
      <p><strong>Round ${round}, Turn ${turn}</strong> is ready.</p>
      <p><a href="${loginUrl}" style="display: inline-block; padding: 12px 16px; background: #2d5a2d; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Play your turn</a></p>
      <p style="color: #666; font-size: 14px;">If the button does not work, copy and paste this link into your browser: <a href="${loginUrl}">${loginUrl}</a></p>
    </div>
  `;
}

export async function sendTurnReminderEmail(to: string, gameName: string, round: number, turn: number): Promise<void> {
  await send(to, `Your turn in Ecology: ${gameName}`, buildTurnReminderEmailHtml(gameName, round, turn));
}
