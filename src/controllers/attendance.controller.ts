import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as attendanceService from '../services/attendance.service';
import { sendSuccess } from '../utils/response';
import { Role } from '@prisma/client';

export async function checkIn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { lat, lng, address, isWFH } = req.body ?? {};
    const location = (lat && lng) ? { lat: Number(lat), lng: Number(lng), address } : undefined;
    const record = await attendanceService.checkIn(req.user!.userId, location, Boolean(isWFH));
    sendSuccess({ res, data: record, message: 'Checked in successfully', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function checkOut(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { lat, lng, address } = req.body ?? {};
    const location = (lat && lng) ? { lat: Number(lat), lng: Number(lng), address } : undefined;
    const record = await attendanceService.checkOut(req.user!.userId, location);
    sendSuccess({ res, data: record, message: 'Checked out successfully' });
  } catch (err) { next(err); }
}

export async function getTodayStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.getTodayStatus(req.user!.userId);
    sendSuccess({ res, data: record });
  } catch (err) { next(err); }
}

export async function getMyHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
    const records = await attendanceService.getMyHistory(req.user!.userId, limit);
    sendSuccess({ res, data: records });
  } catch (err) { next(err); }
}

export async function getMonthlyAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const month = req.query.month as string | undefined;
    const records = await attendanceService.getMonthlyAttendance(req.user!.userId, month);
    sendSuccess({ res, data: records });
  } catch (err) { next(err); }
}

export async function getTeamAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date } = req.query as { date?: string };
    const role = req.user!.role as Role;

    let records;
    if (role === Role.MANAGER) {
      records = await attendanceService.getTeamAttendance(req.user!.userId, date);
    } else {
      records = await attendanceService.getAllAttendance({ date, userId: req.query.userId as string, status: req.query.status as string });
    }
    sendSuccess({ res, data: records });
  } catch (err) { next(err); }
}

// All authenticated users: full employee roster with attendance for a date
export async function getTeamDaily(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date } = req.query as { date?: string };
    const records = await attendanceService.getTeamDailyAttendance(date);
    sendSuccess({ res, data: records });
  } catch (err) { next(err); }
}
