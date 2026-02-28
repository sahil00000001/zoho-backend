import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

function todayDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── Check-in ──────────────────────────────────────────────────────────────
export async function checkIn(userId: string) {
  const date = todayDate();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (existing) {
    throw new AppError('ALREADY_CHECKED_IN', 'You have already checked in today', 409);
  }

  const now = new Date();
  // Mark late if check-in after 09:30 local time
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isLate = hours > 9 || (hours === 9 && minutes > 30);

  const record = await prisma.attendance.create({
    data: {
      userId,
      date,
      checkInTime: now,
      status: isLate ? 'LATE' : 'PRESENT',
    },
    include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
  });

  return record;
}

// ─── Check-out ─────────────────────────────────────────────────────────────
export async function checkOut(userId: string) {
  const date = todayDate();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (!existing) {
    throw new AppError('NOT_CHECKED_IN', 'You have not checked in today', 400);
  }

  if (existing.checkOutTime) {
    throw new AppError('ALREADY_CHECKED_OUT', 'You have already checked out today', 409);
  }

  const now = new Date();
  const workHours =
    existing.checkInTime
      ? parseFloat(((now.getTime() - existing.checkInTime.getTime()) / 3_600_000).toFixed(2))
      : null;

  const record = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOutTime: now, workHours },
    include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
  });

  return record;
}

// ─── Today's Status ────────────────────────────────────────────────────────
export async function getTodayStatus(userId: string) {
  const date = todayDate();

  const record = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
    include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
  });

  return record ?? null;
}
