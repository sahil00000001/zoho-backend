import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as userService from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { role, departmentId, isActive, search } = req.query as Record<string, string>;
    const users = await userService.getAllUsers({
      role,
      departmentId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
    sendSuccess({ res, data: users });
  } catch (err) { next(err); }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.params.id);
    sendSuccess({ res, data: user });
  } catch (err) { next(err); }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.createUser(req.body as CreateUserInput);
    sendSuccess({ res, data: user, message: 'User created successfully', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUser(req.params.id, req.body as UpdateUserInput);
    sendSuccess({ res, data: user, message: 'User updated successfully' });
  } catch (err) { next(err); }
}

export async function deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.deactivateUser(req.params.id);
    sendSuccess({ res, data: user, message: 'User deactivated successfully' });
  } catch (err) { next(err); }
}

export async function getDepartments(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const departments = await userService.getDepartments();
    sendSuccess({ res, data: departments });
  } catch (err) { next(err); }
}
