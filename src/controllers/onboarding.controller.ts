import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as svc from '../services/onboarding.service';
import { sendSuccess } from '../utils/response';
import { AssetStatus, ITProvisionStatus, OnboardingTaskStatus } from '@prisma/client';

export async function initOnboarding(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const data = await svc.initOnboarding(userId);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function getOnboarding(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId || req.user!.userId;
    const data = await svc.getOnboarding(userId);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function updateTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const data = await svc.updateTask(id, status as OnboardingTaskStatus, notes);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function addTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId || req.user!.userId;
    const data = await svc.addTask(userId, req.body);
    sendSuccess({ res, data, statusCode: 201 });
  } catch (e) { next(e); }
}

export async function deleteTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteTask(req.params.id);
    sendSuccess({ res, data: { deleted: true } });
  } catch (e) { next(e); }
}

// Assets
export async function listAssets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as AssetStatus | undefined;
    const data = await svc.listAssets(status);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function addAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.addAsset(req.body);
    sendSuccess({ res, data, statusCode: 201 });
  } catch (e) { next(e); }
}

export async function assignAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { assetId } = req.params;
    const { userId, condition, notes } = req.body;
    const assignedById = req.user!.userId;
    const data = await svc.assignAsset(assetId, userId, assignedById, condition, notes);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function returnAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.returnAsset(req.params.assignmentId);
    sendSuccess({ res, data: { returned: true } });
  } catch (e) { next(e); }
}

export async function getUserAssets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId || req.user!.userId;
    const data = await svc.getUserAssets(userId);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

// IT Provisions
export async function listITProvisions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.query.userId as string | undefined;
    const data = await svc.listITProvisions(userId);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function updateITProvision(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const data = await svc.updateITProvision(id, status as ITProvisionStatus, notes);
    sendSuccess({ res, data });
  } catch (e) { next(e); }
}

export async function addITProvision(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId || req.user!.userId;
    const data = await svc.addITProvision(userId, req.body.item);
    sendSuccess({ res, data, statusCode: 201 });
  } catch (e) { next(e); }
}
