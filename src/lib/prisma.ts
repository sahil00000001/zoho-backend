/**
 * Prisma client singleton.
 *
 * In serverless environments (Vercel) each invocation can create a new module
 * scope, which would exhaust the DB connection pool quickly.  We store the
 * client on the Node.js global object so it survives hot-reloads in dev and
 * is reused across invocations within the same container in production.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
