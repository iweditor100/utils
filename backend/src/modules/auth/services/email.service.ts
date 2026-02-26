import nodemailer from "nodemailer";

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
        text: `Verify your account: ${process.env.FRONTEND_ORIGIN}/verify-email?token=${token}`,
        html: `<p>Verify your account: <a href='${process.env.FRONTEND_ORIGIN}/verify-email?token=${token}'>Verify Email</a></p>`
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
        text: `Reset your password: ${process.env.FRONTEND_ORIGIN}/reset-password?token=${token}`,
        html: `<p>Reset your password: <a href='${process.env.FRONTEND_ORIGIN}/reset-password?token=${token}'>Reset Password</a></p>`
      });
    } catch (e) {
      // Never throw: mail failure cannot leak
    }
  }
};

