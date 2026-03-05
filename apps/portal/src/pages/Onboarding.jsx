// ============================================================
// ONBOARDING WORKFLOWS PAGE
// 4-tab module: Active Onboardings, Templates, Add Employee
// (wizard), and Dashboard analytics
// Fully internationalized - all strings use t() for translation
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import {
  employeesApi,
  departmentsApi,
  rolesApi,
  locationsApi,
  skillsApi,
  authApi,
} from '../lib/api';
import {
  User,
  Users,
  Briefcase,
  Award,
  CalendarClock,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  UserPlus,
  FileText,
  BarChart3,
  Clock,
  Calendar,
  X,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';

// ============================================================
// DEMO DATA - Active Onboardings
// ============================================================

const ACTIVE_ONBOARDINGS = [
  {
    id: 1, name: 'Olivia Brown', role: 'Receptionist', department: 'Front of House',
    location: 'London Mayfair', startDate: '2026-02-10', buddy: 'Sarah Mitchell',
    status: 'on_track', tasksCompleted: 9, tasksTotal: 12,
    tasks: [
      { category: 'IT Setup', items: [
        { name: 'Create email account', assignee: 'IT', due: '2026-02-07', done: true },
        { name: 'Set up Opera PMS access', assignee: 'IT', due: '2026-02-08', done: true },
        { name: 'Issue keycard & badges', assignee: 'IT', due: '2026-02-09', done: true },
      ]},
      { category: 'HR Documents', items: [
        { name: 'Sign employment contract', assignee: 'HR', due: '2026-02-07', done: true },
        { name: 'Complete tax forms', assignee: 'HR', due: '2026-02-08', done: true },
        { name: 'Emergency contact form', assignee: 'HR', due: '2026-02-09', done: false },
      ]},
      { category: 'Training', items: [
        { name: 'Health & safety induction', assignee: 'Manager', due: '2026-02-10', done: true },
        { name: 'Fire safety training', assignee: 'Manager', due: '2026-02-11', done: true },
        { name: 'Guest service standards', assignee: 'Manager', due: '2026-02-12', done: true },
      ]},
      { category: 'Team Introductions', items: [
        { name: 'Meet department heads', assignee: 'Buddy', due: '2026-02-10', done: true },
        { name: 'Shadow shift with mentor', assignee: 'Buddy', due: '2026-02-11', done: false },
        { name: 'Welcome lunch with team', assignee: 'Buddy', due: '2026-02-12', done: false },
      ]},
    ]
  },
  {
    id: 2, name: 'Daniel Park', role: 'Line Cook', department: 'Kitchen',
    location: 'Paris Champs-Élysées', startDate: '2026-02-03', buddy: 'Klaus Weber',
    status: 'at_risk', tasksCompleted: 5, tasksTotal: 12,
    tasks: [
      { category: 'IT Setup', items: [
        { name: 'Create email account', assignee: 'IT', due: '2026-01-31', done: true },
        { name: 'Kitchen system access', assignee: 'IT', due: '2026-02-01', done: true },
        { name: 'Issue uniform & badges', assignee: 'IT', due: '2026-02-02', done: false },
      ]},
      { category: 'HR Documents', items: [
        { name: 'Sign employment contract', assignee: 'HR', due: '2026-01-31', done: true },
        { name: 'Food Safety certification check', assignee: 'HR', due: '2026-02-01', done: true },
        { name: 'Right to work verification', assignee: 'HR', due: '2026-02-01', done: true },
      ]},
      { category: 'Training', items: [
        { name: 'Food Safety Level 2', assignee: 'Manager', due: '2026-02-03', done: false },
        { name: 'Kitchen safety training', assignee: 'Manager', due: '2026-02-04', done: false },
        { name: 'Menu & recipe walkthrough', assignee: 'Manager', due: '2026-02-05', done: false },
      ]},
      { category: 'Team Introductions', items: [
        { name: 'Meet kitchen brigade', assignee: 'Buddy', due: '2026-02-03', done: false },
        { name: 'Shadow shift with mentor', assignee: 'Buddy', due: '2026-02-04', done: false },
        { name: 'Team welcome event', assignee: 'Buddy', due: '2026-02-05', done: false },
      ]},
    ]
  },
  {
    id: 3, name: 'Emma Williams', role: 'Events Coordinator', department: 'Events & Conferences',
    location: 'London Mayfair', startDate: '2026-01-20', buddy: 'Rachel Thompson',
    status: 'on_track', tasksCompleted: 12, tasksTotal: 12,
    tasks: []
  },
  {
    id: 4, name: 'Raj Mehta', role: 'Bartender', department: 'Bar & Beverage',
    location: 'Dubai Marina', startDate: '2026-02-17', buddy: 'James Wilson',
    status: 'on_track', tasksCompleted: 3, tasksTotal: 12,
    tasks: []
  },
  {
    id: 5, name: 'Fatima Al-Hassan', role: 'Spa Therapist', department: 'Spa & Wellness',
    location: 'London Mayfair', startDate: '2026-02-05', buddy: 'Sophie Anderson',
    status: 'overdue', tasksCompleted: 4, tasksTotal: 10,
    tasks: []
  },
  {
    id: 6, name: 'Liam O\'Connor', role: 'Maintenance Engineer', department: 'Engineering & Facilities',
    location: 'Dubai Marina', startDate: '2026-02-12', buddy: 'Thomas Brown',
    status: 'on_track', tasksCompleted: 7, tasksTotal: 12,
    tasks: []
  },
];

// ============================================================
// DEMO DATA - Templates
// ============================================================

const TEMPLATES = [
  { id: 1, name: 'Standard Onboarding', duration: '30 days', taskCount: 24, lastUpdated: '2026-01-15', description: 'Complete onboarding for permanent employees', isDefault: true },
  { id: 2, name: 'Manager Onboarding', duration: '60 days', taskCount: 36, lastUpdated: '2026-01-10', description: 'Extended onboarding with leadership modules' },
  { id: 3, name: 'Seasonal Worker', duration: '14 days', taskCount: 12, lastUpdated: '2025-12-20', description: 'Fast-track onboarding for seasonal staff' },
];

// Placeholder tasks for template expanded view
const TEMPLATE_TASKS = {
  1: [
    { category: 'IT Setup', items: ['Create email account', 'Set up system access', 'Issue keycard & badges', 'Configure workstation', 'Set up phone extension', 'Grant network permissions'] },
    { category: 'HR Documents', items: ['Sign employment contract', 'Complete tax forms', 'Emergency contact form', 'Bank details for payroll', 'Photo for ID badge', 'NDA & confidentiality agreement'] },
    { category: 'Training', items: ['Health & safety induction', 'Fire safety training', 'Data protection (GDPR)', 'Customer service standards', 'Company policies overview', 'Role-specific SOPs'] },
    { category: 'Team Introductions', items: ['Meet department heads', 'Shadow shift with mentor', 'Welcome lunch with team', 'Tour of premises', 'Meet buddy/mentor', 'Introduction to key contacts'] },
  ],
  2: [
    { category: 'IT Setup', items: ['Create email account', 'Set up system access', 'Issue keycard & badges', 'Management dashboard access', 'Reporting tools setup', 'Mobile device provisioning'] },
    { category: 'HR Documents', items: ['Sign employment contract', 'Complete tax forms', 'Emergency contact form', 'Manager-level NDA', 'Benefits enrollment', 'Company car agreement'] },
    { category: 'Training', items: ['Health & safety induction', 'Fire safety training', 'Leadership fundamentals', 'Performance management training', 'Budget management', 'Conflict resolution workshop'] },
    { category: 'Leadership', items: ['Meet executive team', 'Shadow senior manager', 'Department strategy review', 'Team assessment meetings', 'Stakeholder mapping', 'First 90-day plan creation'] },
    { category: 'Team Introductions', items: ['Meet department heads', 'All-hands introduction', 'Cross-department meetings', 'Welcome dinner with leadership', 'Meet direct reports 1:1', 'External partner introductions'] },
  ],
  3: [
    { category: 'IT Setup', items: ['Create temporary email', 'Set up POS/system access', 'Issue temporary badge'] },
    { category: 'HR Documents', items: ['Sign seasonal contract', 'Complete tax forms', 'Emergency contact form'] },
    { category: 'Training', items: ['Health & safety induction', 'Fire safety training', 'Role-specific quick-start'] },
    { category: 'Team Introductions', items: ['Meet team lead', 'Shadow experienced colleague', 'Tour of work area'] },
  ],
};

// ============================================================
// DEMO DATA - Dashboard
// ============================================================

const DEPARTMENT_CHART = [
  { department: 'Production', count: 2 },
  { department: 'Quality Control', count: 1 },
  { department: 'Warehouse & Logistics', count: 1 },
  { department: 'EHS', count: 1 },
  { department: 'Maintenance', count: 1 },
];

const COMPLETION_TREND = [
  { month: 'Aug', rate: 88 },
  { month: 'Sep', rate: 90 },
  { month: 'Oct', rate: 85 },
  { month: 'Nov', rate: 91 },
  { month: 'Dec', rate: 94 },
  { month: 'Jan', rate: 92 },
];

const OVERDUE_TASKS = [
  { employee: 'Fatima Al-Hassan', task: 'Complete tax forms', assignee: 'HR', due: '2026-02-03' },
  { employee: 'Daniel Park', task: 'Issue uniform & badges', assignee: 'IT', due: '2026-02-02' },
  { employee: 'Daniel Park', task: 'HACCP training', assignee: 'Manager', due: '2026-02-03' },
];

// ============================================================
// WIZARD CONSTANTS (preserved from original)
// ============================================================

const STEPS = [
  { id: 1, labelKey: 'onboarding.steps.employeeDetails', icon: User },
  { id: 2, labelKey: 'onboarding.steps.roleDepartment', icon: Briefcase },
  { id: 3, labelKey: 'onboarding.steps.skillsCerts', icon: Award },
  { id: 4, labelKey: 'onboarding.steps.availability', icon: CalendarClock },
  { id: 5, labelKey: 'onboarding.steps.invitation', icon: Send },
];

const DAYS_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SHIFT_TIMES_KEYS = ['morning', 'afternoon', 'evening', 'night'];
const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'casual', 'contractor'];

function generateEmployeeId() {
  return 'EMP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================================
// TAB DEFINITIONS
// ============================================================

const TABS = [
  { id: 'active', labelKey: 'onboarding.tabs.activeOnboardings', icon: Users },
  { id: 'templates', labelKey: 'onboarding.tabs.templates', icon: FileText },
  { id: 'add', labelKey: 'onboarding.tabs.addEmployee', icon: UserPlus },
  { id: 'dashboard', labelKey: 'onboarding.tabs.dashboard', icon: BarChart3 },
];

// ============================================================
// STEP 1: Employee Details
// ============================================================
function StepEmployeeDetails({ data, onChange, errors, employees }) {
  const { t } = useTranslation();
  const update = (field, value) => onChange({ ...data, [field]: value });
  const [emailWarning, setEmailWarning] = useState('');

  const handleEmailBlur = () => {
    const email = (data.email || '').trim().toLowerCase();
    if (email && employees && employees.length > 0) {
      const match = employees.find(
        (emp) => (emp.email || '').toLowerCase() === email
      );
      if (match) {
        setEmailWarning(t('onboarding.emailExistsWarning', 'An employee with this email already exists ({{name}}).', { name: `${match.first_name} ${match.last_name}` }));
      } else {
        setEmailWarning('');
      }
    } else {
      setEmailWarning('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('onboarding.employeeDetailsTitle', 'Employee Details')}</h3>
        <p className="text-sm text-slate-500">{t('onboarding.employeeDetailsDesc', 'Enter the basic information for the new employee.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.firstName', 'First Name')} *</label>
          <input
            type="text"
            value={data.firstName || ''}
            onChange={(e) => update('firstName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.firstName ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder={t('onboarding.firstNamePlaceholder', 'e.g. John')}
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.lastName', 'Last Name')} *</label>
          <input
            type="text"
            value={data.lastName || ''}
            onChange={(e) => update('lastName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.lastName ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder={t('onboarding.lastNamePlaceholder', 'e.g. Smith')}
          />
          {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.emailAddress', 'Email Address')} *</label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => { update('email', e.target.value); setEmailWarning(''); }}
            onBlur={handleEmailBlur}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder={t('onboarding.emailPlaceholder', 'e.g. john.smith@company.com')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          {emailWarning && !errors.email && (
            <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {emailWarning}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.phoneNumber', 'Phone Number')}</label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            placeholder={t('onboarding.phonePlaceholder', 'e.g. +44 7700 900000')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.employmentType', 'Employment Type')} *</label>
          <select
            value={data.employmentType || ''}
            onChange={(e) => update('employmentType', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.employmentType ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">{t('onboarding.selectType', 'Select type...')}</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`onboarding.employmentTypes.${type}`, type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '))}
              </option>
            ))}
          </select>
          {errors.employmentType && <p className="mt-1 text-xs text-red-600">{errors.employmentType}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.startDate', 'Start Date')} *</label>
          <input
            type="date"
            value={data.startDate || ''}
            onChange={(e) => update('startDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.startDate ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          />
          {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.employeeId', 'Employee ID')}</label>
          <input
            type="text"
            value={data.employeeId || ''}
            onChange={(e) => update('employeeId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            placeholder={t('onboarding.employeeIdPlaceholder', 'Auto-generated if left blank')}
          />
          <p className="mt-1 text-xs text-slate-400">{t('onboarding.employeeIdHelper', 'Leave blank to auto-generate.')}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2: Role & Department
// ============================================================
function StepRoleDepartment({ data, onChange, errors, departments, roles, locations, employees }) {
  const { t } = useTranslation();
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('onboarding.roleDepartmentTitle', 'Role & Department')}</h3>
        <p className="text-sm text-slate-500">{t('onboarding.roleDepartmentDesc', 'Assign the employee to a department, role and location.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.department', 'Department')} *</label>
          <select
            value={data.department || ''}
            onChange={(e) => update('department', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.department ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">{t('onboarding.selectDepartment', 'Select department...')}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.role', 'Role')} *</label>
          <select
            value={data.role || ''}
            onChange={(e) => update('role', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.role ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">{t('onboarding.selectRole', 'Select role...')}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.location', 'Location')} *</label>
          <select
            value={data.location || ''}
            onChange={(e) => update('location', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.location ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">{t('onboarding.selectLocation', 'Select location...')}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.payRate', 'Pay Rate')} *</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.payRate || ''}
                onChange={(e) => update('payRate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
                  errors.payRate ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="0.00"
              />
            </div>
            <select
              value={data.payType || 'hourly'}
              onChange={(e) => update('payType', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="hourly">{t('onboarding.perHour', '/ hour')}</option>
              <option value="salary">{t('onboarding.perYear', '/ year')}</option>
            </select>
          </div>
          {errors.payRate && <p className="mt-1 text-xs text-red-600">{errors.payRate}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.reportingManager', 'Reporting Manager')}</label>
          <select
            value={data.managerId || ''}
            onChange={(e) => update('managerId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="">{t('onboarding.selectManager', 'Select manager (optional)...')}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3: Skills & Certifications
// ============================================================
function StepSkillsCertifications({ data, onChange, availableSkills }) {
  const { t } = useTranslation();
  const selectedSkills = data.skills || [];
  const certifications = data.certifications || [];

  const toggleSkill = (skill) => {
    const existing = selectedSkills.find((s) => s.id === skill.id);
    if (existing) {
      onChange({ ...data, skills: selectedSkills.filter((s) => s.id !== skill.id) });
    } else {
      onChange({ ...data, skills: [...selectedSkills, { id: skill.id, name: skill.name, proficiency: 'beginner' }] });
    }
  };

  const updateSkillProficiency = (skillId, proficiency) => {
    onChange({
      ...data,
      skills: selectedSkills.map((s) => (s.id === skillId ? { ...s, proficiency } : s)),
    });
  };

  const addCertification = () => {
    onChange({
      ...data,
      certifications: [...certifications, { name: '', expiryDate: '', issuer: '' }],
    });
  };

  const updateCert = (index, field, value) => {
    const updated = [...certifications];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, certifications: updated });
  };

  const removeCert = (index) => {
    onChange({ ...data, certifications: certifications.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('onboarding.skillsCertsTitle', 'Skills & Certifications')}</h3>
        <p className="text-sm text-slate-500">{t('onboarding.skillsCertsDesc', 'Select skills and add any certifications the employee holds.')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{t('onboarding.skills', 'Skills')}</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {availableSkills.map((skill) => {
            const isSelected = selectedSkills.some((s) => s.id === skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-momentum-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 inline mr-1" />}
                {skill.name}
              </button>
            );
          })}
          {availableSkills.length === 0 && (
            <p className="text-sm text-slate-400 italic">{t('onboarding.noSkillsDefined', 'No skills defined yet. Add skills in the Skills page first.')}</p>
          )}
        </div>

        {selectedSkills.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase">{t('onboarding.setProficiencyLevels', 'Set Proficiency Levels')}</p>
            {selectedSkills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">{skill.name}</span>
                <div className="flex gap-1">
                  {PROFICIENCY_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => updateSkillProficiency(skill.id, level)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        skill.proficiency === level
                          ? 'bg-momentum-500 text-white'
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {t(`onboarding.proficiency.${level}`, level.charAt(0).toUpperCase() + level.slice(1))}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">{t('onboarding.certifications', 'Certifications')}</label>
          <button
            type="button"
            onClick={addCertification}
            className="flex items-center gap-1 text-sm text-momentum-600 hover:text-momentum-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('onboarding.addCertification', 'Add Certification')}
          </button>
        </div>

        {certifications.length === 0 && (
          <p className="text-sm text-slate-400 italic">{t('onboarding.noCertificationsYet', 'No certifications added yet.')}</p>
        )}

        <div className="space-y-3">
          {certifications.map((cert, index) => (
            <div key={index} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={cert.name}
                  onChange={(e) => updateCert(index, 'name', e.target.value)}
                  placeholder={t('onboarding.certificationNamePlaceholder', 'Certification name')}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                />
                <input
                  type="text"
                  value={cert.issuer}
                  onChange={(e) => updateCert(index, 'issuer', e.target.value)}
                  placeholder={t('onboarding.issuingBodyPlaceholder', 'Issuing body')}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                />
                <input
                  type="date"
                  value={cert.expiryDate}
                  onChange={(e) => updateCert(index, 'expiryDate', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCert(index)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 4: Availability & Preferences
// ============================================================
function StepAvailability({ data, onChange }) {
  const { t } = useTranslation();
  const update = (field, value) => onChange({ ...data, [field]: value });
  const daysAvailable = data.daysAvailable || [];
  const preferredShifts = data.preferredShifts || [];

  const toggleDay = (day) => {
    if (daysAvailable.includes(day)) {
      update('daysAvailable', daysAvailable.filter((d) => d !== day));
    } else {
      update('daysAvailable', [...daysAvailable, day]);
    }
  };

  const toggleShift = (shift) => {
    if (preferredShifts.includes(shift)) {
      update('preferredShifts', preferredShifts.filter((s) => s !== shift));
    } else {
      update('preferredShifts', [...preferredShifts, shift]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('onboarding.availabilityTitle', 'Availability & Preferences')}</h3>
        <p className="text-sm text-slate-500">{t('onboarding.availabilityDesc', "Set the employee's availability and scheduling preferences.")}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{t('onboarding.daysAvailable', 'Days Available')}</label>
        <div className="flex flex-wrap gap-2">
          {DAYS_KEYS.map((dayKey) => (
            <button
              key={dayKey}
              type="button"
              onClick={() => toggleDay(dayKey)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                daysAvailable.includes(dayKey)
                  ? 'bg-momentum-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t(`common.days.${dayKey}Short`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{t('onboarding.preferredShiftTimes', 'Preferred Shift Times')}</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SHIFT_TIMES_KEYS.map((shiftKey) => (
            <button
              key={shiftKey}
              type="button"
              onClick={() => toggleShift(shiftKey)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                preferredShifts.includes(shiftKey)
                  ? 'bg-momentum-50 border-momentum-500 text-momentum-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {t(`common.shifts.${shiftKey}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xs">
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.maxHoursPerWeek', 'Max Hours Per Week')}</label>
        <input
          type="number"
          min="0"
          max="168"
          value={data.maxHoursPerWeek || ''}
          onChange={(e) => update('maxHoursPerWeek', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          placeholder={t('onboarding.maxHoursPlaceholder', 'e.g. 40')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.restrictionsNotes', 'Restrictions / Notes')}</label>
        <textarea
          value={data.notes || ''}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          placeholder={t('onboarding.notesPlaceholder', 'Any scheduling restrictions, preferences or notes...')}
        />
      </div>
    </div>
  );
}

// ============================================================
// STEP 5: Invitation
// ============================================================
function StepInvitation({ formData, inviteSettings, onChangeInviteSettings }) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{t('onboarding.reviewInviteTitle', 'Review & Send Invitation')}</h3>
        <p className="text-sm text-slate-500">{t('onboarding.reviewInviteDesc', 'Review the details and invite the employee to the Uplift app.')}</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{t('onboarding.summary', 'Summary')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-slate-500">{t('onboarding.summaryName', 'Name')}:</span>{' '}
            <span className="font-medium text-slate-900">{formData.firstName} {formData.lastName}</span>
          </div>
          <div>
            <span className="text-slate-500">{t('onboarding.summaryEmail', 'Email')}:</span>{' '}
            <span className="font-medium text-slate-900">{formData.email}</span>
          </div>
          {formData.phone && (
            <div>
              <span className="text-slate-500">{t('onboarding.summaryPhone', 'Phone')}:</span>{' '}
              <span className="font-medium text-slate-900">{formData.phone}</span>
            </div>
          )}
          <div>
            <span className="text-slate-500">{t('onboarding.summaryType', 'Type')}:</span>{' '}
            <span className="font-medium text-slate-900 capitalize">{formData.employmentType?.replace('-', ' ')}</span>
          </div>
          <div>
            <span className="text-slate-500">{t('onboarding.summaryStartDate', 'Start Date')}:</span>{' '}
            <span className="font-medium text-slate-900">{formData.startDate}</span>
          </div>
          <div>
            <span className="text-slate-500">{t('onboarding.summaryEmployeeId', 'Employee ID')}:</span>{' '}
            <span className="font-medium text-slate-900">{formData.employeeId || t('onboarding.autoGenerated', 'Auto-generated')}</span>
          </div>
          {formData.skills?.length > 0 && (
            <div className="md:col-span-2">
              <span className="text-slate-500">{t('onboarding.summarySkills', 'Skills')}:</span>{' '}
              <span className="font-medium text-slate-900">
                {formData.skills.map((s) => `${s.name} (${s.proficiency})`).join(', ')}
              </span>
            </div>
          )}
          {formData.daysAvailable?.length > 0 && (
            <div className="md:col-span-2">
              <span className="text-slate-500">{t('onboarding.summaryAvailable', 'Available')}:</span>{' '}
              <span className="font-medium text-slate-900">
                {formData.daysAvailable.map((d) => d.slice(0, 3)).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            id="sendInvite"
            type="checkbox"
            checked={inviteSettings.sendEmail}
            onChange={(e) => onChangeInviteSettings({ ...inviteSettings, sendEmail: e.target.checked })}
            className="w-4 h-4 text-momentum-500 border-slate-300 rounded focus:ring-momentum-500"
          />
          <label htmlFor="sendInvite" className="text-sm text-slate-700">
            <span className="font-medium">{t('onboarding.sendInvitationEmail', 'Send invitation email')}</span>
            <span className="block text-slate-500">{t('onboarding.sendInvitationEmailDesc', 'The employee will receive an email to download the Uplift app and set up their account.')}</span>
          </label>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="setPassword"
            type="checkbox"
            checked={inviteSettings.setPassword}
            onChange={(e) => onChangeInviteSettings({ ...inviteSettings, setPassword: e.target.checked })}
            className="w-4 h-4 text-momentum-500 border-slate-300 rounded focus:ring-momentum-500 mt-0.5"
          />
          <div className="flex-1">
            <label htmlFor="setPassword" className="text-sm text-slate-700">
              <span className="font-medium">{t('onboarding.setTempPassword', 'Set temporary password')}</span>
              <span className="block text-slate-500">{t('onboarding.setTempPasswordDesc', 'Set a temporary password the employee can use to log in initially.')}</span>
            </label>
            {inviteSettings.setPassword && (
              <div className="mt-2 relative max-w-xs">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={inviteSettings.temporaryPassword || ''}
                  onChange={(e) => onChangeInviteSettings({ ...inviteSettings, temporaryPassword: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  placeholder={t('onboarding.tempPasswordPlaceholder', 'Temporary password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUCCESS STATE
// ============================================================
function SuccessState({ formData, onViewEmployee, onOnboardAnother }) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('onboarding.successTitle', 'Employee Onboarded Successfully!')}</h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        <span className="font-medium text-slate-700">{formData.firstName} {formData.lastName}</span> {t('onboarding.successDesc', 'has been added to the system and an invitation has been sent to')} <span className="font-medium text-slate-700">{formData.email}</span>.
      </p>

      <div className="bg-slate-50 rounded-xl p-6 max-w-sm mx-auto mb-8 text-left space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">{t('onboarding.summaryEmployeeId', 'Employee ID')}</span>
          <span className="font-medium text-slate-900">{formData.employeeId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">{t('onboarding.summaryStartDate', 'Start Date')}</span>
          <span className="font-medium text-slate-900">{formData.startDate}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onViewEmployee}
          className="px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
        >
          {t('onboarding.viewEmployees', 'View Employees')}
        </button>
        <button
          onClick={onOnboardAnother}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          {t('onboarding.onboardAnother', 'Onboard Another')}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ADD EMPLOYEE WIZARD (wraps the original Onboarding wizard)
// ============================================================
function AddEmployeeWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [refDataLoading, setRefDataLoading] = useState(true);

  const [inviteSettings, setInviteSettings] = useState({
    sendEmail: true,
    setPassword: false,
    temporaryPassword: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      setRefDataLoading(true);
      try {
        const [deptRes, roleRes, locRes, skillRes, empRes] = await Promise.allSettled([
          departmentsApi.list(),
          rolesApi.list(),
          locationsApi.list(),
          skillsApi.list(),
          employeesApi.list(),
        ]);
        if (deptRes.status === 'fulfilled') {
          const d = deptRes.value?.departments || deptRes.value || [];
          if (d.length) setDepartments(d);
        }
        if (roleRes.status === 'fulfilled') {
          const r = roleRes.value?.roles || roleRes.value || [];
          if (r.length) setRoles(r);
        }
        if (locRes.status === 'fulfilled') {
          const l = locRes.value?.locations || locRes.value || [];
          if (l.length) setLocations(l);
        }
        if (skillRes.status === 'fulfilled') {
          const s = skillRes.value?.skills || skillRes.value || [];
          if (s.length) setAvailableSkills(s);
        }
        if (empRes.status === 'fulfilled') {
          const e = empRes.value?.employees || empRes.value?.data || empRes.value || [];
          if (e.length) setEmployees(e);
        }
      } catch {
        // Reference data fetch failed
      } finally {
        setRefDataLoading(false);
      }
    };
    fetchData();
  }, []);

  const validateStep = useCallback((step) => {
    const errs = {};
    if (step === 1) {
      if (!formData.firstName?.trim()) errs.firstName = t('onboarding.errors.firstNameRequired', 'First name is required');
      if (!formData.lastName?.trim()) errs.lastName = t('onboarding.errors.lastNameRequired', 'Last name is required');
      if (!formData.email?.trim()) errs.email = t('onboarding.errors.emailRequired', 'Email is required');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = t('onboarding.errors.invalidEmail', 'Invalid email address');
      if (!formData.employmentType) errs.employmentType = t('onboarding.errors.employmentTypeRequired', 'Employment type is required');
      if (!formData.startDate) errs.startDate = t('onboarding.errors.startDateRequired', 'Start date is required');
    }
    if (step === 2) {
      if (!formData.department) errs.department = t('onboarding.errors.departmentRequired', 'Department is required');
      if (!formData.role) errs.role = t('onboarding.errors.roleRequired', 'Role is required');
      if (!formData.location) errs.location = t('onboarding.errors.locationRequired', 'Location is required');
      if (!formData.payRate || parseFloat(formData.payRate) <= 0) errs.payRate = t('onboarding.errors.payRateRequired', 'Valid pay rate is required');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData, t]);

  const goNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, 5));
      setGlobalError('');
    }
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
    setErrors({});
    setGlobalError('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setGlobalError('');
    const employeeId = formData.employeeId || generateEmployeeId();
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone || null,
      employment_type: formData.employmentType,
      start_date: formData.startDate,
      employee_id: employeeId,
      department_id: formData.department,
      primary_role_id: formData.role,
      location_id: formData.location,
      pay_rate: parseFloat(formData.payRate),
      pay_type: formData.payType || 'hourly',
      manager_id: formData.managerId || null,
      skills: (formData.skills || []).map(s => ({ skill_id: s.id, level: s.proficiency === 'advanced' ? 3 : s.proficiency === 'intermediate' ? 2 : 1 })),
      certifications: (formData.certifications || []).filter((c) => c.name),
      availability: {
        days: formData.daysAvailable || [],
        preferred_shifts: formData.preferredShifts || [],
        max_hours_per_week: formData.maxHoursPerWeek ? parseInt(formData.maxHoursPerWeek) : null,
        notes: formData.notes || '',
      },
      status: 'active',
    };

    try {
      await employeesApi.create(payload);
      if (inviteSettings.sendEmail) {
        try {
          const invitePayload = {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: 'worker',
          };
          if (inviteSettings.setPassword && inviteSettings.temporaryPassword) {
            invitePayload.temporaryPassword = inviteSettings.temporaryPassword;
          }
          await authApi.inviteUser(invitePayload);
        } catch {
          toast.warning(t('onboarding.inviteEmailFailed', 'Employee created but invitation email failed to send. You can resend from the Employees page.'));
        }
      }
      setFormData({ ...formData, employeeId });
      setCompleted(true);
    } catch (err) {
      setGlobalError(err.message || t('onboarding.createFailed', 'Failed to create employee. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setFormData({});
    setErrors({});
    setGlobalError('');
    setCurrentStep(1);
    setCompleted(false);
    setInviteSettings({ sendEmail: true, setPassword: false, temporaryPassword: '' });
  };

  if (completed) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <SuccessState
          formData={formData}
          onViewEmployee={() => navigate('/employees')}
          onOnboardAnother={resetWizard}
        />
      </div>
    );
  }

  if (refDataLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-momentum-500 mx-auto mb-3" />
        <p className="text-sm text-slate-500">{t('onboarding.loadingData', 'Loading organisation data...')}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-slate-500 mb-4 text-sm">
        {t('onboarding.pageDesc', 'Add a new employee and invite them to the Uplift app.')}
        {' '}<Link to="/bulk-import" className="text-momentum-600 hover:text-momentum-700 text-sm font-medium">{t('onboarding.bulkImportLink', 'Need to add many employees? Use Bulk Import')}</Link>
      </p>

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
                      {t(step.labelKey)}
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
          {currentStep === 1 && <StepEmployeeDetails data={formData} onChange={setFormData} errors={errors} employees={employees} />}
          {currentStep === 2 && (
            <StepRoleDepartment
              data={formData} onChange={setFormData} errors={errors}
              departments={departments} roles={roles} locations={locations} employees={employees}
            />
          )}
          {currentStep === 3 && <StepSkillsCertifications data={formData} onChange={setFormData} availableSkills={availableSkills} />}
          {currentStep === 4 && <StepAvailability data={formData} onChange={setFormData} />}
          {currentStep === 5 && <StepInvitation formData={formData} inviteSettings={inviteSettings} onChangeInviteSettings={setInviteSettings} />}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.back', 'Back')}
          </button>

          <span className="text-sm text-slate-400">{t('onboarding.stepOf', 'Step {{current}} of {{total}}', { current: currentStep, total: STEPS.length })}</span>

          {currentStep < 5 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-5 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
            >
              {t('common.next', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{t('onboarding.creating', 'Creating...')}</>
              ) : (
                <><UserPlus className="w-4 h-4" />{t('onboarding.createEmployee', 'Create Employee')}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 1: ACTIVE ONBOARDINGS
// ============================================================
function ActiveOnboardingsTab() {
  const { t } = useTranslation();
  const [expandedRow, setExpandedRow] = useState(null);

  const getInitials = (name) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const getStatusBadge = (status) => {
    const configs = {
      on_track: { label: t('onboarding.status.onTrack', 'On Track'), className: 'bg-green-100 text-green-700' },
      at_risk: { label: t('onboarding.status.atRisk', 'At Risk'), className: 'bg-amber-100 text-amber-700' },
      overdue: { label: t('onboarding.status.overdue', 'Overdue'), className: 'bg-red-100 text-red-700' },
    };
    const config = configs[status] || configs.on_track;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {t('onboarding.configs.' + config.key, config.label)}
      </span>
    );
  };

  const getAssigneeBadge = (assignee) => {
    const colors = {
      IT: 'bg-blue-100 text-blue-700',
      HR: 'bg-purple-100 text-purple-700',
      Manager: 'bg-amber-100 text-amber-700',
      Buddy: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[assignee] || 'bg-slate-100 text-slate-700'}`}>
        {assignee}
      </span>
    );
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Empty state check
  if (ACTIVE_ONBOARDINGS.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {t('onboarding.noActiveOnboardings', 'No active onboardings')}
          </h3>
          <p className="text-slate-500 max-w-md mb-6">
            {t('onboarding.noActiveOnboardingsDesc', 'When you add new employees, their onboarding progress will appear here. Start by adding your first team member.')}
          </p>
          <Link
            to="/onboarding?tab=add"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <UserPlus className="h-5 w-5" />
            {t('onboarding.addFirstEmployee', 'Add First Employee')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">{t('onboarding.activeOnboardingsTitle', 'Active Onboardings')}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t('onboarding.activeOnboardingsDesc', 'Track the progress of employees currently being onboarded')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">{t('onboarding.columnName', 'Name')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('onboarding.columnRole', 'Role')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('onboarding.columnDepartment', 'Department')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('onboarding.columnLocation', 'Location')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('onboarding.columnStartDate', 'Start Date')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('onboarding.columnProgress', 'Progress')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('onboarding.columnStatus', 'Status')}</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('onboarding.columnBuddy', 'Buddy')}</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ACTIVE_ONBOARDINGS.map((emp) => {
              const isExpanded = expandedRow === emp.id;
              const progressPct = Math.round((emp.tasksCompleted / emp.tasksTotal) * 100);
              return (
                <React.Fragment key={emp.id}>
                  <tr
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => toggleRow(emp.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-momentum-100 text-momentum-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {getInitials(emp.name)}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{emp.role}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{emp.department}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{emp.location}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{emp.startDate}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              progressPct === 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-momentum-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{emp.tasksCompleted}/{emp.tasksTotal}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(emp.status)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{emp.buddy}</td>
                    <td className="px-4 py-4">
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>

                  {isExpanded && emp.tasks.length > 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {emp.tasks.map((taskGroup, gi) => (
                            <div key={gi} className="bg-white rounded-lg border border-slate-200 p-4">
                              <h4 className="text-sm font-semibold text-slate-900 mb-3">{taskGroup.category}</h4>
                              <div className="space-y-2">
                                {taskGroup.items.map((task, ti) => (
                                  <div key={ti} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                        task.done ? 'bg-green-500 border-green-500' : 'border-slate-300'
                                      }`}>
                                        {task.done && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className={`text-sm truncate ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {task.nameKey ? t(task.nameKey, task.name) : task.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {getAssigneeBadge(task.assignee)}
                                      <span className="text-xs text-slate-400">{task.due}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}

                  {isExpanded && emp.tasks.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-6 bg-slate-50 text-center">
                        <p className="text-sm text-slate-400 italic">{t('onboarding.noTaskDetails', 'Detailed task breakdown not available for this employee.')}</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// TAB 2: TEMPLATES
// ============================================================
function TemplatesTab() {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', duration: '' });

  const handleCreateTemplate = () => {
    // Demo only - would save to backend
    setShowCreateModal(false);
    setNewTemplate({ name: '', description: '', duration: '' });
  };

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('onboarding.templatesTitle', 'Onboarding Templates')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('onboarding.templatesDesc', 'Reusable templates for different onboarding workflows')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('onboarding.createTemplate', 'Create Template')}
        </button>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${
              expandedTemplate === template.id ? 'border-momentum-300 ring-1 ring-momentum-200' : 'border-slate-200'
            }`}
            onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">{template.nameKey ? t(template.nameKey, template.name) : template.name}</h3>
                {template.isDefault && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-momentum-100 text-momentum-700">
                    {t('onboarding.default', 'Default')}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-4">{template.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  <span>{t('onboarding.taskCount', '{{count}} tasks', { count: template.taskCount })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{template.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 col-span-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{t('onboarding.lastUpdated', 'Updated {{date}}', { date: template.lastUpdated })}</span>
                </div>
              </div>
            </div>

            {expandedTemplate === template.id && TEMPLATE_TASKS[template.id] && (
              <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 rounded-b-xl">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('onboarding.templateTasks', 'Template Tasks')}</h4>
                <div className="space-y-3">
                  {TEMPLATE_TASKS[template.id].map((group, gi) => (
                    <div key={gi}>
                      <p className="text-xs font-medium text-slate-700 mb-1.5">{t('onboarding.taskCategories.' + group.category.replace(/ /g, ''), group.category)}</p>
                      <div className="space-y-1">
                        {group.items.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-3.5 h-3.5 rounded border border-slate-300 flex-shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{t('onboarding.createTemplateTitle', 'Create Onboarding Template')}</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.templateName', 'Template Name')} *</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  placeholder={t('onboarding.templateNamePlaceholder', 'e.g. Graduate Programme Onboarding')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.templateDescription', 'Description')}</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  placeholder={t('onboarding.templateDescriptionPlaceholder', 'Describe the purpose of this template...')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.templateDuration', 'Duration')} *</label>
                <input
                  type="text"
                  value={newTemplate.duration}
                  onChange={(e) => setNewTemplate({ ...newTemplate, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  placeholder={t('onboarding.templateDurationPlaceholder', 'e.g. 30 days')}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name.trim() || !newTemplate.duration.trim()}
                className="px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('onboarding.createTemplateBtn', 'Create Template')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 4: DASHBOARD
// ============================================================
function DashboardTab() {
  const { t } = useTranslation();

  const kpis = [
    { label: t('onboarding.kpi.activeOnboardings', 'Active Onboardings'), value: '6', icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: t('onboarding.kpi.avgCompletionTime', 'Avg Completion Time'), value: t('onboarding.kpi.days', '18 days'), icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: t('onboarding.kpi.completionRate', 'Completion Rate'), value: '92%', icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { label: t('onboarding.kpi.overdueTasks', 'Overdue Tasks'), value: '3', icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];

  const maxDeptCount = Math.max(...DEPARTMENT_CHART.map((d) => d.count));
  const maxTrendRate = 100;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{t('onboarding.kpis.' + kpi.key, kpi.label)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Onboardings by Department */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('onboarding.dashboard.byDepartment', 'Onboardings by Department')}</h3>
          <div className="space-y-3">
            {DEPARTMENT_CHART.map((dept, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-32 flex-shrink-0 truncate">{dept.department}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-6 relative">
                  <div
                    className="bg-momentum-500 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${(dept.count / maxDeptCount) * 100}%`, minWidth: '2rem' }}
                  >
                    <span className="text-xs font-medium text-white">{dept.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completion Rate Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('onboarding.dashboard.completionTrend', 'Completion Rate Trend')}</h3>
          <div className="flex items-end gap-3 h-48">
            {COMPLETION_TREND.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-slate-600">{item.rate}%</span>
                <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '160px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-momentum-500 rounded-t-lg transition-all"
                    style={{ height: `${(item.rate / maxTrendRate) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue Tasks */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">{t('onboarding.dashboard.overdueTasks', 'Overdue Tasks')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t('onboarding.dashboard.overdueTasksDesc', 'Tasks that have passed their due date')}</p>
        </div>
        <div className="divide-y divide-slate-200">
          {OVERDUE_TASKS.map((task, idx) => (
            <div key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{task.task}</p>
                  <p className="text-xs text-slate-500">{task.employee}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{task.assignee}</span>
                <span className="text-xs text-red-600 font-medium">{t('onboarding.dashboard.dueOn', 'Due {{date}}', { date: task.due })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN ONBOARDING COMPONENT
// ============================================================
export default function Onboarding() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('active');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('onboarding.pageTitle', 'Onboarding')}</h1>
        <p className="text-slate-500 mt-1">{t('onboarding.pageSubtitle', 'Manage new hire onboarding workflows, templates, and analytics')}</p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl">
        <nav className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-momentum-500 text-momentum-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'active' && <ActiveOnboardingsTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'add' && <AddEmployeeWizard />}
      {activeTab === 'dashboard' && <DashboardTab />}
    </div>
  );
}
