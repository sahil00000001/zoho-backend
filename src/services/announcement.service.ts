import { prisma } from '../lib/prisma';
import { AnnouncementType, AnnouncementPriority } from '@prisma/client';

export async function createAnnouncement(data: {
  title: string;
  content: string;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  departmentId?: string;
  expiresAt?: string;
  isPinned?: boolean;
  createdById: string;
}) {
  return prisma.announcement.create({
    data: {
      title: data.title,
      content: data.content,
      type: data.type || 'COMPANY',
      priority: data.priority || 'NORMAL',
      departmentId: data.departmentId || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isPinned: data.isPinned || false,
      createdById: data.createdById,
    },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true, role: true } } },
  });
}

export async function getAnnouncements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });

  const now = new Date();
  const deptId = user?.departmentId;

  return prisma.announcement.findMany({
    where: {
      AND: [
        {
          OR: [
            { type: 'COMPANY' },
            { type: 'DEPARTMENT', departmentId: deptId ?? undefined },
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      ],
    },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true, role: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getAllAnnouncements() {
  return prisma.announcement.findMany({
    include: { createdBy: { select: { id: true, firstName: true, lastName: true, role: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function updateAnnouncement(id: string, data: {
  title?: string;
  content?: string;
  priority?: AnnouncementPriority;
  expiresAt?: string | null;
  isPinned?: boolean;
}) {
  return prisma.announcement.update({
    where: { id },
    data: {
      ...data,
      expiresAt: data.expiresAt === null ? null : data.expiresAt ? new Date(data.expiresAt) : undefined,
      updatedAt: new Date(),
    },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true, role: true } } },
  });
}

export async function deleteAnnouncement(id: string) {
  return prisma.announcement.delete({ where: { id } });
}

export async function getCelebrations() {
  const today = new Date();

  // Get all active users with profile
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true, firstName: true, lastName: true,
      employeeId: true, designation: true,
      joiningDate: true,
      department: { select: { name: true } },
      profile: { select: { dateOfBirth: true, photoUrl: true } },
    },
  });

  const birthdays: Array<{
    userId: string; firstName: string; lastName: string;
    employeeId: string; designation?: string; department?: string;
    photoUrl?: string; date: Date; daysUntil: number; isToday: boolean;
  }> = [];

  const anniversaries: Array<{
    userId: string; firstName: string; lastName: string;
    employeeId: string; designation?: string; department?: string;
    photoUrl?: string; date: Date; years: number; daysUntil: number; isToday: boolean;
  }> = [];

  for (const user of users) {
    // Birthday
    if (user.profile?.dateOfBirth) {
      const dob = new Date(user.profile.dateOfBirth);
      for (let i = 0; i <= 7; i++) {
        const check = new Date(today);
        check.setDate(check.getDate() + i);
        if (dob.getMonth() === check.getMonth() && dob.getDate() === check.getDate()) {
          birthdays.push({
            userId: user.id, firstName: user.firstName, lastName: user.lastName,
            employeeId: user.employeeId, designation: user.designation ?? undefined,
            department: user.department?.name,
            photoUrl: user.profile.photoUrl ?? undefined,
            date: check, daysUntil: i, isToday: i === 0,
          });
          break;
        }
      }
    }

    // Work anniversary
    if (user.joiningDate) {
      const joined = new Date(user.joiningDate);
      const yearsWorked = today.getFullYear() - joined.getFullYear();
      if (yearsWorked <= 0) continue;
      for (let i = 0; i <= 7; i++) {
        const check = new Date(today);
        check.setDate(check.getDate() + i);
        if (joined.getMonth() === check.getMonth() && joined.getDate() === check.getDate()) {
          anniversaries.push({
            userId: user.id, firstName: user.firstName, lastName: user.lastName,
            employeeId: user.employeeId, designation: user.designation ?? undefined,
            department: user.department?.name,
            photoUrl: user.profile?.photoUrl ?? undefined,
            date: check, years: yearsWorked, daysUntil: i, isToday: i === 0,
          });
          break;
        }
      }
    }
  }

  birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
  anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);

  return { birthdays, anniversaries };
}
