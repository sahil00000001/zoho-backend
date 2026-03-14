import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { sendOtpEmail } from './email.service';
import { generateOTP, otpExpiry } from '../utils/otp';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { env } from '../config/env';
import { LoginInput, VerifyOtpInput } from '../schemas/auth.schema';
import { getMyPermissions } from './role.service';

// ─── User selection helper ─────────────────────────────────────────────────
const userSelect = {
  id: true,
  employeeId: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  designation: true,
  phoneNumber: true,
  joiningDate: true,
  address: true,
  profilePhotoUrl: true,
  isActive: true,
  department: { select: { id: true, name: true } },
} as const;

// ─── Initiate Login ────────────────────────────────────────────────────────
export async function initiateLogin(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.isActive) {
    // Return generic message to avoid user enumeration
    return { message: 'If this email is registered, an OTP has been sent.' };
  }

  // Invalidate any previous unused OTPs
  await prisma.oTP.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { isUsed: true },
  });

  const code = generateOTP();
  await prisma.oTP.create({
    data: {
      userId: user.id,
      code,
      expiresAt: otpExpiry(env.OTP_EXPIRES_MINUTES),
    },
  });

  let emailSent = false;
  let emailError = '';
  try {
    await sendOtpEmail(user.email, code, user.firstName);
    emailSent = true;
  } catch (emailErr) {
    emailError = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error('[Auth] Email error:', emailError);
  }

  return {
    message: 'If this email is registered, an OTP has been sent.',
    emailSent,
    ...(emailError && { emailError }),
  };
}

// ─── Verify OTP & Issue Tokens ─────────────────────────────────────────────
export async function verifyOtp(input: VerifyOtpInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: userSelect,
  });

  if (!user || !user.isActive) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or OTP', 401);
  }

  const otp = await prisma.oTP.findFirst({
    where: {
      userId: user.id,
      code: input.otp,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    throw new AppError('INVALID_OTP', 'OTP is invalid or has expired', 401);
  }

  // Mark OTP as used
  await prisma.oTP.update({ where: { id: otp.id }, data: { isUsed: true } });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });

  // Persist refresh token
  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: refreshExpiry },
  });

  const { id, employeeId, email, firstName, lastName, role, designation, profilePhotoUrl, department } = user;

  // Best-effort — if CustomRole table not yet migrated, return null gracefully
  let permissions = null;
  try {
    permissions = await getMyPermissions(id);
  } catch { /* DB schema not yet migrated; client will fetch permissions separately */ }

  return {
    user: { id, employeeId, email, firstName, lastName, role, designation, profilePhotoUrl, department, permissions },
    accessToken,
    refreshToken,
  };
}

// ─── Get Profile ───────────────────────────────────────────────────────────
export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user || !user.isActive) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  return user;
}

// ─── Refresh Tokens ────────────────────────────────────────────────────────
export async function refreshTokens(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new AppError('UNAUTHORIZED', 'Account is inactive', 401);
  }

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { token } });

  const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user.id });

  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 7);
  await prisma.refreshToken.create({
    data: { userId: user.id, token: newRefreshToken, expiresAt: newExpiry },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ─── Logout ────────────────────────────────────────────────────────────────
export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
  return { message: 'Logged out successfully' };
}
