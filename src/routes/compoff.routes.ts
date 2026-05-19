import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/compoff.controller';

const router = Router();

router.use(authenticate);
router.post('/', ctrl.request);
router.get('/', ctrl.list);
router.get('/balance', ctrl.balance);
router.patch('/:id/approve', authorize('MANAGER', 'HR', 'ADMIN'), ctrl.approve);
router.patch('/:id/reject', authorize('MANAGER', 'HR', 'ADMIN'), ctrl.reject);

export default router;
