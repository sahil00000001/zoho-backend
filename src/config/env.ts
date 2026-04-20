import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',

  // JWT
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  // OTP
  OTP_EXPIRES_MINUTES: parseInt(process.env.OTP_EXPIRES_MINUTES ?? '10', 10),

  // Gmail SMTP
  SMTP_USER: required('SMTP_USER'),
  SMTP_PASS: required('SMTP_PASS'),

  // Supabase S3 Storage
  SUPABASE_S3_ENDPOINT:         process.env.SUPABASE_S3_ENDPOINT         ?? '',
  SUPABASE_S3_REGION:           process.env.SUPABASE_S3_REGION            ?? 'ap-south-1',
  SUPABASE_S3_ACCESS_KEY_ID:    process.env.SUPABASE_S3_ACCESS_KEY_ID     ?? '',
  SUPABASE_S3_SECRET_ACCESS_KEY:process.env.SUPABASE_S3_SECRET_ACCESS_KEY ?? '',
  SUPABASE_STORAGE_BUCKET:      process.env.SUPABASE_STORAGE_BUCKET       ?? 'atlas-files',
  SUPABASE_PUBLIC_URL:          process.env.SUPABASE_PUBLIC_URL           ?? '',
} as const;
