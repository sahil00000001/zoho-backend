import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { LoginInput, VerifyOtpInput, RefreshTokenInput, LogoutInput } from '../schemas/auth.schema';
import { Request } from 'express';

export async function initiateLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.initiateLogin(req.body as LoginInput);
    sendSuccess({ res, data: result, message: 'OTP sent successfully' });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.verifyOtp(req.body as VerifyOtpInput);
    sendSuccess({ res, data: result, message: 'Login successful' });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await authService.getProfile(req.user!.userId);
    sendSuccess({ res, data: user });
  } catch (err) {
    next(err);
  }
}

export async function refreshTokens(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const result = await authService.refreshTokens(refreshToken);
    sendSuccess({ res, data: result, message: 'Tokens refreshed' });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body as LogoutInput;
    const result = await authService.logout(refreshToken);
    sendSuccess({ res, data: result, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}
