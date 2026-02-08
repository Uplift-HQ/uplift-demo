// ============================================================
// BACKGROUND JOB QUEUE
// Uses BullMQ + Redis when available, falls back to setInterval
// ============================================================

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
let connection = null;
let useRedis = false;
const queues = {};
const workers = [];
const intervals = [];

// Job definitions: name → { handler, repeat }
const jobRegistry = {};

/**
 * Initialize Redis connection if configured
 */
async function init() {
  if (REDIS_URL) {
    try {
      connection = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
      });
      await new Promise((resolve, reject) => {
        connection.once('ready', resolve);
        connection.once('error', reject);
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
      });
      useRedis = true;
      console.log('[jobs] Connected to Redis — using BullMQ');
    } catch (err) {
      console.warn(`[jobs] Redis unavailable (${err.message}) — falling back to in-process scheduling`);
      connection = null;
      useRedis = false;
    }
  } else {
    console.log('[jobs] No REDIS_URL — using in-process scheduling');
  }
}

/**
 * Register a recurring job
 * @param {string} name - Unique job name
 * @param {Function} handler - async function to execute
 * @param {object} options
 * @param {number} options.every - Repeat interval in ms
 * @param {string} [options.cron] - Cron expression (takes precedence over `every`)
 */
function register(name, handler, options = {}) {
  jobRegistry[name] = { handler, options };
}

/**
 * Start all registered jobs
 */
async function startAll() {
  for (const [name, { handler, options }] of Object.entries(jobRegistry)) {
    if (useRedis) {
      const queue = new Queue(name, { connection });
      queues[name] = queue;

      // Remove existing repeatable jobs to avoid duplicates on restart
      const existing = await queue.getRepeatableJobs();
      for (const job of existing) {
        await queue.removeRepeatableByKey(job.key);
      }

      // Add repeatable job
      const repeatOpts = options.cron
        ? { pattern: options.cron }
        : { every: options.every };

      await queue.add(name, {}, { repeat: repeatOpts });

      // Create worker
      const worker = new Worker(name, async () => {
        await handler();
      }, {
        connection,
        concurrency: 1,
        limiter: { max: 1, duration: 1000 },
      });

      worker.on('failed', (job, err) => {
        console.error(`[jobs] ${name} failed:`, err.message);
      });

      workers.push(worker);
      console.log(`[jobs] Registered BullMQ job: ${name}`);
    } else {
      // Fallback: in-process scheduling
      if (options.cron) {
        // Simple cron fallback: parse "0 3 * * *" → daily at 3 AM
        const cronInterval = parseCronToMs(options.cron);
        if (cronInterval) {
          const id = setInterval(async () => {
            try { await handler(); } catch (err) { console.error(`[jobs] ${name} error:`, err.message); }
          }, cronInterval);
          intervals.push(id);
        }
      } else if (options.every) {
        const id = setInterval(async () => {
          try { await handler(); } catch (err) { console.error(`[jobs] ${name} error:`, err.message); }
        }, options.every);
        intervals.push(id);
      }
      console.log(`[jobs] Registered in-process job: ${name}`);
    }
  }
}

/**
 * Enqueue a one-off job (e.g., send welcome email after signup)
 */
async function enqueue(name, data = {}, options = {}) {
  if (useRedis && queues[name]) {
    await queues[name].add(`${name}-oneoff`, data, options);
    return;
  }
  // Fallback: execute immediately
  const job = jobRegistry[name];
  if (job) {
    try { await job.handler(data); } catch (err) { console.error(`[jobs] ${name} error:`, err.message); }
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  for (const id of intervals) {
    clearInterval(id);
  }
  for (const worker of workers) {
    await worker.close();
  }
  for (const queue of Object.values(queues)) {
    await queue.close();
  }
  if (connection) {
    await connection.quit();
  }
  console.log('[jobs] All workers shut down');
}

/**
 * Basic cron-to-ms fallback for simple patterns
 */
function parseCronToMs(cron) {
  // "0 3 * * *" = daily → 24h
  // "*/15 * * * *" = every 15 min
  const parts = cron.split(' ');
  if (parts.length !== 5) return null;
  const [min, hour, dom, month, dow] = parts;

  if (dom === '*' && month === '*' && dow === '*') {
    if (min.startsWith('*/')) {
      return parseInt(min.slice(2)) * 60 * 1000;
    }
    if (hour === '*') {
      return 60 * 60 * 1000; // hourly fallback
    }
    return 24 * 60 * 60 * 1000; // daily fallback
  }
  return 24 * 60 * 60 * 1000; // default daily
}

const jobQueue = {
  init,
  register,
  startAll,
  enqueue,
  shutdown,
  get useRedis() { return useRedis; },
};

export default jobQueue;
export { init, register, startAll, enqueue, shutdown };
