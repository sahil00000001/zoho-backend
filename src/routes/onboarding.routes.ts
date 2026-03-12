import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/onboarding.controller';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Checklist
router.post('/init/:userId', authorize(Role.HR, Role.ADMIN), ctrl.initOnboarding);
router.get('/me', ctrl.getOnboarding);
router.patch('/tasks/:id', ctrl.updateTask);
router.delete('/tasks/:id', authorize(Role.HR, Role.ADMIN), ctrl.deleteTask);
router.get('/:userId', authorize(Role.HR, Role.ADMIN, Role.MANAGER), ctrl.getOnboarding);
router.post('/:userId/tasks', authorize(Role.HR, Role.ADMIN, Role.MANAGER), ctrl.addTask);

// Assets
router.get('/assets/list', authorize(Role.HR, Role.ADMIN, Role.MANAGER), ctrl.listAssets);
router.post('/assets', authorize(Role.HR, Role.ADMIN), ctrl.addAsset);
router.post('/assets/:assetId/assign', authorize(Role.HR, Role.ADMIN), ctrl.assignAsset);
router.patch('/assets/assignments/:assignmentId/return', authorize(Role.HR, Role.ADMIN), ctrl.returnAsset);
router.get('/assets/my', ctrl.getUserAssets);
router.get('/assets/user/:userId', authorize(Role.HR, Role.ADMIN, Role.MANAGER), ctrl.getUserAssets);

// IT Provisions
router.get('/it-provisions', authorize(Role.HR, Role.ADMIN), ctrl.listITProvisions);
router.patch('/it-provisions/:id', authorize(Role.HR, Role.ADMIN), ctrl.updateITProvision);
router.post('/:userId/it-provisions', authorize(Role.HR, Role.ADMIN), ctrl.addITProvision);

export default router;
