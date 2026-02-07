-- ============================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS
-- Complete permission system for Uplift
-- ============================================================

-- ============================================================
-- PERMISSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROLE PERMISSIONS (Many-to-Many)
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- ============================================================
-- SSO CONFIGURATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS sso_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- google, microsoft, okta, saml
  client_id VARCHAR(255),
  client_secret VARCHAR(500),
  tenant_id VARCHAR(255),
  entry_point TEXT,
  certificate TEXT,
  domain VARCHAR(255),
  enabled BOOLEAN DEFAULT TRUE,
  sso_jit_provisioning BOOLEAN DEFAULT FALSE,
  sso_default_role VARCHAR(50) DEFAULT 'worker',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- ============================================================
-- SSO STATES (for OAuth flow)
-- ============================================================

CREATE TABLE IF NOT EXISTS sso_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state VARCHAR(255) UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  redirect_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_states_state ON sso_states(state);

-- ============================================================
-- SESSIONS TABLE (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_id UUID REFERENCES refresh_tokens(id) ON DELETE CASCADE,
  device_info JSONB,
  ip_address VARCHAR(45),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ============================================================
-- ADD MISSING COLUMNS TO USERS TABLE
-- ============================================================

DO $$ 
BEGIN
  -- MFA backup codes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_backup_codes') THEN
    ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT[];
  END IF;

  -- Language preference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'language') THEN
    ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'en';
  END IF;
END $$;

-- ============================================================
-- ADD MISSING COLUMNS TO ORGANIZATIONS TABLE
-- ============================================================

DO $$ 
BEGIN
  -- SSO JIT provisioning
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'sso_jit_provisioning') THEN
    ALTER TABLE organizations ADD COLUMN sso_jit_provisioning BOOLEAN DEFAULT FALSE;
  END IF;

  -- SSO default role
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'sso_default_role') THEN
    ALTER TABLE organizations ADD COLUMN sso_default_role VARCHAR(50) DEFAULT 'worker';
  END IF;
END $$;

-- ============================================================
-- SEED PERMISSIONS
-- ============================================================

INSERT INTO permissions (permission_key, name, description, category) VALUES
  -- Dashboard
  ('dashboard.view', 'View Dashboard', 'Access the main dashboard', 'Dashboard'),
  ('dashboard.analytics', 'View Analytics', 'Access detailed analytics and reports', 'Dashboard'),
  
  -- Employees
  ('employees.view', 'View Employees', 'View employee list and profiles', 'Employees'),
  ('employees.create', 'Create Employees', 'Add new employees', 'Employees'),
  ('employees.edit', 'Edit Employees', 'Modify employee details', 'Employees'),
  ('employees.delete', 'Delete Employees', 'Remove employees', 'Employees'),
  ('employees.invite', 'Invite Employees', 'Send invitations to new employees', 'Employees'),
  
  -- Scheduling
  ('schedule.view', 'View Schedule', 'View shift schedules', 'Scheduling'),
  ('schedule.view_own', 'View Own Schedule', 'View only own shifts', 'Scheduling'),
  ('schedule.create', 'Create Shifts', 'Create new shifts', 'Scheduling'),
  ('schedule.edit', 'Edit Shifts', 'Modify existing shifts', 'Scheduling'),
  ('schedule.delete', 'Delete Shifts', 'Remove shifts', 'Scheduling'),
  ('schedule.publish', 'Publish Schedule', 'Publish schedules to employees', 'Scheduling'),
  ('schedule.approve_swaps', 'Approve Shift Swaps', 'Approve or reject shift swap requests', 'Scheduling'),
  
  -- Time Tracking
  ('time.view', 'View Time Entries', 'View all time entries', 'Time Tracking'),
  ('time.view_own', 'View Own Time', 'View only own time entries', 'Time Tracking'),
  ('time.clock', 'Clock In/Out', 'Clock in and out of shifts', 'Time Tracking'),
  ('time.edit', 'Edit Time Entries', 'Modify time entries', 'Time Tracking'),
  ('time.approve', 'Approve Timesheets', 'Approve employee timesheets', 'Time Tracking'),
  
  -- Time Off
  ('timeoff.view', 'View Time Off', 'View all time off requests', 'Time Off'),
  ('timeoff.view_own', 'View Own Time Off', 'View only own time off', 'Time Off'),
  ('timeoff.request', 'Request Time Off', 'Submit time off requests', 'Time Off'),
  ('timeoff.approve', 'Approve Time Off', 'Approve or reject time off requests', 'Time Off'),
  
  -- Skills
  ('skills.view', 'View Skills', 'View employee skills', 'Skills'),
  ('skills.manage', 'Manage Skills', 'Add and edit skill definitions', 'Skills'),
  ('skills.verify', 'Verify Skills', 'Verify employee skills', 'Skills'),
  ('skills.assign', 'Assign Skills', 'Assign skills to employees', 'Skills'),
  
  -- Locations
  ('locations.view', 'View Locations', 'View location list', 'Locations'),
  ('locations.manage', 'Manage Locations', 'Add, edit, delete locations', 'Locations'),
  
  -- Departments
  ('departments.view', 'View Departments', 'View department list', 'Departments'),
  ('departments.manage', 'Manage Departments', 'Add, edit, delete departments', 'Departments'),
  
  -- Reports
  ('reports.view', 'View Reports', 'Access reports', 'Reports'),
  ('reports.export', 'Export Reports', 'Export report data', 'Reports'),
  ('reports.labor', 'Labor Reports', 'Access labor cost reports', 'Reports'),
  
  -- Settings
  ('settings.view', 'View Settings', 'View organization settings', 'Settings'),
  ('settings.edit', 'Edit Settings', 'Modify organization settings', 'Settings'),
  ('settings.billing', 'Manage Billing', 'View and manage billing', 'Settings'),
  ('settings.integrations', 'Manage Integrations', 'Configure integrations', 'Settings'),
  ('settings.sso', 'Manage SSO', 'Configure single sign-on', 'Settings'),
  
  -- User Management
  ('users.view', 'View Users', 'View user accounts', 'User Management'),
  ('users.manage', 'Manage Users', 'Add, edit users', 'User Management'),
  ('users.roles', 'Manage Roles', 'Assign user roles', 'User Management'),
  ('users.permissions', 'Manage Permissions', 'Configure role permissions', 'User Management'),
  
  -- Jobs
  ('jobs.view', 'View Job Postings', 'View internal job postings', 'Jobs'),
  ('jobs.apply', 'Apply to Jobs', 'Apply for internal positions', 'Jobs'),
  ('jobs.manage', 'Manage Job Postings', 'Create and manage job postings', 'Jobs'),
  
  -- Feed
  ('feed.view', 'View Feed', 'View organization feed', 'Feed'),
  ('feed.post', 'Post to Feed', 'Create feed posts', 'Feed'),
  ('feed.manage', 'Manage Feed', 'Moderate and manage feed content', 'Feed')
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================
-- ASSIGN DEFAULT PERMISSIONS TO ROLES
-- ============================================================

-- Worker role
INSERT INTO role_permissions (role, permission_id)
SELECT 'worker', id FROM permissions WHERE permission_key IN (
  'dashboard.view',
  'schedule.view_own',
  'time.view_own',
  'time.clock',
  'timeoff.view_own',
  'timeoff.request',
  'skills.view',
  'jobs.view',
  'jobs.apply',
  'feed.view',
  'feed.post'
) ON CONFLICT DO NOTHING;

-- Manager role (includes all worker permissions plus more)
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions WHERE permission_key IN (
  'dashboard.view',
  'dashboard.analytics',
  'employees.view',
  'employees.edit',
  'employees.invite',
  'schedule.view',
  'schedule.view_own',
  'schedule.create',
  'schedule.edit',
  'schedule.delete',
  'schedule.publish',
  'schedule.approve_swaps',
  'time.view',
  'time.view_own',
  'time.clock',
  'time.edit',
  'time.approve',
  'timeoff.view',
  'timeoff.view_own',
  'timeoff.request',
  'timeoff.approve',
  'skills.view',
  'skills.verify',
  'skills.assign',
  'locations.view',
  'departments.view',
  'reports.view',
  'reports.export',
  'jobs.view',
  'jobs.apply',
  'jobs.manage',
  'feed.view',
  'feed.post',
  'feed.manage'
) ON CONFLICT DO NOTHING;

-- Admin role (all permissions except superadmin-only)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE permission_key NOT IN (
  'users.permissions' -- Only superadmin can manage permissions
) ON CONFLICT DO NOTHING;

-- Superadmin gets all permissions (handled in code - always returns true)

-- ============================================================
-- CREATE INDEX FOR FASTER PERMISSION LOOKUPS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);
