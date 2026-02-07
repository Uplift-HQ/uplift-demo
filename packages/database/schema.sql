-- ============================================================
-- UPLIFT CORE DATABASE SCHEMA
-- Complete multi-tenant workforce management platform
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ORGANIZATIONS (Multi-tenancy root)
-- ============================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  plan VARCHAR(50) DEFAULT 'trial',
  plan_expires_at TIMESTAMPTZ,
  employee_limit INTEGER DEFAULT 10,
  
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  currency VARCHAR(3) DEFAULT 'GBP',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  week_starts_on INTEGER DEFAULT 1,
  
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#F26522',
  
  features JSONB DEFAULT '{"shifts":true,"timeClock":true,"timeOff":true,"skills":true,"mobility":true}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMPTZ,
  
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  
  employee_id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(50),
  
  role VARCHAR(50) DEFAULT 'worker', -- superadmin, admin, manager, worker
  permissions JSONB DEFAULT '[]'::jsonb,
  
  sso_provider VARCHAR(50),
  sso_id VARCHAR(255),
  
  last_login_at TIMESTAMPTZ,
  last_login_ip VARCHAR(45),
  last_login_device TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  locked_reason VARCHAR(100),
  
  force_password_change BOOLEAN DEFAULT false,
  password_changed_at TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, invited, locked
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID,
  deactivation_reason TEXT,
  
  invited_at TIMESTAMPTZ,
  invited_by UUID,
  invitation_token VARCHAR(255),
  invitation_expires TIMESTAMPTZ,
  
  deleted_at TIMESTAMPTZ, -- soft delete for GDPR
  deletion_requested_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, email)
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(organization_id, status);

-- User sessions for session management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_id UUID REFERENCES refresh_tokens(id) ON DELETE CASCADE,
  
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- desktop, mobile, tablet
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address VARCHAR(45),
  location VARCHAR(255),
  
  is_current BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id) WHERE revoked_at IS NULL;

-- User activity log for security auditing
CREATE TABLE user_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  action VARCHAR(100) NOT NULL, -- login, logout, password_change, password_reset, mfa_enabled, etc.
  action_details JSONB,
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,
  
  success BOOLEAN DEFAULT true,
  failure_reason VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_org ON user_activity_log(organization_id);
CREATE INDEX idx_user_activity_action ON user_activity_log(action);
CREATE INDEX idx_user_activity_time ON user_activity_log(created_at DESC);

-- Email notifications queue
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(255),
  
  template VARCHAR(100) NOT NULL, -- password_changed, new_device_login, account_locked, etc.
  template_data JSONB,
  
  subject VARCHAR(500),
  body_html TEXT,
  body_text TEXT,
  
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON email_queue(status) WHERE status = 'pending';

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  device_info JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOCATIONS
-- ============================================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  type VARCHAR(50) DEFAULT 'store',
  
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(2) DEFAULT 'GB',
  
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 100,
  
  timezone VARCHAR(50),
  phone VARCHAR(50),
  
  operating_hours JSONB,
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_org ON locations(organization_id);

-- ============================================================
-- DEPARTMENTS & ROLES
-- ============================================================

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  parent_id UUID REFERENCES departments(id),
  manager_id UUID,
  color VARCHAR(7),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  department_id UUID REFERENCES departments(id),
  
  default_hourly_rate DECIMAL(10, 2),
  color VARCHAR(7),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  preferred_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  date_of_birth DATE,
  
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(2),
  
  employee_number VARCHAR(50),
  employment_type VARCHAR(50) DEFAULT 'full_time',
  start_date DATE,
  end_date DATE,
  
  department_id UUID REFERENCES departments(id),
  primary_role_id UUID REFERENCES roles(id),
  primary_location_id UUID REFERENCES locations(id),
  manager_id UUID REFERENCES employees(id),
  
  location_ids UUID[] DEFAULT '{}',
  role_ids UUID[] DEFAULT '{}',
  
  hourly_rate DECIMAL(10, 2),
  contracted_hours_per_week DECIMAL(5, 2),
  
  availability JSONB,
  
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  
  status VARCHAR(20) DEFAULT 'active',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_employees_status ON employees(organization_id, status);
CREATE INDEX idx_employees_location ON employees(primary_location_id);
CREATE INDEX idx_employees_department ON employees(department_id);

ALTER TABLE users ADD CONSTRAINT fk_users_employee 
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager 
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================================
-- SKILLS & CERTIFICATIONS
-- ============================================================

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  requires_verification BOOLEAN DEFAULT FALSE,
  expires_after_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE TABLE employee_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, skill_id)
);

-- ============================================================
-- SHIFTS
-- ============================================================

CREATE TABLE schedule_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, location_id, start_date)
);

CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  name VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES roles(id),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}',
  color VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  
  date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  
  location_id UUID NOT NULL REFERENCES locations(id),
  role_id UUID REFERENCES roles(id),
  employee_id UUID REFERENCES employees(id),
  
  is_open BOOLEAN DEFAULT FALSE,
  applicants UUID[] DEFAULT '{}',
  
  status VARCHAR(30) DEFAULT 'scheduled',
  confirmed_at TIMESTAMPTZ,
  
  schedule_period_id UUID REFERENCES schedule_periods(id),
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  
  notes TEXT,
  color VARCHAR(7),
  estimated_cost DECIMAL(10, 2),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shifts_org_date ON shifts(organization_id, date);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_location ON shifts(location_id);
CREATE INDEX idx_shifts_open ON shifts(organization_id, is_open) WHERE is_open = TRUE;

CREATE TABLE shift_swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_shift_id UUID NOT NULL REFERENCES shifts(id),
  from_employee_id UUID NOT NULL REFERENCES employees(id),
  to_shift_id UUID REFERENCES shifts(id),
  to_employee_id UUID REFERENCES employees(id),
  type VARCHAR(20) DEFAULT 'swap',
  status VARCHAR(20) DEFAULT 'pending',
  reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TIME TRACKING
-- ============================================================

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  
  employee_id UUID NOT NULL REFERENCES employees(id),
  shift_id UUID REFERENCES shifts(id),
  location_id UUID REFERENCES locations(id),
  
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  
  total_break_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(5, 2),
  regular_hours DECIMAL(5, 2),
  overtime_hours DECIMAL(5, 2),
  
  clock_in_location JSONB,
  clock_out_location JSONB,
  
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  
  adjusted BOOLEAN DEFAULT FALSE,
  adjustment_reason TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_org ON time_entries(organization_id);
CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_date ON time_entries(organization_id, clock_in);
CREATE INDEX idx_time_entries_pending ON time_entries(organization_id, status) WHERE status = 'pending';

-- ============================================================
-- TIME OFF
-- ============================================================

CREATE TABLE time_off_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  accrual_type VARCHAR(20) DEFAULT 'annual',
  accrual_amount DECIMAL(5, 2),
  max_balance DECIMAL(5, 2),
  allow_carryover BOOLEAN DEFAULT TRUE,
  max_carryover DECIMAL(5, 2),
  requires_approval BOOLEAN DEFAULT TRUE,
  is_paid BOOLEAN DEFAULT TRUE,
  color VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE time_off_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES time_off_policies(id),
  year INTEGER NOT NULL,
  entitlement DECIMAL(5, 2) DEFAULT 0,
  used DECIMAL(5, 2) DEFAULT 0,
  pending DECIMAL(5, 2) DEFAULT 0,
  carried_over DECIMAL(5, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, policy_id, year)
);

CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  employee_id UUID NOT NULL REFERENCES employees(id),
  policy_id UUID NOT NULL REFERENCES time_off_policies(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_off_org ON time_off_requests(organization_id);
CREATE INDEX idx_time_off_employee ON time_off_requests(employee_id);
CREATE INDEX idx_time_off_pending ON time_off_requests(organization_id, status) WHERE status = 'pending';

-- ============================================================
-- INTERNAL MOBILITY
-- ============================================================

CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  role_id UUID REFERENCES roles(id),
  department_id UUID REFERENCES departments(id),
  location_id UUID REFERENCES locations(id),
  employment_type VARCHAR(50),
  hourly_rate_min DECIMAL(10, 2),
  hourly_rate_max DECIMAL(10, 2),
  required_skills UUID[],
  visibility VARCHAR(20) DEFAULT 'internal',
  status VARCHAR(20) DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_posting_id UUID NOT NULL REFERENCES job_postings(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  status VARCHAR(30) DEFAULT 'applied',
  cover_letter TEXT,
  interview_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_posting_id, employee_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  shift_reminders BOOLEAN DEFAULT TRUE,
  shift_reminder_hours INTEGER DEFAULT 24,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  related_type VARCHAR(50),
  related_id UUID,
  action_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- ============================================================
-- REPORTING
-- ============================================================

CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  date DATE NOT NULL,
  shifts_scheduled INTEGER DEFAULT 0,
  shifts_filled INTEGER DEFAULT 0,
  shifts_open INTEGER DEFAULT 0,
  hours_scheduled DECIMAL(10, 2) DEFAULT 0,
  hours_worked DECIMAL(10, 2) DEFAULT 0,
  labor_cost_scheduled DECIMAL(12, 2) DEFAULT 0,
  labor_cost_actual DECIMAL(12, 2) DEFAULT 0,
  clock_ins_on_time INTEGER DEFAULT 0,
  clock_ins_late INTEGER DEFAULT 0,
  employees_active INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, location_id, date)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_log(organization_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    NEW.total_hours = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600 
                      - COALESCE(NEW.total_break_minutes, 0) / 60.0;
    NEW.regular_hours = LEAST(NEW.total_hours, 8);
    NEW.overtime_hours = GREATEST(NEW.total_hours - 8, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_time_hours BEFORE INSERT OR UPDATE ON time_entries
FOR EACH ROW EXECUTE FUNCTION calculate_time_entry_hours();

-- Apply updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('CREATE TRIGGER update_%I_ts BEFORE UPDATE ON %I 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tenant isolation via app.organization_id session variable
-- Set via: SET LOCAL app.organization_id = 'uuid';

CREATE POLICY tenant_isolation_locations ON locations
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_departments ON departments
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_employees ON employees
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_shifts ON shifts
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_time_entries ON time_entries
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_time_off ON time_off_requests
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_notifications ON notifications
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_skills ON skills
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_roles ON roles
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- Service role bypass for background jobs
CREATE ROLE uplift_service NOLOGIN;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass_locations ON locations TO uplift_service USING (true);
CREATE POLICY service_bypass_employees ON employees TO uplift_service USING (true);
CREATE POLICY service_bypass_shifts ON shifts TO uplift_service USING (true);
CREATE POLICY service_bypass_time_entries ON time_entries TO uplift_service USING (true);
