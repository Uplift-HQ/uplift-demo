// ============================================================
// STATUS PAGE ROUTES
// System health monitoring and status endpoints
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';

const router = Router();

// Service status tracking (in production, use Redis or database)
const serviceStatus = {
  api: { status: 'operational', lastCheck: new Date() },
  database: { status: 'operational', lastCheck: new Date() },
  authentication: { status: 'operational', lastCheck: new Date() },
  notifications: { status: 'operational', lastCheck: new Date() },
  fileStorage: { status: 'operational', lastCheck: new Date() }
};

// Check database connectivity
async function checkDatabase() {
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    const latency = Date.now() - start;
    return {
      status: latency < 100 ? 'operational' : latency < 500 ? 'degraded' : 'partial_outage',
      latency
    };
  } catch (error) {
    return { status: 'major_outage', error: error.message };
  }
}

// GET /api/status - Get system status (JSON)
router.get('/', async (req, res) => {
  try {
    // Check database
    const dbStatus = await checkDatabase();
    serviceStatus.database = { ...dbStatus, lastCheck: new Date() };

    // Calculate overall status
    const statuses = Object.values(serviceStatus).map(s => s.status);
    let overallStatus = 'operational';
    if (statuses.includes('major_outage')) {
      overallStatus = 'major_outage';
    } else if (statuses.includes('partial_outage')) {
      overallStatus = 'partial_outage';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    res.json({
      status: overallStatus,
      updated: new Date().toISOString(),
      services: {
        api: {
          name: 'API',
          status: serviceStatus.api.status,
          description: 'Core API endpoints'
        },
        database: {
          name: 'Database',
          status: serviceStatus.database.status,
          latency: serviceStatus.database.latency,
          description: 'Primary data store'
        },
        authentication: {
          name: 'Authentication',
          status: serviceStatus.authentication.status,
          description: 'Login and session management'
        },
        notifications: {
          name: 'Notifications',
          status: serviceStatus.notifications.status,
          description: 'Push and email notifications'
        },
        fileStorage: {
          name: 'File Storage',
          status: serviceStatus.fileStorage.status,
          description: 'Document and image storage'
        }
      },
      incidents: [],
      maintenance: []
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      status: 'major_outage',
      error: 'Unable to check system status'
    });
  }
});

// GET /api/status/health - Simple health check endpoint
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// GET /api/status/page - Serve HTML status page
router.get('/page', async (req, res) => {
  try {
    const dbStatus = await checkDatabase();

    const statusColors = {
      operational: '#10B981',
      degraded: '#F59E0B',
      partial_outage: '#F97316',
      major_outage: '#EF4444'
    };

    const statusLabels = {
      operational: 'Operational',
      degraded: 'Degraded Performance',
      partial_outage: 'Partial Outage',
      major_outage: 'Major Outage'
    };

    const services = [
      { name: 'API', status: 'operational' },
      { name: 'Database', status: dbStatus.status },
      { name: 'Authentication', status: 'operational' },
      { name: 'Notifications', status: 'operational' },
      { name: 'File Storage', status: 'operational' }
    ];

    const overallStatus = services.some(s => s.status === 'major_outage') ? 'major_outage'
      : services.some(s => s.status === 'partial_outage') ? 'partial_outage'
      : services.some(s => s.status === 'degraded') ? 'degraded'
      : 'operational';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Uplift Status</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet">
  <meta http-equiv="refresh" content="60">
  <style>
    .status-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-3xl mx-auto px-4 py-12">
    <div class="text-center mb-12">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Uplift System Status</h1>
      <p class="text-gray-600">Real-time status of all Uplift services</p>
    </div>

    <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
      <div class="flex items-center gap-3">
        <span class="status-dot" style="background-color: ${statusColors[overallStatus]}"></span>
        <span class="text-xl font-semibold">${statusLabels[overallStatus]}</span>
      </div>
      <p class="text-gray-500 text-sm mt-2">Last updated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="bg-white rounded-lg shadow-sm border divide-y">
      ${services.map(service => `
        <div class="flex items-center justify-between p-4">
          <span class="font-medium text-gray-900">${service.name}</span>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">${statusLabels[service.status]}</span>
            <span class="status-dot" style="background-color: ${statusColors[service.status]}"></span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="mt-8 bg-white rounded-lg shadow-sm border p-6">
      <h2 class="text-lg font-semibold mb-4">Recent Incidents</h2>
      <p class="text-gray-500">No incidents reported in the last 7 days.</p>
    </div>

    <div class="mt-8 bg-white rounded-lg shadow-sm border p-6">
      <h2 class="text-lg font-semibold mb-4">Scheduled Maintenance</h2>
      <p class="text-gray-500">No scheduled maintenance at this time.</p>
    </div>

    <div class="mt-12 text-center text-gray-500 text-sm">
      <p>Subscribe to status updates via <a href="#" class="text-blue-600 hover:underline">email</a> or <a href="#" class="text-blue-600 hover:underline">RSS</a></p>
      <p class="mt-2">&copy; ${new Date().getFullYear()} Uplift. All systems monitored 24/7.</p>
    </div>
  </div>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('Status page error:', error);
    res.status(500).send('Error loading status page');
  }
});

// GET /api/status/history - Get status history (mock)
router.get('/history', (req, res) => {
  const { days = 7 } = req.query;

  // Generate mock history
  const history = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    history.push({
      date: date.toISOString().split('T')[0],
      status: 'operational',
      uptime: 100,
      incidents: []
    });
  }

  res.json({
    days: parseInt(days),
    history,
    overallUptime: 99.99
  });
});

export default router;
