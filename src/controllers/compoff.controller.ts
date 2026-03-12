import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as svc from '../services/compoff.service';
import { sendSuccess } from '../utils/response';

export async function request(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.requestCompOff(req.user!.userId, req.body);
    sendSuccess({ res, data, message: 'Comp-off request submitted', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.listCompOffs(req.user!.userId, req.user!.role);
    sendSuccess({ res, data });
  } catch (err) { next(err); }
}

export async function balance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await svc.getCompOffBalance(req.user!.userId);
    sendSuccess({ res, data: { available: count } });
  } catch (err) { next(err); }
}

export async function approve(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.approveCompOff(req.params.id as string, req.user!.userId);
    sendSuccess({ res, data, message: 'Comp-off approved' });
  } catch (err) { next(err); }
}

export async function reject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.rejectCompOff(req.params.id as string, req.user!.userId);
    sendSuccess({ res, data, message: 'Comp-off rejected' });
  } catch (err) { next(err); }
}
