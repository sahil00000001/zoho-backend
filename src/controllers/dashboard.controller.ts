import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as dashboardService from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';
import { Role } from '@prisma/client';

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stats = await dashboardService.getDashboardStats(req.user!.userId, req.user!.role as Role);
    sendSuccess({ res, data: stats });
  } catch (err) { next(err); }
}

export async function getActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const activity = await dashboardService.getRecentActivity(req.user!.userId, req.user!.role as Role);
    sendSuccess({ res, data: activity });
  } catch (err) { next(err); }
}
