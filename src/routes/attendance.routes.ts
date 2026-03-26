import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as attendanceController from '../controllers/attendance.controller';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Employee routes
router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.get('/today', attendanceController.getTodayStatus);
router.get('/history', attendanceController.getMyHistory);
router.get('/monthly', attendanceController.getMonthlyAttendance);
router.get('/daily', attendanceController.getTeamDaily);

// Manager/Admin routes
router.get('/team', authorize(Role.MANAGER, Role.HR, Role.ADMIN), attendanceController.getTeamAttendance);

export default router;
