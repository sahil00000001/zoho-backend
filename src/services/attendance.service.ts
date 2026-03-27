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

interface Location { lat: number; lng: number; address?: string }

// ─── Check-in ──────────────────────────────────────────────────────────────
export async function checkIn(userId: string, location?: Location, isWFH = false) {
  const date = todayDate();

  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  if (existing) throw new AppError('ALREADY_CHECKED_IN', 'You have already checked in today', 409);

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isLate = hours > 9 || (hours === 9 && minutes > 30);

  return prisma.attendance.create({
    data: {
      userId, date, checkInTime: now,
      status: isLate ? 'LATE' : 'PRESENT',
      isWFH,
      ...(location && { checkInLat: location.lat, checkInLng: location.lng, checkInAddress: location.address }),
    },
    include: ATTENDANCE_INCLUDE,
  });
}

// ─── Check-out ─────────────────────────────────────────────────────────────
export async function checkOut(userId: string, location?: Location) {
  const date = todayDate();

  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  if (!existing) throw new AppError('NOT_CHECKED_IN', 'You have not checked in today', 400);
  if (existing.checkOutTime) throw new AppError('ALREADY_CHECKED_OUT', 'You have already checked out today', 409);

  const now = new Date();
  const workHours = existing.checkInTime
    ? parseFloat(((now.getTime() - existing.checkInTime.getTime()) / 3_600_000).toFixed(2))
    : null;
  const overtimeHours = workHours && workHours > 9 ? parseFloat((workHours - 9).toFixed(2)) : null;

  return prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOutTime: now, workHours, overtimeHours,
      ...(location && { checkOutLat: location.lat, checkOutLng: location.lng, checkOutAddress: location.address }),
    },
    include: ATTENDANCE_INCLUDE,
  });
}

// ─── Re-Check-In (undo accidental checkout, keep original check-in time) ───
export async function reCheckIn(userId: string) {
  const date = todayDate();

  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  if (!existing) throw new AppError('NOT_CHECKED_IN', 'No attendance record found for today', 400);
  if (!existing.checkOutTime) throw new AppError('NOT_CHECKED_OUT', 'You have not checked out yet', 400);

  return prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOutTime: null, workHours: null, overtimeHours: null },
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

// ─── Monthly Attendance ────────────────────────────────────────────────────
export async function getMonthlyAttendance(userId: string, month?: string) {
  const ref = month ? new Date(`${month}-01`) : new Date();
  const start = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), 1));
  const end = new Date(Date.UTC(ref.getFullYear(), ref.getMonth() + 1, 0));

  return prisma.attendance.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
    include: ATTENDANCE_INCLUDE,
  });
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

// ─── All Employees Daily Attendance (any authenticated user) ────────────────
export async function getTeamDailyAttendance(date?: string) {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setUTCHours(0, 0, 0, 0);

  const [users, attendances] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        designation: true,
        department: { select: { name: true } },
      },
      orderBy: [{ firstName: 'asc' }],
    }),
    prisma.attendance.findMany({
      where: { date: targetDate },
      orderBy: { checkInTime: 'asc' },
    }),
  ]);

  const attendanceMap = new Map(attendances.map(a => [a.userId, a]));
  return users.map(u => ({ user: u, attendance: attendanceMap.get(u.id) ?? null }));
}
