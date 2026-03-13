import nodemailer from 'nodemailer';
import { env } from '../config/env';

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  HR: 'HR',
  ADMIN: 'Administrator',
};

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendWelcomeEmail(to: string, firstName: string, role: string, employeeId: string): Promise<void> {
  const roleLabel = ROLE_LABELS[role] ?? role;
  await transporter.sendMail({
    from: `Atlas <${env.SMTP_USER}>`,
    to,
    subject: 'You have been invited to Atlas',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Welcome to Atlas</h2>
        <p>Hi ${firstName},</p>
        <p>You have been added to the <strong>Atlas Employee Portal</strong> with the role of <strong>${roleLabel}</strong>.</p>
        <table style="background:#f4f4f4;border-radius:8px;padding:16px;width:100%;margin:20px 0;">
          <tr><td style="color:#555;padding:4px 0;">Employee ID</td><td style="font-weight:bold;">${employeeId}</td></tr>
          <tr><td style="color:#555;padding:4px 0;">Role</td><td style="font-weight:bold;">${roleLabel}</td></tr>
          <tr><td style="color:#555;padding:4px 0;">Email</td><td style="font-weight:bold;">${to}</td></tr>
        </table>
        <p>To sign in, visit the portal and enter your email — a one-time password will be sent to this address.</p>
        <a href="https://zoho-app-sigma.vercel.app/login"
           style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:8px 0;">
          Sign in to Portal
        </a>
        <p style="color:#888;font-size:13px;margin-top:24px;">If you were not expecting this invitation, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
  await transporter.sendMail({
    from: `Atlas <${env.SMTP_USER}>`,
    to,
    subject: 'Your Login OTP – Atlas',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Atlas</h2>
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
