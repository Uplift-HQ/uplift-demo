#!/usr/bin/env python3
"""Update PrivacyPolicy.jsx with i18n t() calls."""
import os

PORTAL = "/Users/diogo/Desktop/uplift-portal-audit"

# ── PrivacyPolicy.jsx ──
privacy_jsx = r'''// ============================================================
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('legal.privacy.title', 'Privacy Policy')}</h1>
        <p className="text-slate-600 mb-8">{t('legal.privacy.lastUpdated', 'Last updated: January 2026')}</p>

        <div className="prose prose-slate max-w-none">
          <h2>{t('legal.privacy.section1Title', '1. Introduction')}</h2>
          <p>{t('legal.privacy.section1Text', 'Uplift ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our workforce intelligence platform.')}</p>

          <h2>{t('legal.privacy.section2Title', '2. Information We Collect')}</h2>

          <h3>{t('legal.privacy.section2aTitle', '2.1 Personal Information')}</h3>
          <p>{t('legal.privacy.section2aText', 'We may collect personal information that you provide directly, including:')}</p>
          <ul>
            <li>{t('legal.privacy.section2aItem1', 'Name, email address, and phone number')}</li>
            <li>{t('legal.privacy.section2aItem2', 'Employment details (job title, department, work location)')}</li>
            <li>{t('legal.privacy.section2aItem3', 'Skills and certifications')}</li>
            <li>{t('legal.privacy.section2aItem4', 'Work schedule preferences and availability')}</li>
            <li>{t('legal.privacy.section2aItem5', 'Time and attendance data')}</li>
          </ul>

          <h3>{t('legal.privacy.section2bTitle', '2.2 Usage Data')}</h3>
          <p>{t('legal.privacy.section2bText', 'We automatically collect certain information when you use the Service:')}</p>
          <ul>
            <li>{t('legal.privacy.section2bItem1', 'Device information (browser type, operating system)')}</li>
            <li>{t('legal.privacy.section2bItem2', 'IP address and location data')}</li>
            <li>{t('legal.privacy.section2bItem3', 'Usage patterns and feature interactions')}</li>
            <li>{t('legal.privacy.section2bItem4', 'Login times and session duration')}</li>
          </ul>

          <h2>{t('legal.privacy.section3Title', '3. How We Use Your Information')}</h2>
          <p>{t('legal.privacy.section3Text', 'We use the information we collect to:')}</p>
          <ul>
            <li>{t('legal.privacy.section3Item1', 'Provide and maintain the Service')}</li>
            <li>{t('legal.privacy.section3Item2', 'Process scheduling and workforce management functions')}</li>
            <li>{t('legal.privacy.section3Item3', 'Send notifications about shifts, time off, and opportunities')}</li>
            <li>{t('legal.privacy.section3Item4', 'Generate analytics and insights for your organization')}</li>
            <li>{t('legal.privacy.section3Item5', 'Improve our Service and develop new features')}</li>
            <li>{t('legal.privacy.section3Item6', 'Communicate with you about updates and support')}</li>
            <li>{t('legal.privacy.section3Item7', 'Comply with legal obligations')}</li>
          </ul>

          <h2>{t('legal.privacy.section4Title', '4. Data Sharing')}</h2>
          <p>{t('legal.privacy.section4Text', 'We may share your information with:')}</p>
          <ul>
            <li><strong>{t('legal.privacy.section4Item1Label', 'Your Employer:')}</strong> {t('legal.privacy.section4Item1Text', 'As the platform is provided to organizations, your employer has access to work-related data')}</li>
            <li><strong>{t('legal.privacy.section4Item2Label', 'Service Providers:')}</strong> {t('legal.privacy.section4Item2Text', 'Third parties who assist us in operating the Service (e.g., cloud hosting, payment processing)')}</li>
            <li><strong>{t('legal.privacy.section4Item3Label', 'Legal Requirements:')}</strong> {t('legal.privacy.section4Item3Text', 'When required by law or to protect our rights')}</li>
          </ul>
          <p>{t('legal.privacy.section4NoSell', 'We do not sell your personal information to third parties.')}</p>

          <h2>{t('legal.privacy.section5Title', '5. Data Security')}</h2>
          <p>{t('legal.privacy.section5Text', 'We implement appropriate technical and organizational measures to protect your personal information, including:')}</p>
          <ul>
            <li>{t('legal.privacy.section5Item1', 'Encryption of data in transit and at rest')}</li>
            <li>{t('legal.privacy.section5Item2', 'Regular security assessments and penetration testing')}</li>
            <li>{t('legal.privacy.section5Item3', 'Access controls and authentication mechanisms')}</li>
            <li>{t('legal.privacy.section5Item4', 'Employee training on data protection')}</li>
          </ul>

          <h2>{t('legal.privacy.section6Title', '6. Data Retention')}</h2>
          <p>{t('legal.privacy.section6Text', 'We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this policy, unless a longer retention period is required by law.')}</p>

          <h2>{t('legal.privacy.section7Title', '7. Your Rights (GDPR)')}</h2>
          <p>{t('legal.privacy.section7Text', 'If you are in the European Economic Area, you have the right to:')}</p>
          <ul>
            <li><strong>{t('legal.privacy.section7Item1Label', 'Access:')}</strong> {t('legal.privacy.section7Item1Text', 'Request a copy of your personal data')}</li>
            <li><strong>{t('legal.privacy.section7Item2Label', 'Rectification:')}</strong> {t('legal.privacy.section7Item2Text', 'Request correction of inaccurate data')}</li>
            <li><strong>{t('legal.privacy.section7Item3Label', 'Erasure:')}</strong> {t('legal.privacy.section7Item3Text', 'Request deletion of your data ("right to be forgotten")')}</li>
            <li><strong>{t('legal.privacy.section7Item4Label', 'Portability:')}</strong> {t('legal.privacy.section7Item4Text', 'Receive your data in a machine-readable format')}</li>
            <li><strong>{t('legal.privacy.section7Item5Label', 'Objection:')}</strong> {t('legal.privacy.section7Item5Text', 'Object to certain processing of your data')}</li>
            <li><strong>{t('legal.privacy.section7Item6Label', 'Restriction:')}</strong> {t('legal.privacy.section7Item6Text', 'Request restriction of processing')}</li>
          </ul>
          <p>{t('legal.privacy.section7Contact', 'To exercise these rights, contact us at privacy@getuplift.io or use the self-service options in your account settings.')}</p>

          <h2>{t('legal.privacy.section8Title', '8. Cookies')}</h2>
          <p>{t('legal.privacy.section8Text', 'We use cookies and similar tracking technologies to track activity on our Service. These are used for authentication, preferences, and analytics. You can control cookie settings through your browser.')}</p>

          <h2>{t('legal.privacy.section9Title', '9. International Transfers')}</h2>
          <p>{t('legal.privacy.section9Text', 'Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.')}</p>

          <h2>{t('legal.privacy.section10Title', "10. Children's Privacy")}</h2>
          <p>{t('legal.privacy.section10Text', 'Our Service is not directed to individuals under 16. We do not knowingly collect personal information from children under 16.')}</p>

          <h2>{t('legal.privacy.section11Title', '11. Changes to This Policy')}</h2>
          <p>{t('legal.privacy.section11Text', 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.')}</p>

          <h2>{t('legal.privacy.section12Title', '12. Contact Us')}</h2>
          <p>{t('legal.privacy.section12Text', 'If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us:')}</p>
          <p>
            <strong>{t('legal.privacy.section12DpoLabel', 'Data Protection Officer:')}</strong> privacy@getuplift.io<br />
            <strong>{t('legal.privacy.section12AddressLabel', 'Address:')}</strong> {t('legal.privacy.section12Address', 'London, United Kingdom')}
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Uplift. {t('auth.allRightsReserved', 'All rights reserved')}.
        </div>
      </footer>
    </div>
  );
}
'''

with open(os.path.join(PORTAL, "src/pages/PrivacyPolicy.jsx"), "w") as f:
    f.write(privacy_jsx.lstrip('\n'))
print("PrivacyPolicy.jsx updated")
