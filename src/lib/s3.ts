import { S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';

export const s3 = new S3Client({
  region: env.SUPABASE_S3_REGION,
  endpoint: env.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: env.SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: env.SUPABASE_S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // required for Supabase S3 protocol
});
