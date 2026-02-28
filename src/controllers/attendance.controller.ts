import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as attendanceService from '../services/attendance.service';
import { sendSuccess } from '../utils/response';

export async function checkIn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.checkIn(req.user!.userId);
    sendSuccess({ res, data: record, message: 'Checked in successfully', statusCode: 201 });
  } catch (err) {
    next(err);
  }
}

export async function checkOut(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.checkOut(req.user!.userId);
    sendSuccess({ res, data: record, message: 'Checked out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getTodayStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.getTodayStatus(req.user!.userId);
    sendSuccess({ res, data: record });
  } catch (err) {
    next(err);
  }
}
