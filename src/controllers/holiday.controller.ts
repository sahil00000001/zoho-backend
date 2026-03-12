import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as svc from '../services/holiday.service';
import { sendSuccess } from '../utils/response';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const data = await svc.getHolidays(year);
    sendSuccess({ res, data });
  } catch (err) { next(err); }
}

export async function add(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.addHoliday(req.body);
    sendSuccess({ res, data, message: 'Holiday added', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteHoliday(req.params.id as string);
    sendSuccess({ res, data: null, message: 'Holiday removed' });
  } catch (err) { next(err); }
}

export async function seed(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.seedNationalHolidays();
    sendSuccess({ res, data: null, message: 'National holidays seeded for 2026' });
  } catch (err) { next(err); }
}
