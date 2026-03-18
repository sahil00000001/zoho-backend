import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as orgChartController from '../controllers/orgchart.controller';

const router = Router();

router.use(authenticate);

router.get('/', orgChartController.getOrgChart);
router.patch('/assign', authorize('MANAGER', 'HR', 'ADMIN'), orgChartController.assignManager);
router.patch('/bulk-assign', authorize('HR', 'ADMIN'), orgChartController.bulkAssign);

export default router;
