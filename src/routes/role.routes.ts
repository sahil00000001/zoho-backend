import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as roleController from '../controllers/role.controller';

const router = Router();

router.use(authenticate);

router.get('/modules', roleController.getModules);
router.get('/my-permissions', roleController.getMyPermissions);
router.get('/', roleController.listRoles);
router.get('/:id', roleController.getRole);
router.post('/seed', authorize('ADMIN'), roleController.seedRoles);
router.post('/', authorize('ADMIN'), roleController.createRole);
router.put('/:id', authorize('ADMIN'), roleController.updateRole);
router.delete('/:id', authorize('ADMIN'), roleController.deleteRole);

export default router;
