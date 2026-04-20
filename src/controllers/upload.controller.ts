import { Request, Response } from 'express';
import { uploadFile } from '../services/storage.service';
import { sendSuccess, sendError } from '../utils/response';

const VALID_FOLDERS = new Set(['avatars', 'kra', 'documents', 'uploads']);

export async function handleUpload(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      return sendError({ res, code: 'NO_FILE', message: 'No file provided', statusCode: 400 });
    }

    const folder = VALID_FOLDERS.has(req.query.folder as string)
      ? (req.query.folder as 'avatars' | 'kra' | 'documents' | 'uploads')
      : 'uploads';

    const result = await uploadFile(file.buffer, file.originalname, file.mimetype, folder);
    sendSuccess({ res, data: result });
  } catch (err) {
    sendError({
      res,
      code: 'UPLOAD_FAILED',
      message: err instanceof Error ? err.message : 'File upload failed',
      statusCode: 500,
    });
  }
}
