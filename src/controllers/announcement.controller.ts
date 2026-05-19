import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as svc from '../services/announcement.service';
import { sendSuccess } from '../utils/response';

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createAnnouncement({ ...req.body, createdById: req.user!.userId });
    sendSuccess({ res, data, statusCode: 201 });
  } catch (e) { next(e); }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getAnnouncements(req.user!.userId);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function listAll(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getAllAnnouncements();
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateAnnouncement(req.params.id, req.body);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteAnnouncement(req.params.id);
    sendSuccess({ res, data: { deleted: true } });
  } catch (e) { next(e); }
}

export async function celebrations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getCelebrations();
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}
