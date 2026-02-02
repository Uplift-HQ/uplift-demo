// ============================================================
// PRIVACY POLICY PAGE
// ============================================================

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToLogin', 'Back to login')}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-momentum-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">U</span>
            </div>
            <span className="text-slate-900 font-bold text-2xl">Uplift</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('settings.privacyPolicy', 'Privacy Policy')}</h1>
        <p className="text-slate-600 mb-8">{t('legal.lastUpdated', 'Last updated')}: January 2026</p>

        <div className="prose prose-slate max-w-none">
          <h2>1. Introduction</h2>
          <p>
            Uplift ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our workforce intelligence platform.
          </p>

          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Personal Information</h3>
          <p>We may collect personal information that you provide directly, including:</p>
          <ul>
            <li>Name, email address, and phone number</li>
            <li>Employment details (job title, department, work location)</li>
            <li>Skills and certifications</li>
            <li>Work schedule preferences and availability</li>
            <li>Time and attendance data</li>
          </ul>

          <h3>2.2 Usage Data</h3>
          <p>We automatically collect certain information when you use the Service:</p>
          <ul>
            <li>Device information (browser type, operating system)</li>
            <li>IP address and location data</li>
            <li>Usage patterns and feature interactions</li>
            <li>Login times and session duration</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and maintain the Service</li>
            <li>Process scheduling and workforce management functions</li>
            <li>Send notifications about shifts, time off, and opportunities</li>
            <li>Generate analytics and insights for your organization</li>
            <li>Improve our Service and develop new features</li>
            <li>Communicate with you about updates and support</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. Data Sharing</h2>
          <p>We may share your information with:</p>
          <ul>
            <li><strong>Your Employer:</strong> As the platform is provided to organizations, your employer has access to work-related data</li>
            <li><strong>Service Providers:</strong> Third parties who assist us in operating the Service (e.g., cloud hosting, payment processing)</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information, including:
          </p>
          <ul>
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security assessments and penetration testing</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Employee training on data protection</li>
          </ul>

          <h2>6. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
          </p>

          <h2>7. Your Rights (GDPR)</h2>
          <p>If you are in the European Economic Area, you have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
            <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
            <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Object to certain processing of your data</li>
            <li><strong>Restriction:</strong> Request restriction of processing</li>
          </ul>
          <p>
            To exercise these rights, contact us at privacy@getuplift.io or use the self-service options in your account settings.
          </p>

          <h2>8. Cookies</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our Service. These are used for authentication, preferences, and analytics. You can control cookie settings through your browser.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.
          </p>

          <h2>10. Children's Privacy</h2>
          <p>
            Our Service is not directed to individuals under 16. We do not knowingly collect personal information from children under 16.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us:
          </p>
          <p>
            <strong>Data Protection Officer:</strong> privacy@getuplift.io<br />
            <strong>Address:</strong> London, United Kingdom
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Uplift. {t('auth.allRightsReserved', 'All rights reserved')}.
        </div>
      </footer>
    </div>
  );
}
