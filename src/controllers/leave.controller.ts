import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as leaveService from '../services/leave.service';
import { sendSuccess } from '../utils/response';
import { ApplyLeaveInput } from '../schemas/leave.schema';

export async function getMyLeaves(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const leaves = await leaveService.getMyLeaves(req.user!.userId);
    sendSuccess({ res, data: leaves });
  } catch (err) {
    next(err);
  }
}

export async function applyLeave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const leave = await leaveService.applyLeave(req.user!.userId, req.body as ApplyLeaveInput);
    sendSuccess({ res, data: leave, message: 'Leave application submitted', statusCode: 201 });
  } catch (err) {
    next(err);
  }
}

export async function getLeaveTypes(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const types = await leaveService.getLeaveTypes();
    sendSuccess({ res, data: types });
  } catch (err) {
    next(err);
  }
}
