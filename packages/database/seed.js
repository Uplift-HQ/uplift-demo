// ============================================================
// DATABASE SEED SCRIPT
// Creates initial admin user and sample data for development
// Usage: node database/seed.js
// ============================================================

import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uplift'
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const hash = async (password) => bcrypt.hash(password, 12);
const uuid = () => randomUUID();

// ============================================================
// SEED DATA
// ============================================================

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting database seed...\n');

    // ----------------------------------------
    // 1. Create Demo Organization
    // ----------------------------------------
    console.log('📦 Creating organization...');
    
    const orgId = uuid();
    await client.query(`
      INSERT INTO organizations (id, name, slug, timezone, currency, features)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `, [
      orgId,
      'Uplift Demo',
      'uplift-demo',
      'Europe/London',
      'GBP',
      JSON.stringify({
        scheduling: true,
        timeTracking: true,
        skills: true,
        careers: true,
        gamification: true,
        aiScheduling: true
      })
    ]);

    // ----------------------------------------
    // 2. Create Admin User
    // ----------------------------------------
    console.log('👤 Creating admin user...');
    
    const adminUserId = uuid();
    const adminEmployeeId = uuid();
    const adminPassword = await hash('admin123');
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, status, email_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [adminUserId, 'admin@demo.com', adminPassword, 'Demo', 'Admin', 'admin', orgId, 'active']);

    await client.query(`
      INSERT INTO employees (id, user_id, organization_id, first_name, last_name, email, status, job_title, contract_hours, hourly_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
    `, [adminEmployeeId, adminUserId, orgId, 'Demo', 'Admin', 'admin@demo.com', 'active', 'Administrator', 40, 50.00]);

    // ----------------------------------------
    // 3. Create Manager User
    // ----------------------------------------
    console.log('👤 Creating manager user...');
    
    const managerUserId = uuid();
    const managerEmployeeId = uuid();
    const managerPassword = await hash('manager123');
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, status, email_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [managerUserId, 'manager@demo.com', managerPassword, 'Sarah', 'Chen', 'manager', orgId, 'active']);

    await client.query(`
      INSERT INTO employees (id, user_id, organization_id, first_name, last_name, email, status, job_title, contract_hours, hourly_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
    `, [managerEmployeeId, managerUserId, orgId, 'Sarah', 'Chen', 'manager@demo.com', 'active', 'Store Manager', 40, 25.00]);

    // ----------------------------------------
    // 4. Create Worker User
    // ----------------------------------------
    console.log('👤 Creating worker user...');
    
    const workerUserId = uuid();
    const workerEmployeeId = uuid();
    const workerPassword = await hash('worker123');
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, status, email_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [workerUserId, 'worker@demo.com', workerPassword, 'Marcus', 'Johnson', 'worker', orgId, 'active']);

    await client.query(`
      INSERT INTO employees (id, user_id, organization_id, first_name, last_name, email, status, job_title, contract_hours, hourly_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
    `, [workerEmployeeId, workerUserId, orgId, 'Marcus', 'Johnson', 'worker@demo.com', 'active', 'Sales Associate', 35, 12.50]);

    // ----------------------------------------
    // 5. Create Locations
    // ----------------------------------------
    console.log('📍 Creating locations...');
    
    const locations = [
      { name: 'London - Oxford St', address: '123 Oxford Street, London W1D 2LN', openTime: '09:00', closeTime: '21:00' },
      { name: 'Manchester - Arndale', address: 'Arndale Centre, Manchester M4 3AQ', openTime: '09:00', closeTime: '20:00' },
      { name: 'Birmingham - Bullring', address: 'Bullring, Birmingham B5 4BU', openTime: '10:00', closeTime: '20:00' },
    ];

    const locationIds = [];
    for (const loc of locations) {
      const locId = uuid();
      locationIds.push(locId);
      await client.query(`
        INSERT INTO locations (id, organization_id, name, address, open_time, close_time, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        ON CONFLICT DO NOTHING
      `, [locId, orgId, loc.name, loc.address, loc.openTime, loc.closeTime]);
    }

    // ----------------------------------------
    // 6. Create Departments
    // ----------------------------------------
    console.log('🏢 Creating departments...');
    
    const departments = ['Retail', 'Food & Beverage', 'Warehouse', 'Customer Service'];
    const deptIds = [];
    
    for (const name of departments) {
      const deptId = uuid();
      deptIds.push(deptId);
      await client.query(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [deptId, orgId, name]);
    }

    // ----------------------------------------
    // 7. Create Skills
    // ----------------------------------------
    console.log('🎯 Creating skills...');
    
    const skills = [
      { name: 'Cash Handling', category: 'Core', required: true },
      { name: 'Customer Service', category: 'Core', required: true },
      { name: 'First Aid', category: 'Safety', required: false },
      { name: 'Food Safety L2', category: 'Compliance', required: true },
      { name: 'Barista', category: 'Specialist', required: false },
      { name: 'Forklift License', category: 'Specialist', required: false },
      { name: 'Team Leadership', category: 'Management', required: false },
      { name: 'Inventory Management', category: 'Operations', required: false },
    ];

    for (const skill of skills) {
      await client.query(`
        INSERT INTO skills (id, organization_id, name, category, is_required)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, skill.name, skill.category, skill.required]);
    }

    // ----------------------------------------
    // 8. Create Billing Plan
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
    // 9. Create Sample Subscription (Trial)
    // ----------------------------------------
    console.log('📋 Creating trial subscription...');
    
    await client.query(`
      INSERT INTO subscriptions (id, organization_id, plan_id, status, core_seats, flex_seats, trial_ends_at)
      SELECT $1, $2, p.id, 'trialing', 50, 10, NOW() + INTERVAL '14 days'
      FROM plans p WHERE p.slug = 'growth'
      ON CONFLICT DO NOTHING
    `, [uuid(), orgId]);

    // ----------------------------------------
    // 10. Create Sample Shifts (this week)
    // ----------------------------------------
    console.log('📅 Creating sample shifts...');
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    for (let i = 0; i < 5; i++) { // Mon-Fri
      const shiftDate = new Date(startOfWeek);
      shiftDate.setDate(startOfWeek.getDate() + i);
      const dateStr = shiftDate.toISOString().split('T')[0];

      // Manager shift
      await client.query(`
        INSERT INTO shifts (id, organization_id, location_id, employee_id, date, start_time, end_time, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, locationIds[0], managerEmployeeId, dateStr, '09:00', '17:00']);

      // Worker shift
      await client.query(`
        INSERT INTO shifts (id, organization_id, location_id, employee_id, date, start_time, end_time, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, locationIds[0], workerEmployeeId, dateStr, '10:00', '18:00']);

      // Open shift
      await client.query(`
        INSERT INTO shifts (id, organization_id, location_id, date, start_time, end_time, status, is_open)
        VALUES ($1, $2, $3, $4, $5, $6, 'open', true)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, locationIds[0], dateStr, '14:00', '22:00']);
    }

    // ----------------------------------------
    // 11. Create Internal Job Posting
    // ----------------------------------------
    console.log('💼 Creating job postings...');
    
    await client.query(`
      INSERT INTO job_postings (id, organization_id, title, description, department_id, location_id, employment_type, salary_min, salary_max, is_internal, status)
      SELECT $1, $2, $3, $4, d.id, $5, $6, $7, $8, $9, 'open'
      FROM departments d WHERE d.organization_id = $2 AND d.name = 'Retail'
      LIMIT 1
      ON CONFLICT DO NOTHING
    `, [uuid(), orgId, 'Shift Supervisor', 'Lead a team of 5-8 sales associates. Previous retail management experience preferred.', locationIds[0], 'full_time', 28000, 32000, true]);

    await client.query('COMMIT');

    console.log('\n✅ Seed completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Demo Accounts Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:   admin@demo.com   / admin123');
    console.log('Manager: manager@demo.com / manager123');
    console.log('Worker:  worker@demo.com  / worker123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
