import { env } from '../config/env';

// Get OAuth2 access token from Azure using client credentials flow
async function getAccessToken(): Promise<string> {
  const url = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.AZURE_CLIENT_ID,
    client_secret: env.AZURE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json() as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`Azure token error: ${data.error_description ?? 'unknown'}`);
  }
  return data.access_token;
}

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
  const token = await getAccessToken();

  const payload = {
    message: {
      subject: 'Your Login OTP – Employee Portal',
      body: {
        contentType: 'HTML',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #dc2626;">PeopleOS — Employee Portal</h2>
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
              color: #dc2626;
            ">${otp}</div>
            <p style="color: #888; font-size: 13px;">
              If you did not request this OTP, please ignore this email.
            </p>
          </div>
        `,
      },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: false,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${env.SMTP_USER}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(`Graph sendMail error: ${err.error?.message ?? res.status}`);
  }
}
