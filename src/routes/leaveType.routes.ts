import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as leaveController from '../controllers/leave.controller';

const router = Router();

router.use(authenticate);
router.get('/', leaveController.getLeaveTypes);

export default router;
