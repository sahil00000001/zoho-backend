import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as svc from '../services/profile.service';
import { sendSuccess } from '../utils/response';

export async function getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getProfile(req.user!.userId);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getProfile(req.params.userId);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.upsertProfile(req.user!.userId, req.body);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function updateBasicInfo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateBasicInfo(req.user!.userId, req.body);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function addSkill(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, level } = req.body;
    const data = await svc.addSkill(req.user!.userId, name, level);
    sendSuccess({ res, data, statusCode: 201 });
  } catch (e) { next(e); }
}

export async function deleteSkill(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteSkill(req.params.id, req.user!.userId);
    sendSuccess({ res, data: { deleted: true } });
  } catch (e) { next(e); }
}

export async function addCertification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.addCertification(req.user!.userId, req.body);
    sendSuccess({ res, data, statusCode: 201 });
  } catch (e) { next(e); }
}

export async function deleteCertification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteCertification(req.params.id, req.user!.userId);
    sendSuccess({ res, data: { deleted: true } });
  } catch (e) { next(e); }
}

export async function uploadKRA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.addKRADocument(req.user!.userId, req.body);
    sendSuccess({ res, data, statusCode: 201 });
  } catch (e) { next(e); }
}

export async function deleteKRA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteKRADocument(req.params.id, req.user!.userId);
    sendSuccess({ res, data: { deleted: true } });
  } catch (e) { next(e); }
}

export async function getMyKRA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getKRADocuments(req.user!.userId);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function getAllKRA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getAllKRADocuments();
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}
