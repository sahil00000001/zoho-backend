import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Your Login OTP – Employee Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a73e8;">Employee Management Portal</h2>
        <p>Hi ${name},</p>
        <p>Use the OTP below to log in. It expires in <strong>${env.OTP_EXPIRES_MINUTES} minutes</strong>.</p>
        <div style="
          background: #f4f4f4;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 10px;
          margin: 24px 0;
          color: #1a73e8;
        ">${otp}</div>
        <p style="color: #888; font-size: 13px;">
          If you did not request this OTP, please ignore this email.
        </p>
      </div>
    `,
    text: `Your OTP is: ${otp}. It expires in ${env.OTP_EXPIRES_MINUTES} minutes.`,
  });
}
