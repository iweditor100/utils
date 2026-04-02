import nodemailer from "nodemailer";
import { createChildLogger } from "../../../logger";

const log = createChildLogger("email");

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export const emailService = {
  async sendVerificationEmail({ to, token }: { to: string; token: string }) {
    if (!to || !token) return;
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject: "Verify your email",
        text: `Verify your account: ${process.env.FRONTEND_ORIGIN_use}/verify-email?token=${token}`,
        html: `<p>Verify your account: <a href='${process.env.FRONTEND_ORIGIN_use}/verify-email?token=${token}'>Verify Email, This email verification link is only valid for 15 mins.</a></p>`
      });
    } catch (e) {
      // Never throw: mail failure cannot leak
    }
  },
  async sendResetPasswordEmail({ to, token }: { to: string; token: string }) {
    if (!to || !token) return;
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject: "Reset your password",
        text: `Reset your password: ${process.env.FRONTEND_ORIGIN_use}/reset-password?token=${token}`,
        html: `<p>Reset your password: <a href='${process.env.FRONTEND_ORIGIN_use}/reset-password?token=${token}'>Reset Password</a></p>`
      });
    } catch (e) {
      // Never throw: mail failure cannot leak
    }
  },

  async sendZipReadyEmail({ to, jobId }: { to: string; jobId: string }) {
    if (!to || !jobId) return;
    const pageUrl = `${process.env.FRONTEND_ORIGIN_use}/downloads/${jobId}`;
    try {
      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject: "Your ZIP file is ready to download",
        text: `Your ZIP file is ready. Go here to download it: ${pageUrl}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Your ZIP is ready</h2>
            <p style="color: #555;">Your requested files have been packaged and are ready to download.</p>
            <a
              href="${pageUrl}"
              style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;"
            >
              Go to Downloads
            </a>
            <p style="color: #999; font-size: 12px;">The download link on that page is valid for 24 hours.</p>
          </div>
        `,
      });
      log.info({ to, messageId: info.messageId, jobId }, "ZIP ready email sent");
    } catch (e: any) {
      log.error({ to, jobId, err: e?.message }, "ZIP ready email failed");
    }
  },
};
