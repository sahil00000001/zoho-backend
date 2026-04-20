import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess, sendError } from './utils/response';
import { prisma } from './lib/prisma';
import { seedSystemRoles, patchMissingModules } from './services/role.service';

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
import roleRoutes from './routes/role.routes';
import auditRoutes from './routes/audit.routes';
import orgChartRoutes from './routes/orgchart.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// ── Security & parsing ────────────────────────────────────────────────────
app.use(helmet());

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (env.CORS_ORIGIN === '*') return callback(null, true);
    const allowed = env.CORS_ORIGIN.split(',').map(s => s.trim());
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Respond to all preflight OPTIONS requests
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
app.use('/api/roles', roleRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/org-chart', orgChartRoutes);
app.use('/api/upload', uploadRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  sendError({ res, code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ── Seed system roles on startup ─────────────────────────────────────────
seedSystemRoles().catch(console.error);
patchMissingModules('org-chart').catch(console.error);

export default app;
