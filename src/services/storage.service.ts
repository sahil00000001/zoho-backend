import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';
import { s3 } from '../lib/s3';
import { env } from '../config/env';

export function getPublicUrl(key: string): string {
  return `${env.SUPABASE_PUBLIC_URL}/${env.SUPABASE_STORAGE_BUCKET}/${key}`;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: 'avatars' | 'kra' | 'documents' | 'uploads' = 'uploads',
): Promise<{ url: string; key: string; size: number; fileName: string; mimeType: string }> {
  const ext = path.extname(originalName).toLowerCase();
  const key = `${folder}/${Date.now()}-${randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.SUPABASE_STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `inline; filename="${originalName}"`,
    }),
  );

  return {
    url: getPublicUrl(key),
    key,
    size: buffer.length,
    fileName: originalName,
    mimeType,
  };
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.SUPABASE_STORAGE_BUCKET,
      Key: key,
    }),
  );
}
