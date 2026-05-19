import crypto from 'crypto';

/** Generate a numeric OTP of the given digit length (default 6). */
export function generateOTP(digits = 6): string {
  const max = Math.pow(10, digits);
  const min = Math.pow(10, digits - 1);
  return String(crypto.randomInt(min, max));
}

/** Return a Date object `minutes` from now. */
export function otpExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
