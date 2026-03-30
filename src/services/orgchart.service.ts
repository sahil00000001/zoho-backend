import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getOrgChart() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      designation: true,
      managerId: true,
      department: { select: { id: true, name: true } },
      _count: { select: { subordinates: true } },
      profile: { select: { photoUrl: true } },
    },
    orderBy: [{ firstName: 'asc' }],
  });
}

export async function assignManager(userId: string, managerId: string | null) {
  if (managerId) {
    if (managerId === userId)
      throw new AppError('INVALID', 'A user cannot be their own manager', 400);

    // Cycle detection — walk up the chain from managerId
    let current: string | null = managerId;
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current)) break;
      if (current === userId)
        throw new AppError('CIRCULAR', 'This would create a circular reporting chain', 400);
      visited.add(current);
      const mgr: { managerId: string | null } | null = await prisma.user.findUnique({
        where: { id: current },
        select: { managerId: true },
      });
      current = mgr?.managerId ?? null;
    }
  }

  // Fetch previous manager so we can potentially demote them
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { managerId: true },
  });
  const previousManagerId = target?.managerId ?? null;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { managerId: managerId ?? null },
    select: { id: true, managerId: true, firstName: true, lastName: true },
  });

  // ── Auto-promote: if this person now has a manager assigned, promote the MANAGER
  if (managerId) {
    const mgr = await prisma.user.findUnique({
      where: { id: managerId },
      select: { role: true },
    });
    // Promote EMPLOYEE → MANAGER automatically
    if (mgr?.role === 'EMPLOYEE') {
      await prisma.user.update({
        where: { id: managerId },
        data: { role: 'MANAGER' },
      });
    }
  }

  // ── Auto-demote: if the previous manager lost their last subordinate, demote to EMPLOYEE
  if (previousManagerId && previousManagerId !== managerId) {
    const prevMgr = await prisma.user.findUnique({
      where: { id: previousManagerId },
      select: { role: true },
    });
    if (prevMgr?.role === 'MANAGER') {
      const remainingSubordinates = await prisma.user.count({
        where: { managerId: previousManagerId, isActive: true },
      });
      if (remainingSubordinates === 0) {
        await prisma.user.update({
          where: { id: previousManagerId },
          data: { role: 'EMPLOYEE' },
        });
      }
    }
  }

  return updated;
}

export async function bulkAssignManagers(
  assignments: { userId: string; managerId: string | null }[],
) {
  const results = [];
  for (const { userId, managerId } of assignments) {
    const result = await assignManager(userId, managerId);
    results.push(result);
  }
  return results;
}
