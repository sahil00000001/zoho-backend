import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as leaveService from '../services/leave.service';
import { sendSuccess } from '../utils/response';
import { ApplyLeaveInput } from '../schemas/leave.schema';
import { Role } from '@prisma/client';

export async function getMyLeaves(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const leaves = await leaveService.getMyLeaves(req.user!.userId);
    sendSuccess({ res, data: leaves });
  } catch (err) { next(err); }
}

export async function applyLeave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const leave = await leaveService.applyLeave(req.user!.userId, req.body as ApplyLeaveInput);
    sendSuccess({ res, data: leave, message: 'Leave application submitted', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function getLeaveTypes(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const types = await leaveService.getLeaveTypes();
    sendSuccess({ res, data: types });
  } catch (err) { next(err); }
}

// Any authenticated user: leave calendar for a given month
export async function getLeaveCalendar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const data = await leaveService.getLeaveCalendar(month);
    sendSuccess({ res, data });
  } catch (err) { next(err); }
}

// Manager/Admin: view all or team leaves
export async function getAllLeaves(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, userId } = req.query as Record<string, string>;
    const role = req.user!.role as Role;

    let leaves;
    if (role === Role.MANAGER) {
      leaves = await leaveService.getTeamLeaves(req.user!.userId, { status });
    } else {
      leaves = await leaveService.getAllLeaves({ status, userId });
    }
    sendSuccess({ res, data: leaves });
  } catch (err) { next(err); }
}

// Manager/Admin: approve a leave
export async function approveLeave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const leave = await leaveService.approveLeave(req.params.id, req.user!.userId);
    sendSuccess({ res, data: leave, message: 'Leave approved successfully' });
  } catch (err) { next(err); }
}

// Manager/Admin: reject a leave
export async function rejectLeave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: string };
    const leave = await leaveService.rejectLeave(req.params.id, req.user!.userId, reason);
    sendSuccess({ res, data: leave, message: 'Leave rejected' });
  } catch (err) { next(err); }
}

// Employee: cancel own leave
export async function cancelLeave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const leave = await leaveService.cancelLeave(req.params.id, req.user!.userId);
    sendSuccess({ res, data: leave, message: 'Leave cancelled' });
  } catch (err) { next(err); }
}

// Get leave balance for self or specific user (admin)
export async function getLeaveBalance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const targetUserId = req.params.userId || req.user!.userId;
    const balance = await leaveService.getLeaveBalance(targetUserId);
    sendSuccess({ res, data: balance });
  } catch (err) { next(err); }
}
