import { z } from 'zod';

export const applyLeaveSchema = z.object({
  leaveTypeId: z.string().uuid('Invalid leave type ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason too long'),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] },
);

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
