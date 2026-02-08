// ============================================================
// MONITORING & ALERTING
// Health checks with email/Slack alerts on degradation
// ============================================================

import { db } from '../lib/database.js';
import emailService from './email.js';

const SLACK_WEBHOOK_URL = process.env.SLACK_ALERT_WEBHOOK;
const ALERT_EMAIL = process.env.ALERT_EMAIL; // ops team email
const APP_NAME = process.env.APP_NAME || 'Uplift';
const APP_URL = process.env.APP_URL || 'https://api.uplifthq.co.uk';

// Track previous states to avoid alert spam
const previousStates = {};
const alertCooldowns = {}; // name → timestamp of last alert
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between repeat alerts

/**
 * Run all health checks and alert on issues
 */
async function runHealthChecks() {
  const checks = [
    { name: 'database', fn: checkDatabase },
    { name: 'email_queue', fn: checkEmailQueue },
    { name: 'api_response', fn: checkApiResponse },
    { name: 'disk_space', fn: checkDiskUsage },
  ];

  const results = {};

  for (const check of checks) {
    try {
      results[check.name] = await check.fn();
    } catch (err) {
      results[check.name] = { status: 'critical', message: err.message };
    }

    const current = results[check.name].status;
    const previous = previousStates[check.name];

    // Alert on state change to unhealthy, or recovery
    if (previous && previous !== current) {
      if (current !== 'healthy') {
        await sendAlert('degradation', check.name, results[check.name]);
      } else {
        await sendAlert('recovery', check.name, results[check.name]);
      }
    } else if (current === 'critical' && canAlert(check.name)) {
      await sendAlert('critical', check.name, results[check.name]);
    }

    previousStates[check.name] = current;
  }

  return results;
}

function canAlert(name) {
  const last = alertCooldowns[name];
  if (!last || Date.now() - last > COOLDOWN_MS) {
    alertCooldowns[name] = Date.now();
    return true;
  }
  return false;
}

// ==================== HEALTH CHECKS ====================

async function checkDatabase() {
  const start = Date.now();
  try {
    await db.query('SELECT 1');
    const latency = Date.now() - start;
    if (latency > 1000) return { status: 'warning', message: `High latency: ${latency}ms` };
    if (latency > 5000) return { status: 'critical', message: `Very high latency: ${latency}ms` };
    return { status: 'healthy', latency };
  } catch (err) {
    return { status: 'critical', message: err.message };
  }
}

async function checkEmailQueue() {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as stuck FROM email_queue
       WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 minutes'`
    );
    const stuck = parseInt(result.rows[0]?.stuck || 0);
    if (stuck > 50) return { status: 'critical', message: `${stuck} emails stuck in queue` };
    if (stuck > 10) return { status: 'warning', message: `${stuck} emails pending > 30 min` };
    return { status: 'healthy', pending: stuck };
  } catch (err) {
    return { status: 'warning', message: err.message };
  }
}

async function checkApiResponse() {
  const start = Date.now();
  try {
    const response = await fetch(`${APP_URL}/api/status`);
    const latency = Date.now() - start;
    if (!response.ok) return { status: 'critical', message: `Status endpoint returned ${response.status}` };
    if (latency > 5000) return { status: 'warning', message: `Slow response: ${latency}ms` };
    return { status: 'healthy', latency };
  } catch (err) {
    return { status: 'critical', message: `API unreachable: ${err.message}` };
  }
}

async function checkDiskUsage() {
  // Simple check via /tmp usage — works on Railway/Heroku containers
  try {
    const { execSync } = await import('child_process');
    const output = execSync("df -h /tmp | tail -1 | awk '{print $5}'").toString().trim();
    const percent = parseInt(output);
    if (percent > 90) return { status: 'critical', message: `Disk ${percent}% full` };
    if (percent > 75) return { status: 'warning', message: `Disk ${percent}% full` };
    return { status: 'healthy', usage: `${percent}%` };
  } catch {
    return { status: 'healthy', message: 'Unable to check disk (non-critical)' };
  }
}

// ==================== ALERTING ====================

async function sendAlert(type, checkName, details) {
  const emoji = type === 'recovery' ? '✅' : type === 'critical' ? '🚨' : '⚠️';
  const title = type === 'recovery'
    ? `${emoji} RECOVERED: ${checkName}`
    : `${emoji} ${type.toUpperCase()}: ${checkName}`;
  const body = `${title}\n\nDetails: ${details.message || JSON.stringify(details)}\nTime: ${new Date().toISOString()}`;

  console.log(`[monitoring] ${body}`);

  // Slack webhook
  if (SLACK_WEBHOOK_URL) {
    try {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: body,
          username: `${APP_NAME} Monitor`,
          icon_emoji: emoji,
        }),
      });
    } catch (err) {
      console.error('[monitoring] Slack alert failed:', err.message);
    }
  }

  // Email alert
  if (ALERT_EMAIL && type !== 'recovery') {
    try {
      await emailService.queueEmail({
        to_email: ALERT_EMAIL,
        to_name: 'Ops Team',
        subject: `[${APP_NAME}] ${title}`,
        template: 'system_alert',
        body_text: body,
        body_html: `<h2>${title}</h2><p>${details.message || JSON.stringify(details)}</p><p><small>${new Date().toISOString()}</small></p>`,
      });
    } catch (err) {
      console.error('[monitoring] Email alert failed:', err.message);
    }
  }
}

const monitoringService = {
  runHealthChecks,
};

export default monitoringService;
export { runHealthChecks };
