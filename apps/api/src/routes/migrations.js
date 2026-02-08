// ============================================================
// DATABASE MIGRATIONS ENDPOINT
// Standalone endpoint for running migrations with secret key auth
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';

const router = Router();

// Migration secret - must be set in environment
const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'uplift-migrate-2026';

// Simple key-based auth for migration endpoints
const requireMigrationKey = (req, res, next) => {
  const key = req.headers['x-migration-key'] || req.query.key;
  if (key !== MIGRATION_SECRET) {
    return res.status(403).json({ error: 'Invalid migration key' });
  }
  next();
};

/**
 * GET /api/migrations/status - Get migration status
 */
router.get('/status', requireMigrationKey, async (req, res) => {
  try {
    // Check if migrations table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_migrations'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        status: 'no_migrations_table',
        executed: [],
        message: 'Migrations table does not exist yet'
      });
    }

    // Get executed migrations
    const executed = await db.query(`
      SELECT filename, executed_at
      FROM _migrations
      ORDER BY executed_at ASC
    `);

    // Get all tables
    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    res.json({
      status: 'ok',
      executed: executed.rows,
      executedCount: executed.rows.length,
      tables: tables.rows.map(r => r.table_name),
      tableCount: tables.rows.length
    });
  } catch (error) {
    console.error('Get migration status error:', error);
    res.status(500).json({ error: 'Failed to get migration status', details: error.message });
  }
});

/**
 * POST /api/migrations/run - Run pending migrations
 */
router.post('/run', requireMigrationKey, async (req, res) => {
  const client = await db.getClient();

  try {
    console.log('🚀 Starting database migrations via API...');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get list of executed migrations
    const executed = await client.query('SELECT filename FROM _migrations');
    const executedFiles = new Set(executed.rows.map(r => r.filename));

    // Migration SQL files - embedded for API execution
    const migrations = getMigrationFiles();

    const results = [];
    let migratedCount = 0;

    for (const migration of migrations) {
      if (executedFiles.has(migration.filename)) {
        results.push({ filename: migration.filename, status: 'skipped', reason: 'already executed' });
        continue;
      }

      console.log(`📄 Running ${migration.filename}...`);

      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [migration.filename]
        );
        await client.query('COMMIT');
        results.push({ filename: migration.filename, status: 'success' });
        migratedCount++;
        console.log(`   ✅ ${migration.filename} completed`);
      } catch (error) {
        await client.query('ROLLBACK');
        results.push({ filename: migration.filename, status: 'failed', error: error.message });
        console.error(`   ❌ ${migration.filename} failed:`, error.message);
        // Continue with other migrations instead of stopping
      }
    }

    res.json({
      success: true,
      migratedCount,
      skippedCount: migrations.length - migratedCount - results.filter(r => r.status === 'failed').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      results
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  } finally {
    client.release();
  }
});

// Helper to get migration files (embedded SQL)
function getMigrationFiles() {
  return [
    {
      filename: '001_core_schema.sql',
      sql: `
        -- Organizations
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          timezone VARCHAR(50) DEFAULT 'Europe/London',
          currency VARCHAR(3) DEFAULT 'GBP',
          features JSONB DEFAULT '{}',
          settings JSONB DEFAULT '{}',
          billing_email VARCHAR(255),
          billing_name VARCHAR(255),
          tax_id VARCHAR(50),
          stripe_customer_id VARCHAR(100),
          metadata JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Users
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          role VARCHAR(50) DEFAULT 'worker',
          status VARCHAR(20) DEFAULT 'active',
          preferred_language VARCHAR(10) DEFAULT 'en',
          avatar_url TEXT,
          phone VARCHAR(50),
          last_login_at TIMESTAMPTZ,
          email_verified_at TIMESTAMPTZ,
          mfa_enabled BOOLEAN DEFAULT false,
          mfa_secret VARCHAR(100),
          backup_codes TEXT[],
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Employees
        CREATE TABLE IF NOT EXISTS employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          employee_number VARCHAR(50),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          job_title VARCHAR(100),
          department_id UUID,
          location_id UUID,
          manager_id UUID REFERENCES employees(id),
          employment_type VARCHAR(50) DEFAULT 'full_time',
          contract_hours NUMERIC(5,2),
          hourly_rate NUMERIC(10,2),
          salary NUMERIC(12,2),
          start_date DATE,
          end_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          seat_type VARCHAR(20) DEFAULT 'core',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Departments
        CREATE TABLE IF NOT EXISTS departments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          parent_id UUID REFERENCES departments(id),
          manager_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Locations
        CREATE TABLE IF NOT EXISTS locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          address TEXT,
          city VARCHAR(100),
          country VARCHAR(100),
          timezone VARCHAR(50),
          open_time TIME,
          close_time TIME,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
        CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
      `
    },
    {
      filename: '002_scheduling.sql',
      sql: `
        -- Shifts
        CREATE TABLE IF NOT EXISTS shifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          location_id UUID REFERENCES locations(id),
          employee_id UUID REFERENCES employees(id),
          department_id UUID,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          break_minutes INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'scheduled',
          is_open BOOLEAN DEFAULT false,
          notes TEXT,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Time entries
        CREATE TABLE IF NOT EXISTS time_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          shift_id UUID REFERENCES shifts(id),
          clock_in TIMESTAMPTZ NOT NULL,
          clock_out TIMESTAMPTZ,
          break_start TIMESTAMPTZ,
          break_end TIMESTAMPTZ,
          total_break_minutes INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          location_id UUID,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Time off requests
        CREATE TABLE IF NOT EXISTS time_off_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          total_days NUMERIC(5,2),
          status VARCHAR(20) DEFAULT 'pending',
          reason TEXT,
          approved_by UUID,
          approved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_shifts_org_date ON shifts(organization_id, date);
        CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id, date);
        CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id, clock_in);
      `
    },
    {
      filename: '003_billing.sql',
      sql: `
        -- Plans
        CREATE TABLE IF NOT EXISTS plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          core_price_per_seat NUMERIC(10,2) NOT NULL,
          flex_price_per_seat NUMERIC(10,2) NOT NULL,
          min_seats INTEGER DEFAULT 1,
          max_seats INTEGER,
          features JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          is_public BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          stripe_price_id_core VARCHAR(100),
          stripe_price_id_flex VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Subscriptions
        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
          plan_id UUID REFERENCES plans(id),
          status VARCHAR(20) DEFAULT 'active',
          core_seats INTEGER DEFAULT 0,
          flex_seats INTEGER DEFAULT 0,
          trial_start TIMESTAMPTZ,
          trial_end TIMESTAMPTZ,
          trial_ends_at TIMESTAMPTZ,
          current_period_start TIMESTAMPTZ,
          current_period_end TIMESTAMPTZ,
          cancel_at_period_end BOOLEAN DEFAULT false,
          canceled_at TIMESTAMPTZ,
          cancellation_reason TEXT,
          stripe_subscription_id VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Invoices
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          stripe_invoice_id VARCHAR(100),
          invoice_number VARCHAR(50),
          invoice_date DATE,
          due_date DATE,
          subtotal NUMERIC(12,2),
          tax NUMERIC(12,2),
          total NUMERIC(12,2),
          status VARCHAR(20) DEFAULT 'draft',
          pdf_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Billing events
        CREATE TABLE IF NOT EXISTS billing_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          event_type VARCHAR(100) NOT NULL,
          data JSONB,
          actor_type VARCHAR(50),
          actor_id UUID,
          actor_email VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
      `
    },
    {
      filename: '004_learning.sql',
      sql: `
        -- Learning courses
        CREATE TABLE IF NOT EXISTS learning_courses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          duration_minutes INTEGER,
          thumbnail_url TEXT,
          content_type VARCHAR(50) DEFAULT 'video',
          content_url TEXT,
          is_required BOOLEAN DEFAULT false,
          is_published BOOLEAN DEFAULT true,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Course enrollments
        CREATE TABLE IF NOT EXISTS learning_enrollments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id UUID REFERENCES learning_courses(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'enrolled',
          progress INTEGER DEFAULT 0,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          due_date DATE,
          score INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(course_id, employee_id)
        );

        CREATE INDEX IF NOT EXISTS idx_courses_org ON learning_courses(organization_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_employee ON learning_enrollments(employee_id);
      `
    },
    {
      filename: '005_performance.sql',
      sql: `
        -- Performance goals
        CREATE TABLE IF NOT EXISTS performance_goals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          level VARCHAR(50) DEFAULT 'individual',
          target_value NUMERIC(12,2),
          current_value NUMERIC(12,2) DEFAULT 0,
          unit VARCHAR(50),
          start_date DATE,
          due_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          progress INTEGER DEFAULT 0,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Performance reviews
        CREATE TABLE IF NOT EXISTS performance_reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          reviewer_id UUID REFERENCES employees(id),
          cycle_id UUID,
          type VARCHAR(50) DEFAULT 'annual',
          status VARCHAR(20) DEFAULT 'pending',
          overall_rating INTEGER,
          self_assessment JSONB,
          manager_assessment JSONB,
          feedback TEXT,
          submitted_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Review cycles
        CREATE TABLE IF NOT EXISTS performance_cycles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) DEFAULT 'annual',
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          self_review_deadline DATE,
          manager_review_deadline DATE,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_goals_employee ON performance_goals(employee_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_employee ON performance_reviews(employee_id);
      `
    },
    {
      filename: '006_recognition.sql',
      sql: `
        -- Recognition/kudos
        CREATE TABLE IF NOT EXISTS recognition (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          from_employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          to_employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          category VARCHAR(100),
          value VARCHAR(100),
          message TEXT NOT NULL,
          points INTEGER DEFAULT 0,
          is_public BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Recognition reactions
        CREATE TABLE IF NOT EXISTS recognition_reactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recognition_id UUID REFERENCES recognition(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          reaction VARCHAR(50) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(recognition_id, employee_id)
        );

        CREATE INDEX IF NOT EXISTS idx_recognition_to ON recognition(to_employee_id);
        CREATE INDEX IF NOT EXISTS idx_recognition_from ON recognition(from_employee_id);
      `
    },
    {
      filename: '007_payroll.sql',
      sql: `
        -- Payroll runs
        CREATE TABLE IF NOT EXISTS payroll_runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          pay_period_start DATE NOT NULL,
          pay_period_end DATE NOT NULL,
          pay_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'draft',
          total_gross NUMERIC(12,2) DEFAULT 0,
          total_deductions NUMERIC(12,2) DEFAULT 0,
          total_net NUMERIC(12,2) DEFAULT 0,
          employee_count INTEGER DEFAULT 0,
          approved_by UUID,
          approved_at TIMESTAMPTZ,
          processed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Payslips
        CREATE TABLE IF NOT EXISTS payslips (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          gross_pay NUMERIC(12,2) NOT NULL,
          tax NUMERIC(12,2) DEFAULT 0,
          national_insurance NUMERIC(12,2) DEFAULT 0,
          pension NUMERIC(12,2) DEFAULT 0,
          student_loan NUMERIC(12,2) DEFAULT 0,
          other_deductions NUMERIC(12,2) DEFAULT 0,
          net_pay NUMERIC(12,2) NOT NULL,
          hours_worked NUMERIC(8,2),
          overtime_hours NUMERIC(8,2),
          breakdown JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tax codes
        CREATE TABLE IF NOT EXISTS employee_tax_info (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
          tax_code VARCHAR(20) DEFAULT '1257L',
          ni_category VARCHAR(5) DEFAULT 'A',
          student_loan_plan VARCHAR(10),
          pension_contribution NUMERIC(5,2) DEFAULT 5.00,
          pension_type VARCHAR(20) DEFAULT 'percentage',
          bank_account_name VARCHAR(255),
          bank_sort_code VARCHAR(10),
          bank_account_number VARCHAR(20),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(organization_id);
        CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
      `
    },
    {
      filename: '008_surveys.sql',
      sql: `
        -- Surveys
        CREATE TABLE IF NOT EXISTS surveys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) DEFAULT 'engagement',
          status VARCHAR(20) DEFAULT 'draft',
          is_anonymous BOOLEAN DEFAULT true,
          start_date TIMESTAMPTZ,
          end_date TIMESTAMPTZ,
          questions JSONB DEFAULT '[]',
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Survey responses
        CREATE TABLE IF NOT EXISTS survey_responses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
          answers JSONB NOT NULL,
          submitted_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_surveys_org ON surveys(organization_id);
        CREATE INDEX IF NOT EXISTS idx_survey_responses ON survey_responses(survey_id);
      `
    },
    {
      filename: '009_notifications.sql',
      sql: `
        -- Notifications
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          organization_id UUID,
          type VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          data JSONB DEFAULT '{}',
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Email queue
        CREATE TABLE IF NOT EXISTS email_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          to_email VARCHAR(255) NOT NULL,
          to_name VARCHAR(255),
          template VARCHAR(100),
          template_data JSONB DEFAULT '{}',
          subject VARCHAR(255),
          body_html TEXT,
          body_text TEXT,
          language VARCHAR(10) DEFAULT 'en',
          status VARCHAR(20) DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          last_error TEXT,
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
        CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, created_at);
      `
    },
    {
      filename: '010_skills_careers.sql',
      sql: `
        -- Skills
        CREATE TABLE IF NOT EXISTS skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          category VARCHAR(100),
          description TEXT,
          is_required BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Employee skills
        CREATE TABLE IF NOT EXISTS employee_skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
          level INTEGER DEFAULT 1,
          verified_at TIMESTAMPTZ,
          verified_by UUID,
          expires_at DATE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(employee_id, skill_id)
        );

        -- Job postings
        CREATE TABLE IF NOT EXISTS job_postings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          department_id UUID,
          location_id UUID,
          employment_type VARCHAR(50),
          salary_min NUMERIC(12,2),
          salary_max NUMERIC(12,2),
          is_internal BOOLEAN DEFAULT true,
          status VARCHAR(20) DEFAULT 'draft',
          closes_at DATE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Job applications
        CREATE TABLE IF NOT EXISTS job_applications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'applied',
          cover_letter TEXT,
          resume_url TEXT,
          applied_at TIMESTAMPTZ DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          UNIQUE(job_posting_id, employee_id)
        );

        CREATE INDEX IF NOT EXISTS idx_skills_org ON skills(organization_id);
        CREATE INDEX IF NOT EXISTS idx_employee_skills ON employee_skills(employee_id);
        CREATE INDEX IF NOT EXISTS idx_job_postings_org ON job_postings(organization_id);
      `
    },
    {
      filename: '011_documents.sql',
      sql: `
        -- Documents
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100),
          category VARCHAR(100),
          file_url TEXT NOT NULL,
          file_size INTEGER,
          mime_type VARCHAR(100),
          requires_signature BOOLEAN DEFAULT false,
          signed_at TIMESTAMPTZ,
          expires_at DATE,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
        CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
      `
    },
    {
      filename: '012_audit_refresh_tokens.sql',
      sql: `
        -- Audit log
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID,
          user_id UUID,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id UUID,
          details JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Refresh tokens
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          device_info JSONB,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(organization_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      `
    },
    {
      filename: '013_fix_missing_columns.sql',
      sql: `
        -- Add missing columns to payroll_runs
        ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS created_by UUID;
        ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS pay_frequency VARCHAR(50) DEFAULT 'monthly';

        -- Add missing columns to learning_courses
        ALTER TABLE learning_courses ADD COLUMN IF NOT EXISTS provider VARCHAR(100);
        ALTER TABLE learning_courses ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
        ALTER TABLE learning_courses ADD COLUMN IF NOT EXISTS skills_taught UUID[];

        -- Add missing columns to performance_goals
        ALTER TABLE performance_goals ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 100;
        ALTER TABLE performance_goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES performance_goals(id);

        -- Add missing columns to recognition
        ALTER TABLE recognition ADD COLUMN IF NOT EXISTS badge_id UUID;
        ALTER TABLE recognition ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

        -- Add missing columns to surveys
        ALTER TABLE surveys ADD COLUMN IF NOT EXISTS response_count INTEGER DEFAULT 0;
        ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
      `
    },
    {
      filename: '014_table_aliases_and_lessons.sql',
      sql: `
        -- Create courses view/table alias for learning_courses
        CREATE OR REPLACE VIEW courses AS SELECT
          id, organization_id, title, description, category,
          duration_minutes, thumbnail_url AS thumbnail,
          content_type, content_url, is_required AS is_mandatory,
          is_published, 'published' AS status,
          created_by, created_at, updated_at
        FROM learning_courses;

        -- Create lessons table (required by learning routes)
        CREATE TABLE IF NOT EXISTS lessons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id UUID REFERENCES learning_courses(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          content_type VARCHAR(50) DEFAULT 'video',
          content_url TEXT,
          duration_minutes INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create course_enrollments view for learning_enrollments
        CREATE OR REPLACE VIEW course_enrollments AS SELECT
          id, course_id, employee_id, status, progress,
          started_at, completed_at, due_date, score, created_at
        FROM learning_enrollments;

        -- Create goals view alias for performance_goals
        CREATE OR REPLACE VIEW goals AS SELECT * FROM performance_goals;

        -- Add is_mandatory column to learning_courses if missing
        ALTER TABLE learning_courses ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;

        CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
      `
    },
    {
      filename: '015_goals_and_surveys_support.sql',
      sql: `
        -- Drop and recreate goals view with correct columns
        DROP VIEW IF EXISTS goals;
        CREATE VIEW goals AS SELECT
          id, organization_id, employee_id, title, description, category,
          level, target_value, current_value, unit, start_date,
          due_date AS target_date, status, progress,
          'medium' AS priority, created_by, created_at, updated_at
        FROM performance_goals;

        -- Create goal_updates table for tracking goal progress
        CREATE TABLE IF NOT EXISTS goal_updates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          goal_id UUID REFERENCES performance_goals(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id),
          update_type VARCHAR(50) DEFAULT 'progress',
          old_value NUMERIC(12,2),
          new_value NUMERIC(12,2),
          note TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create survey_invitations table
        CREATE TABLE IF NOT EXISTS survey_invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          sent_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          UNIQUE(survey_id, employee_id)
        );

        -- Create survey_templates table
        CREATE TABLE IF NOT EXISTS survey_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) DEFAULT 'engagement',
          questions JSONB DEFAULT '[]',
          is_public BOOLEAN DEFAULT false,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add missing columns to survey_responses
        ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT true;
        ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();

        -- Add missing columns to surveys
        ALTER TABLE surveys ADD COLUMN IF NOT EXISTS template_id UUID;
        ALTER TABLE surveys ADD COLUMN IF NOT EXISTS target_department_id UUID;
        ALTER TABLE surveys ADD COLUMN IF NOT EXISTS target_location_id UUID;

        CREATE INDEX IF NOT EXISTS idx_goal_updates ON goal_updates(goal_id);
        CREATE INDEX IF NOT EXISTS idx_survey_invitations ON survey_invitations(survey_id);
      `
    },
    {
      filename: '016_recognition_and_fixes.sql',
      sql: `
        -- Add user_id columns to recognition table
        ALTER TABLE recognition ADD COLUMN IF NOT EXISTS from_user_id UUID;
        ALTER TABLE recognition ADD COLUMN IF NOT EXISTS to_user_id UUID;

        -- Create recognitions view (plural) for route compatibility
        CREATE OR REPLACE VIEW recognitions AS SELECT
          id, organization_id,
          from_employee_id, to_employee_id,
          from_user_id, to_user_id,
          category, value, message, points,
          is_public, is_featured, badge_id, created_at
        FROM recognition;

        -- Create badges table
        CREATE TABLE IF NOT EXISTS badges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          icon VARCHAR(100),
          color VARCHAR(50),
          points INTEGER DEFAULT 0,
          criteria JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create employee_badges table
        CREATE TABLE IF NOT EXISTS employee_badges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
          awarded_by UUID,
          awarded_at TIMESTAMPTZ DEFAULT NOW(),
          reason TEXT,
          UNIQUE(employee_id, badge_id)
        );

        -- Create awards table
        CREATE TABLE IF NOT EXISTS awards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          criteria JSONB DEFAULT '{}',
          prize TEXT,
          nomination_deadline TIMESTAMPTZ,
          winner_announcement_date TIMESTAMPTZ,
          status VARCHAR(20) DEFAULT 'open',
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create award_nominations table
        CREATE TABLE IF NOT EXISTS award_nominations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          award_id UUID REFERENCES awards(id) ON DELETE CASCADE,
          nominee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          nominated_by UUID REFERENCES employees(id),
          reason TEXT,
          is_winner BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(award_id, nominee_id, nominated_by)
        );

        CREATE INDEX IF NOT EXISTS idx_badges_org ON badges(organization_id);
        CREATE INDEX IF NOT EXISTS idx_employee_badges ON employee_badges(employee_id);
        CREATE INDEX IF NOT EXISTS idx_awards_org ON awards(organization_id);
      `
    },
    {
      filename: '017_employees_user_id.sql',
      sql: `
        -- Add user_id column to employees if not exists
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

        -- Create index for user_id lookup
        CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

        -- Add salary column if not exists
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary NUMERIC(12,2);

        -- Add seat_type if not exists
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS seat_type VARCHAR(20) DEFAULT 'core';
      `
    },
    {
      filename: '018_ops_super_admin.sql',
      sql: `
        -- Create ops_users table if not exists
        CREATE TABLE IF NOT EXISTS ops_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'support',
          role_id UUID,
          status VARCHAR(20) DEFAULT 'active',
          is_active BOOLEAN DEFAULT true,
          mfa_enabled BOOLEAN DEFAULT false,
          mfa_secret VARCHAR(255),
          force_password_change BOOLEAN DEFAULT false,
          last_login_at TIMESTAMPTZ,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create ops_roles table if not exists
        CREATE TABLE IF NOT EXISTS ops_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          permissions JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Get or create super_admin role
        INSERT INTO ops_roles (name, permissions)
        SELECT 'super_admin', '["*"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM ops_roles WHERE name = 'super_admin');

        -- Insert default ops user (password: UpliftOps2026!)
        -- Hash generated with bcrypt rounds=12
        INSERT INTO ops_users (email, name, first_name, last_name, password_hash, role, role_id, status, is_active)
        SELECT
          'dazevedo@uplifthq.co.uk',
          'Diogo Azevedo',
          'Diogo',
          'Azevedo',
          '$2a$12$9Dgg3QP48.dYnVFKf8suDuOflNtgxvS897/z281PDkfWwxTTvmABK',
          'super_admin',
          (SELECT id FROM ops_roles WHERE name = 'super_admin' LIMIT 1),
          'active',
          true
        WHERE NOT EXISTS (SELECT 1 FROM ops_users WHERE email = 'dazevedo@uplifthq.co.uk');

        -- Update existing user to super_admin if exists
        UPDATE ops_users SET
          role = 'super_admin',
          role_id = (SELECT id FROM ops_roles WHERE name = 'super_admin' LIMIT 1),
          is_active = true
        WHERE email = 'dazevedo@uplifthq.co.uk';
      `
    },
    {
      filename: '019_ops_super_admin_fix.sql',
      sql: `
        -- Insert default ops user (password: UpliftOps2026!)
        INSERT INTO ops_users (email, name, first_name, last_name, password_hash, role, role_id, status, is_active)
        SELECT
          'dazevedo@uplifthq.co.uk',
          'Diogo Azevedo',
          'Diogo',
          'Azevedo',
          '$2a$12$9Dgg3QP48.dYnVFKf8suDuOflNtgxvS897/z281PDkfWwxTTvmABK',
          'super_admin',
          (SELECT id FROM ops_roles WHERE name = 'super_admin' LIMIT 1),
          'active',
          true
        WHERE NOT EXISTS (SELECT 1 FROM ops_users WHERE email = 'dazevedo@uplifthq.co.uk');

        -- Update existing user to super_admin if exists
        UPDATE ops_users SET
          role = 'super_admin',
          role_id = (SELECT id FROM ops_roles WHERE name = 'super_admin' LIMIT 1),
          is_active = true,
          password_hash = '$2a$12$9Dgg3QP48.dYnVFKf8suDuOflNtgxvS897/z281PDkfWwxTTvmABK'
        WHERE email = 'dazevedo@uplifthq.co.uk';
      `
    },
    {
      filename: '020_payroll_settings.sql',
      sql: `
        -- Employee payroll settings
        CREATE TABLE IF NOT EXISTS employee_payroll_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
          tax_code VARCHAR(20) DEFAULT '1257L',
          ni_category VARCHAR(5) DEFAULT 'A',
          student_loan_plan VARCHAR(10),
          postgrad_loan BOOLEAN DEFAULT false,
          pension_contribution NUMERIC(5,2) DEFAULT 5.00,
          pension_type VARCHAR(20) DEFAULT 'percentage',
          pension_provider VARCHAR(100),
          pension_reference VARCHAR(100),
          payment_method VARCHAR(50) DEFAULT 'bacs',
          bank_name VARCHAR(100),
          bank_sort_code VARCHAR(10),
          bank_account_number VARCHAR(20),
          bank_account_name VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Payroll country configs
        CREATE TABLE IF NOT EXISTS payroll_country_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          country_code VARCHAR(3) NOT NULL,
          tax_year VARCHAR(10),
          personal_allowance NUMERIC(12,2),
          basic_rate NUMERIC(5,4),
          higher_rate NUMERIC(5,4),
          additional_rate NUMERIC(5,4),
          basic_threshold NUMERIC(12,2),
          higher_threshold NUMERIC(12,2),
          ni_primary_threshold NUMERIC(12,2),
          ni_upper_limit NUMERIC(12,2),
          ni_employee_rate NUMERIC(5,4),
          ni_employer_rate NUMERIC(5,4),
          config JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Payroll tax tables
        CREATE TABLE IF NOT EXISTS payroll_tax_tables (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          country_code VARCHAR(3) NOT NULL,
          tax_year VARCHAR(10) NOT NULL,
          table_type VARCHAR(50) NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Insert UK 2025/26 tax config
        INSERT INTO payroll_country_configs (country_code, tax_year, personal_allowance, basic_rate, higher_rate, additional_rate, basic_threshold, higher_threshold, ni_primary_threshold, ni_upper_limit, ni_employee_rate, ni_employer_rate)
        VALUES ('GBP', '2025/26', 12570, 0.20, 0.40, 0.45, 37700, 125140, 12570, 50270, 0.12, 0.138)
        ON CONFLICT DO NOTHING;

        CREATE INDEX IF NOT EXISTS idx_employee_payroll_settings ON employee_payroll_settings(employee_id);
      `
    },
    {
      filename: '021_time_entries_payroll_columns.sql',
      sql: `
        -- Add payroll-related columns to time_entries
        ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS regular_hours NUMERIC(8,2);
        ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(8,2);
        ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS holiday_hours NUMERIC(8,2);
        ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS sick_hours NUMERIC(8,2);
        ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_by UUID;
        ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

        -- Add salary to employees if missing
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary NUMERIC(12,2);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_frequency VARCHAR(20) DEFAULT 'monthly';
      `
    },
    {
      filename: '022_time_entries_work_date.sql',
      sql: `
        -- Add work_date column to time_entries
        ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS work_date DATE;

        -- Update work_date from clock_in where null
        UPDATE time_entries SET work_date = DATE(clock_in) WHERE work_date IS NULL AND clock_in IS NOT NULL;

        -- Add organization_id to time_entries if missing
        ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS organization_id UUID;
      `
    },
    {
      filename: '023_bonus_payouts.sql',
      sql: `
        -- Bonus payouts table
        CREATE TABLE IF NOT EXISTS bonus_payouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          type VARCHAR(100) NOT NULL,
          description TEXT,
          amount NUMERIC(12,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          pay_period DATE,
          approved_by UUID,
          approved_at TIMESTAMPTZ,
          paid_at TIMESTAMPTZ,
          payroll_run_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_bonus_payouts_employee ON bonus_payouts(employee_id);
        CREATE INDEX IF NOT EXISTS idx_bonus_payouts_status ON bonus_payouts(status);
      `
    },
    {
      filename: '024_performance_scores.sql',
      sql: `
        -- Performance scores table
        CREATE TABLE IF NOT EXISTS performance_scores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          period VARCHAR(50),
          score NUMERIC(5,2),
          rating VARCHAR(50),
          notes TEXT,
          reviewer_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add performance_score_id to bonus_payouts if missing
        ALTER TABLE bonus_payouts ADD COLUMN IF NOT EXISTS performance_score_id UUID;

        CREATE INDEX IF NOT EXISTS idx_performance_scores_employee ON performance_scores(employee_id);
      `
    }
  ];
}

export default router;
