// ============================================================
// UPLIFT CORE API
// Main Express application entry point
// ============================================================

import './env.js';
import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// Routes
import authRoutes from './routes/auth.js';
import coreRoutes from './routes/core.js';
import schedulingRoutes from './routes/scheduling.js';
import timeRoutes from './routes/time.js';
import usersRoutes from './routes/users.js';
import skillsRoutes from './routes/skills.js';
import operationsRoutes from './routes/operations.js';
import utilitiesRoutes from './routes/utilities.js';
import billingRoutes from './routes/billing.js';
import adminRoutes from './routes/admin.js';
import opsRoutes from './routes/ops.js';
import opsUsersRoutes from './routes/ops-users.js';
import licenseRoutes from './routes/licenses.js';
import aiRoutes from './routes/ai.js';
import integrationsRoutes from './routes/integrations.js';
import translationRoutes from './routes/translation.js';
import chatRoutes from './routes/chat.js';
import complianceRoutes from './routes/compliance.js';
import expensesRoutes from './routes/expenses.js';
import payslipsRoutes from './routes/payslips.js';
import onboardingRoutes from './routes/onboarding.js';
import legalRoutes from './routes/legal.js';
import billingPortalRoutes from './routes/billing-portal.js';
import apiDocsRoutes from './routes/api-docs.js';
import statusRoutes from './routes/status.js';
import cookiesRoutes from './routes/cookies.js';
import gamificationRoutes from './routes/gamification.js';
import brandingRoutes from './routes/branding.js';
import mobileRoutes from './routes/mobile.js';
import documentsRoutes from './routes/documents.js';
import rolesRoutes from './routes/roles.js';
import performanceBonusRoutes from './routes/performance-bonus.js';

// Middleware
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger,
  requestIdMiddleware,
  apiLimiter,
  authLimiter,
  corsOptions,
  csrfProtection,
  csrfTokenEndpoint,
} from './middleware/index.js';

// Services
import { db } from './lib/database.js';
import { notificationService } from './services/notifications.js';
import { initializeWebSocket } from './services/websocket.js';
import { cleanupService } from './services/cleanup.js';
import emailService from './services/email.js';
import jobQueue from './services/jobQueue.js';
import monitoringService from './services/monitoring.js';
import http from 'http';

// Structured logging
import { httpLogger } from './middleware/httpLogger.js';
import { configuredTimeout } from './middleware/timeout.js';

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- MIDDLEWARE --------------------

// Request ID (first, for tracing)
app.use(requestIdMiddleware);

// Security headers (Helmet.js v7.x)
// Helmet automatically sets: X-Content-Type-Options, X-Frame-Options, HSTS, etc.
app.use(helmet({
  // Content Security Policy - configured for API responses
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust if serving any HTML
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.uplift.com", "https://api.uplifthq.co.uk", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
    },
  },
  // Strict-Transport-Security (HSTS) - force HTTPS
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // Referrer-Policy - limit referrer information
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Cross-Origin-Embedder-Policy - disabled for API integrations
  crossOriginEmbedderPolicy: false,
  // Cross-Origin-Resource-Policy - allow cross-origin requests for API
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Cross-Origin-Opener-Policy - isolate browsing context
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  // X-DNS-Prefetch-Control - prevent DNS prefetching
  xDnsPrefetchControl: { allow: false },
  // X-Permitted-Cross-Domain-Policies - restrict Adobe Flash/PDF policies
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// CORS
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Structured HTTP logging (pino)
app.use(httpLogger);

// Request timeout (30s default, longer for reports/exports)
app.use(configuredTimeout());

// Raw body capture for Stripe webhooks (must be before json parsing)
app.use('/api/billing/webhooks/stripe', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for Stripe signature verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// -------------------- HEALTH CHECK --------------------

// Liveness probe - basic check that process is running
app.get('/health', async (req, res) => {
  const dbHealth = await db.healthCheck();
  const poolStats = db.getPoolStats();

  res.json({
    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    pool: poolStats,
    uptime: process.uptime(),
  });
});

// Simple health check
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2026-01-28-v4' });
});

// Readiness probe - checks all dependencies
app.get('/api/health/ready', async (req, res) => {
  const checks = {
    database: false,
    migrations: false,
  };
  
  try {
    // Check database connection
    const dbResult = await db.query('SELECT 1');
    checks.database = dbResult.rows.length > 0;
    
    // Check migrations table exists (indicates migrations ran)
    const migResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists
    `);
    checks.migrations = migResult.rows[0]?.exists || false;
    
    const allHealthy = Object.values(checks).every(v => v);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks,
    });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  const poolStats = db.getPoolStats();
  
  const metrics = `
# HELP uplift_uptime_seconds Process uptime in seconds
# TYPE uplift_uptime_seconds gauge
uplift_uptime_seconds ${Math.floor(process.uptime())}

# HELP uplift_db_pool_total Total database connections
# TYPE uplift_db_pool_total gauge
uplift_db_pool_total ${poolStats.totalCount || 0}

# HELP uplift_db_pool_idle Idle database connections
# TYPE uplift_db_pool_idle gauge
uplift_db_pool_idle ${poolStats.idleCount || 0}

# HELP uplift_db_pool_waiting Waiting database connections
# TYPE uplift_db_pool_waiting gauge
uplift_db_pool_waiting ${poolStats.waitingCount || 0}

# HELP nodejs_heap_size_bytes Node.js heap size
# TYPE nodejs_heap_size_bytes gauge
nodejs_heap_size_bytes ${process.memoryUsage().heapUsed}

# HELP nodejs_heap_total_bytes Node.js total heap
# TYPE nodejs_heap_total_bytes gauge
nodejs_heap_total_bytes ${process.memoryUsage().heapTotal}
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// CSRF token endpoint (client fetches this first)
app.get('/api/csrf-token', csrfTokenEndpoint);

// -------------------- API ROUTES --------------------

// Auth routes (with stricter rate limiting + CSRF)
app.use('/api/auth', authLimiter, csrfProtection, authRoutes);

// Ops routes (Uplift operations team - internal portal)
// Must be before /api catch-all routes to avoid core authMiddleware
app.use('/api/ops', apiLimiter, opsRoutes);

// License key routes (under ops namespace)
app.use('/api/ops/licenses', apiLimiter, licenseRoutes);

// Ops user management routes (under ops namespace)
app.use('/api/ops/users', apiLimiter, opsUsersRoutes);

// Core routes (employees, locations, departments, roles, skills)
app.use('/api', apiLimiter, csrfProtection, coreRoutes);

// Scheduling routes (shifts, templates, swaps)
app.use('/api', apiLimiter, csrfProtection, schedulingRoutes);

// Time tracking routes (clock in/out, timesheets, time off)
app.use('/api', apiLimiter, csrfProtection, timeRoutes);

// User management routes (accounts, sessions, GDPR)
app.use('/api/users', apiLimiter, csrfProtection, usersRoutes);

// Skills & internal mobility routes
app.use('/api', apiLimiter, csrfProtection, skillsRoutes);

// Operations routes (swaps, open shifts, templates, payroll)
app.use('/api', apiLimiter, csrfProtection, operationsRoutes);

// Utility routes (search, import, webhooks, reports)
app.use('/api', apiLimiter, csrfProtection, utilitiesRoutes);

// Billing routes (subscriptions, seats, invoices)
// Note: Stripe webhook has its own raw body parsing, mounted separately
app.use('/api/billing', apiLimiter, csrfProtection, billingRoutes);

// Admin routes (Uplift backoffice - superadmin only)
app.use('/api/admin', apiLimiter, csrfProtection, adminRoutes);

// AI & Real-time routes (scheduling AI, push notifications)
app.use('/api/ai', apiLimiter, csrfProtection, aiRoutes);

// Integrations routes (API keys, webhooks, OAuth)
app.use('/api/integrations', apiLimiter, csrfProtection, integrationsRoutes);
app.use('/api/translation', apiLimiter, csrfProtection, translationRoutes);

// Chat routes (channels, messages, reactions)
app.use('/api/chat', apiLimiter, csrfProtection, chatRoutes);

// Compliance routes (training, certifications)
app.use('/api/compliance', apiLimiter, csrfProtection, complianceRoutes);

// Documents routes (upload, download, e-signatures)
app.use('/api/documents', apiLimiter, csrfProtection, documentsRoutes);

// Expenses routes (claims, reimbursements)
app.use('/api/expenses', apiLimiter, csrfProtection, expensesRoutes);

// Payslips routes (pay statements, YTD)
app.use('/api/payslips', apiLimiter, csrfProtection, payslipsRoutes);

// Onboarding routes (setup wizard)
app.use('/api/onboarding', apiLimiter, csrfProtection, onboardingRoutes);

// Legal routes (terms acceptance, consents)
app.use('/api/legal', apiLimiter, csrfProtection, legalRoutes);

// Billing portal routes (self-serve billing management)
app.use('/api/billing-portal', apiLimiter, csrfProtection, billingPortalRoutes);

// API documentation routes (Swagger/OpenAPI)
app.use('/api/docs', apiDocsRoutes);

// Status routes (system health, status page)
app.use('/api/status', statusRoutes);

// Cookie consent routes (GDPR/PECR compliance)
app.use('/api/cookies', cookiesRoutes);

// Gamification routes (points, badges, rewards, affiliate offers)
app.use('/api/gamification', apiLimiter, csrfProtection, gamificationRoutes);

// Branding routes (white-label customization)
// Note: GET /api/branding is public (no auth/CSRF), PUT/POST/DELETE require auth
app.use('/api', apiLimiter, brandingRoutes);

// Mobile compatibility routes (missing endpoints expected by mobile app)
app.use('/api', apiLimiter, csrfProtection, mobileRoutes);

// Roles routes (custom roles CRUD)
app.use('/api/roles', apiLimiter, csrfProtection, rolesRoutes);

// Performance bonus routes (external scores, bonus payouts)
app.use('/api/payroll', apiLimiter, csrfProtection, performanceBonusRoutes);

// -------------------- NOTIFICATION ROUTES --------------------

import { authMiddleware } from './middleware/index.js';

app.get('/api/notifications', authMiddleware, async (req, res) => {
  const { unreadOnly } = req.query;
  const notifications = await notificationService.getForUser(req.user.userId, {
    unreadOnly: unreadOnly === 'true',
  });
  const unreadCount = await notificationService.getUnreadCount(req.user.userId);
  res.json({ notifications, unreadCount });
});

app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.userId);
  res.json({ success: true });
});

app.post('/api/notifications/read-all', authMiddleware, async (req, res) => {
  await notificationService.markAllAsRead(req.user.userId);
  res.json({ success: true });
});

app.post('/api/notifications/push-token', authMiddleware, async (req, res) => {
  const { token, platform, deviceName } = req.body;
  await notificationService.registerPushToken(req.user.userId, token, platform, deviceName);
  res.json({ success: true });
});

// -------------------- DASHBOARD / REPORTING --------------------

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  const { organizationId, role, employeeId } = req.user;
  const today = new Date().toISOString().split('T')[0];

  // Different dashboards for different roles
  if (role === 'worker') {
    // Worker dashboard
    const [upcomingShifts, timeOffBalance, notifications] = await Promise.all([
      db.query(
        `SELECT s.*, l.name as location_name FROM shifts s
         LEFT JOIN locations l ON l.id = s.location_id
         WHERE s.employee_id = $1 AND s.date >= $2 AND s.status != 'cancelled'
         ORDER BY s.date, s.start_time LIMIT 5`,
        [employeeId, today]
      ),
      db.query(
        `SELECT tob.*, top.name FROM time_off_balances tob
         JOIN time_off_policies top ON top.id = tob.policy_id
         WHERE tob.employee_id = $1 AND tob.year = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [employeeId]
      ),
      notificationService.getForUser(req.user.userId, { limit: 5, unreadOnly: true }),
    ]);

    res.json({
      upcomingShifts: upcomingShifts.rows,
      timeOffBalance: timeOffBalance.rows,
      notifications,
    });
  } else {
    // Manager/Admin dashboard
    const [
      todaysShifts,
      pendingApprovals,
      openShifts,
      activeEmployees,
      weekMetrics,
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN employee_id IS NOT NULL THEN 1 ELSE 0 END) as filled
         FROM shifts WHERE organization_id = $1 AND date = $2`,
        [organizationId, today]
      ),
      db.query(
        `SELECT 
           (SELECT COUNT(*) FROM time_entries WHERE organization_id = $1 AND status = 'pending') as timesheets,
           (SELECT COUNT(*) FROM time_off_requests WHERE organization_id = $1 AND status = 'pending') as time_off,
           (SELECT COUNT(*) FROM shift_swaps WHERE organization_id = $1 AND status = 'pending') as swaps`,
        [organizationId]
      ),
      db.query(
        `SELECT COUNT(*) FROM shifts 
         WHERE organization_id = $1 AND is_open = TRUE AND date >= $2`,
        [organizationId, today]
      ),
      db.query(
        `SELECT COUNT(*) FROM employees WHERE organization_id = $1 AND status = 'active'`,
        [organizationId]
      ),
      db.query(
        `SELECT 
           COALESCE(SUM(hours_scheduled), 0) as scheduled,
           COALESCE(SUM(hours_worked), 0) as worked,
           COALESCE(SUM(labor_cost_scheduled), 0) as cost_scheduled,
           COALESCE(SUM(labor_cost_actual), 0) as cost_actual
         FROM daily_metrics 
         WHERE organization_id = $1 
           AND date >= CURRENT_DATE - INTERVAL '7 days'`,
        [organizationId]
      ),
    ]);

    res.json({
      today: {
        shifts: todaysShifts.rows[0],
        date: today,
      },
      pendingApprovals: pendingApprovals.rows[0],
      openShifts: parseInt(openShifts.rows[0].count),
      activeEmployees: parseInt(activeEmployees.rows[0].count),
      weekMetrics: weekMetrics.rows[0],
    });
  }
});

// -------------------- ORGANIZATION SETTINGS --------------------

app.get('/api/organization', authMiddleware, async (req, res) => {
  const result = await db.query(
    `SELECT * FROM organizations WHERE id = $1`,
    [req.user.organizationId]
  );
  res.json({ organization: result.rows[0] });
});

app.patch('/api/organization', authMiddleware, async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin required' });
  }

  const updates = req.body;
  const allowed = ['name', 'timezone', 'currency', 'date_format', 'week_starts_on', 'logo_url', 'primary_color', 'features'];
  
  const setClauses = [];
  const values = [req.user.organizationId];
  let i = 2;

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = $${i++}`);
      values.push(key === 'features' ? JSON.stringify(value) : value);
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields' });
  }

  const result = await db.query(
    `UPDATE organizations SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );

  res.json({ organization: result.rows[0] });
});

// -------------------- ERROR HANDLING --------------------

// 404 handler
app.use(notFoundHandler);

// Sentry error handler (must be before custom error handler)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use(errorHandler);

// -------------------- STARTUP --------------------

// Create HTTP server (needed for WebSocket)
const server = http.createServer(app);

// Initialize WebSocket
const io = initializeWebSocket(server);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    UPLIFT CORE API                         ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                          ║
║  WebSocket: Enabled                                        ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// -------------------- BACKGROUND JOBS --------------------

// Register recurring jobs
jobQueue.register('shift-reminders', () => notificationService.sendShiftReminders(), { every: 15 * 60 * 1000 });
jobQueue.register('email-queue', () => emailService.processQueue(), { every: 30 * 1000 });
jobQueue.register('cleanup', () => cleanupService.runAll(), { cron: '0 3 * * *' });
jobQueue.register('health-checks', () => monitoringService.runHealthChecks(), { every: 5 * 60 * 1000 });

// Initialize job queue (connects to Redis if available, otherwise uses setInterval)
await jobQueue.init();
await jobQueue.startAll();

// -------------------- GRACEFUL SHUTDOWN --------------------

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    await jobQueue.shutdown();
    await db.close();
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
// CI deploy test
// deploy test 1769464340
// deploy 1769464435
// trigger redeploy 1769469788
// redeploy 1769470064
// redeploy 1769506752
// redeploy 1769516125
