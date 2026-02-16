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

    // ----------------------------------------
    // 12. Create Expense Categories
    // ----------------------------------------
    console.log('💳 Creating expense categories...');

    const expenseCategories = [
      { name: 'Travel', code: 'TRV', glCode: '6100', description: 'Transport, flights, rail, taxi, and car hire', isActive: true },
      { name: 'Meals & Entertainment', code: 'M&E', glCode: '6200', description: 'Client meals, team lunches, hospitality', isActive: true },
      { name: 'Accommodation', code: 'ACC', glCode: '6150', description: 'Hotels, lodging for business trips', isActive: true },
      { name: 'Office Supplies', code: 'OFF', glCode: '6300', description: 'Stationery, small equipment, consumables', isActive: true },
      { name: 'Equipment', code: 'EQP', glCode: '6400', description: 'IT equipment, furniture, tools', isActive: true },
      { name: 'Professional Development', code: 'TRN', glCode: '6500', description: 'Courses, conferences, certifications', isActive: true },
      { name: 'Software & Subscriptions', code: 'SFT', glCode: '6350', description: 'Software licenses, SaaS subscriptions', isActive: true },
      { name: 'Mileage', code: 'MIL', glCode: '6110', description: 'Business mileage reimbursement', isActive: true },
      { name: 'Other', code: 'OTH', glCode: '6999', description: 'Miscellaneous business expenses', isActive: true },
    ];

    for (const cat of expenseCategories) {
      await client.query(`
        INSERT INTO expense_categories (id, organization_id, name, code, gl_code, description, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, cat.name, cat.code, cat.glCode, cat.description, cat.isActive]);
    }

    // Create some auto-categorization mappings
    console.log('🔗 Creating expense category mappings...');

    // Get the category IDs we just created
    const categoryResult = await client.query(
      `SELECT id, name FROM expense_categories WHERE organization_id = $1`,
      [orgId]
    );
    const categoryMap = {};
    for (const row of categoryResult.rows) {
      categoryMap[row.name] = row.id;
    }

    const categoryMappings = [
      { category: 'Travel', merchant: 'uber', matchType: 'contains' },
      { category: 'Travel', merchant: 'trainline', matchType: 'contains' },
      { category: 'Travel', merchant: 'national rail', matchType: 'contains' },
      { category: 'Travel', merchant: 'british airways', matchType: 'contains' },
      { category: 'Meals & Entertainment', merchant: 'costa', matchType: 'contains' },
      { category: 'Meals & Entertainment', merchant: 'starbucks', matchType: 'contains' },
      { category: 'Meals & Entertainment', merchant: 'pret', matchType: 'contains' },
      { category: 'Meals & Entertainment', merchant: 'deliveroo', matchType: 'contains' },
      { category: 'Accommodation', merchant: 'premier inn', matchType: 'contains' },
      { category: 'Accommodation', merchant: 'hilton', matchType: 'contains' },
      { category: 'Accommodation', merchant: 'travelodge', matchType: 'contains' },
      { category: 'Accommodation', merchant: 'booking.com', matchType: 'contains' },
      { category: 'Office Supplies', merchant: 'amazon', matchType: 'contains' },
      { category: 'Office Supplies', merchant: 'viking', matchType: 'contains' },
      { category: 'Office Supplies', merchant: 'ryman', matchType: 'contains' },
    ];

    for (const mapping of categoryMappings) {
      if (categoryMap[mapping.category]) {
        await client.query(`
          INSERT INTO expense_category_mappings (id, category_id, merchant_pattern, match_type)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [uuid(), categoryMap[mapping.category], mapping.merchant, mapping.matchType]);
      }
    }

    // ----------------------------------------
    // 13. Create Sample Time Entries (last 2 weeks)
    // ----------------------------------------
    console.log('⏰ Creating sample time entries...');

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    for (let i = 0; i < 10; i++) {
      const entryDate = new Date(twoWeeksAgo);
      entryDate.setDate(twoWeeksAgo.getDate() + i);
      if (entryDate.getDay() === 0 || entryDate.getDay() === 6) continue; // Skip weekends

      const dateStr = entryDate.toISOString().split('T')[0];

      // Manager time entry
      const managerClockIn = new Date(entryDate);
      managerClockIn.setHours(9, Math.floor(Math.random() * 10), 0); // 9:00-9:10
      const managerClockOut = new Date(entryDate);
      managerClockOut.setHours(17, Math.floor(Math.random() * 15), 0); // 17:00-17:15

      await client.query(`
        INSERT INTO time_entries (id, organization_id, employee_id, date, clock_in, clock_out, break_minutes, status, hours_worked)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, managerEmployeeId, dateStr, managerClockIn, managerClockOut, 30, 7.5]);

      // Worker time entry (some variation)
      const workerClockIn = new Date(entryDate);
      workerClockIn.setHours(10, Math.floor(Math.random() * 5), 0); // 10:00-10:05
      const workerClockOut = new Date(entryDate);
      workerClockOut.setHours(18, Math.floor(Math.random() * 10), 0); // 18:00-18:10

      await client.query(`
        INSERT INTO time_entries (id, organization_id, employee_id, date, clock_in, clock_out, break_minutes, status, hours_worked)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, workerEmployeeId, dateStr, workerClockIn, workerClockOut, 45, 7.25]);
    }

    // ----------------------------------------
    // 14. Create Sample Expense Claims
    // ----------------------------------------
    console.log('💷 Creating sample expense claims...');

    const expenseSamples = [
      { desc: 'Client lunch at Dishoom', category: 'Meals & Entertainment', amount: 67.50, status: 'approved' },
      { desc: 'Train to Manchester conference', category: 'Travel', amount: 125.00, status: 'paid' },
      { desc: 'Office supplies - printer paper', category: 'Office Supplies', amount: 24.99, status: 'pending' },
      { desc: 'Team celebration dinner', category: 'Meals & Entertainment', amount: 185.00, status: 'pending' },
      { desc: 'Uber to airport', category: 'Travel', amount: 42.50, status: 'approved' },
      { desc: 'Premier Inn Birmingham 2 nights', category: 'Accommodation', amount: 178.00, status: 'paid' },
    ];

    const expenseCatResult = await client.query(
      `SELECT id, name FROM expense_categories WHERE organization_id = $1`,
      [orgId]
    );
    const expenseCatMap = {};
    for (const row of expenseCatResult.rows) {
      expenseCatMap[row.name] = row.id;
    }

    for (const exp of expenseSamples) {
      const expenseDate = new Date();
      expenseDate.setDate(expenseDate.getDate() - Math.floor(Math.random() * 30)); // Random date within last 30 days

      await client.query(`
        INSERT INTO expense_claims (id, organization_id, employee_id, description, category_id, amount, expense_date, status, currency)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'GBP')
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, managerEmployeeId, exp.desc, expenseCatMap[exp.category], exp.amount, expenseDate.toISOString().split('T')[0], exp.status]);
    }

    // ----------------------------------------
    // 15. Create Recognitions/Kudos
    // ----------------------------------------
    console.log('🌟 Creating sample recognitions...');

    const recognitions = [
      { from: adminEmployeeId, to: managerEmployeeId, type: 'shoutout', message: 'Great job handling the busy weekend shift!', value: 'reliability', points: 25 },
      { from: managerEmployeeId, to: workerEmployeeId, type: 'kudos', message: 'Excellent customer service with difficult customer', value: 'customer_focus', points: 15 },
      { from: adminEmployeeId, to: workerEmployeeId, type: 'thank_you', message: 'Thanks for covering the extra shift on short notice', value: 'teamwork', points: 20 },
      { from: managerEmployeeId, to: workerEmployeeId, type: 'great_job', message: 'Brilliant upselling this week - best numbers on the team!', value: 'other', points: 30 },
    ];

    for (const rec of recognitions) {
      await client.query(`
        INSERT INTO recognitions (id, organization_id, sender_id, recipient_id, type, message, value, points, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, rec.from, rec.to, rec.type, rec.message, rec.value, rec.points]);
    }

    // ----------------------------------------
    // 16. Create Momentum Scores
    // ----------------------------------------
    console.log('📊 Creating momentum scores...');

    const today30DaysAgo = new Date();
    today30DaysAgo.setDate(today30DaysAgo.getDate() - 30);
    const periodStart = today30DaysAgo.toISOString().split('T')[0];
    const periodEnd = new Date().toISOString().split('T')[0];

    const momentumScores = [
      {
        employeeId: managerEmployeeId,
        score: 87.5,
        attendance: 95, punctuality: 92, shiftCompletion: 100, skillsGrowth: 75, recognition: 85, engagement: 80,
        trend: 'up'
      },
      {
        employeeId: workerEmployeeId,
        score: 78.2,
        attendance: 88, punctuality: 75, shiftCompletion: 95, skillsGrowth: 60, recognition: 90, engagement: 70,
        trend: 'up'
      },
      {
        employeeId: adminEmployeeId,
        score: 92.0,
        attendance: 100, punctuality: 98, shiftCompletion: 100, skillsGrowth: 80, recognition: 95, engagement: 85,
        trend: 'stable'
      },
    ];

    for (const ms of momentumScores) {
      await client.query(`
        INSERT INTO momentum_scores (id, employee_id, organization_id, score, attendance_score, punctuality_score, shift_completion_score, skills_growth_score, recognition_score, engagement_score, trend, period_start, period_end)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [uuid(), ms.employeeId, orgId, ms.score, ms.attendance, ms.punctuality, ms.shiftCompletion, ms.skillsGrowth, ms.recognition, ms.engagement, ms.trend, periodStart, periodEnd]);
    }

    // ----------------------------------------
    // 17. Create Time Off Policies
    // ----------------------------------------
    console.log('🏖️ Creating time off policies...');

    const timeOffPolicies = [
      { name: 'Annual Leave', code: 'AL', allowance: 28, carryOver: 5, requiresApproval: true },
      { name: 'Sick Leave', code: 'SL', allowance: null, carryOver: 0, requiresApproval: false },
      { name: 'Personal Day', code: 'PD', allowance: 3, carryOver: 0, requiresApproval: true },
      { name: 'Work From Home', code: 'WFH', allowance: null, carryOver: 0, requiresApproval: true },
    ];

    for (const policy of timeOffPolicies) {
      await client.query(`
        INSERT INTO time_off_policies (id, organization_id, name, code, default_allowance, max_carry_over, requires_approval)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, policy.name, policy.code, policy.allowance, policy.carryOver, policy.requiresApproval]);
    }

    // ----------------------------------------
    // 18. Create Additional Demo Employees
    // ----------------------------------------
    console.log('👥 Creating additional demo employees...');

    const additionalEmployees = [
      { firstName: 'Emily', lastName: 'Thompson', email: 'emily.thompson@demo.com', title: 'Team Lead', rate: 18.00, momentum: 82.5 },
      { firstName: 'James', lastName: 'Williams', email: 'james.williams@demo.com', title: 'Sales Associate', rate: 12.50, momentum: 71.0 },
      { firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@demo.com', title: 'Customer Service Rep', rate: 13.00, momentum: 88.0 },
      { firstName: 'David', lastName: 'Brown', email: 'david.brown@demo.com', title: 'Warehouse Associate', rate: 14.00, momentum: 65.0 },
      { firstName: 'Sophie', lastName: 'Martinez', email: 'sophie.martinez@demo.com', title: 'Barista', rate: 12.00, momentum: 79.5 },
    ];

    for (const emp of additionalEmployees) {
      const empId = uuid();
      await client.query(`
        INSERT INTO employees (id, organization_id, first_name, last_name, email, status, job_title, contract_hours, hourly_rate)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, 35, $7)
        ON CONFLICT DO NOTHING
      `, [empId, orgId, emp.firstName, emp.lastName, emp.email, emp.title, emp.rate]);

      // Add momentum score for each
      await client.query(`
        INSERT INTO momentum_scores (id, employee_id, organization_id, score, attendance_score, punctuality_score, shift_completion_score, skills_growth_score, recognition_score, engagement_score, trend, period_start, period_end)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [uuid(), empId, orgId, emp.momentum,
          Math.round(emp.momentum + (Math.random() * 10 - 5)),
          Math.round(emp.momentum + (Math.random() * 10 - 5)),
          Math.round(emp.momentum + (Math.random() * 10 - 5)),
          Math.round(emp.momentum + (Math.random() * 15 - 10)),
          Math.round(emp.momentum + (Math.random() * 10 - 5)),
          Math.round(emp.momentum + (Math.random() * 10 - 5)),
          Math.random() > 0.5 ? 'up' : 'stable', periodStart, periodEnd]);
    }

    await client.query('COMMIT');

    console.log('\n✅ Seed completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Demo Accounts Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:   admin@demo.com   / admin123');
    console.log('Manager: manager@demo.com / manager123');
    console.log('Worker:  worker@demo.com  / worker123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nDemo Data Includes:');
    console.log('• 3 locations (London, Manchester, Birmingham)');
    console.log('• 4 departments');
    console.log('• 8 skills');
    console.log('• 9 expense categories with auto-categorization');
    console.log('• Sample time entries (last 2 weeks)');
    console.log('• Sample expense claims');
    console.log('• Employee recognitions/kudos');
    console.log('• Momentum scores for all employees');
    console.log('• Time off policies');
    console.log('• 8 total employees with varied data\n');

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
