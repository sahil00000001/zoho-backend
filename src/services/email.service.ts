import { env } from '../config/env';

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PeopleOS <onboarding@resend.dev>',
      to: [to],
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
    }),
  });

  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(`Resend error: ${err.message ?? res.status}`);
  }
}
