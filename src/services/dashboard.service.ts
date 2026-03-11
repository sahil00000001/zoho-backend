import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

function todayDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardStats(userId: string, role: Role) {
  const today = todayDate();

  if (role === Role.EMPLOYEE) {
    // Employee sees their own stats
    const [todayAttendance, myLeaves, leaveBalance] = await Promise.all([
      prisma.attendance.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.leave.findMany({ where: { userId, status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.leave.count({ where: { userId, status: 'APPROVED', startDate: { gte: new Date(`${new Date().getFullYear()}-01-01`) } } }),
    ]);

    return {
      role,
      todayAttendance,
      pendingLeaves: myLeaves.length,
      leavesUsedThisYear: leaveBalance,
    };
  }

  if (role === Role.MANAGER) {
    const subordinates = await prisma.user.findMany({ where: { managerId: userId, isActive: true }, select: { id: true } });
    const subordinateIds = subordinates.map((u) => u.id);

    const [teamPresent, teamOnLeave, pendingApprovals] = await Promise.all([
      prisma.attendance.count({ where: { userId: { in: subordinateIds }, date: today, status: { in: ['PRESENT', 'LATE'] } } }),
      prisma.leave.count({ where: { userId: { in: subordinateIds }, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } } }),
      prisma.leave.count({ where: { userId: { in: subordinateIds }, status: 'PENDING' } }),
    ]);

    return {
      role,
      teamSize: subordinateIds.length,
      teamPresent,
      teamOnLeave,
      pendingApprovals,
    };
  }

  // HR / ADMIN sees org-wide stats
  const [totalEmployees, presentToday, onLeaveToday, pendingLeaves] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.attendance.count({ where: { date: today, status: { in: ['PRESENT', 'LATE'] } } }),
    prisma.leave.count({ where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.leave.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    role,
    totalEmployees,
    presentToday,
    onLeaveToday,
    absentToday: totalEmployees - presentToday - onLeaveToday,
    pendingLeaves,
  };
}

export async function getRecentActivity(userId: string, role: Role) {
  const isAdmin = role === Role.ADMIN || role === Role.HR;
  const isManager = role === Role.MANAGER;

  const leaves = await prisma.leave.findMany({
    where: isAdmin ? {} : isManager ? { user: { managerId: userId } } : { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: { select: { firstName: true, lastName: true, employeeId: true } },
      leaveType: { select: { name: true } },
    },
  });

  return leaves.map((l) => ({
    id: l.id,
    type: 'leave',
    title: `${l.user.firstName} ${l.user.lastName} applied for ${l.leaveType.name}`,
    status: l.status,
    date: l.createdAt,
  }));
}
