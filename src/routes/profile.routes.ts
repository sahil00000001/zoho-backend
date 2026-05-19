import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/profile.controller';
import upload from '../middleware/upload.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// My profile
router.get('/me', ctrl.getMyProfile);
router.patch('/me', ctrl.updateProfile);
router.patch('/me/basic', ctrl.updateBasicInfo);

// Skills
router.post('/me/skills', ctrl.addSkill);
router.delete('/me/skills/:id', ctrl.deleteSkill);

// Certifications
router.post('/me/certifications', ctrl.addCertification);
router.delete('/me/certifications/:id', ctrl.deleteCertification);

// KRA
router.get('/me/kra', ctrl.getMyKRA);
router.post('/me/kra', upload.single('file'), ctrl.uploadKRA);
router.delete('/me/kra/:id', ctrl.deleteKRA);

// Certification file upload
router.post('/me/certifications/upload', upload.single('file'), ctrl.uploadCertificationFile);

// HR/Admin: view any profile and all KRAs
router.get('/kra/all', authorize(Role.HR, Role.ADMIN, Role.MANAGER), ctrl.getAllKRA);
router.get('/:userId', authorize(Role.HR, Role.ADMIN, Role.MANAGER), ctrl.getProfile);

export default router;
