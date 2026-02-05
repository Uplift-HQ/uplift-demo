// ============================================================
// COMPANY DIRECTORY PAGE
// Route: /directory -- Visible to ALL roles
// Grid, List, and Org Chart views with search, filters, detail modal
// 34 employees across 5 locations + Corporate HQ
// ============================================================
import { useState, useMemo, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  Search,
  LayoutGrid,
  List,
  GitBranch,
  MapPin,
  Mail,
  Phone,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  X,
  Users,
  Calendar,
  Tag,
  Briefcase,
  ArrowUpDown,
  Circle,
  User,
  Clock,
} from 'lucide-react';

// ============================================================
// DEMO DATA -- 34 employees, 5 locations + Corporate HQ
// ============================================================
const EMPLOYEES = [
  // --- Corporate HQ ---
  { id: 1, firstName: 'Victoria', lastName: 'Sterling', title: 'CEO / Group Director', department: 'Executive', location: 'Corporate HQ', email: 'victoria.sterling@grandmetropolitan.com', phone: '+44 20 7946 0001', managerId: null, status: 'active', startDate: '2015-03-01', employmentType: 'full-time', skills: ['Strategic Leadership', 'Hospitality Management', 'Board Relations', 'P&L Oversight'] },
  { id: 2, firstName: 'Richard', lastName: 'Thompson', title: 'CFO', department: 'Finance', location: 'Corporate HQ', email: 'richard.thompson@grandmetropolitan.com', phone: '+44 20 7946 0002', managerId: 1, status: 'active', startDate: '2016-09-15', employmentType: 'full-time', skills: ['Financial Planning', 'Audit', 'Compliance', 'Budgeting'] },

  // --- London Mayfair ---
  { id: 3, firstName: 'Sarah', lastName: 'Chen', title: 'HR Administrator', department: 'Administration', location: 'London Mayfair', email: 'sarah.chen@grandmetropolitan.com', phone: '+44 20 7946 0100', managerId: 1, status: 'active', startDate: '2018-01-10', employmentType: 'full-time', skills: ['Recruitment', 'Employee Relations', 'HRIS', 'Payroll'] },
  { id: 4, firstName: 'James', lastName: 'Williams', title: 'F&B Manager', department: 'Food & Beverage', location: 'London Mayfair', email: 'james.williams@grandmetropolitan.com', phone: '+44 20 7946 0101', managerId: 1, status: 'active', startDate: '2017-06-20', employmentType: 'full-time', skills: ['Restaurant Operations', 'Menu Planning', 'Cost Control', 'Team Leadership'] },
  { id: 5, firstName: 'Maria', lastName: 'Santos', title: 'Front Desk Associate', department: 'Front Office', location: 'London Mayfair', email: 'maria.santos@grandmetropolitan.com', phone: '+44 20 7946 0102', managerId: 4, status: 'active', startDate: '2021-03-15', employmentType: 'full-time', skills: ['Guest Services', 'PMS Systems', 'Check-in/Check-out', 'Multilingual'] },
  { id: 6, firstName: 'Oliver', lastName: 'Barnes', title: 'Head Concierge', department: 'Front Office', location: 'London Mayfair', email: 'oliver.barnes@grandmetropolitan.com', phone: '+44 20 7946 0103', managerId: 4, status: 'active', startDate: '2019-08-01', employmentType: 'full-time', skills: ['Concierge Services', 'Local Knowledge', 'VIP Handling', 'Reservations'] },
  { id: 7, firstName: 'Emily', lastName: 'Watson', title: 'Spa Director', department: 'Spa & Wellness', location: 'London Mayfair', email: 'emily.watson@grandmetropolitan.com', phone: '+44 20 7946 0104', managerId: 1, status: 'on_leave', startDate: '2019-11-01', employmentType: 'full-time', skills: ['Spa Management', 'Wellness Programs', 'Product Selection', 'Staff Training'] },
  { id: 8, firstName: 'Tom', lastName: 'Hughes', title: 'Night Auditor', department: 'Front Office', location: 'London Mayfair', email: 'tom.hughes@grandmetropolitan.com', phone: '+44 20 7946 0105', managerId: 4, status: 'active', startDate: '2022-01-10', employmentType: 'full-time', skills: ['Night Audit', 'Accounting', 'Security Procedures', 'PMS'] },
  { id: 9, firstName: 'Priya', lastName: 'Sharma', title: 'Revenue Analyst', department: 'Finance', location: 'London Mayfair', email: 'priya.sharma@grandmetropolitan.com', phone: '+44 20 7946 0106', managerId: 3, status: 'active', startDate: '2022-06-01', employmentType: 'full-time', skills: ['Revenue Management', 'Data Analysis', 'Forecasting', 'Excel'] },
  { id: 10, firstName: 'David', lastName: 'Mitchell', title: 'IT Systems Admin', department: 'Information Technology', location: 'London Mayfair', email: 'david.mitchell@grandmetropolitan.com', phone: '+44 20 7946 0107', managerId: 3, status: 'active', startDate: '2020-09-15', employmentType: 'full-time', skills: ['Network Admin', 'PMS Support', 'Cybersecurity', 'Cloud Infrastructure'] },

  // --- Paris Champs-Elysees ---
  { id: 11, firstName: 'Isabelle', lastName: 'Laurent', title: 'General Manager', department: 'Management', location: 'Paris Champs-Elysees', email: 'isabelle.laurent@grandmetropolitan.com', phone: '+33 1 42 68 0001', managerId: 1, status: 'active', startDate: '2016-04-01', employmentType: 'full-time', skills: ['Hotel Management', 'French Hospitality', 'Revenue Strategy', 'Staff Development'] },
  { id: 12, firstName: 'Pierre', lastName: 'Dubois', title: 'Head Chef', department: 'Food & Beverage', location: 'Paris Champs-Elysees', email: 'pierre.dubois@grandmetropolitan.com', phone: '+33 1 42 68 0002', managerId: 11, status: 'active', startDate: '2017-09-01', employmentType: 'full-time', skills: ['French Cuisine', 'Menu Development', 'Kitchen Management', 'Food Safety'] },
  { id: 13, firstName: 'Claire', lastName: 'Dupont', title: 'Housekeeping Supervisor', department: 'Housekeeping', location: 'Paris Champs-Elysees', email: 'claire.dupont@grandmetropolitan.com', phone: '+33 1 42 68 0003', managerId: 11, status: 'active', startDate: '2020-02-15', employmentType: 'full-time', skills: ['Housekeeping Standards', 'Inventory Management', 'Staff Scheduling', 'Quality Control'] },
  { id: 14, firstName: 'Sophie', lastName: 'Martin', title: 'Front Office Manager', department: 'Front Office', location: 'Paris Champs-Elysees', email: 'sophie.martin@grandmetropolitan.com', phone: '+33 1 42 68 0004', managerId: 11, status: 'active', startDate: '2019-05-10', employmentType: 'full-time', skills: ['Front Desk Operations', 'Guest Relations', 'PMS', 'Upselling'] },
  { id: 15, firstName: 'Jean-Pierre', lastName: 'Moreau', title: 'Sommelier', department: 'Food & Beverage', location: 'Paris Champs-Elysees', email: 'jean-pierre.moreau@grandmetropolitan.com', phone: '+33 1 42 68 0005', managerId: 12, status: 'active', startDate: '2021-07-01', employmentType: 'full-time', skills: ['Wine Selection', 'Tasting Notes', 'Cellar Management', 'Pairing'] },
  { id: 16, firstName: 'Camille', lastName: 'Rousseau', title: 'L&D Coordinator', department: 'Human Resources', location: 'Paris Champs-Elysees', email: 'camille.rousseau@grandmetropolitan.com', phone: '+33 1 42 68 0006', managerId: 11, status: 'active', startDate: '2022-03-01', employmentType: 'full-time', skills: ['Training Design', 'Onboarding', 'E-Learning', 'Compliance Training'] },

  // --- Dubai Marina ---
  { id: 17, firstName: 'Khalid', lastName: 'Al-Rashid', title: 'General Manager', department: 'Management', location: 'Dubai Marina', email: 'khalid.al-rashid@grandmetropolitan.com', phone: '+971 4 399 0001', managerId: 1, status: 'active', startDate: '2017-01-15', employmentType: 'full-time', skills: ['Hotel Operations', 'Gulf Hospitality', 'Revenue Growth', 'VIP Management'] },
  { id: 18, firstName: 'Ahmed', lastName: 'Hassan', title: 'Executive Chef', department: 'Food & Beverage', location: 'Dubai Marina', email: 'ahmed.hassan@grandmetropolitan.com', phone: '+971 4 399 0002', managerId: 17, status: 'active', startDate: '2018-06-01', employmentType: 'full-time', skills: ['Middle Eastern Cuisine', 'International Menu', 'Kitchen Management', 'Halal Standards'] },
  { id: 19, firstName: 'Fatima', lastName: 'Al-Zahra', title: 'Guest Relations Manager', department: 'Front Office', location: 'Dubai Marina', email: 'fatima.al-zahra@grandmetropolitan.com', phone: '+971 4 399 0003', managerId: 17, status: 'active', startDate: '2019-09-01', employmentType: 'full-time', skills: ['Guest Experience', 'Complaint Resolution', 'VIP Services', 'Multilingual'] },
  { id: 20, firstName: 'Omar', lastName: 'Mahmoud', title: 'Porter', department: 'Front Office', location: 'Dubai Marina', email: 'omar.mahmoud@grandmetropolitan.com', phone: '+971 4 399 0004', managerId: 19, status: 'active', startDate: '2023-01-15', employmentType: 'full-time', skills: ['Luggage Handling', 'Guest Assistance', 'Local Knowledge', 'Driving'] },
  { id: 21, firstName: 'Layla', lastName: 'Ibrahim', title: 'Finance Director', department: 'Finance', location: 'Dubai Marina', email: 'layla.ibrahim@grandmetropolitan.com', phone: '+971 4 399 0005', managerId: 17, status: 'active', startDate: '2018-11-01', employmentType: 'full-time', skills: ['Financial Reporting', 'Tax Compliance', 'Budgeting', 'ERP Systems'] },
  { id: 22, firstName: 'Noor', lastName: 'Bakri', title: 'Marketing Manager', department: 'Marketing', location: 'Dubai Marina', email: 'noor.bakri@grandmetropolitan.com', phone: '+971 4 399 0006', managerId: 17, status: 'on_leave', startDate: '2020-04-01', employmentType: 'full-time', skills: ['Digital Marketing', 'Brand Strategy', 'Social Media', 'Campaign Management'] },

  // --- New York Central Park ---
  { id: 23, firstName: 'Michael', lastName: 'Torres', title: 'General Manager', department: 'Management', location: 'New York Central Park', email: 'michael.torres@grandmetropolitan.com', phone: '+1 212 555 0001', managerId: 1, status: 'active', startDate: '2016-11-01', employmentType: 'full-time', skills: ['Hotel Management', 'US Hospitality', 'P&L Management', 'Union Relations'] },
  { id: 24, firstName: 'Jessica', lastName: 'Thompson', title: 'Front Desk Manager', department: 'Front Office', location: 'New York Central Park', email: 'jessica.thompson@grandmetropolitan.com', phone: '+1 212 555 0002', managerId: 23, status: 'active', startDate: '2019-02-01', employmentType: 'full-time', skills: ['Front Desk Operations', 'Shift Management', 'PMS', 'Guest Recovery'] },
  { id: 25, firstName: 'Marcus', lastName: 'Johnson', title: 'Bartender', department: 'Food & Beverage', location: 'New York Central Park', email: 'marcus.johnson@grandmetropolitan.com', phone: '+1 212 555 0003', managerId: 24, status: 'active', startDate: '2021-09-15', employmentType: 'full-time', skills: ['Mixology', 'Customer Service', 'Inventory', 'POS Systems'] },
  { id: 26, firstName: 'Ashley', lastName: 'Williams', title: 'HR Business Partner', department: 'Human Resources', location: 'New York Central Park', email: 'ashley.williams@grandmetropolitan.com', phone: '+1 212 555 0004', managerId: 23, status: 'active', startDate: '2020-06-01', employmentType: 'full-time', skills: ['Employee Relations', 'Performance Management', 'Recruitment', 'Labour Law'] },
  { id: 27, firstName: 'Carlos', lastName: 'Rodriguez', title: 'Head Housekeeper', department: 'Housekeeping', location: 'New York Central Park', email: 'carlos.rodriguez@grandmetropolitan.com', phone: '+1 212 555 0005', managerId: 23, status: 'active', startDate: '2018-08-01', employmentType: 'full-time', skills: ['Housekeeping Operations', 'Quality Assurance', 'Laundry', 'Sustainability'] },
  { id: 28, firstName: 'Samantha', lastName: 'Lee', title: 'Events Coordinator', department: 'Events', location: 'New York Central Park', email: 'samantha.lee@grandmetropolitan.com', phone: '+1 212 555 0006', managerId: 23, status: 'active', startDate: '2022-02-01', employmentType: 'contract', skills: ['Event Planning', 'Vendor Management', 'Catering Coordination', 'AV Setup'] },

  // --- Tokyo Ginza ---
  { id: 29, firstName: 'Haruki', lastName: 'Nakamura', title: 'General Manager', department: 'Management', location: 'Tokyo Ginza', email: 'haruki.nakamura@grandmetropolitan.com', phone: '+81 3 6274 0001', managerId: 1, status: 'active', startDate: '2017-04-01', employmentType: 'full-time', skills: ['Hotel Operations', 'Japanese Hospitality', 'Omotenashi', 'Revenue Strategy'] },
  { id: 30, firstName: 'Yuki', lastName: 'Tanaka', title: 'Restaurant Manager', department: 'Food & Beverage', location: 'Tokyo Ginza', email: 'yuki.tanaka@grandmetropolitan.com', phone: '+81 3 6274 0002', managerId: 29, status: 'active', startDate: '2019-06-01', employmentType: 'full-time', skills: ['Restaurant Operations', 'Japanese Cuisine', 'Staff Management', 'Customer Experience'] },
  { id: 31, firstName: 'Aiko', lastName: 'Yamamoto', title: 'Concierge', department: 'Front Office', location: 'Tokyo Ginza', email: 'aiko.yamamoto@grandmetropolitan.com', phone: '+81 3 6274 0003', managerId: 30, status: 'active', startDate: '2021-04-01', employmentType: 'full-time', skills: ['Concierge Services', 'Tokyo Guide', 'Multilingual', 'Reservations'] },
  { id: 32, firstName: 'Wei', lastName: 'Zhang', title: 'Sous Chef', department: 'Food & Beverage', location: 'Tokyo Ginza', email: 'wei.zhang@grandmetropolitan.com', phone: '+81 3 6274 0004', managerId: 30, status: 'active', startDate: '2020-10-01', employmentType: 'full-time', skills: ['Asian Fusion', 'Sushi Preparation', 'Kitchen Operations', 'Food Safety'] },
  { id: 33, firstName: 'Kenji', lastName: 'Sato', title: 'Front Desk Associate', department: 'Front Office', location: 'Tokyo Ginza', email: 'kenji.sato@grandmetropolitan.com', phone: '+81 3 6274 0005', managerId: 29, status: 'on_leave', startDate: '2022-08-01', employmentType: 'part-time', skills: ['Guest Services', 'PMS', 'Multilingual', 'Check-in/Check-out'] },
  { id: 34, firstName: 'Mei', lastName: 'Lin', title: 'Spa Therapist', department: 'Spa & Wellness', location: 'Tokyo Ginza', email: 'mei.lin@grandmetropolitan.com', phone: '+81 3 6274 0006', managerId: 29, status: 'active', startDate: '2023-03-01', employmentType: 'full-time', skills: ['Massage Therapy', 'Aromatherapy', 'Skincare', 'Japanese Wellness'] },
];

// ============================================================
// LOCATION METADATA -- country codes & colours (no emoji flags)
// ============================================================
const LOCATION_META = {
  'Corporate HQ':          { code: 'UK', colors: ['#012169', '#C8102E', '#FFFFFF'] },
  'London Mayfair':        { code: 'UK', colors: ['#012169', '#C8102E', '#FFFFFF'] },
  'Paris Champs-Elysees':  { code: 'FR', colors: ['#002395', '#FFFFFF', '#ED2939'] },
  'Dubai Marina':          { code: 'AE', colors: ['#00732F', '#FFFFFF', '#FF0000'] },
  'New York Central Park': { code: 'US', colors: ['#3C3B6E', '#FFFFFF', '#B22234'] },
  'Tokyo Ginza':           { code: 'JP', colors: ['#FFFFFF', '#BC002D', '#FFFFFF'] },
};

// ============================================================
// HELPER UTILITIES
// ============================================================

/** Build a lookup map: employee id -> employee object */
const EMPLOYEE_MAP = Object.fromEntries(EMPLOYEES.map(e => [e.id, e]));

/** Full display name */
function fullName(emp) {
  return `${emp.firstName} ${emp.lastName}`;
}

/** Initials from first + last */
function getInitials(emp) {
  return `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
}

/** Deterministic avatar colour based on employee id */
const AVATAR_PALETTE = [
  'bg-rose-600',    'bg-sky-600',    'bg-emerald-600', 'bg-violet-600',
  'bg-amber-600',   'bg-teal-600',   'bg-pink-600',    'bg-indigo-600',
  'bg-orange-600',  'bg-cyan-600',   'bg-fuchsia-600', 'bg-lime-600',
];
function avatarColor(id) {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length];
}

/** Tenure string from startDate */
function tenure(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 12) return `${totalMonths}mo`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}y ${m}mo` : `${y}y`;
}

/** Direct reports for a given employee */
function directReports(empId) {
  return EMPLOYEES.filter(e => e.managerId === empId);
}

/** All unique values for a field */
function uniqueValues(field) {
  return [...new Set(EMPLOYEES.map(e => e[field]))].sort();
}

// ============================================================
// SMALL SVG FLAG COMPONENT (no emojis)
// ============================================================
function LocationFlag({ location, className = '' }) {
  const meta = LOCATION_META[location];
  if (!meta) return null;
  const [c1, c2, c3] = meta.colors;
  return (
    <svg
      viewBox="0 0 18 12"
      className={`inline-block rounded-sm border border-slate-200 ${className}`}
      style={{ width: 18, height: 12 }}
      aria-label={meta.code}
    >
      <rect x="0" y="0" width="6" height="12" fill={c1} />
      <rect x="6" y="0" width="6" height="12" fill={c2} />
      <rect x="12" y="0" width="6" height="12" fill={c3} />
    </svg>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================
function StatusBadge({ status, t }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    on_leave: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const labels = {
    active: t('directory.statusActive', 'Active'),
    on_leave: t('directory.statusOnLeave', 'On Leave'),
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.active}`}>
      <Circle className="w-2 h-2 fill-current" />
      {labels[status] || status}
    </span>
  );
}

// ============================================================
// EMPLOYEE DETAIL MODAL
// ============================================================
function EmployeeDetailModal({ employee, onClose, onNavigate, t }) {
  if (!employee) return null;

  const manager = employee.managerId ? EMPLOYEE_MAP[employee.managerId] : null;
  const reports = directReports(employee.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
          aria-label={t('directory.close', 'Close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0 ${avatarColor(employee.id)}`}>
              {getInitials(employee)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900">{fullName(employee)}</h2>
              <p className="text-sm text-slate-600 mt-0.5">{employee.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={employee.status} t={t} />
                <span className="text-xs text-slate-400 capitalize">{employee.employmentType.replace('-', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Department & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('directory.department', 'Department')}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <Building2 className="w-4 h-4 text-slate-400" />
                {employee.department}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('directory.location', 'Location')}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <LocationFlag location={employee.location} className="mr-0.5" />
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {employee.location}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              {t('directory.contact', 'Contact')}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`mailto:${employee.email}`} className="text-momentum-600 hover:underline truncate">
                  {employee.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                {employee.phone}
              </div>
            </div>
          </div>

          {/* Manager */}
          {manager && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                {t('directory.reportsTo', 'Reports To')}
              </p>
              <button
                onClick={() => onNavigate(manager)}
                className="flex items-center gap-3 p-2.5 -ml-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(manager.id)}`}>
                  {getInitials(manager)}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-momentum-600 transition-colors">
                    {fullName(manager)}
                  </p>
                  <p className="text-xs text-slate-500">{manager.title}</p>
                </div>
              </button>
            </div>
          )}

          {/* Direct Reports */}
          {reports.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                {t('directory.directReports', 'Direct Reports')} ({reports.length})
              </p>
              <div className="space-y-1">
                {reports.map(r => (
                  <button
                    key={r.id}
                    onClick={() => onNavigate(r)}
                    className="flex items-center gap-3 p-2 -ml-2 rounded-lg hover:bg-slate-50 transition-colors w-full group"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${avatarColor(r.id)}`}>
                      {getInitials(r)}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm text-slate-700 group-hover:text-momentum-600 transition-colors truncate">
                        {fullName(r)}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{r.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {employee.skills && employee.skills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                {t('directory.skills', 'Skills')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {employee.skills.map(skill => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    <Tag className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Start Date & Tenure */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('directory.startDate', 'Start Date')}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                {new Date(employee.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('directory.tenure', 'Tenure')}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                {tenure(employee.startDate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ORG CHART NODE
// ============================================================
function OrgChartNode({ employee, depth, expandedNodes, toggleNode, onSelect, t }) {
  const reports = directReports(employee.id);
  const hasReports = reports.length > 0;
  const isExpanded = expandedNodes[employee.id];

  const depthColors = [
    'border-momentum-400 bg-gradient-to-br from-momentum-50 to-white',
    'border-sky-300 bg-sky-50/60',
    'border-violet-300 bg-violet-50/60',
    'border-emerald-300 bg-emerald-50/60',
    'border-amber-300 bg-amber-50/60',
  ];

  const borderClass = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <div className="flex flex-col">
      {/* Node card */}
      <div className="flex items-center gap-2">
        {/* Expand/collapse toggle */}
        {hasReports ? (
          <button
            onClick={() => toggleNode(employee.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            aria-label={isExpanded ? t('directory.collapse', 'Collapse') : t('directory.expand', 'Expand')}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <button
          onClick={() => onSelect(employee)}
          className={`flex items-center gap-3 px-4 py-2.5 border-2 rounded-xl transition-all hover:shadow-md cursor-pointer ${borderClass}`}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${avatarColor(employee.id)}`}>
            {getInitials(employee)}
          </div>
          <div className="text-left min-w-0">
            <p className="font-semibold text-slate-900 text-sm">{fullName(employee)}</p>
            <p className="text-xs text-slate-500 truncate">{employee.title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <LocationFlag location={employee.location} className="mr-0.5" />
              <span className="text-[10px] text-slate-400">{employee.location}</span>
            </div>
          </div>
          {hasReports && (
            <span className="ml-1 text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
              {reports.length}
            </span>
          )}
        </button>
      </div>

      {/* Children */}
      {hasReports && isExpanded && (
        <div className="ml-7 pl-5 border-l-2 border-slate-200 mt-1 space-y-1">
          {reports.map(r => (
            <OrgChartNode
              key={r.id}
              employee={r}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              onSelect={onSelect}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SORT HELPERS
// ============================================================
const SORT_OPTIONS = [
  { key: 'alpha', labelKey: 'directory.sortAlpha', fallback: 'Alphabetical' },
  { key: 'department', labelKey: 'directory.sortDepartment', fallback: 'Department' },
  { key: 'location', labelKey: 'directory.sortLocation', fallback: 'Location' },
];

function sortEmployees(list, sortKey) {
  const sorted = [...list];
  switch (sortKey) {
    case 'department':
      sorted.sort((a, b) => a.department.localeCompare(b.department) || a.lastName.localeCompare(b.lastName));
      break;
    case 'location':
      sorted.sort((a, b) => a.location.localeCompare(b.location) || a.lastName.localeCompare(b.lastName));
      break;
    case 'alpha':
    default:
      sorted.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
      break;
  }
  return sorted;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Directory() {
  const { t } = useTranslation();
  const { role } = useAuth();

  // --- State ---
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState('alpha');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // List view column sort
  const [listSortCol, setListSortCol] = useState('lastName');
  const [listSortDir, setListSortDir] = useState('asc');

  // Org chart expanded nodes -- default expand top 2 levels
  const [expandedNodes, setExpandedNodes] = useState(() => {
    const initial = {};
    EMPLOYEES.forEach(e => {
      // Expand CEO and direct reports of CEO (GMs etc.)
      if (!e.managerId || e.managerId === 1) {
        initial[e.id] = true;
      }
    });
    return initial;
  });

  // --- Derived Data ---
  const departments = useMemo(() => uniqueValues('department'), []);
  const locations = useMemo(() => uniqueValues('location'), []);

  const filteredEmployees = useMemo(() => {
    let list = EMPLOYEES.filter(emp => {
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;
      if (locationFilter !== 'all' && emp.location !== locationFilter) return false;
      if (employmentTypeFilter !== 'all' && emp.employmentType !== employmentTypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = fullName(emp).toLowerCase();
        const skills = (emp.skills || []).join(' ').toLowerCase();
        return (
          name.includes(q) ||
          emp.title.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q) ||
          skills.includes(q)
        );
      }
      return true;
    });
    return sortEmployees(list, sortKey);
  }, [searchQuery, departmentFilter, locationFilter, employmentTypeFilter, sortKey]);

  // List-view sorting (overrides default sort)
  const listSortedEmployees = useMemo(() => {
    const sorted = [...filteredEmployees];
    sorted.sort((a, b) => {
      let valA, valB;
      switch (listSortCol) {
        case 'firstName': valA = a.firstName; valB = b.firstName; break;
        case 'lastName': valA = a.lastName; valB = b.lastName; break;
        case 'title': valA = a.title; valB = b.title; break;
        case 'department': valA = a.department; valB = b.department; break;
        case 'location': valA = a.location; valB = b.location; break;
        case 'status': valA = a.status; valB = b.status; break;
        default: valA = a.lastName; valB = b.lastName;
      }
      const cmp = String(valA).localeCompare(String(valB));
      return listSortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredEmployees, listSortCol, listSortDir]);

  // --- Callbacks ---
  const toggleNode = useCallback((id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleListSort = useCallback((col) => {
    setListSortCol(prev => {
      if (prev === col) {
        setListSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return col;
      }
      setListSortDir('asc');
      return col;
    });
  }, []);

  const handleSelectEmployee = useCallback((emp) => {
    setSelectedEmployee(emp);
  }, []);

  const handleModalNavigate = useCallback((emp) => {
    setSelectedEmployee(emp);
  }, []);

  // --- Column header for list view ---
  const SortableHeader = ({ col, children }) => {
    const isActive = listSortCol === col;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 transition-colors"
        onClick={() => handleListSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {isActive ? (
            listSortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </span>
      </th>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* --- Header --- */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t('directory.title', 'Company Directory')}
        </h1>
        <p className="text-slate-600 mt-1">
          {t('directory.subtitle', 'Find and connect with colleagues across the organisation')}
        </p>
      </div>

      {/* --- Search --- */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder={t('directory.searchPlaceholder', 'Search by name, title, department, or skill...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 text-sm bg-white shadow-sm"
        />
      </div>

      {/* --- Controls Row --- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          {[
            { mode: 'grid', icon: LayoutGrid, labelKey: 'directory.grid', fallback: 'Grid' },
            { mode: 'list', icon: List, labelKey: 'directory.list', fallback: 'List' },
            { mode: 'org', icon: GitBranch, labelKey: 'directory.orgChart', fallback: 'Org Chart' },
          ].map(({ mode, icon: Icon, labelKey, fallback }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-white text-momentum-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t(labelKey, fallback)}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Department */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">{t('directory.allDepartments', 'All Departments')}</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Location */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">{t('directory.allLocations', 'All Locations')}</option>
              {locations.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Employment Type */}
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={employmentTypeFilter}
              onChange={(e) => setEmploymentTypeFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">{t('directory.allTypes', 'All Types')}</option>
              <option value="full-time">{t('directory.fullTime', 'Full-time')}</option>
              <option value="part-time">{t('directory.partTime', 'Part-time')}</option>
              <option value="contract">{t('directory.contract', 'Contract')}</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort (grid/list only) */}
          {viewMode !== 'org' && (
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 bg-white appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{t(opt.labelKey, opt.fallback)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* --- Results Count --- */}
      <p className="text-sm text-slate-500">
        {t('directory.showingResults', 'Showing {{count}} colleagues', { count: filteredEmployees.length })}
      </p>

      {/* ============================================================
          GRID VIEW
          ============================================================ */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredEmployees.map(emp => (
            <button
              key={emp.id}
              onClick={() => handleSelectEmployee(emp)}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-momentum-300 hover:-translate-y-0.5 transition-all text-left cursor-pointer"
            >
              {/* Avatar + Name */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mb-3 ${avatarColor(emp.id)}`}>
                  {getInitials(emp)}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{fullName(emp)}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{emp.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{emp.department}</p>
              </div>

              {/* Location */}
              <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
                <LocationFlag location={emp.location} />
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{emp.location}</span>
              </div>

              {/* Contact */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{emp.phone}</span>
                </div>
              </div>

              {/* Status badge */}
              <div className="flex justify-center mt-3">
                <StatusBadge status={emp.status} t={t} />
              </div>
            </button>
          ))}

          {/* Empty state */}
          {filteredEmployees.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">{t('directory.noResults', 'No colleagues found')}</p>
              <p className="text-sm mt-1">{t('directory.noResultsHint', 'Try adjusting your search or filters')}</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          LIST VIEW
          ============================================================ */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <SortableHeader col="lastName">
                    {t('directory.name', 'Name')}
                  </SortableHeader>
                  <SortableHeader col="title">
                    {t('directory.titleCol', 'Title')}
                  </SortableHeader>
                  <SortableHeader col="department">
                    {t('directory.department', 'Department')}
                  </SortableHeader>
                  <SortableHeader col="location">
                    {t('directory.location', 'Location')}
                  </SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('directory.email', 'Email')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('directory.phone', 'Phone')}
                  </th>
                  <SortableHeader col="status">
                    {t('directory.status', 'Status')}
                  </SortableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listSortedEmployees.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className={`cursor-pointer transition-colors hover:bg-momentum-50/40 ${
                      idx % 2 === 1 ? 'bg-slate-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(emp.id)}`}>
                          {getInitials(emp)}
                        </div>
                        <span className="font-medium text-slate-900 text-sm">{fullName(emp)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{emp.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{emp.department}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <LocationFlag location={emp.location} />
                        {emp.location}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[200px]">{emp.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{emp.phone}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={emp.status} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">{t('directory.noResults', 'No colleagues found')}</p>
              <p className="text-sm mt-1">{t('directory.noResultsHint', 'Try adjusting your search or filters')}</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          ORG CHART VIEW
          ============================================================ */}
      {viewMode === 'org' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2 mb-5 text-sm text-slate-500">
            <GitBranch className="w-4 h-4" />
            <span>{t('directory.orgChartHint', 'Click nodes to view details. Expand or collapse reporting lines.')}</span>
          </div>

          {/* Start from CEO (Victoria Sterling, id=1) */}
          {(() => {
            const ceo = EMPLOYEE_MAP[1];
            if (!ceo) return null;
            return (
              <OrgChartNode
                employee={ceo}
                depth={0}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                onSelect={handleSelectEmployee}
                t={t}
              />
            );
          })()}
        </div>
      )}

      {/* ============================================================
          EMPLOYEE DETAIL MODAL
          ============================================================ */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onNavigate={handleModalNavigate}
          t={t}
        />
      )}
    </div>
  );
}
