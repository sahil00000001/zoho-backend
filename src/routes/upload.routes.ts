import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import upload from '../middleware/upload.middleware';
import { handleUpload } from '../controllers/upload.controller';

const router = Router();
router.use(authenticate);

// POST /api/upload?folder=avatars|kra|documents|uploads
// Body: multipart/form-data with field name "file"
// Returns: { url, key, size, fileName, mimeType }
router.post('/', upload.single('file'), handleUpload);

export default router;
