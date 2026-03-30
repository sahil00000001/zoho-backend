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

// ─── Leave Request → Manager ────────────────────────────────────────────────
export async function sendLeaveRequestEmail(opts: {
  to: string;
  managerName: string;
  employeeName: string;
  employeeId: string;
  department: string;
  leaveType: string;
  days: number;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<void> {
  const { to, managerName, employeeName, employeeId, department, leaveType, days, startDate, endDate, reason } = opts;
  const subject = `Leave Request: ${employeeName} | ${days} Day${days > 1 ? 's' : ''} ${leaveType}`;
  await transporter.sendMail({
    from: `ATLAS HR <${env.SMTP_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
        <div style="background:linear-gradient(135deg,#dc2626,#f97316);padding:24px 32px;border-radius:12px 12px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;font-weight:800;letter-spacing:-0.3px;">ATLAS HR</h2>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Leave Approval Request</p>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">
          <p style="margin:0 0 6px;font-size:15px;">Dear <strong>${managerName}</strong>,</p>
          <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6;">
            A leave request has been submitted by one of your team members and requires your approval.
          </p>

          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f8fafc;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;width:140px;">Employee</td>
              <td style="padding:11px 16px;font-size:14px;font-weight:600;color:#0f172a;">${employeeName}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Employee ID</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${employeeId}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Department</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${department}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Leave Type</td>
              <td style="padding:11px 16px;font-size:14px;font-weight:600;color:#dc2626;">${leaveType}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Duration</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${startDate} → ${endDate} &nbsp;·&nbsp; <strong>${days} day${days > 1 ? 's' : ''}</strong></td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Reason</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${reason || '—'}</td>
            </tr>
          </table>

          <p style="font-size:13px;color:#64748b;margin:0;">
            Please log in to <a href="https://zoho-app-sigma.vercel.app/dashboard/approvals" style="color:#dc2626;font-weight:600;text-decoration:none;">ATLAS HR Portal</a> to approve or reject this request.
          </p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">ATLAS HR · This is an automated notification</p>
      </div>
    `,
  });
}

// ─── Leave Approved → Super Admin / HR ──────────────────────────────────────
export async function sendLeaveApprovedEmail(opts: {
  to: string;
  adminName: string;
  employeeName: string;
  employeeId: string;
  department: string;
  leaveType: string;
  days: number;
  startDate: string;
  endDate: string;
  approvedBy: string;
}): Promise<void> {
  const { to, adminName, employeeName, employeeId, department, leaveType, days, startDate, endDate, approvedBy } = opts;
  const subject = `Leave Approved: ${employeeName} | ${days} Day${days > 1 ? 's' : ''} ${leaveType}`;
  await transporter.sendMail({
    from: `ATLAS HR <${env.SMTP_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
        <div style="background:linear-gradient(135deg,#dc2626,#f97316);padding:24px 32px;border-radius:12px 12px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;font-weight:800;letter-spacing:-0.3px;">ATLAS HR</h2>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Leave Approval Notification</p>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">
          <div style="display:inline-flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 14px;margin-bottom:20px;">
            <span style="color:#16a34a;font-weight:700;font-size:13px;">✓ Leave Approved</span>
          </div>
          <p style="margin:0 0 6px;font-size:15px;">Dear <strong>${adminName}</strong>,</p>
          <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6;">
            The following leave request has been approved by <strong>${approvedBy}</strong> and is now active.
          </p>

          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f8fafc;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;width:140px;">Employee</td>
              <td style="padding:11px 16px;font-size:14px;font-weight:600;color:#0f172a;">${employeeName}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Employee ID</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${employeeId}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Department</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${department}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Leave Type</td>
              <td style="padding:11px 16px;font-size:14px;font-weight:600;color:#dc2626;">${leaveType}</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Duration</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${startDate} → ${endDate} &nbsp;·&nbsp; <strong>${days} day${days > 1 ? 's' : ''}</strong></td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Approved By</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${approvedBy}</td>
            </tr>
          </table>

          <p style="font-size:13px;color:#64748b;margin:0;">
            View details in the <a href="https://zoho-app-sigma.vercel.app/dashboard/approvals" style="color:#dc2626;font-weight:600;text-decoration:none;">ATLAS HR Portal</a>.
          </p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">ATLAS HR · This is an automated notification</p>
      </div>
    `,
  });
}

// ─── Leave Status → Employee ─────────────────────────────────────────────────
export async function sendLeaveStatusEmail(opts: {
  to: string;
  employeeName: string;
  leaveType: string;
  days: number;
  startDate: string;
  endDate: string;
  status: 'APPROVED' | 'REJECTED';
  approvedBy: string;
  note?: string;
}): Promise<void> {
  const { to, employeeName, leaveType, days, startDate, endDate, status, approvedBy, note } = opts;
  const isApproved = status === 'APPROVED';
  const subject = isApproved
    ? `✅ Leave Approved: ${leaveType} | ${days} Day${days > 1 ? 's' : ''}`
    : `❌ Leave Rejected: ${leaveType} | ${days} Day${days > 1 ? 's' : ''}`;

  await transporter.sendMail({
    from: `ATLAS HR <${env.SMTP_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
        <div style="background:linear-gradient(135deg,#dc2626,#f97316);padding:24px 32px;border-radius:12px 12px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;font-weight:800;letter-spacing:-0.3px;">ATLAS HR</h2>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Leave Request Update</p>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">
          <div style="display:inline-flex;align-items:center;gap:8px;background:${isApproved ? '#f0fdf4' : '#fef2f2'};border:1px solid ${isApproved ? '#bbf7d0' : '#fecaca'};border-radius:8px;padding:8px 14px;margin-bottom:20px;">
            <span style="color:${isApproved ? '#16a34a' : '#dc2626'};font-weight:700;font-size:13px;">${isApproved ? '✓ Leave Approved' : '✗ Leave Rejected'}</span>
          </div>
          <p style="margin:0 0 6px;font-size:15px;">Dear <strong>${employeeName}</strong>,</p>
          <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6;">
            Your leave request has been <strong>${isApproved ? 'approved' : 'rejected'}</strong> by <strong>${approvedBy}</strong>.
          </p>

          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f8fafc;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;width:130px;">Leave Type</td>
              <td style="padding:11px 16px;font-size:14px;font-weight:600;color:#dc2626;">${leaveType}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Duration</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${startDate} → ${endDate} &nbsp;·&nbsp; <strong>${days} day${days > 1 ? 's' : ''}</strong></td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Status</td>
              <td style="padding:11px 16px;font-size:14px;font-weight:700;color:${isApproved ? '#16a34a' : '#dc2626'};">${status}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">${isApproved ? 'Approved By' : 'Reviewed By'}</td>
              <td style="padding:11px 16px;font-size:14px;color:#334155;">${approvedBy}</td>
            </tr>
            ${note ? `<tr style="background:#f8fafc;"><td style="padding:11px 16px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Note</td><td style="padding:11px 16px;font-size:14px;color:#334155;">${note}</td></tr>` : ''}
          </table>

          <p style="font-size:13px;color:#64748b;margin:0;">
            View your leave status in the <a href="https://zoho-app-sigma.vercel.app/dashboard/leaves" style="color:#dc2626;font-weight:600;text-decoration:none;">ATLAS HR Portal</a>.
          </p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">ATLAS HR · This is an automated notification</p>
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
