import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

function todayDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const ATTENDANCE_INCLUDE = {
  user: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
};

// ─── Check-in ──────────────────────────────────────────────────────────────
export async function checkIn(userId: string) {
  const date = todayDate();

  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  if (existing) throw new AppError('ALREADY_CHECKED_IN', 'You have already checked in today', 409);

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isLate = hours > 9 || (hours === 9 && minutes > 30);

  return prisma.attendance.create({
    data: { userId, date, checkInTime: now, status: isLate ? 'LATE' : 'PRESENT' },
    include: ATTENDANCE_INCLUDE,
  });
}

// ─── Check-out ─────────────────────────────────────────────────────────────
export async function checkOut(userId: string) {
  const date = todayDate();

  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  if (!existing) throw new AppError('NOT_CHECKED_IN', 'You have not checked in today', 400);
  if (existing.checkOutTime) throw new AppError('ALREADY_CHECKED_OUT', 'You have already checked out today', 409);

  const now = new Date();
  const workHours = existing.checkInTime
    ? parseFloat(((now.getTime() - existing.checkInTime.getTime()) / 3_600_000).toFixed(2))
    : null;

  return prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOutTime: now, workHours },
    include: ATTENDANCE_INCLUDE,
  });
}

// ─── Today's Status ────────────────────────────────────────────────────────
export async function getTodayStatus(userId: string) {
  const date = todayDate();
  return prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
    include: ATTENDANCE_INCLUDE,
  }) ?? null;
}

// ─── Team Attendance (Manager/Admin) ───────────────────────────────────────
export async function getTeamAttendance(managerId: string, date?: string) {
  const targetDate = date ? new Date(date) : todayDate();
  targetDate.setUTCHours(0, 0, 0, 0);

  const subordinates = await prisma.user.findMany({
    where: { managerId, isActive: true },
    select: { id: true },
  });
  const userIds = subordinates.map((u) => u.id);

  return prisma.attendance.findMany({
    where: { userId: { in: userIds }, date: targetDate },
    include: ATTENDANCE_INCLUDE,
    orderBy: { checkInTime: 'asc' },
  });
}

// ─── All Attendance (Admin) ────────────────────────────────────────────────
export async function getAllAttendance(filters?: { date?: string; userId?: string; status?: string }) {
  const targetDate = filters?.date ? new Date(filters.date) : todayDate();
  targetDate.setUTCHours(0, 0, 0, 0);

  return prisma.attendance.findMany({
    where: {
      date: targetDate,
      ...(filters?.userId ? { userId: filters.userId } : {}),
      ...(filters?.status ? { status: filters.status as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' } : {}),
    },
    include: ATTENDANCE_INCLUDE,
    orderBy: { checkInTime: 'asc' },
  });
}

// ─── My Attendance History ──────────────────────────────────────────────────
export async function getMyHistory(userId: string, limit = 30) {
  return prisma.attendance.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
    include: ATTENDANCE_INCLUDE,
  });
}
