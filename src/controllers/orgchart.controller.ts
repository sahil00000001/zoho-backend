import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as orgChartService from '../services/orgchart.service';
import { logAudit } from '../services/audit.service';
import { sendSuccess } from '../utils/response';

export async function getOrgChart(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess({ res, data: await orgChartService.getOrgChart() });
  } catch (err) { next(err); }
}

export async function assignManager(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, managerId } = req.body as { userId: string; managerId: string | null };
    const result = await orgChartService.assignManager(userId, managerId ?? null);
    logAudit({
      userId: req.user!.userId,
      userName: `${req.user!.firstName} ${req.user!.lastName}`,
      action: 'ASSIGN_MANAGER',
      module: 'org-chart',
      resourceId: userId,
      details: {
        targetUserId: userId,
        targetUserName: (result as any).firstName ? `${(result as any).firstName} ${(result as any).lastName}` : userId,
        managerId: managerId ?? null,
      },
    });
    sendSuccess({ res, data: result });
  } catch (err) { next(err); }
}

export async function bulkAssign(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { assignments } = req.body as {
      assignments: { userId: string; managerId: string | null }[];
    };
    sendSuccess({ res, data: await orgChartService.bulkAssignManagers(assignments) });
  } catch (err) { next(err); }
}
