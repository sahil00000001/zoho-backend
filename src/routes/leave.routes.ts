import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { applyLeaveSchema } from '../schemas/leave.schema';
import * as leaveController from '../controllers/leave.controller';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// All authenticated users: leave calendar
router.get('/calendar', leaveController.getLeaveCalendar);

// Employee routes
router.get('/my', leaveController.getMyLeaves);
router.post('/', validate(applyLeaveSchema), leaveController.applyLeave);
router.patch('/:id/cancel', leaveController.cancelLeave);

// Manager/Admin routes
router.get('/', authorize(Role.MANAGER, Role.HR, Role.ADMIN), leaveController.getAllLeaves);
router.patch('/:id/approve', authorize(Role.MANAGER, Role.HR, Role.ADMIN), leaveController.approveLeave);
router.patch('/:id/reject', authorize(Role.MANAGER, Role.HR, Role.ADMIN), leaveController.rejectLeave);

// Leave balance
router.get('/balance/me', leaveController.getLeaveBalance);
router.get('/balance/:userId', authorize(Role.MANAGER, Role.HR, Role.ADMIN), leaveController.getLeaveBalance);

export default router;
