import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    sendError({ res, code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header', statusCode: 401 });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);

    // Always fetch the current role from DB so role changes (promotions/demotions)
    // take effect immediately without requiring the user to log out and back in.
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      sendError({ res, code: 'UNAUTHORIZED', message: 'User account not found or deactivated', statusCode: 401 });
      return;
    }

    req.user = { userId: payload.userId, role: dbUser.role };
    next();
  } catch {
    sendError({ res, code: 'TOKEN_EXPIRED', message: 'Access token is invalid or expired', statusCode: 401 });
  }
}

/** Restrict access to specific roles. Always use after `authenticate`. */
export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      sendError({ res, code: 'FORBIDDEN', message: 'You do not have permission to perform this action', statusCode: 403 });
      return;
    }
    next();
  };
}
