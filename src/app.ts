import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess, sendError } from './utils/response';
import { prisma } from './lib/prisma';

// Routes
import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import leaveTypeRoutes from './routes/leaveType.routes';
import usersRoutes from './routes/users.routes';
import dashboardRoutes from './routes/dashboard.routes';
import regularizationRoutes from './routes/regularization.routes';
import holidayRoutes from './routes/holiday.routes';
import compoffRoutes from './routes/compoff.routes';
import onboardingRoutes from './routes/onboarding.routes';
import profileRoutes from './routes/profile.routes';
import announcementRoutes from './routes/announcement.routes';

const app = express();

// ── Security & parsing ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess({ res, data: { status: 'healthy', database: 'connected' } });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance/regularizations', regularizationRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/compoffs', compoffRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/announcements', announcementRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  sendError({ res, code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

export default app;
