// ============================================================
// ORG ONBOARDING WIZARD
// 5-step wizard for setting up a new organization
// ============================================================

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { organizationApi, brandingApi, authApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Building2,
  Image,
  UserPlus,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  Link as LinkIcon,
  Clock,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Company Info', icon: Building2 },
  { id: 2, label: 'Branding & Timezone', icon: Image },
  { id: 3, label: 'Invite Admin', icon: UserPlus },
  { id: 4, label: 'Add Employees', icon: Users },
  { id: 5, label: 'Done', icon: CheckCircle2 },
];

const INDUSTRIES = [
  'Retail',
  'Hospitality',
  'Healthcare',
  'Manufacturing',
  'Construction',
  'Logistics',
  'Food & Beverage',
  'Education',
  'Technology',
  'Finance',
  'Government',
  'Non-profit',
  'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Lisbon',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

// ============================================================
// STEP 1: Company Info
// ============================================================
function StepCompanyInfo({ data, onChange, errors, t }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          {t('orgOnboarding.companyInfoTitle', 'Tell us about your company')}
        </h3>
        <p className="text-sm text-slate-500">
          {t('orgOnboarding.companyInfoDesc', 'Basic information to set up your organization.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('orgOnboarding.companyName', 'Company Name')} *
          </label>
          <input
            type="text"
            value={data.companyName || ''}
            onChange={(e) => update('companyName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.companyName ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder={t('orgOnboarding.companyNamePlaceholder', 'e.g. Acme Corp')}
          />
          {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('orgOnboarding.industry', 'Industry')} *
          </label>
          <select
            value={data.industry || ''}
            onChange={(e) => update('industry', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.industry ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">{t('orgOnboarding.selectIndustry', 'Select industry...')}</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          {errors.industry && <p className="mt-1 text-xs text-red-600">{errors.industry}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('orgOnboarding.companySize', 'Company Size')} *
          </label>
          <select
            value={data.companySize || ''}
            onChange={(e) => update('companySize', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.companySize ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">{t('orgOnboarding.selectSize', 'Select size...')}</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>{size} {t('orgOnboarding.employees', 'employees')}</option>
            ))}
          </select>
          {errors.companySize && <p className="mt-1 text-xs text-red-600">{errors.companySize}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2: Logo & Timezone
// ============================================================
function StepBranding({ data, onChange, logoFile, onLogoChange, t }) {
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onLogoChange(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          {t('orgOnboarding.brandingTitle', 'Branding & Timezone')}
        </h3>
        <p className="text-sm text-slate-500">
          {t('orgOnboarding.brandingDesc', 'Upload your logo and set your default timezone.')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {t('orgOnboarding.companyLogo', 'Company Logo')}
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-momentum-400 hover:bg-momentum-50/30 transition-colors"
        >
          {logoFile ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={URL.createObjectURL(logoFile)}
                alt="Logo preview"
                className="w-20 h-20 object-contain rounded-lg"
              />
              <p className="text-sm text-slate-600">{logoFile.name}</p>
              <p className="text-xs text-slate-400">{t('orgOnboarding.clickToChange', 'Click to change')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-600">{t('orgOnboarding.clickToUpload', 'Click to upload logo')}</p>
              <p className="text-xs text-slate-400">{t('orgOnboarding.logoFormats', 'PNG, JPG, or SVG up to 2MB')}</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          <Clock className="w-4 h-4 inline mr-1" />
          {t('orgOnboarding.timezone', 'Timezone')}
        </label>
        <select
          value={data.timezone || ''}
          onChange={(e) => onChange({ ...data, timezone: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
        >
          <option value="">{t('orgOnboarding.selectTimezone', 'Select timezone...')}</option>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3: Invite Admin
// ============================================================
function StepInviteAdmin({ data, onChange, errors, t }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          {t('orgOnboarding.inviteAdminTitle', 'Invite your first admin or manager')}
        </h3>
        <p className="text-sm text-slate-500">
          {t('orgOnboarding.inviteAdminDesc', 'Add someone to help manage the organization. You can skip this step.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('orgOnboarding.adminName', 'Full Name')}
          </label>
          <input
            type="text"
            value={data.adminName || ''}
            onChange={(e) => update('adminName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.adminEmail ? 'border-slate-300' : 'border-slate-300'
            }`}
            placeholder={t('orgOnboarding.adminNamePlaceholder', 'e.g. Jane Smith')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('orgOnboarding.adminEmail', 'Email Address')}
          </label>
          <input
            type="email"
            value={data.adminEmail || ''}
            onChange={(e) => update('adminEmail', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.adminEmail ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder={t('orgOnboarding.adminEmailPlaceholder', 'e.g. jane@company.com')}
          />
          {errors.adminEmail && <p className="mt-1 text-xs text-red-600">{errors.adminEmail}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('orgOnboarding.adminRole', 'Role')}
          </label>
          <select
            value={data.adminRole || 'admin'}
            onChange={(e) => update('adminRole', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="admin">{t('orgOnboarding.roleAdmin', 'Admin')}</option>
            <option value="manager">{t('orgOnboarding.roleManager', 'Manager')}</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {t('orgOnboarding.inviteOptional', 'This step is optional. You can invite team members later from Settings.')}
      </p>
    </div>
  );
}

// ============================================================
// STEP 4: Add Employees
// ============================================================
function StepAddEmployees({ navigate, t }) {
  const options = [
    {
      icon: FileSpreadsheet,
      title: t('orgOnboarding.uploadCsv', 'Upload CSV'),
      desc: t('orgOnboarding.uploadCsvDesc', 'Import employees from a spreadsheet file.'),
      action: () => navigate('/bulk-import'),
      color: 'blue',
    },
    {
      icon: LinkIcon,
      title: t('orgOnboarding.connectHris', 'Connect HRIS'),
      desc: t('orgOnboarding.connectHrisDesc', 'Sync employees from your existing HR system.'),
      action: () => navigate('/integrations'),
      color: 'green',
    },
    {
      icon: Clock,
      title: t('orgOnboarding.addLater', 'Add manually later'),
      desc: t('orgOnboarding.addLaterDesc', 'Skip this for now and add employees one by one.'),
      action: null, // handled by "Next" button
      color: 'slate',
    },
  ];

  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-400 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:border-green-400 hover:bg-green-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-100',
  };

  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    slate: 'bg-slate-200 text-slate-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          {t('orgOnboarding.addEmployeesTitle', 'How would you like to add employees?')}
        </h3>
        <p className="text-sm text-slate-500">
          {t('orgOnboarding.addEmployeesDesc', 'Choose a method or skip this step for now.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt) => (
          <button
            key={opt.title}
            type="button"
            onClick={opt.action || undefined}
            className={`p-6 rounded-xl border-2 text-left transition-all ${colors[opt.color]}`}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${iconColors[opt.color]}`}>
              <opt.icon className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-1">{opt.title}</h4>
            <p className="text-sm text-slate-500">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STEP 5: Done
// ============================================================
function StepDone({ navigate, t }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        {t('orgOnboarding.doneTitle', 'Your organization is set up!')}
      </h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        {t('orgOnboarding.doneDesc', 'Everything is ready. Head to the dashboard to start managing your team.')}
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
      >
        {t('orgOnboarding.goToDashboard', 'Go to Dashboard')}
      </button>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function OrgOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium mb-1">
          {t('orgOnboarding.accessRestricted', 'Access Restricted')}
        </p>
        <p className="text-slate-500 text-sm">
          {t('orgOnboarding.adminOnly', 'Only administrators can set up the organization.')}
        </p>
      </div>
    );
  }

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!formData.companyName?.trim()) errs.companyName = t('orgOnboarding.required', 'This field is required');
      if (!formData.industry) errs.industry = t('orgOnboarding.required', 'This field is required');
      if (!formData.companySize) errs.companySize = t('orgOnboarding.required', 'This field is required');
    }
    if (step === 3 && formData.adminEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
        errs.adminEmail = t('orgOnboarding.invalidEmail', 'Invalid email address');
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveOrgData = async () => {
    setSaving(true);
    setGlobalError('');
    try {
      // Save org info
      await organizationApi.update({
        name: formData.companyName,
        industry: formData.industry,
        company_size: formData.companySize,
        timezone: formData.timezone || null,
      });

      // Upload logo if provided
      if (logoFile) {
        try {
          await brandingApi.uploadLogo(logoFile, 'primary');
        } catch {
          // Logo upload failed but org was saved
        }
      }

      // Invite admin if provided
      if (formData.adminEmail?.trim()) {
        try {
          const nameParts = (formData.adminName || '').trim().split(' ');
          await authApi.inviteUser({
            email: formData.adminEmail,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            role: formData.adminRole || 'admin',
          });
        } catch {
          // Invite failed but org was saved
        }
      }
    } catch (err) {
      setGlobalError(err.message || t('orgOnboarding.saveFailed', 'Failed to save organization. Please try again.'));
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  };

  const goNext = async () => {
    if (!validateStep(currentStep)) return;

    // Save data when leaving step 3 (all info collected)
    if (currentStep === 3) {
      const ok = await saveOrgData();
      if (!ok) return;
    }

    setCurrentStep((s) => Math.min(s + 1, 5));
    setGlobalError('');
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
    setErrors({});
    setGlobalError('');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('orgOnboarding.title', 'Organization Setup')}
        </h1>
        <p className="text-slate-500 mt-1">
          {t('orgOnboarding.subtitle', 'Set up your organization in a few simple steps.')}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Progress bar */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isDone
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-momentum-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span
                      className={`hidden md:block text-xs mt-1 font-medium ${
                        isActive ? 'text-momentum-600' : isDone ? 'text-green-600' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-8 lg:w-16 h-0.5 mx-1 lg:mx-2 ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1">
            <div
              className="bg-momentum-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {globalError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {globalError}
          </div>
        )}

        {/* Step content */}
        <div className="p-6">
          {currentStep === 1 && <StepCompanyInfo data={formData} onChange={setFormData} errors={errors} t={t} />}
          {currentStep === 2 && <StepBranding data={formData} onChange={setFormData} logoFile={logoFile} onLogoChange={setLogoFile} t={t} />}
          {currentStep === 3 && <StepInviteAdmin data={formData} onChange={setFormData} errors={errors} t={t} />}
          {currentStep === 4 && <StepAddEmployees navigate={navigate} t={t} />}
          {currentStep === 5 && <StepDone navigate={navigate} t={t} />}
        </div>

        {/* Footer - hide on done step */}
        {currentStep < 5 && (
          <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              {t('orgOnboarding.back', 'Back')}
            </button>

            <span className="text-sm text-slate-400">
              {t('orgOnboarding.stepOf', 'Step {{current}} of {{total}}', { current: currentStep, total: STEPS.length })}
            </span>

            <button
              onClick={goNext}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('orgOnboarding.saving', 'Saving...')}</>
              ) : (
                <>{t('orgOnboarding.next', 'Next')} <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
