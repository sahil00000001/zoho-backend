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

  const [leaves, announcements, regularizations, managerChanges, newUsers] = await Promise.all([
    // Leave applications & status changes
    prisma.leave.findMany({
      where: isAdmin ? {} : isManager ? { user: { managerId: userId } } : { userId },
      orderBy: { updatedAt: 'desc' },
      take: 15,
      include: {
        user: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
    }),

    // Announcements — everyone sees these
    prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    }),

    // Attendance regularization requests
    prisma.attendanceRegularization.findMany({
      where: isAdmin ? {} : isManager ? { user: { managerId: userId } } : { userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),

    // Manager assignment events (from audit log — admin/HR only)
    isAdmin ? prisma.auditLog.findMany({
      where: { action: 'ASSIGN_MANAGER' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }) : Promise.resolve([]),

    // New employee additions (admin/HR only)
    isAdmin ? prisma.user.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, firstName: true, lastName: true, designation: true, createdAt: true },
    }) : Promise.resolve([]),
  ]);

  const items: Array<{ id: string; type: string; title: string; status: string; date: Date }> = [];

  // Leaves
  const leaveLabel: Record<string, string> = {
    PENDING: 'applied for',
    APPROVED: 'leave approved —',
    REJECTED: 'leave rejected —',
    CANCELLED: 'cancelled leave for',
  };
  for (const l of leaves) {
    items.push({
      id: `leave-${l.id}`,
      type: 'leave',
      title: `${l.user.firstName} ${l.user.lastName} ${leaveLabel[l.status] ?? 'updated'} ${l.leaveType.name}`,
      status: l.status,
      date: l.updatedAt,
    });
  }

  // Announcements
  for (const a of announcements) {
    items.push({
      id: `ann-${a.id}`,
      type: 'announcement',
      title: `New announcement: ${a.title}`,
      status: a.priority,
      date: a.createdAt,
    });
  }

  // Regularizations
  const regLabel: Record<string, string> = {
    PENDING: 'requested attendance correction',
    APPROVED: 'attendance correction approved',
    REJECTED: 'attendance correction rejected',
  };
  for (const r of regularizations) {
    items.push({
      id: `reg-${r.id}`,
      type: 'regularization',
      title: `${r.user.firstName} ${r.user.lastName} ${regLabel[r.status] ?? 'submitted regularization'}`,
      status: r.status,
      date: r.updatedAt,
    });
  }

  // Manager changes
  for (const log of managerChanges) {
    const details = log.details as Record<string, unknown> | null;
    const targetName = (details?.targetUserName as string) || 'an employee';
    items.push({
      id: `mgr-${log.id}`,
      type: 'manager_change',
      title: `${log.userName ?? 'Admin'} assigned manager to ${targetName}`,
      status: 'UPDATED',
      date: log.createdAt,
    });
  }

  // New users
  for (const u of newUsers) {
    items.push({
      id: `user-${u.id}`,
      type: 'new_user',
      title: `${u.firstName} ${u.lastName} joined${u.designation ? ` as ${u.designation}` : ''}`,
      status: 'ACTIVE',
      date: u.createdAt,
    });
  }

  // Sort by date descending, return top 20
  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items.slice(0, 20);
}
