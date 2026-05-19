import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as auditService from '../services/audit.service';
import { sendSuccess } from '../utils/response';

export async function getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, module, action, from, to, limit, offset } = req.query as Record<string, string>;
    const data = await auditService.getAuditLogs({
      userId, module, action, from, to,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    sendSuccess({ res, data });
  } catch (err) { next(err); }
}

export async function getErrorLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { from, to, limit, offset } = req.query as Record<string, string>;
    const data = await auditService.getErrorLogs({
      from, to,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    sendSuccess({ res, data });
  } catch (err) { next(err); }
}
