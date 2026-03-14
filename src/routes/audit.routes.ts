import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as auditController from '../controllers/audit.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'HR'));

router.get('/', auditController.getAuditLogs);
router.get('/errors', auditController.getErrorLogs);

export default router;
