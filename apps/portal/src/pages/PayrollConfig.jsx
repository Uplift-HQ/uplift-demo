// ============================================================
// PAYROLL CONFIGURATION
// Admin page for configuring multi-country payroll settings
// ============================================================
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Calendar,
  Link2,
  CheckCircle,
  Save,
  Building2,
  Users,
  Percent,
  DollarSign,
  Clock,
  AlertCircle,
  Check,
} from 'lucide-react';

// ============================================================
// DEMO DATA - Multi-country setup
// ============================================================

const COUNTRY_FLAGS = {
  GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}',
  PL: '\u{1F1F5}\u{1F1F1}',
  US: '\u{1F1FA}\u{1F1F8}',
  CN: '\u{1F1E8}\u{1F1F3}',
  AE: '\u{1F1E6}\u{1F1EA}',
};

const COUNTRY_CONFIG = [
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '\u00A3',
    payFrequency: 'Monthly',
    taxYearStart: '6 April',
    taxYearEnd: '5 April',
    enabled: true,
  },
  {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    payFrequency: 'Monthly',
    taxYearStart: '1 January',
    taxYearEnd: '31 December',
    enabled: true,
  },
  {
    code: 'PL',
    name: 'Poland',
    currency: 'PLN',
    currencySymbol: 'z\u0142',
    payFrequency: 'Monthly',
    taxYearStart: '1 January',
    taxYearEnd: '31 December',
    enabled: true,
  },
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    payFrequency: 'Bi-weekly',
    taxYearStart: '1 January',
    taxYearEnd: '31 December',
    enabled: true,
  },
  {
    code: 'CN',
    name: 'China',
    currency: 'CNY',
    currencySymbol: '\u00A5',
    payFrequency: 'Monthly',
    taxYearStart: '1 January',
    taxYearEnd: '31 December',
    enabled: true,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED',
    payFrequency: 'Monthly',
    taxYearStart: '1 January',
    taxYearEnd: '31 December',
    enabled: true,
  },
];

const TAX_CONFIG = {
  GB: {
    name: 'United Kingdom',
    brackets: [
      { threshold: 0, rate: 0, label: 'Personal Allowance' },
      { threshold: 12570, rate: 20, label: 'Basic Rate' },
      { threshold: 50270, rate: 40, label: 'Higher Rate' },
      { threshold: 125140, rate: 45, label: 'Additional Rate' },
    ],
    employerNI: 13.8,
    employeeNI: 12,
    pensionMinEmployer: 3,
    pensionMinEmployee: 5,
  },
  DE: {
    name: 'Germany',
    brackets: [
      { threshold: 0, rate: 0, label: 'Grundfreibetrag' },
      { threshold: 11604, rate: 14, label: 'Eingangssteuersatz' },
      { threshold: 17006, rate: 24, label: 'Progressive Zone 1' },
      { threshold: 66761, rate: 42, label: 'Spitzensteuersatz' },
      { threshold: 277826, rate: 45, label: 'Reichensteuer' },
    ],
    socialInsurance: 19.975,
    healthInsurance: 14.6,
    pensionInsurance: 18.6,
  },
  PL: {
    name: 'Poland',
    brackets: [
      { threshold: 0, rate: 0, label: 'Kwota wolna' },
      { threshold: 30000, rate: 12, label: 'First Threshold' },
      { threshold: 120000, rate: 32, label: 'Second Threshold' },
    ],
    zusEmployer: 19.48,
    zusEmployee: 13.71,
    healthInsurance: 9,
  },
  US: {
    name: 'United States',
    brackets: [
      { threshold: 0, rate: 10, label: '10% Bracket' },
      { threshold: 11600, rate: 12, label: '12% Bracket' },
      { threshold: 47150, rate: 22, label: '22% Bracket' },
      { threshold: 100525, rate: 24, label: '24% Bracket' },
      { threshold: 191950, rate: 32, label: '32% Bracket' },
      { threshold: 243725, rate: 35, label: '35% Bracket' },
      { threshold: 609350, rate: 37, label: '37% Bracket' },
    ],
    socialSecurity: 6.2,
    medicare: 1.45,
    futa: 0.6,
  },
  CN: {
    name: 'China',
    brackets: [
      { threshold: 0, rate: 3, label: 'Level 1' },
      { threshold: 36000, rate: 10, label: 'Level 2' },
      { threshold: 144000, rate: 20, label: 'Level 3' },
      { threshold: 300000, rate: 25, label: 'Level 4' },
      { threshold: 420000, rate: 30, label: 'Level 5' },
      { threshold: 660000, rate: 35, label: 'Level 6' },
      { threshold: 960000, rate: 45, label: 'Level 7' },
    ],
    socialInsuranceEmployer: 29.5,
    socialInsuranceEmployee: 10.5,
    housingFund: 12,
  },
  AE: {
    name: 'United Arab Emirates',
    brackets: [
      { threshold: 0, rate: 0, label: 'No Income Tax' },
    ],
    note: 'UAE has no personal income tax. Only corporate tax applies (9% above AED 375,000).',
    gratuity: true,
    wps: true,
  },
};

const PAY_CALENDARS = [
  {
    country: 'GB',
    monthlyPayDate: 28,
    cutOffDate: 20,
    bankProcessingDays: 3,
    notes: 'BACS processing required',
  },
  {
    country: 'DE',
    monthlyPayDate: 28,
    cutOffDate: 18,
    bankProcessingDays: 2,
    notes: 'SEPA transfers',
  },
  {
    country: 'PL',
    monthlyPayDate: 28,
    cutOffDate: 20,
    bankProcessingDays: 2,
    notes: 'Elixir domestic transfers',
  },
  {
    country: 'US',
    monthlyPayDate: 15,
    cutOffDate: 5,
    bankProcessingDays: 2,
    notes: 'Bi-weekly on 1st and 15th',
  },
  {
    country: 'CN',
    monthlyPayDate: 25,
    cutOffDate: 15,
    bankProcessingDays: 3,
    notes: 'CNAPS processing',
  },
  {
    country: 'AE',
    monthlyPayDate: 28,
    cutOffDate: 22,
    bankProcessingDays: 1,
    notes: 'WPS submission required',
  },
];

const INTEGRATIONS = [
  {
    id: 'adp',
    name: 'ADP',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/ADP_Logo.svg/320px-ADP_Logo.svg.png',
    status: 'connected',
    countries: ['US'],
    type: 'external',
  },
  {
    id: 'sage',
    name: 'Sage',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Sage_logo.svg/320px-Sage_logo.svg.png',
    status: 'connected',
    countries: ['GB'],
    type: 'external',
  },
  {
    id: 'xero',
    name: 'Xero',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9f/Xero_software_logo.svg/320px-Xero_software_logo.svg.png',
    status: 'available',
    countries: ['GB', 'AE'],
    type: 'external',
  },
  {
    id: 'native',
    name: 'Uplift Native',
    logo: null,
    status: 'active',
    countries: ['DE', 'PL', 'CN', 'AE'],
    type: 'native',
  },
];

const APPROVAL_CONFIG = {
  requireManagerApproval: true,
  requireFinanceApproval: true,
  autoApproveThreshold: 5000,
  currency: 'GBP',
};

// ============================================================
// TAB CONFIGURATION
// ============================================================

const TABS = [
  { id: 'countries', nameKey: 'payrollConfig.tabs.countries', icon: Globe },
  { id: 'tax', nameKey: 'payrollConfig.tabs.tax', icon: Percent },
  { id: 'calendars', nameKey: 'payrollConfig.tabs.calendars', icon: Calendar },
  { id: 'integrations', nameKey: 'payrollConfig.tabs.integrations', icon: Link2 },
  { id: 'approvals', nameKey: 'payrollConfig.tabs.approvals', icon: CheckCircle },
];

// ============================================================
// COMPONENT
// ============================================================

export default function PayrollConfig() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('countries');
  const [countries, setCountries] = useState(COUNTRY_CONFIG);
  const [calendars, setCalendars] = useState(PAY_CALENDARS);
  const [approvalSettings, setApprovalSettings] = useState(APPROVAL_CONFIG);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
    showMsg(t('payrollConfig.saved', 'Configuration saved successfully'));
  };

  const toggleCountry = (code) => {
    setCountries(prev =>
      prev.map(c =>
        c.code === code ? { ...c, enabled: !c.enabled } : c
      )
    );
  };

  const updateCalendar = (country, field, value) => {
    setCalendars(prev =>
      prev.map(c =>
        c.country === country ? { ...c, [field]: value } : c
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('payrollConfig.title', 'Payroll Configuration')}
          </h1>
          <p className="text-slate-600">
            {t('payrollConfig.subtitle', 'Configure global payroll settings')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? t('payrollConfig.saving', 'Saving...') : t('payrollConfig.saveChanges', 'Save Changes')}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Layout with Sidebar */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-momentum-50 text-momentum-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {t(tab.nameKey, tab.id.charAt(0).toUpperCase() + tab.id.slice(1))}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6">
          {activeTab === 'countries' && (
            <CountriesTab
              countries={countries}
              onToggle={toggleCountry}
            />
          )}
          {activeTab === 'tax' && <TaxConfigTab />}
          {activeTab === 'calendars' && (
            <CalendarsTab
              calendars={calendars}
              onUpdate={updateCalendar}
            />
          )}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'approvals' && (
            <ApprovalsTab
              settings={approvalSettings}
              onUpdate={setApprovalSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COUNTRIES TAB
// ============================================================

function CountriesTab({ countries, onToggle }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t('payrollConfig.countries.title', 'Enabled Countries')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('payrollConfig.countries.description', 'Manage which countries are active for payroll processing')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('payrollConfig.countries.country', 'Country')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('payrollConfig.countries.currency', 'Currency')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('payrollConfig.countries.payFrequency', 'Pay Frequency')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('payrollConfig.countries.taxYear', 'Tax Year')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('payrollConfig.countries.enabled', 'Enabled')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {countries.map((country) => (
              <tr key={country.code} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{COUNTRY_FLAGS[country.code]}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{country.name}</p>
                      <p className="text-xs text-slate-500">{country.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                    {country.currency} ({country.currencySymbol})
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">{country.payFrequency}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {country.taxYearStart} - {country.taxYearEnd}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => onToggle(country.code)}
                    className={`inline-flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                      country.enabled
                        ? 'bg-green-500'
                        : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        country.enabled ? 'translate-x-3' : '-translate-x-3'
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              {t('payrollConfig.countries.infoTitle', 'Country Configuration')}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {t('payrollConfig.countries.infoDescription', 'Disabling a country will prevent new payroll runs but will not affect historical data. Existing employees in that country will remain in the system.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAX CONFIGURATION TAB
// ============================================================

function TaxConfigTab() {
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState('GB');

  const taxConfig = TAX_CONFIG[selectedCountry];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t('payrollConfig.tax.title', 'Tax Configuration')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('payrollConfig.tax.description', 'View tax brackets and rates by country (read-only, config-driven)')}
        </p>
      </div>

      {/* Country Selector */}
      <div className="flex items-center gap-3">
        <Globe className="h-5 w-5 text-slate-400" />
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 bg-white"
        >
          {Object.keys(TAX_CONFIG).map((code) => (
            <option key={code} value={code}>
              {COUNTRY_FLAGS[code]} {TAX_CONFIG[code].name}
            </option>
          ))}
        </select>
      </div>

      {/* Tax Brackets */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Percent className="h-4 w-4" />
          {t('payrollConfig.tax.brackets', 'Income Tax Brackets')}
        </h3>
        <div className="space-y-2">
          {taxConfig.brackets.map((bracket, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{t('payrollConfig.brackets.' + bracket.key, bracket.label)}</p>
                <p className="text-xs text-slate-500">
                  {bracket.threshold === 0
                    ? t('payrollConfig.tax.fromZero', 'From 0')
                    : t('payrollConfig.tax.above', 'Above {{amount}}', {
                        amount: bracket.threshold.toLocaleString(),
                      })}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  bracket.rate === 0
                    ? 'bg-green-100 text-green-700'
                    : bracket.rate <= 20
                    ? 'bg-blue-100 text-blue-700'
                    : bracket.rate <= 35
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {bracket.rate}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Tax Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {taxConfig.employerNI !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.employerNI', "Employer's NI")}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.employerNI}%</p>
          </div>
        )}
        {taxConfig.employeeNI !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.employeeNI', "Employee's NI")}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.employeeNI}%</p>
          </div>
        )}
        {taxConfig.socialInsurance !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.socialInsurance', 'Social Insurance')}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.socialInsurance}%</p>
          </div>
        )}
        {taxConfig.healthInsurance !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.healthInsurance', 'Health Insurance')}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.healthInsurance}%</p>
          </div>
        )}
        {taxConfig.pensionInsurance !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.pensionInsurance', 'Pension Insurance')}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.pensionInsurance}%</p>
          </div>
        )}
        {taxConfig.socialSecurity !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.socialSecurity', 'Social Security')}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.socialSecurity}%</p>
          </div>
        )}
        {taxConfig.medicare !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.medicare', 'Medicare')}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.medicare}%</p>
          </div>
        )}
        {taxConfig.zusEmployer !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.zusEmployer', 'ZUS (Employer)')}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.zusEmployer}%</p>
          </div>
        )}
        {taxConfig.socialInsuranceEmployer !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.socialInsuranceEmployer', 'Social Insurance (Employer)')}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.socialInsuranceEmployer}%</p>
          </div>
        )}
        {taxConfig.housingFund !== undefined && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {t('payrollConfig.tax.housingFund', 'Housing Fund')}
            </p>
            <p className="text-xl font-bold text-slate-900">{taxConfig.housingFund}%</p>
          </div>
        )}
      </div>

      {/* Special Notes */}
      {taxConfig.note && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {t('payrollConfig.tax.specialNote', 'Special Note')}
              </p>
              <p className="text-sm text-amber-700 mt-1">{taxConfig.note}</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500">
          {t('payrollConfig.tax.disclaimer', 'Tax rates shown are for informational purposes and are updated annually. Always consult local tax authorities for official rates.')}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// PAY CALENDARS TAB
// ============================================================

function CalendarsTab({ calendars, onUpdate }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t('payrollConfig.calendars.title', 'Pay Calendars')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('payrollConfig.calendars.description', 'Configure pay dates and processing schedules by country')}
        </p>
      </div>

      <div className="space-y-4">
        {calendars.map((calendar) => {
          const country = COUNTRY_CONFIG.find((c) => c.code === calendar.country);
          return (
            <div
              key={calendar.country}
              className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">{COUNTRY_FLAGS[calendar.country]}</span>
                <div>
                  <p className="font-medium text-slate-900">{country?.name}</p>
                  <p className="text-xs text-slate-500">{calendar.notes}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {t('payrollConfig.calendars.monthlyPayDate', 'Monthly Pay Date')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={calendar.monthlyPayDate}
                      onChange={(e) =>
                        onUpdate(calendar.country, 'monthlyPayDate', parseInt(e.target.value))
                      }
                      className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                    />
                    <span className="text-sm text-slate-500">
                      {t('payrollConfig.calendars.ofMonth', 'of each month')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {t('payrollConfig.calendars.cutOffDate', 'Cut-off Date')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={calendar.cutOffDate}
                      onChange={(e) =>
                        onUpdate(calendar.country, 'cutOffDate', parseInt(e.target.value))
                      }
                      className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                    />
                    <span className="text-sm text-slate-500">
                      {t('payrollConfig.calendars.ofMonth', 'of each month')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {t('payrollConfig.calendars.bankProcessingDays', 'Bank Processing Days')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={calendar.bankProcessingDays}
                      onChange={(e) =>
                        onUpdate(calendar.country, 'bankProcessingDays', parseInt(e.target.value))
                      }
                      className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500"
                    />
                    <span className="text-sm text-slate-500">
                      {t('payrollConfig.calendars.days', 'days')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              {t('payrollConfig.calendars.timingInfo', 'Payment Timing')}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {t('payrollConfig.calendars.timingDescription', 'Ensure cut-off dates allow sufficient time for payroll processing and bank transfers. Consider public holidays which may affect processing times.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INTEGRATIONS TAB
// ============================================================

function IntegrationsTab() {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const toggleIntegrationType = (id) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id
          ? {
              ...int,
              status: int.status === 'connected' ? 'available' : 'connected',
            }
          : int
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t('payrollConfig.integrations.title', 'Payroll Integrations')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('payrollConfig.integrations.description', 'Connect external payroll providers or use native calculations')}
        </p>
      </div>

      {/* Native vs External Toggle Info */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              {t('payrollConfig.integrations.processingMode', 'Processing Mode')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t('payrollConfig.integrations.processingModeDescription', 'Choose between Uplift native calculations or external provider APIs per country')}
            </p>
          </div>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className={`p-4 rounded-lg border-2 transition-colors ${
              integration.status === 'connected' || integration.status === 'active'
                ? 'border-green-200 bg-green-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {integration.logo ? (
                  <img
                    src={integration.logo}
                    alt={integration.name}
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-8 w-8 bg-momentum-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-momentum-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-slate-900">{integration.name}</p>
                  <p className="text-xs text-slate-500">
                    {integration.type === 'native'
                      ? t('payrollConfig.integrations.nativeCalculation', 'Native Calculation')
                      : t('payrollConfig.integrations.externalAPI', 'External API')}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  integration.status === 'connected'
                    ? 'bg-green-100 text-green-700'
                    : integration.status === 'active'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {integration.status === 'connected'
                  ? t('payrollConfig.integrations.connected', 'Connected')
                  : integration.status === 'active'
                  ? t('payrollConfig.integrations.active', 'Active')
                  : t('payrollConfig.integrations.available', 'Available')}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">
                {t('payrollConfig.integrations.countries', 'Countries:')}
              </span>
              {integration.countries.map((code) => (
                <span key={code} className="text-sm">
                  {COUNTRY_FLAGS[code]}
                </span>
              ))}
            </div>

            {integration.type !== 'native' && (
              <button
                onClick={() => toggleIntegrationType(integration.id)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  integration.status === 'connected'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-momentum-500 text-white hover:bg-momentum-600'
                }`}
              >
                {integration.status === 'connected'
                  ? t('payrollConfig.integrations.disconnect', 'Disconnect')
                  : t('payrollConfig.integrations.connect', 'Connect')}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {t('payrollConfig.integrations.switchingWarning', 'Switching Providers')}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {t('payrollConfig.integrations.switchingDescription', 'Changing payroll providers mid-year may require manual reconciliation. We recommend making changes at the start of a new tax year.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// APPROVALS TAB
// ============================================================

function ApprovalsTab({ settings, onUpdate }) {
  const { t } = useTranslation();

  const handleToggle = (field) => {
    onUpdate((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleThresholdChange = (value) => {
    onUpdate((prev) => ({ ...prev, autoApproveThreshold: parseInt(value) || 0 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t('payrollConfig.approvals.title', 'Approval Workflow')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('payrollConfig.approvals.description', 'Configure the payroll approval chain and auto-approval rules')}
        </p>
      </div>

      {/* Approval Checkboxes */}
      <div className="space-y-4">
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {t('payrollConfig.approvals.managerApproval', 'Manager Approval')}
                </p>
                <p className="text-sm text-slate-500">
                  {t('payrollConfig.approvals.managerApprovalDescription', 'Require line manager approval for payroll changes')}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('requireManagerApproval')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.requireManagerApproval ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.requireManagerApproval ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {t('payrollConfig.approvals.financeApproval', 'Finance Approval')}
                </p>
                <p className="text-sm text-slate-500">
                  {t('payrollConfig.approvals.financeApprovalDescription', 'Require finance team sign-off before processing')}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('requireFinanceApproval')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.requireFinanceApproval ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.requireFinanceApproval ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Auto-approve Threshold */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          {t('payrollConfig.approvals.autoApproveThreshold', 'Auto-Approve Threshold')}
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          {t('payrollConfig.approvals.autoApproveDescription', 'Payroll changes below this amount will be automatically approved without manual review.')}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-slate-700">{settings.currency}</span>
          <input
            type="number"
            min="0"
            step="100"
            value={settings.autoApproveThreshold}
            onChange={(e) => handleThresholdChange(e.target.value)}
            className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-lg font-medium focus:ring-2 focus:ring-momentum-500"
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {t('payrollConfig.approvals.autoApproveNote', 'Set to 0 to require approval for all changes')}
        </p>
      </div>

      {/* Approval Flow Diagram */}
      <div className="p-4 bg-white rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          {t('payrollConfig.approvals.currentFlow', 'Current Approval Flow')}
        </h3>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">
            {t('payrollConfig.approvals.payrollSubmitted', 'Payroll Submitted')}
          </div>
          <span className="text-slate-400">&rarr;</span>
          {settings.requireManagerApproval && (
            <>
              <div className="px-4 py-2 bg-blue-100 rounded-lg text-sm font-medium text-blue-700 flex items-center gap-2">
                <Check className="h-4 w-4" />
                {t('payrollConfig.approvals.managerReview', 'Manager Review')}
              </div>
              <span className="text-slate-400">&rarr;</span>
            </>
          )}
          {settings.requireFinanceApproval && (
            <>
              <div className="px-4 py-2 bg-purple-100 rounded-lg text-sm font-medium text-purple-700 flex items-center gap-2">
                <Check className="h-4 w-4" />
                {t('payrollConfig.approvals.financeReview', 'Finance Review')}
              </div>
              <span className="text-slate-400">&rarr;</span>
            </>
          )}
          <div className="px-4 py-2 bg-green-100 rounded-lg text-sm font-medium text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {t('payrollConfig.approvals.processed', 'Processed')}
          </div>
        </div>
        {!settings.requireManagerApproval && !settings.requireFinanceApproval && (
          <p className="text-center text-sm text-amber-600 mt-4">
            {t('payrollConfig.approvals.noApprovalsWarning', 'Warning: No approvals required. Payroll will be processed automatically.')}
          </p>
        )}
      </div>
    </div>
  );
}
