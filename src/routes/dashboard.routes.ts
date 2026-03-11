import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/activity', dashboardController.getActivity);

export default router;
