import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as attendanceController from '../controllers/attendance.controller';

const router = Router();

// All attendance routes require authentication
router.use(authenticate);

router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.get('/today', attendanceController.getTodayStatus);

export default router;
