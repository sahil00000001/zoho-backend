import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as svc from '../services/regularization.service';
import { sendSuccess } from '../utils/response';

export async function submit(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await svc.submitRegularization(req.user!.userId, req.body);
    sendSuccess({ res, data: result, message: 'Regularization request submitted', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await svc.getRegularizations(req.user!.userId, req.user!.role);
    sendSuccess({ res, data: result });
  } catch (err) { next(err); }
}

export async function approve(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await svc.approveRegularization(req.params.id as string, req.user!.userId);
    sendSuccess({ res, data: result, message: 'Regularization approved' });
  } catch (err) { next(err); }
}

export async function reject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await svc.rejectRegularization(req.params.id as string, req.user!.userId, req.body.reviewNote);
    sendSuccess({ res, data: result, message: 'Regularization rejected' });
  } catch (err) { next(err); }
}
