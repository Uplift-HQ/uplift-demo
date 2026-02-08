// ============================================================
// ENVIRONMENT CONFIGURATION & VALIDATION
// ============================================================
// Load environment variable defaults before any other module
// Railway/Vercel variables should override these when properly configured

import dotenv from 'dotenv';

// Load .env file (no-op in production where env vars are already set)
dotenv.config();

// Development defaults - NEVER used in production
const defaults = {
  NODE_ENV: 'development',
  PORT: '3000',
  JWT_SECRET: 'dev-only-fallback-secret-change-in-production-min32chars',
  JWT_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_DAYS: '7',
  CORS_ORIGINS: 'http://localhost:5173,http://localhost:3000',
  LOG_LEVEL: 'debug',
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// -------------------- STARTUP VALIDATION --------------------
// These variables are REQUIRED for the application to run safely

const isProduction = process.env.NODE_ENV === 'production';
const errors = [];

// CRITICAL: Database URL must always be set
if (!process.env.DATABASE_URL) {
  errors.push('DATABASE_URL is required - cannot connect to database');
}

// CRITICAL: JWT_SECRET must be set in production (fallback only for dev)
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('dev-only'))) {
  errors.push('JWT_SECRET must be set to a secure value in production');
}

// CRITICAL: JWT_SECRET must be at least 32 characters
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  errors.push('JWT_SECRET must be at least 32 characters for security');
}

// Exit if any critical errors
if (errors.length > 0) {
  console.error('\n╔════════════════════════════════════════════════════════════╗');
  console.error('║              STARTUP VALIDATION FAILED                     ║');
  console.error('╠════════════════════════════════════════════════════════════╣');
  errors.forEach(err => console.error(`║  ❌ ${err}`));
  console.error('╚════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}

// Warnings (non-fatal)
const warnings = [];

if (isProduction && !process.env.SENTRY_DSN) {
  warnings.push('SENTRY_DSN not set - error tracking disabled');
}

if (isProduction && !process.env.STRIPE_SECRET_KEY) {
  warnings.push('STRIPE_SECRET_KEY not set - billing features disabled');
}

if (isProduction && !process.env.POSTMARK_SERVER_TOKEN && !process.env.SENDGRID_API_KEY) {
  warnings.push('No email provider configured - emails will be logged only');
}

if (warnings.length > 0) {
  console.warn('\n⚠️  Startup warnings:');
  warnings.forEach(w => console.warn(`   - ${w}`));
  console.warn('');
}
