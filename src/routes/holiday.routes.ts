import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { cacheControl } from '../middleware/cache';
import * as ctrl from '../controllers/holiday.controller';

const router = Router();

router.use(authenticate);
router.get('/', cacheControl(300), ctrl.list);
router.post('/seed', authorize('ADMIN'), ctrl.seed);
router.post('/', authorize('ADMIN'), ctrl.add);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

export default router;
