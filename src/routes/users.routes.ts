import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';
import * as usersController from '../controllers/users.controller';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// GET /api/users - All authenticated users can list (for directory)
router.get('/', usersController.listUsers);

// GET /api/users/departments - All authenticated
router.get('/departments', usersController.getDepartments);

// GET /api/users/:id - All authenticated
router.get('/:id', usersController.getUser);

// POST /api/users - ADMIN only
router.post('/', authorize(Role.ADMIN), validate(createUserSchema), usersController.createUser);

// PUT /api/users/:id - ADMIN only
router.put('/:id', authorize(Role.ADMIN), validate(updateUserSchema), usersController.updateUser);

// DELETE /api/users/:id (deactivate) - ADMIN only
router.delete('/:id', authorize(Role.ADMIN), usersController.deactivateUser);

export default router;
