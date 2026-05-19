import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const INCLUDE = {
  user: { select: { firstName: true, lastName: true, employeeId: true } },
  approver: { select: { firstName: true, lastName: true } },
};

function expiresAt(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 3); // expires in 3 months
  return d;
}

export async function requestCompOff(userId: string, data: { earnedDate: string; reason: string }) {
  const earnedDate = new Date(data.earnedDate);
  earnedDate.setUTCHours(0, 0, 0, 0);
  return prisma.compOff.create({
    data: { userId, reason: data.reason, earnedDate, expiresAt: expiresAt(earnedDate), status: 'EARNED' },
    include: INCLUDE,
  });
}

export async function listCompOffs(userId: string, role: string) {
  const isPrivileged = ['MANAGER', 'HR', 'ADMIN'].includes(role);
  return prisma.compOff.findMany({
    where: isPrivileged ? {} : { userId },
    orderBy: { createdAt: 'desc' },
    include: INCLUDE,
  });
}

export async function getCompOffBalance(userId: string) {
  const now = new Date();
  return prisma.compOff.count({
    where: { userId, status: 'APPROVED', expiresAt: { gte: now } },
  });
}

export async function approveCompOff(id: string, approverId: string) {
  const co = await prisma.compOff.findUnique({ where: { id } });
  if (!co) throw new AppError('NOT_FOUND', 'Comp-off request not found', 404);
  if (co.status !== 'EARNED') throw new AppError('ALREADY_REVIEWED', 'Already processed', 409);
  return prisma.compOff.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy: approverId, approvedAt: new Date() },
    include: INCLUDE,
  });
}

export async function rejectCompOff(id: string, approverId: string) {
  const co = await prisma.compOff.findUnique({ where: { id } });
  if (!co) throw new AppError('NOT_FOUND', 'Comp-off request not found', 404);
  if (co.status !== 'EARNED') throw new AppError('ALREADY_REVIEWED', 'Already processed', 409);
  return prisma.compOff.update({
    where: { id },
    data: { status: 'EXPIRED', approvedBy: approverId, approvedAt: new Date() },
    include: INCLUDE,
  });
}
