// ============================================================
// TERMS OF SERVICE PAGE
// ============================================================

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('legal.terms.title', 'Terms of Service')}</h1>
        <p className="text-slate-600 mb-8">{t('legal.terms.lastUpdated', 'Last updated: January 2026')}</p>

        <div className="prose prose-slate max-w-none">
          <h2>{t('legal.terms.s1Title', '1. Acceptance of Terms')}</h2>
          <p>{t('legal.terms.s1Text', 'By accessing or using Uplift\'s workforce intelligence platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.')}</p>

          <h2>{t('legal.terms.s2Title', '2. Description of Service')}</h2>
          <p>{t('legal.terms.s2Text', 'Uplift provides a workforce intelligence SaaS platform that includes AI scheduling, skills tracking, career path visibility, and gamification features designed to help organizations manage their workforce more effectively.')}</p>

          <h2>{t('legal.terms.s3Title', '3. User Accounts')}</h2>
          <p>{t('legal.terms.s3Text1', 'When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of these Terms, which may result in immediate termination of your account.')}</p>
          <p>{t('legal.terms.s3Text2', 'You are responsible for safeguarding your password and for all activities that occur under your account. You agree not to disclose your password to any third party.')}</p>

          <h2>{t('legal.terms.s4Title', '4. Data Protection')}</h2>
          <p>{t('legal.terms.s4Text', 'We take data protection seriously. Your use of the Service is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information.')}</p>

          <h2>{t('legal.terms.s5Title', '5. Acceptable Use')}</h2>
          <p>{t('legal.terms.s5Text', 'You agree not to:')}</p>
          <ul>
            <li>{t('legal.terms.s5Item1', 'Use the Service for any unlawful purpose')}</li>
            <li>{t('legal.terms.s5Item2', 'Attempt to gain unauthorized access to any part of the Service')}</li>
            <li>{t('legal.terms.s5Item3', 'Interfere with or disrupt the Service or servers')}</li>
            <li>{t('legal.terms.s5Item4', 'Upload malicious code or content')}</li>
            <li>{t('legal.terms.s5Item5', 'Share account credentials with unauthorized users')}</li>
          </ul>

          <h2>{t('legal.terms.s6Title', '6. Intellectual Property')}</h2>
          <p>{t('legal.terms.s6Text', 'The Service and its original content, features, and functionality are owned by Uplift and are protected by international copyright, trademark, and other intellectual property laws.')}</p>

          <h2>{t('legal.terms.s7Title', '7. Subscription and Payment')}</h2>
          <p>{t('legal.terms.s7Text', 'Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring basis. Billing cycles are set on a monthly or annual basis, depending on your subscription plan.')}</p>

          <h2>{t('legal.terms.s8Title', '8. Termination')}</h2>
          <p>{t('legal.terms.s8Text', 'We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.')}</p>

          <h2>{t('legal.terms.s9Title', '9. Limitation of Liability')}</h2>
          <p>{t('legal.terms.s9Text', 'In no event shall Uplift, its directors, employees, partners, or suppliers be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill.')}</p>

          <h2>{t('legal.terms.s10Title', '10. Changes to Terms')}</h2>
          <p>{t('legal.terms.s10Text', 'We reserve the right to modify these Terms at any time. We will provide notice of any material changes by posting the new Terms on this page and updating the "Last updated" date.')}</p>

          <h2>{t('legal.terms.s11Title', '11. Contact Us')}</h2>
          <p>{t('legal.terms.s11Text', 'If you have any questions about these Terms, please contact us at:')}</p>
          <p>
            <strong>{t('legal.terms.emailLabel', 'Email:')}</strong> legal@getuplift.io<br />
            <strong>{t('legal.terms.addressLabel', 'Address:')}</strong> {t('legal.terms.address', 'London, United Kingdom')}
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
