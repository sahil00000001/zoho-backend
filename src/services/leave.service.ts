import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ApplyLeaveInput } from '../schemas/leave.schema';

// ─── Get My Leaves ─────────────────────────────────────────────────────────
export async function getMyLeaves(userId: string) {
  return prisma.leave.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      leaveType: { select: { id: true, name: true, maxDays: true } },
      user: { select: { id: true, employeeId: true, firstName: true, lastName: true } },
    },
  });
}

// ─── Apply for Leave ───────────────────────────────────────────────────────
export async function applyLeave(userId: string, input: ApplyLeaveInput) {
  const leaveType = await prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } });

  if (!leaveType || !leaveType.isActive) {
    throw new AppError('INVALID_LEAVE_TYPE', 'Leave type not found or inactive', 404);
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  // Check for overlapping leaves
  const overlap = await prisma.leave.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } },
      ],
    },
  });

  if (overlap) {
    throw new AppError('LEAVE_OVERLAP', 'You already have a leave request overlapping this period', 409);
  }

  return prisma.leave.create({
    data: {
      userId,
      leaveTypeId: input.leaveTypeId,
      startDate,
      endDate,
      reason: input.reason,
    },
    include: {
      leaveType: { select: { id: true, name: true } },
      user: { select: { id: true, employeeId: true, firstName: true, lastName: true } },
    },
  });
}

// ─── Get Leave Types ───────────────────────────────────────────────────────
export async function getLeaveTypes() {
  return prisma.leaveType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}
