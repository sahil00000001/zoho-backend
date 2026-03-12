import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const INCLUDE = {
  user: { select: { firstName: true, lastName: true, employeeId: true, email: true } },
  reviewer: { select: { firstName: true, lastName: true } },
  attendance: { select: { checkInTime: true, checkOutTime: true, workHours: true } },
};

// ─── Submit regularization request ─────────────────────────────────────────
export async function submitRegularization(
  userId: string,
  data: { date: string; reason: string; requestedCheckIn?: string; requestedCheckOut?: string }
) {
  const date = new Date(data.date);
  date.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.attendanceRegularization.findFirst({
    where: { userId, date, status: 'PENDING' },
  });
  if (existing) throw new AppError('ALREADY_REQUESTED', 'A pending regularization already exists for this date', 409);

  const attendance = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });

  return prisma.attendanceRegularization.create({
    data: {
      userId,
      date,
      reason: data.reason,
      attendanceId: attendance?.id ?? null,
      requestedCheckIn: data.requestedCheckIn ? new Date(data.requestedCheckIn) : null,
      requestedCheckOut: data.requestedCheckOut ? new Date(data.requestedCheckOut) : null,
    },
    include: INCLUDE,
  });
}

// ─── List regularizations ───────────────────────────────────────────────────
export async function getRegularizations(userId: string, role: string) {
  const isPrivileged = ['MANAGER', 'HR', 'ADMIN'].includes(role);
  return prisma.attendanceRegularization.findMany({
    where: isPrivileged ? {} : { userId },
    orderBy: { createdAt: 'desc' },
    include: INCLUDE,
  });
}

// ─── Approve ────────────────────────────────────────────────────────────────
export async function approveRegularization(id: string, reviewerId: string) {
  const req = await prisma.attendanceRegularization.findUnique({ where: { id } });
  if (!req) throw new AppError('NOT_FOUND', 'Regularization request not found', 404);
  if (req.status !== 'PENDING') throw new AppError('ALREADY_REVIEWED', 'Request has already been reviewed', 409);

  // Apply the correction to attendance record
  if (req.attendanceId && (req.requestedCheckIn || req.requestedCheckOut)) {
    const update: Record<string, unknown> = {};
    if (req.requestedCheckIn) update.checkInTime = req.requestedCheckIn;
    if (req.requestedCheckOut) {
      update.checkOutTime = req.requestedCheckOut;
      if (req.requestedCheckIn) {
        const diff = (req.requestedCheckOut.getTime() - req.requestedCheckIn.getTime()) / 3_600_000;
        update.workHours = parseFloat(diff.toFixed(2));
        update.overtimeHours = diff > 9 ? parseFloat((diff - 9).toFixed(2)) : null;
      }
    }
    await prisma.attendance.update({ where: { id: req.attendanceId }, data: update });
  } else if (!req.attendanceId && req.requestedCheckIn) {
    // Create attendance record if none existed
    const workHours = req.requestedCheckOut
      ? parseFloat(((req.requestedCheckOut.getTime() - req.requestedCheckIn.getTime()) / 3_600_000).toFixed(2))
      : null;
    await prisma.attendance.create({
      data: {
        userId: req.userId,
        date: req.date,
        checkInTime: req.requestedCheckIn,
        checkOutTime: req.requestedCheckOut ?? null,
        workHours,
        status: 'PRESENT',
      },
    });
  }

  return prisma.attendanceRegularization.update({
    where: { id },
    data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date() },
    include: INCLUDE,
  });
}

// ─── Reject ─────────────────────────────────────────────────────────────────
export async function rejectRegularization(id: string, reviewerId: string, reviewNote?: string) {
  const req = await prisma.attendanceRegularization.findUnique({ where: { id } });
  if (!req) throw new AppError('NOT_FOUND', 'Regularization request not found', 404);
  if (req.status !== 'PENDING') throw new AppError('ALREADY_REVIEWED', 'Request has already been reviewed', 409);

  return prisma.attendanceRegularization.update({
    where: { id },
    data: { status: 'REJECTED', reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote },
    include: INCLUDE,
  });
}
