-- Migration: RTI Submissions tracking
-- Created: 2026-03-03

-- RTI submissions table to track FPS/EPS submissions to HMRC
CREATE TABLE IF NOT EXISTS rti_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  submission_type VARCHAR(10) NOT NULL CHECK (submission_type IN ('FPS', 'EPS', 'EYU', 'NVR')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'accepted', 'rejected', 'error')),
  payload JSONB NOT NULL,
  response JSONB,
  hmrc_correlation_id VARCHAR(100),
  tax_year VARCHAR(10),
  tax_month INTEGER,
  error_message TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rti_submissions_org ON rti_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_rti_submissions_type ON rti_submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_rti_submissions_status ON rti_submissions(status);
CREATE INDEX IF NOT EXISTS idx_rti_submissions_payroll_run ON rti_submissions(payroll_run_id);

-- Enable RLS
ALTER TABLE rti_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policy for rti_submissions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rti_submissions' AND policyname = 'rti_submissions_org_isolation') THEN
    CREATE POLICY rti_submissions_org_isolation ON rti_submissions
      FOR ALL
      USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
  END IF;
END $$;

-- Add PAYE reference and accounts office reference to organizations if not exists
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS paye_reference VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS accounts_office_reference VARCHAR(20);

-- Add student loan plan to employee payroll settings if not exists
ALTER TABLE employee_payroll_settings ADD COLUMN IF NOT EXISTS student_loan_plan VARCHAR(10);
