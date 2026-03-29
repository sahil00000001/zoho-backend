import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ApplyLeaveInput } from '../schemas/leave.schema';
import { sendLeaveRequestEmail, sendLeaveApprovedEmail } from './email.service';

const LEAVE_INCLUDE = {
  leaveType: { select: { id: true, name: true, maxDays: true } },
  user: { select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, department: { select: { name: true } } } },
};

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcDays(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

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

  const leave = await prisma.leave.create({
    data: { userId, leaveTypeId: input.leaveTypeId, startDate, endDate, reason: input.reason },
    include: LEAVE_INCLUDE,
  });

  // ── Notify manager (or fall back to first active HR/ADMIN) ──────────────
  const applicant = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true, lastName: true, employeeId: true,
      email: true,
      department: { select: { name: true } },
      manager: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (applicant) {
    let recipientEmail: string | null = applicant.manager?.email ?? null;
    let recipientName: string = applicant.manager
      ? `${applicant.manager.firstName} ${applicant.manager.lastName}`
      : '';

    // No manager assigned — fall back to first active HR or ADMIN
    if (!recipientEmail) {
      const fallback = await prisma.user.findFirst({
        where: { isActive: true, role: { in: ['HR', 'ADMIN'] } },
        orderBy: { role: 'asc' }, // HR before ADMIN alphabetically
        select: { firstName: true, lastName: true, email: true },
      });
      if (fallback) {
        recipientEmail = fallback.email;
        recipientName = `${fallback.firstName} ${fallback.lastName}`;
      }
    }

    if (recipientEmail) {
      sendLeaveRequestEmail({
        to: recipientEmail,
        managerName: recipientName,
        employeeName: `${applicant.firstName} ${applicant.lastName}`,
        employeeId: applicant.employeeId,
        department: applicant.department?.name ?? '—',
        leaveType: leaveType.name,
        days: calcDays(startDate, endDate),
        startDate: fmtDate(startDate),
        endDate: fmtDate(endDate),
        reason: input.reason ?? '',
      }).catch(() => {}); // fire-and-forget — don't fail the request if email fails
    }
  }

  return leave;
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
  return prisma.leave.findMany({
    where: {
      user: { managerId, isActive: true },
      ...(filters?.status ? { status: filters.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: LEAVE_INCLUDE,
  });
}

// ─── Approve Leave ─────────────────────────────────────────────────────────
export async function approveLeave(leaveId: string, approverId?: string) {
  const leave = await prisma.leave.findUnique({ where: { id: leaveId }, include: LEAVE_INCLUDE });
  if (!leave) throw new AppError('LEAVE_NOT_FOUND', 'Leave request not found', 404);
  if (leave.status !== 'PENDING') throw new AppError('LEAVE_NOT_PENDING', 'Only pending leaves can be approved', 400);

  const updated = await prisma.leave.update({
    where: { id: leaveId },
    data: { status: 'APPROVED' },
    include: LEAVE_INCLUDE,
  });

  // ── Notify all active ADMIN + HR users ────────────────────────────────────
  const admins = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['ADMIN', 'HR'] } },
    select: { firstName: true, lastName: true, email: true },
  });

  let approverName = 'Manager';
  if (approverId) {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { firstName: true, lastName: true },
    });
    if (approver) approverName = `${approver.firstName} ${approver.lastName}`;
  }

  const emp = updated.user as { firstName: string; lastName: string; employeeId: string; email: string; department?: { name: string } | null };
  const days = calcDays(new Date(updated.startDate), new Date(updated.endDate));

  for (const admin of admins) {
    sendLeaveApprovedEmail({
      to: admin.email,
      adminName: `${admin.firstName} ${admin.lastName}`,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeId: emp.employeeId,
      department: emp.department?.name ?? '—',
      leaveType: updated.leaveType.name,
      days,
      startDate: fmtDate(new Date(updated.startDate)),
      endDate: fmtDate(new Date(updated.endDate)),
      approvedBy: approverName,
    }).catch(() => {});
  }

  return updated;
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

// ─── Leave Calendar (all employees, any role) ──────────────────────────────
export async function getLeaveCalendar(month: string) {
  const [year, m] = month.split('-').map(Number);
  const startOfMonth = new Date(year, m - 1, 1);
  const endOfMonth = new Date(year, m, 0); // last day of month

  return prisma.leave.findMany({
    where: {
      status: { in: ['APPROVED', 'PENDING'] },
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    },
    orderBy: [{ startDate: 'asc' }],
    include: {
      leaveType: { select: { id: true, name: true } },
      user: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          designation: true,
          department: { select: { name: true } },
        },
      },
    },
  });
}

// ─── Leave Balance Summary ─────────────────────────────────────────────────
export async function getLeaveBalance(userId: string) {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(`${currentYear}-01-01`);

  // Single parallel fetch instead of N+1 per leave type
  const [leaveTypes, approvedLeaves] = await Promise.all([
    prisma.leaveType.findMany({ where: { isActive: true } }),
    prisma.leave.findMany({
      where: { userId, status: 'APPROVED', startDate: { gte: yearStart } },
      select: { leaveTypeId: true, startDate: true, endDate: true },
    }),
  ]);

  // Group used days by leave type in memory
  const usedByType = new Map<string, number>();
  for (const l of approvedLeaves) {
    const days = Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86_400_000) + 1;
    usedByType.set(l.leaveTypeId, (usedByType.get(l.leaveTypeId) ?? 0) + days);
  }

  return leaveTypes.map((lt) => {
    const usedDays = usedByType.get(lt.id) ?? 0;
    return {
      leaveType: lt,
      maxDays: lt.maxDays,
      usedDays,
      remainingDays: Math.max(0, lt.maxDays - usedDays),
    };
  });
}
