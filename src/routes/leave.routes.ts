import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { applyLeaveSchema } from '../schemas/leave.schema';
import * as leaveController from '../controllers/leave.controller';

const router = Router();

// All leave routes require authentication
router.use(authenticate);

// /api/leaves
router.get('/', leaveController.getMyLeaves);
router.post('/', validate(applyLeaveSchema), leaveController.applyLeave);

export default router;
