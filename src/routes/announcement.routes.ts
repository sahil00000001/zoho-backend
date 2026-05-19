import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/announcement.controller';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/celebrations', ctrl.celebrations);
router.get('/all', authorize(Role.HR, Role.ADMIN), ctrl.listAll);
router.post('/', authorize(Role.HR, Role.ADMIN, Role.MANAGER), ctrl.create);
router.patch('/:id', authorize(Role.HR, Role.ADMIN, Role.MANAGER), ctrl.update);
router.delete('/:id', authorize(Role.HR, Role.ADMIN), ctrl.remove);

export default router;
