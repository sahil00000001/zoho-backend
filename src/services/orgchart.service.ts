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

  return prisma.user.update({
    where: { id: userId },
    data: { managerId: managerId ?? null },
    select: { id: true, managerId: true, firstName: true, lastName: true },
  });
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
