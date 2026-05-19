import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as roleService from '../services/role.service';
import { sendSuccess } from '../utils/response';

export async function listRoles(req: AuthRequest, res: Response, next: NextFunction) {
  try { sendSuccess({ res, data: await roleService.listRoles() }); } catch (err) { next(err); }
}

export async function getRole(req: AuthRequest, res: Response, next: NextFunction) {
  try { sendSuccess({ res, data: await roleService.getRoleById(req.params.id) }); } catch (err) { next(err); }
}

export async function createRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const role = await roleService.createRole(req.body);
    sendSuccess({ res, data: role, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function updateRole(req: AuthRequest, res: Response, next: NextFunction) {
  try { sendSuccess({ res, data: await roleService.updateRole(req.params.id, req.body) }); } catch (err) { next(err); }
}

export async function deleteRole(req: AuthRequest, res: Response, next: NextFunction) {
  try { await roleService.deleteRole(req.params.id); sendSuccess({ res, data: null, message: 'Role deleted' }); } catch (err) { next(err); }
}

export async function getModules(_req: AuthRequest, res: Response, next: NextFunction) {
  try { sendSuccess({ res, data: roleService.ALL_MODULES }); } catch (err) { next(err); }
}

export async function getMyPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try { sendSuccess({ res, data: await roleService.getMyPermissions(req.user!.userId) }); } catch (err) { next(err); }
}

export async function seedRoles(_req: AuthRequest, res: Response, next: NextFunction) {
  try { await roleService.seedSystemRoles(); sendSuccess({ res, data: null, message: 'System roles seeded' }); } catch (err) { next(err); }
}
