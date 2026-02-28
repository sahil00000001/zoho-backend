import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as authController from '../controllers/auth.controller';
import {
  loginSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../schemas/auth.schema';

const router = Router();

router.post('/login', validate(loginSchema), authController.initiateLogin);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.get('/me', authenticate, authController.getProfile);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshTokens);
router.post('/logout', validate(logoutSchema), authController.logout);

export default router;
