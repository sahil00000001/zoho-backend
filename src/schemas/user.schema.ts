import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']),
  designation: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().optional(),
  departmentId: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
  managerId: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
  joiningDate: z.string().optional(), // ISO date string
});

export const updateUserSchema = createUserSchema.partial().omit({ email: true });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
