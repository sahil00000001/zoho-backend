import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { cacheControl } from '../middleware/cache';
import * as leaveController from '../controllers/leave.controller';

const router = Router();

router.use(authenticate);
router.get('/', cacheControl(300), leaveController.getLeaveTypes);

export default router;
