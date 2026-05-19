import { prisma } from '../lib/prisma';

export interface AuditParams {
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  module: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ...params,
        details: params.details as any,
      },
    });
  } catch {
    // never throw from audit logging
  }
}

export async function logError(params: {
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  statusCode?: number;
}): Promise<void> {
  try {
    await prisma.errorLog.create({ data: params });
  } catch {
    // never throw from error logging
  }
}

export async function getAuditLogs(filters?: {
  userId?: string;
  module?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.module) where.module = filters.module;
  if (filters?.action) where.action = { contains: filters.action, mode: 'insensitive' };
  if (filters?.from || filters?.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const limit = Math.min(filters?.limit ?? 50, 200);
  const offset = filters?.offset ?? 0;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
  ]);
  return { total, logs, limit, offset };
}

export async function getErrorLogs(filters?: { limit?: number; offset?: number; from?: string; to?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.from || filters?.to) {
    where.createdAt = {
      ...(filters?.from ? { gte: new Date(filters.from) } : {}),
      ...(filters?.to ? { lte: new Date(filters.to) } : {}),
    };
  }
  const limit = Math.min(filters?.limit ?? 50, 200);
  const offset = filters?.offset ?? 0;
  const [total, logs] = await Promise.all([
    prisma.errorLog.count({ where }),
    prisma.errorLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
  ]);
  return { total, logs, limit, offset };
}
