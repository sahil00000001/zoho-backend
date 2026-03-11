import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ApplyLeaveInput } from '../schemas/leave.schema';

const LEAVE_INCLUDE = {
  leaveType: { select: { id: true, name: true, maxDays: true } },
  user: { select: { id: true, employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
};

// ─── Get My Leaves ─────────────────────────────────────────────────────────
export async function getMyLeaves(userId: string) {
  return prisma.leave.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: LEAVE_INCLUDE,
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

  const overlap = await prisma.leave.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
    },
  });

  if (overlap) {
    throw new AppError('LEAVE_OVERLAP', 'You already have a leave request overlapping this period', 409);
  }

  return prisma.leave.create({
    data: { userId, leaveTypeId: input.leaveTypeId, startDate, endDate, reason: input.reason },
    include: LEAVE_INCLUDE,
  });
}

// ─── Get Leave Types ───────────────────────────────────────────────────────
export async function getLeaveTypes() {
  return prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

// ─── Get All Leaves (Manager/Admin) ────────────────────────────────────────
export async function getAllLeaves(filters?: { status?: string; userId?: string }) {
  return prisma.leave.findMany({
    where: {
      ...(filters?.status ? { status: filters.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' } : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: LEAVE_INCLUDE,
  });
}

// ─── Get Team Leaves (Manager sees their subordinates' leaves) ─────────────
export async function getTeamLeaves(managerId: string, filters?: { status?: string }) {
  const subordinates = await prisma.user.findMany({
    where: { managerId },
    select: { id: true },
  });
  const userIds = subordinates.map((u) => u.id);

  return prisma.leave.findMany({
    where: {
      userId: { in: userIds },
      ...(filters?.status ? { status: filters.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: LEAVE_INCLUDE,
  });
}

// ─── Approve Leave ─────────────────────────────────────────────────────────
export async function approveLeave(leaveId: string) {
  const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!leave) throw new AppError('LEAVE_NOT_FOUND', 'Leave request not found', 404);
  if (leave.status !== 'PENDING') throw new AppError('LEAVE_NOT_PENDING', 'Only pending leaves can be approved', 400);

  return prisma.leave.update({
    where: { id: leaveId },
    data: { status: 'APPROVED' },
    include: LEAVE_INCLUDE,
  });
}

// ─── Reject Leave ──────────────────────────────────────────────────────────
export async function rejectLeave(leaveId: string, reason?: string) {
  const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!leave) throw new AppError('LEAVE_NOT_FOUND', 'Leave request not found', 404);
  if (leave.status !== 'PENDING') throw new AppError('LEAVE_NOT_PENDING', 'Only pending leaves can be rejected', 400);

  return prisma.leave.update({
    where: { id: leaveId },
    data: { status: 'REJECTED', ...(reason ? { reason } : {}) },
    include: LEAVE_INCLUDE,
  });
}

// ─── Cancel Leave (own) ────────────────────────────────────────────────────
export async function cancelLeave(leaveId: string, userId: string) {
  const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!leave) throw new AppError('LEAVE_NOT_FOUND', 'Leave request not found', 404);
  if (leave.userId !== userId) throw new AppError('FORBIDDEN', 'You can only cancel your own leave requests', 403);
  if (leave.status !== 'PENDING') throw new AppError('LEAVE_NOT_PENDING', 'Only pending leaves can be cancelled', 400);

  return prisma.leave.update({
    where: { id: leaveId },
    data: { status: 'CANCELLED' },
    include: LEAVE_INCLUDE,
  });
}

// ─── Leave Balance Summary ─────────────────────────────────────────────────
export async function getLeaveBalance(userId: string) {
  const leaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });
  const currentYear = new Date().getFullYear();

  const balances = await Promise.all(
    leaveTypes.map(async (lt) => {
      const used = await prisma.leave.count({
        where: {
          userId,
          leaveTypeId: lt.id,
          status: 'APPROVED',
          startDate: { gte: new Date(`${currentYear}-01-01`) },
        },
      });
      return { leaveType: lt, maxDays: lt.maxDays, usedDays: used, remainingDays: Math.max(0, lt.maxDays - used) };
    })
  );

  return balances;
}
