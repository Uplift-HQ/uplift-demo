-- ============================================================
-- TERMS & LEGAL CONSENT SCHEMA
-- Track terms versions and user consent (GDPR compliant)
-- ============================================================

-- Terms and policy versions
CREATE TABLE IF NOT EXISTS terms_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('terms_of_service', 'privacy_policy', 'data_processing', 'cookie_policy')),
    version VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    effective_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    requires_acceptance BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(type, version)
);

-- User consent records
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version_id UUID NOT NULL REFERENCES terms_versions(id) ON DELETE RESTRICT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, terms_version_id)
);

-- Marketing consent (separate from terms)
CREATE TABLE IF NOT EXISTS marketing_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_marketing BOOLEAN NOT NULL DEFAULT false,
    sms_marketing BOOLEAN NOT NULL DEFAULT false,
    push_notifications BOOLEAN NOT NULL DEFAULT true,
    product_updates BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_terms_versions_type ON terms_versions(type);
CREATE INDEX IF NOT EXISTS idx_terms_versions_current ON terms_versions(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_terms ON user_consents(terms_version_id);
CREATE INDEX IF NOT EXISTS idx_marketing_consents_user ON marketing_consents(user_id);

-- Insert initial terms versions
INSERT INTO terms_versions (type, version, title, content, summary, effective_date, is_current, requires_acceptance)
VALUES
    ('terms_of_service', '1.0', 'Terms of Service',
     E'# Uplift Terms of Service\n\n## 1. Acceptance of Terms\n\nBy accessing or using the Uplift platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.\n\n## 2. Description of Service\n\nUplift provides workforce management software including scheduling, time tracking, payroll integration, and related features ("Service"). The Service is provided on a subscription basis.\n\n## 3. User Accounts\n\n- You must provide accurate information when creating an account\n- You are responsible for maintaining the security of your account\n- You must notify us immediately of any unauthorized access\n- One person or legal entity may not maintain more than one account\n\n## 4. Acceptable Use\n\nYou agree not to:\n- Violate any laws or regulations\n- Infringe on intellectual property rights\n- Transmit harmful code or malware\n- Attempt to gain unauthorized access\n- Use the Service for any illegal purpose\n\n## 5. Payment Terms\n\n- Subscription fees are billed in advance\n- All fees are non-refundable except as required by law\n- We may change pricing with 30 days notice\n- Failure to pay may result in service suspension\n\n## 6. Data Ownership\n\n- You retain ownership of your data\n- We have a limited license to process your data to provide the Service\n- You can export your data at any time\n- Upon termination, your data will be deleted after 30 days\n\n## 7. Limitation of Liability\n\nTo the maximum extent permitted by law, Uplift shall not be liable for any indirect, incidental, special, consequential, or punitive damages.\n\n## 8. Termination\n\nEither party may terminate this agreement with 30 days written notice. We may terminate immediately for violation of these Terms.\n\n## 9. Changes to Terms\n\nWe may modify these Terms at any time. Material changes will be communicated via email or in-app notification.\n\n## 10. Governing Law\n\nThese Terms are governed by the laws of the United Kingdom.',
     'Agreement to use Uplift services including account responsibilities, acceptable use, and payment terms.',
     '2024-01-01', true, true),

    ('privacy_policy', '1.0', 'Privacy Policy',
     E'# Uplift Privacy Policy\n\n## 1. Introduction\n\nThis Privacy Policy explains how Uplift ("we", "us", "our") collects, uses, and protects your personal information when you use our workforce management platform.\n\n## 2. Information We Collect\n\n### 2.1 Information You Provide\n- Account information (name, email, phone)\n- Employment information (role, department, location)\n- Time and attendance data\n- Communication preferences\n\n### 2.2 Information Collected Automatically\n- Device information\n- Log data and usage analytics\n- Location data (with consent)\n- Cookies and similar technologies\n\n## 3. How We Use Your Information\n\n- Provide and improve our services\n- Process payroll and scheduling\n- Send important notifications\n- Comply with legal obligations\n- Prevent fraud and abuse\n\n## 4. Data Sharing\n\nWe may share your data with:\n- Your employer (as our customer)\n- Service providers who assist our operations\n- Legal authorities when required by law\n\nWe do not sell your personal information.\n\n## 5. Data Retention\n\nWe retain your data for as long as your account is active or as needed to provide services. After account deletion, data is removed within 30 days.\n\n## 6. Your Rights (GDPR)\n\nYou have the right to:\n- Access your personal data\n- Correct inaccurate data\n- Delete your data\n- Export your data\n- Object to processing\n- Withdraw consent\n\n## 7. Security\n\nWe implement industry-standard security measures including encryption, access controls, and regular security audits.\n\n## 8. International Transfers\n\nYour data may be transferred to and processed in countries outside your residence. We ensure appropriate safeguards are in place.\n\n## 9. Contact Us\n\nFor privacy inquiries: privacy@uplift.app\n\n## 10. Changes\n\nWe may update this policy periodically. Material changes will be communicated to you.',
     'How we collect, use, and protect your personal information including your GDPR rights.',
     '2024-01-01', true, true),

    ('data_processing', '1.0', 'Data Processing Agreement',
     E'# Data Processing Agreement\n\n## 1. Scope\n\nThis Data Processing Agreement ("DPA") forms part of the Terms of Service between Uplift and the Customer regarding the processing of personal data.\n\n## 2. Definitions\n\n- "Personal Data" means any information relating to an identified or identifiable natural person\n- "Processing" means any operation performed on personal data\n- "Controller" means the Customer who determines the purposes of processing\n- "Processor" means Uplift who processes data on behalf of the Customer\n\n## 3. Processing Details\n\n- Subject matter: Workforce management services\n- Duration: Length of the service agreement\n- Nature: Collection, storage, analysis of employee data\n- Categories: Employee contact info, schedules, time records, payroll data\n\n## 4. Processor Obligations\n\nUplift shall:\n- Process data only on documented instructions\n- Ensure personnel confidentiality\n- Implement appropriate security measures\n- Assist with data subject requests\n- Delete or return data upon termination\n- Allow and contribute to audits\n\n## 5. Sub-processors\n\nCurrent sub-processors are listed at uplift.app/sub-processors. We will notify you before adding new sub-processors.\n\n## 6. International Transfers\n\nWe use Standard Contractual Clauses for transfers outside the EEA.\n\n## 7. Security Measures\n\n- Encryption at rest and in transit\n- Access controls and authentication\n- Regular security testing\n- Incident response procedures\n- Business continuity plans',
     'Terms for how we process personal data on behalf of your organization (GDPR Article 28 compliant).',
     '2024-01-01', true, true)
ON CONFLICT (type, version) DO NOTHING;
