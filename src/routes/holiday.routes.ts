import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/holiday.controller';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/seed', authorize('ADMIN'), ctrl.seed);
router.post('/', authorize('ADMIN'), ctrl.add);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

export default router;
