import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
  await transporter.sendMail({
    from: `PeopleOS <${env.SMTP_USER}>`,
    to,
    subject: 'Your Login OTP – PeopleOS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #dc2626;">PeopleOS</h2>
        <p>Hi ${name},</p>
        <p>Your sign-in code (expires in <strong>${env.OTP_EXPIRES_MINUTES} minutes</strong>):</p>
        <div style="background:#f4f4f4;border-radius:8px;padding:20px;text-align:center;
                    font-size:36px;font-weight:bold;letter-spacing:10px;margin:24px 0;color:#dc2626;">
          ${otp}
        </div>
        <p style="color:#888;font-size:13px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
