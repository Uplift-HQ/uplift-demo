// ============================================================
// PRODUCTION DATABASE SEED
// Creates minimal bootstrap data for a fresh installation
// First login triggers the onboarding setup wizard
// Usage: node packages/database/seed.js
// ============================================================

import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uplift'
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const hash = async (password) => bcrypt.hash(password, 12);
const uuid = () => randomUUID();
const generateSecurePassword = () => {
  // Generate a secure random password
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const bytes = randomBytes(16);
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
};

// ============================================================
// PRODUCTION SEED
// ============================================================

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🌱 Starting production database seed...\n');

    // ----------------------------------------
    // 1. Create Billing Plans (required for subscriptions)
    // ----------------------------------------
    console.log('💳 Creating billing plans...');

    const plans = [
      { slug: 'growth', name: 'Growth', corePrice: 10.00, flexPrice: 15.00, minSeats: 10, maxSeats: 99 },
      { slug: 'scale', name: 'Scale', corePrice: 8.00, flexPrice: 12.00, minSeats: 100, maxSeats: 499 },
      { slug: 'enterprise', name: 'Enterprise', corePrice: 6.00, flexPrice: 10.00, minSeats: 500, maxSeats: null },
    ];

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      await client.query(`
        INSERT INTO plans (id, slug, name, core_price_per_seat, flex_price_per_seat, min_seats, max_seats, is_active, is_public, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, $8)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      `, [uuid(), plan.slug, plan.name, plan.corePrice, plan.flexPrice, plan.minSeats, plan.maxSeats, i + 1]);
    }

    // ----------------------------------------
    // 2. Create Super Admin User
    // ----------------------------------------
    console.log('👤 Creating super admin user...');

    // Generate or use environment variable for initial password
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || generateSecurePassword();
    const adminUserId = uuid();
    const adminPassword = await hash(initialPassword);

    // Note: No organization_id - super admin is platform-level
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [adminUserId, 'admin@uplift.hr', adminPassword, 'Platform', 'Admin', 'superadmin', 'active', true]);

    await client.query('COMMIT');

    console.log('\n✅ Production seed completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Super Admin Account:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    admin@uplift.hr`);
    console.log(`Password: ${initialPassword}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Next steps:');
    console.log('1. Log in with the super admin account');
    console.log('2. Complete the organisation onboarding wizard');
    console.log('3. Add your first location, department, and employees');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
