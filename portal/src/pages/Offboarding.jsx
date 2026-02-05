// ============================================================
// OFFBOARDING PAGE - Grand Metropolitan Hotel Group
// Employee offboarding, exit interviews, equipment tracking, analytics
// 5 locations: London Mayfair, Paris Champs-Elysees, Dubai Marina,
//              New York Central Park, Tokyo Ginza
// Fully internationalized - all strings use t() for translation
// Role-based: Admin (full), Manager (team exits + tasks), Worker (denied)
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  UserMinus, ClipboardList, FileText, BarChart3, Plus, X, Eye,
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronRight, ChevronDown,
  Calendar, Users, TrendingDown, Star, Lock, Laptop, Shield,
  Brain, DollarSign, MessageSquare, Edit2, Save,
  ArrowRight, Check, RefreshCw, Search, Filter, Download,
  Building2, Mail, Key, CreditCard, Smartphone, BadgeCheck,
  BookOpen, UserCheck, Package, MapPin, Briefcase, AlertCircle,
  ShieldAlert, ListChecks, CircleDot, ChevronUp,
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================

const LOCATIONS = [
  'London Mayfair',
  'Paris Champs-Elysees',
  'Dubai Marina',
  'New York Central Park',
  'Tokyo Ginza',
];

const DEPARTMENTS = [
  'Front of House',
  'Kitchen',
  'Housekeeping',
  'Bar',
  'Management',
];

const EXIT_REASONS = [
  { value: 'new_opportunity', color: 'bg-blue-100 text-blue-700' },
  { value: 'career_change', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'relocation', color: 'bg-teal-100 text-teal-700' },
  { value: 'compensation', color: 'bg-amber-100 text-amber-700' },
  { value: 'work_life_balance', color: 'bg-purple-100 text-purple-700' },
  { value: 'management_issues', color: 'bg-red-100 text-red-700' },
  { value: 'lack_of_growth', color: 'bg-orange-100 text-orange-700' },
  { value: 'company_culture', color: 'bg-rose-100 text-rose-700' },
  { value: 'personal_reasons', color: 'bg-slate-100 text-slate-700' },
  { value: 'other', color: 'bg-gray-100 text-gray-700' },
];

const REASON_COLOR_MAP = Object.fromEntries(EXIT_REASONS.map(r => [r.value, r.color]));

const STATUS_STYLES = {
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  not_started: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  scheduled: 'bg-blue-100 text-blue-700',
};

const EQUIPMENT_STATUS_STYLES = {
  returned: 'bg-green-100 text-green-700',
  outstanding: 'bg-amber-100 text-amber-700',
  lost: 'bg-red-100 text-red-700',
};

const TASK_CATEGORIES = [
  { key: 'access', icon: Lock, label: 'Access & Security' },
  { key: 'equipment', icon: Laptop, label: 'Equipment Return' },
  { key: 'documents', icon: FileText, label: 'Documents' },
  { key: 'knowledge', icon: Brain, label: 'Knowledge Transfer' },
  { key: 'pay', icon: DollarSign, label: 'Final Pay' },
];

// ============================================================
// EXIT INTERVIEW TEMPLATE (11 questions)
// ============================================================

const EXIT_INTERVIEW_QUESTIONS = [
  {
    id: 1,
    type: 'single_choice',
    question: 'What is your primary reason for leaving?',
    options: ['New opportunity', 'Career change', 'Relocation', 'Compensation', 'Work-life balance', 'Management issues', 'Lack of growth', 'Company culture', 'Personal reasons', 'Other'],
  },
  {
    id: 2,
    type: 'single_choice',
    question: 'How long have you been considering leaving?',
    options: ['Less than 1 month', '1-3 months', '3-6 months', 'Over 6 months'],
  },
  {
    id: 3,
    type: 'rating',
    question: 'How would you rate your relationship with your direct manager?',
    max: 5,
  },
  {
    id: 4,
    type: 'rating',
    question: 'Did you feel you had adequate opportunities for professional development?',
    max: 5,
  },
  {
    id: 5,
    type: 'rating',
    question: 'How would you rate the company culture?',
    max: 5,
  },
  {
    id: 6,
    type: 'rating',
    question: 'Were you satisfied with your compensation and benefits?',
    max: 5,
  },
  {
    id: 7,
    type: 'rating',
    question: 'Did you feel your work was recognized and valued?',
    max: 5,
  },
  {
    id: 8,
    type: 'free_text',
    question: 'What did you enjoy most about working here?',
  },
  {
    id: 9,
    type: 'free_text',
    question: 'What could the company improve?',
  },
  {
    id: 10,
    type: 'single_choice',
    question: 'Would you consider returning to the company in the future?',
    options: ['Yes', 'Maybe', 'No'],
  },
  {
    id: 11,
    type: 'nps',
    question: 'Would you recommend this company to a friend?',
    max: 10,
  },
];

// ============================================================
// TASK TEMPLATES (25 tasks across 5 categories)
// ============================================================

const buildTaskChecklist = (completedIds = []) => ({
  access: [
    { id: 'a1', label: 'Revoke system access', assignee: 'IT', due: 'Last Day', done: completedIds.includes('a1') },
    { id: 'a2', label: 'Deactivate email account', assignee: 'IT', due: 'Last Day +1', done: completedIds.includes('a2') },
    { id: 'a3', label: 'Collect staff ID badge and access cards', assignee: 'Security', due: 'Last Day', done: completedIds.includes('a3') },
    { id: 'a4', label: 'Remove from all group chats and distribution lists', assignee: 'IT', due: 'Last Day', done: completedIds.includes('a4') },
    { id: 'a5', label: 'Update org chart and internal directory', assignee: 'HR', due: 'Last Day +1', done: completedIds.includes('a5') },
  ],
  equipment: [
    { id: 'e1', label: 'Return laptop/computer', assignee: 'IT', due: 'Last Day', serial: '', done: completedIds.includes('e1') },
    { id: 'e2', label: 'Return mobile phone', assignee: 'IT', due: 'Last Day', serial: '', done: completedIds.includes('e2') },
    { id: 'e3', label: 'Return uniform and PPE', assignee: 'HR', due: 'Last Day', done: completedIds.includes('e3') },
    { id: 'e4', label: 'Return locker key', assignee: 'HR', due: 'Last Day', done: completedIds.includes('e4') },
    { id: 'e5', label: 'Return company credit card', assignee: 'Finance', due: 'Last Day -3', done: completedIds.includes('e5') },
  ],
  documents: [
    { id: 'd1', label: 'Generate final payslip', assignee: 'Finance', due: 'Last Day +5', done: completedIds.includes('d1') },
    { id: 'd2', label: 'Issue P45', assignee: 'Finance', due: 'Last Day +5', done: completedIds.includes('d2') },
    { id: 'd3', label: 'Prepare reference letter', assignee: 'HR', due: 'Last Day +3', done: completedIds.includes('d3') },
    { id: 'd4', label: 'Send NDA reminder and confidentiality agreement', assignee: 'Legal', due: 'Last Day -5', done: completedIds.includes('d4') },
    { id: 'd5', label: 'Archive employee file', assignee: 'HR', due: 'Last Day +7', done: completedIds.includes('d5') },
  ],
  knowledge: [
    { id: 'k1', label: 'Document current projects and handover notes', assignee: 'Employee', due: 'Last Day -7', done: completedIds.includes('k1') },
    { id: 'k2', label: 'Brief successor on key responsibilities', assignee: 'Employee', due: 'Last Day -5', done: completedIds.includes('k2') },
    { id: 'k3', label: 'Transfer client relationships', assignee: 'Manager', due: 'Last Day -5', done: completedIds.includes('k3') },
    { id: 'k4', label: 'Update process documentation', assignee: 'Employee', due: 'Last Day -3', done: completedIds.includes('k4') },
    { id: 'k5', label: 'Handover meeting with manager', assignee: 'Manager', due: 'Last Day -1', done: completedIds.includes('k5') },
  ],
  pay: [
    { id: 'p1', label: 'Calculate outstanding expenses', assignee: 'Finance', due: 'Last Day', done: completedIds.includes('p1') },
    { id: 'p2', label: 'Calculate holiday pay owed/deduction', assignee: 'Finance', due: 'Last Day +3', done: completedIds.includes('p2') },
    { id: 'p3', label: 'Process pension final contribution', assignee: 'Finance', due: 'Last Day +5', done: completedIds.includes('p3') },
    { id: 'p4', label: 'Issue final payslip with all adjustments', assignee: 'Finance', due: 'Last Day +5', done: completedIds.includes('p4') },
    { id: 'p5', label: 'Confirm bank details for final payment', assignee: 'HR', due: 'Last Day -3', done: completedIds.includes('p5') },
  ],
});

const countTasks = (tasks) => {
  const all = Object.values(tasks).flat();
  return { completed: all.filter(t => t.done).length, total: all.length };
};

// ============================================================
// DEMO DATA - 3 Active Offboardings
// ============================================================

const DEMO_OFFBOARDINGS = [
  {
    id: 1,
    employee: 'Marcus Johnson',
    role: 'Bartender',
    department: 'Bar',
    location: 'London Mayfair',
    lastWorkingDay: '2026-02-14',
    noticeDate: '2026-01-15',
    reason: 'new_opportunity',
    reasonDetail: 'New opportunity at competitor hotel',
    voluntary: true,
    rehireEligible: true,
    manager: 'James Fletcher',
    tenure: '1.8 years',
    regrettable: true,
    tasks: buildTaskChecklist(['a1', 'a3', 'a4', 'e1', 'e5', 'd4', 'k1', 'k2', 'k3', 'k4', 'k5', 'p1', 'p5', 'a2', 'e4']),
    exitInterview: {
      status: 'completed',
      date: '2026-02-05',
      interviewer: 'Sarah Mitchell (HR)',
      responses: {
        1: 'New opportunity',
        2: '3-6 months',
        3: 4,
        4: 3,
        5: 4,
        6: 2,
        7: 3,
        8: 'The team camaraderie and the energy on busy nights. Working at a prestigious Mayfair venue was a great experience.',
        9: 'Compensation could be more competitive - I am moving to a role with 20% higher base pay. Also, split shifts are exhausting.',
        10: 'Maybe',
        11: 7,
      },
    },
    equipment: [
      { item: 'Laptop (POS Terminal)', serial: 'LM-BAR-0042', status: 'returned', returnDate: '2026-02-05' },
      { item: 'Uniform (3 sets)', serial: 'N/A', status: 'outstanding', returnDate: null },
      { item: 'Staff ID Badge', serial: 'LM-2024-0187', status: 'outstanding', returnDate: null },
      { item: 'Locker Key #47', serial: 'LK-047', status: 'returned', returnDate: '2026-02-05' },
    ],
  },
  {
    id: 2,
    employee: 'Claire Dubois',
    role: 'Housekeeping Supervisor',
    department: 'Housekeeping',
    location: 'Paris Champs-Elysees',
    lastWorkingDay: '2026-02-28',
    noticeDate: '2026-01-28',
    reason: 'relocation',
    reasonDetail: 'Relocation - moving to Lyon',
    voluntary: true,
    rehireEligible: true,
    manager: 'Marie Laurent',
    tenure: '3.2 years',
    regrettable: true,
    tasks: buildTaskChecklist(['a1', 'a4', 'e5', 'd4', 'k1', 'p5']),
    exitInterview: {
      status: 'scheduled',
      date: '2026-02-20',
      interviewer: 'Pierre Moreau (HR)',
      responses: null,
    },
    equipment: [
      { item: 'Laptop', serial: 'PC-HK-0089', status: 'outstanding', returnDate: null },
      { item: 'Mobile Phone', serial: 'MP-PC-0034', status: 'outstanding', returnDate: null },
      { item: 'Uniform (5 sets)', serial: 'N/A', status: 'outstanding', returnDate: null },
      { item: 'Staff ID Badge', serial: 'PC-2023-0092', status: 'outstanding', returnDate: null },
      { item: 'Master Key Card', serial: 'MK-HK-003', status: 'outstanding', returnDate: null },
    ],
  },
  {
    id: 3,
    employee: 'Wei Zhang',
    role: 'Sous Chef',
    department: 'Kitchen',
    location: 'Tokyo Ginza',
    lastWorkingDay: '2026-03-07',
    noticeDate: '2026-02-01',
    reason: 'career_change',
    reasonDetail: 'Career change - attending culinary school',
    voluntary: true,
    rehireEligible: true,
    manager: 'Takeshi Nakamura',
    tenure: '1.4 years',
    regrettable: false,
    tasks: buildTaskChecklist(['a1', 'e5', 'k1', 'p5']),
    exitInterview: {
      status: 'not_scheduled',
      date: null,
      interviewer: null,
      responses: null,
    },
    equipment: [
      { item: 'Laptop (Kitchen Display)', serial: 'TG-KIT-0017', status: 'outstanding', returnDate: null },
      { item: 'Uniform (Chef Whites x4)', serial: 'N/A', status: 'outstanding', returnDate: null },
      { item: 'Staff ID Badge', serial: 'TG-2024-0241', status: 'outstanding', returnDate: null },
      { item: 'Locker Key #12', serial: 'LK-012', status: 'outstanding', returnDate: null },
      { item: 'Knife Set (Company)', serial: 'KS-TG-008', status: 'outstanding', returnDate: null },
    ],
  },
];

// 5 past offboardings for analytics
const PAST_OFFBOARDINGS = [
  {
    id: 101,
    employee: 'Sophie Williams',
    role: 'Front Desk Agent',
    department: 'Front of House',
    location: 'London Mayfair',
    lastWorkingDay: '2025-12-15',
    reason: 'compensation',
    voluntary: true,
    rehireEligible: true,
    regrettable: true,
    tenure: '2.1 years',
    exitInterview: {
      status: 'completed',
      responses: { 1: 'Compensation', 2: '3-6 months', 3: 3, 4: 3, 5: 4, 6: 2, 7: 3, 8: 'Great team environment and guest interactions.', 9: 'Pay needs to match London living costs.', 10: 'Maybe', 11: 6 },
    },
  },
  {
    id: 102,
    employee: 'Ahmed Hassan',
    role: 'Concierge',
    department: 'Front of House',
    location: 'Dubai Marina',
    lastWorkingDay: '2025-11-20',
    reason: 'new_opportunity',
    voluntary: true,
    rehireEligible: true,
    regrettable: true,
    tenure: '1.5 years',
    exitInterview: {
      status: 'completed',
      responses: { 1: 'New opportunity', 2: '1-3 months', 3: 5, 4: 4, 5: 5, 6: 3, 7: 4, 8: 'The luxury standards and professional development.', 9: 'More structured career progression pathways.', 10: 'Yes', 11: 8 },
    },
  },
  {
    id: 103,
    employee: 'Yuki Tanaka',
    role: 'Waitress',
    department: 'Front of House',
    location: 'Tokyo Ginza',
    lastWorkingDay: '2025-10-31',
    reason: 'work_life_balance',
    voluntary: true,
    rehireEligible: false,
    regrettable: false,
    tenure: '0.8 years',
    exitInterview: {
      status: 'completed',
      responses: { 1: 'Work-life balance', 2: '1-3 months', 3: 4, 4: 2, 5: 3, 6: 3, 7: 3, 8: 'Learning Japanese hospitality standards.', 9: 'Shift patterns are very demanding, especially split shifts.', 10: 'No', 11: 5 },
    },
  },
  {
    id: 104,
    employee: 'Jean-Pierre Martin',
    role: 'Head Bartender',
    department: 'Bar',
    location: 'Paris Champs-Elysees',
    lastWorkingDay: '2025-09-15',
    reason: 'management_issues',
    voluntary: true,
    rehireEligible: true,
    regrettable: true,
    tenure: '2.8 years',
    exitInterview: {
      status: 'completed',
      responses: { 1: 'Management issues', 2: 'Over 6 months', 3: 1, 4: 3, 5: 3, 6: 4, 7: 2, 8: 'The cocktail programme and creative freedom.', 9: 'Direct management style was demoralising. Need better manager training.', 10: 'Maybe', 11: 5 },
    },
  },
  {
    id: 105,
    employee: 'Emily Cooper',
    role: 'Events Coordinator',
    department: 'Management',
    location: 'New York Central Park',
    lastWorkingDay: '2025-08-30',
    reason: 'new_opportunity',
    voluntary: true,
    rehireEligible: true,
    regrettable: false,
    tenure: '4.2 years',
    exitInterview: {
      status: 'completed',
      responses: { 1: 'New opportunity', 2: '3-6 months', 3: 4, 4: 4, 5: 4, 6: 3, 7: 4, 8: 'Organising events at an iconic Manhattan hotel was incredible.', 9: 'International transfer opportunities would have kept me longer.', 10: 'Yes', 11: 8 },
    },
  },
];

const ALL_OFFBOARDINGS_FOR_ANALYTICS = [...DEMO_OFFBOARDINGS, ...PAST_OFFBOARDINGS];

// ============================================================
// ADMIN TABS
// ============================================================

const ADMIN_TABS = [
  { id: 'active', labelKey: 'offboarding.tabs.active', icon: UserMinus, label: 'Active Offboardings' },
  { id: 'interviews', labelKey: 'offboarding.tabs.exitInterviews', icon: MessageSquare, label: 'Exit Interviews' },
  { id: 'equipment', labelKey: 'offboarding.tabs.equipment', icon: Package, label: 'Equipment Tracking' },
  { id: 'analytics', labelKey: 'offboarding.tabs.analytics', icon: BarChart3, label: 'Analytics' },
];

const MANAGER_TABS = [
  { id: 'team_exits', labelKey: 'offboarding.tabs.teamExits', icon: Users, label: 'Team Exits' },
  { id: 'my_tasks', labelKey: 'offboarding.tabs.myTasks', icon: ListChecks, label: 'My Tasks' },
];

// ============================================================
// HELPER: days remaining
// ============================================================

const daysUntil = (dateStr) => {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ============================================================
// LOADING SKELETON
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-72 bg-slate-200 rounded mt-2" />
        </div>
        <div className="h-9 w-24 bg-slate-200 rounded" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 w-36 bg-slate-200 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-slate-200 rounded-xl" />
    </div>
  );
}

// ============================================================
// ACCESS DENIED (Worker)
// ============================================================

function AccessDenied({ t }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {t('offboarding.accessDenied.title', 'Access Restricted')}
        </h2>
        <p className="text-slate-500 leading-relaxed">
          {t('offboarding.accessDenied.message', 'Offboarding is managed by HR and your manager. If you have questions about your own departure, please contact your HR representative directly.')}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// DONUT CHART (CSS conic-gradient)
// ============================================================

function DonutChart({ segments, size = 160, strokeWidth = 32, centerLabel, centerValue }) {
  let cumulative = 0;
  const gradientStops = segments.map((seg) => {
    const start = cumulative;
    cumulative += seg.pct;
    return `${seg.color} ${start}% ${cumulative}%`;
  }).join(', ');

  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-full relative"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradientStops})`,
        }}
      >
        <div
          className="absolute bg-white rounded-full flex flex-col items-center justify-center"
          style={{
            top: strokeWidth,
            left: strokeWidth,
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
          }}
        >
          {centerValue && <span className="text-lg font-bold text-slate-900">{centerValue}</span>}
          {centerLabel && <span className="text-xs text-slate-500">{centerLabel}</span>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BAR CHART (SVG)
// ============================================================

function BarChart({ data, valueKey, labelKey, maxValue, barColor = '#6366f1', height = 200 }) {
  const max = maxValue || Math.max(...data.map(d => d[valueKey]));
  const barWidth = Math.max(20, Math.min(48, (600 / data.length) - 8));

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={height + 40} viewBox={`0 0 ${data.length * (barWidth + 12) + 40} ${height + 40}`}>
        {data.map((d, i) => {
          const barH = max > 0 ? (d[valueKey] / max) * height : 0;
          const x = 20 + i * (barWidth + 12);
          const y = height - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                fill={barColor}
                className="hover:opacity-80 transition-opacity"
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="text-[10px] fill-slate-700 font-semibold"
              >
                {d[valueKey]}
              </text>
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                className="text-[10px] fill-slate-500"
              >
                {d[labelKey]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Offboarding() {
  const { t } = useTranslation();
  const { user, isAdmin, isManagerOrAbove, isWorker } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [offboardings, setOffboardings] = useState(DEMO_OFFBOARDINGS);
  const [selectedOffboarding, setSelectedOffboarding] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showNewOffboarding, setShowNewOffboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Set default tab based on role
  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        setActiveTab('active');
      } else if (isManagerOrAbove) {
        setActiveTab('team_exits');
      }
    }
  }, [loading, isAdmin, isManagerOrAbove]);

  // Worker: access denied
  if (!loading && isWorker) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('offboarding.title', 'Offboarding')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('offboarding.subtitle', 'Employee departure management')}</p>
        </div>
        <AccessDenied t={t} />
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  const tabs = isAdmin ? ADMIN_TABS : MANAGER_TABS;

  // Toggle task completion
  const toggleTask = (offboardingId, categoryKey, taskId) => {
    setOffboardings(prev => prev.map(ob => {
      if (ob.id !== offboardingId) return ob;
      const updatedTasks = { ...ob.tasks };
      updatedTasks[categoryKey] = updatedTasks[categoryKey].map(task =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );
      return { ...ob, tasks: updatedTasks };
    }));
    if (selectedOffboarding && selectedOffboarding.id === offboardingId) {
      setSelectedOffboarding(prev => {
        const updatedTasks = { ...prev.tasks };
        updatedTasks[categoryKey] = updatedTasks[categoryKey].map(task =>
          task.id === taskId ? { ...task, done: !task.done } : task
        );
        return { ...prev, tasks: updatedTasks };
      });
    }
  };

  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ============================================================
  // ADMIN TAB 1: ACTIVE OFFBOARDINGS
  // ============================================================
  const renderActiveOffboardings = () => {
    const filtered = offboardings.filter(ob => {
      if (searchQuery && !ob.employee.toLowerCase().includes(searchQuery.toLowerCase()) && !ob.department.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterLocation && ob.location !== filterLocation) return false;
      return true;
    });

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('offboarding.summary.activeExits', 'Active Exits')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{offboardings.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <UserMinus className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('offboarding.summary.thisMonth', 'Departing This Month')}</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {offboardings.filter(ob => {
                    const d = new Date(ob.lastWorkingDay);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('offboarding.summary.interviewsPending', 'Interviews Pending')}</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {offboardings.filter(ob => ob.exitInterview?.status !== 'completed').length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('offboarding.summary.equipmentOutstanding', 'Equipment Outstanding')}</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {offboardings.reduce((acc, ob) => acc + (ob.equipment?.filter(e => e.status === 'outstanding').length || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <Package className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('offboarding.search', 'Search by name or department...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('offboarding.allLocations', 'All Locations')}</option>
            {LOCATIONS.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          {isAdmin && (
            <button
              onClick={() => setShowNewOffboarding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('offboarding.startOffboarding', 'Start Offboarding')}
            </button>
          )}
        </div>

        {/* Offboarding Cards */}
        <div className="space-y-4">
          {filtered.map((ob) => {
            const progress = countTasks(ob.tasks);
            const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
            const daysLeft = daysUntil(ob.lastWorkingDay);
            const isOverdue = daysLeft < 0;
            const isUrgent = daysLeft >= 0 && daysLeft <= 7;

            return (
              <div
                key={ob.id}
                onClick={() => setSelectedOffboarding(ob)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                    {ob.employee.split(' ').map(n => n[0]).join('')}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{ob.employee}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ob.role} &middot; {ob.department} &middot; {ob.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REASON_COLOR_MAP[ob.reason] || 'bg-slate-100 text-slate-700'}`}>
                          {t(`offboarding.reason.${ob.reason}`, ob.reason.replace(/_/g, ' '))}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {t('offboarding.overdue', 'Overdue')}
                          </span>
                        )}
                        {isUrgent && !isOverdue && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            {Math.abs(daysLeft)} {t('offboarding.daysLeft', 'days left')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress + Meta */}
                    <div className="mt-3 flex items-center gap-6">
                      <div className="flex-1 max-w-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">{t('offboarding.progress', 'Progress')}</span>
                          <span className="text-xs font-semibold text-slate-700">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          {progress.completed}/{progress.total} {t('offboarding.tasks', 'tasks')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(ob.lastWorkingDay)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {t(`offboarding.interviewStatus.${ob.exitInterview?.status || 'none'}`, ob.exitInterview?.status?.replace(/_/g, ' ') || 'N/A')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <UserMinus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium">{t('offboarding.noResults', 'No offboardings found')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('offboarding.noResultsHint', 'Try adjusting your search or filters')}</p>
            </div>
          )}
        </div>

        {/* New Offboarding Modal */}
        {showNewOffboarding && renderNewOffboardingModal()}

        {/* Detail Modal */}
        {selectedOffboarding && renderOffboardingDetail()}
      </div>
    );
  };

  // ============================================================
  // NEW OFFBOARDING MODAL
  // ============================================================
  const renderNewOffboardingModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('offboarding.new.title', 'Start Offboarding')}</h3>
          <button onClick={() => setShowNewOffboarding(false)} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.employee', 'Employee')}</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">{t('offboarding.new.selectEmployee', 'Select employee...')}</option>
              <option value="anna">Anna Richardson - Front Desk Agent, London Mayfair</option>
              <option value="ben">Ben Larsson - Chef de Partie, Paris Champs-Elysees</option>
              <option value="fatima">Fatima Al-Rashid - Room Attendant, Dubai Marina</option>
              <option value="david">David Park - Barista, New York Central Park</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.location', 'Location')}</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.noticeDate', 'Notice Date')}</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.lastDay', 'Last Working Day')}</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.reason', 'Reason for Leaving')}</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              {EXIT_REASONS.map(r => (
                <option key={r.value} value={r.value}>{t(`offboarding.reason.${r.value}`, r.value.replace(/_/g, ' '))}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.reasonDetail', 'Additional Details')}</label>
            <textarea
              rows={2}
              placeholder={t('offboarding.new.reasonDetailPlaceholder', 'E.g., moving to competitor, relocating to another city...')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">{t('offboarding.new.voluntary', 'Voluntary Departure')}</label>
            <button className="relative w-11 h-6 rounded-full transition-colors bg-blue-600">
              <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow translate-x-5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">{t('offboarding.new.regrettable', 'Regrettable Loss')}</label>
            <button className="relative w-11 h-6 rounded-full transition-colors bg-slate-300">
              <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow translate-x-0" />
            </button>
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={() => setShowNewOffboarding(false)}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('offboarding.new.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => setShowNewOffboarding(false)}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {t('offboarding.new.start', 'Start Offboarding')}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // OFFBOARDING DETAIL MODAL
  // ============================================================
  const renderOffboardingDetail = () => {
    const ob = selectedOffboarding;
    const progress = countTasks(ob.tasks);
    const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
    const daysLeft = daysUntil(ob.lastWorkingDay);

    // Timeline progress
    const notice = new Date(ob.noticeDate).getTime();
    const last = new Date(ob.lastWorkingDay).getTime();
    const now = Date.now();
    const timelinePct = Math.min(100, Math.max(0, ((now - notice) / (last - notice)) * 100));

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t('offboarding.detail.title', 'Offboarding Details')}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{ob.employee} &middot; {ob.location}</p>
            </div>
            <button onClick={() => setSelectedOffboarding(null)} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Employee Card */}
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-600">
                  {ob.employee.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-900">{ob.employee}</h4>
                  <p className="text-sm text-slate-600">{ob.role} &middot; {ob.department} &middot; {ob.location}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REASON_COLOR_MAP[ob.reason] || 'bg-slate-100 text-slate-700'}`}>
                      {t(`offboarding.reason.${ob.reason}`, ob.reason.replace(/_/g, ' '))}
                    </span>
                    {ob.voluntary ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700">{t('offboarding.voluntary', 'Voluntary')}</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700">{t('offboarding.involuntary', 'Involuntary')}</span>
                    )}
                    {ob.regrettable && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">{t('offboarding.regrettable', 'Regrettable')}</span>
                    )}
                    {ob.rehireEligible && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{t('offboarding.rehireEligible', 'Rehire Eligible')}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-slate-900">{pct}%</p>
                  <p className="text-xs text-slate-500">{t('offboarding.complete', 'complete')}</p>
                </div>
              </div>

              {/* Info row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">{t('offboarding.detail.manager', 'Manager')}</p>
                  <p className="text-sm font-medium text-slate-900">{ob.manager}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('offboarding.detail.tenure', 'Tenure')}</p>
                  <p className="text-sm font-medium text-slate-900">{ob.tenure}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('offboarding.detail.noticeDate', 'Notice Date')}</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(ob.noticeDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('offboarding.detail.lastDay', 'Last Working Day')}</p>
                  <p className={`text-sm font-medium ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {formatDate(ob.lastWorkingDay)}
                    {daysLeft >= 0 && <span className="text-xs text-slate-400 ml-1">({daysLeft}d)</span>}
                    {daysLeft < 0 && <span className="text-xs text-red-400 ml-1">({t('offboarding.pastDue', 'past due')})</span>}
                  </p>
                </div>
              </div>

              {/* Timeline bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{t('offboarding.detail.noticeGiven', 'Notice Given')}</span>
                  <span>{t('offboarding.detail.lastDayLabel', 'Last Day')}</span>
                </div>
                <div className="relative w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${timelinePct >= 100 ? 'bg-red-500' : timelinePct >= 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(timelinePct, 100)}%` }}
                  />
                </div>
              </div>
              {ob.reasonDetail && (
                <p className="text-sm text-slate-600 mt-3 italic">"{ob.reasonDetail}"</p>
              )}
            </div>

            {/* Overall Progress */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900">{t('offboarding.detail.overallProgress', 'Overall Progress')}</h4>
                <span className="text-sm text-slate-500">{progress.completed}/{progress.total} {t('offboarding.detail.tasksComplete', 'tasks complete')}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Category progress mini bars */}
              <div className="grid grid-cols-5 gap-2 mt-3">
                {TASK_CATEGORIES.map((cat) => {
                  const tasks = ob.tasks[cat.key] || [];
                  const done = tasks.filter(t => t.done).length;
                  const catPct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
                  return (
                    <div key={cat.key} className="text-center">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                        <div
                          className={`h-1.5 rounded-full ${catPct === 100 ? 'bg-green-500' : 'bg-blue-400'}`}
                          style={{ width: `${catPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{cat.label.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Categories (Accordion) */}
            <div className="space-y-3">
              {TASK_CATEGORIES.map((cat) => {
                const tasks = ob.tasks[cat.key] || [];
                if (tasks.length === 0) return null;
                const CategoryIcon = cat.icon;
                const doneCount = tasks.filter(t => t.done).length;
                const isExpanded = expandedCategories[cat.key] !== false; // default expanded
                const allDone = doneCount === tasks.length;

                return (
                  <div key={cat.key} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.key)}
                      className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className={`w-4 h-4 ${allDone ? 'text-green-500' : 'text-blue-500'}`} />
                        <span className="text-sm font-semibold text-slate-900">{t(`offboarding.taskCategory.${cat.key}`, cat.label)}</span>
                        {allDone && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{doneCount}/{tasks.length}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-slate-100">
                        {tasks.map((task) => {
                          const isTaskOverdue = !task.done && daysLeft < 0;
                          return (
                            <label
                              key={task.id}
                              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer ${isTaskOverdue ? 'bg-red-50/50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => toggleTask(ob.id, cat.key, task.id)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${task.done ? 'line-through text-slate-400' : isTaskOverdue ? 'text-red-700' : 'text-slate-700'}`}>
                                  {task.label}
                                </span>
                                {task.serial && (
                                  <span className="text-xs text-slate-400 ml-2">SN: {task.serial}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{task.assignee}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${isTaskOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                                  {task.due}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Equipment Section */}
            {ob.equipment && ob.equipment.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-slate-900">{t('offboarding.detail.equipment', 'Equipment Status')}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {ob.equipment.map((eq, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm text-slate-700">{eq.item}</p>
                        <p className="text-xs text-slate-400">{t('offboarding.serial', 'Serial')}: {eq.serial}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {eq.returnDate && (
                          <span className="text-xs text-slate-400">{formatDate(eq.returnDate)}</span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${EQUIPMENT_STATUS_STYLES[eq.status]}`}>
                          {t(`offboarding.equipmentStatus.${eq.status}`, eq.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exit Interview Section */}
            {ob.exitInterview && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-slate-900">{t('offboarding.detail.exitInterview', 'Exit Interview')}</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ob.exitInterview.status] || 'bg-slate-100 text-slate-700'}`}>
                    {t(`offboarding.interviewStatus.${ob.exitInterview.status}`, ob.exitInterview.status?.replace(/_/g, ' '))}
                  </span>
                </div>
                {ob.exitInterview.date && (
                  <p className="text-sm text-slate-500">
                    {ob.exitInterview.status === 'completed'
                      ? t('offboarding.interviewConducted', 'Conducted on')
                      : t('offboarding.interviewScheduled', 'Scheduled for')
                    } {formatDate(ob.exitInterview.date)}
                    {ob.exitInterview.interviewer && ` ${t('offboarding.by', 'by')} ${ob.exitInterview.interviewer}`}
                  </p>
                )}
                {ob.exitInterview.status === 'completed' && ob.exitInterview.responses && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInterview(ob);
                    }}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    {t('offboarding.viewResponses', 'View Responses')}
                  </button>
                )}
                {ob.exitInterview.status === 'not_scheduled' && (
                  <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {t('offboarding.scheduleInterview', 'Schedule Interview')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ADMIN TAB 2: EXIT INTERVIEWS
  // ============================================================
  const renderExitInterviews = () => {
    const allInterviews = offboardings.filter(ob => ob.exitInterview);

    return (
      <div className="space-y-6">
        {/* Interview Template */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">{t('offboarding.interviews.template', 'Exit Interview Template')}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{t('offboarding.interviews.templateDesc', '11 questions covering all aspects of the employee experience')}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {EXIT_INTERVIEW_QUESTIONS.length} {t('offboarding.interviews.questions', 'questions')}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {EXIT_INTERVIEW_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="px-5 py-3 flex items-start gap-3">
                <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 text-right flex-shrink-0">{idx + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-700">{t(`offboarding.interviews.q${q.id}`, q.question)}</p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    {q.type === 'single_choice' && `${t('offboarding.interviews.singleChoice', 'Single choice')}: ${q.options.join(', ')}`}
                    {q.type === 'rating' && `${t('offboarding.interviews.rating', 'Rating')}: 1-${q.max}`}
                    {q.type === 'nps' && `${t('offboarding.interviews.nps', 'NPS Score')}: 0-${q.max}`}
                    {q.type === 'free_text' && t('offboarding.interviews.freeText', 'Free text')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interview List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900">{t('offboarding.interviews.responses', 'Exit Interview Responses')}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.employee', 'Employee')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.location', 'Location')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.date', 'Date')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.status', 'Status')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.npsScore', 'NPS')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allInterviews.map((ob) => (
                  <tr key={ob.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {ob.employee.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-900">{ob.employee}</span>
                          <p className="text-xs text-slate-500">{ob.role} &middot; {ob.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{ob.location}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{ob.exitInterview.date ? formatDate(ob.exitInterview.date) : '--'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ob.exitInterview.status] || 'bg-slate-100 text-slate-700'}`}>
                        {t(`offboarding.interviewStatus.${ob.exitInterview.status}`, ob.exitInterview.status?.replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ob.exitInterview.responses?.['11'] != null ? (
                        <span className={`text-sm font-semibold ${ob.exitInterview.responses['11'] >= 9 ? 'text-green-600' : ob.exitInterview.responses['11'] >= 7 ? 'text-blue-600' : ob.exitInterview.responses['11'] >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                          {ob.exitInterview.responses['11']}/10
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ob.exitInterview.status === 'completed' && ob.exitInterview.responses ? (
                        <button
                          onClick={() => setSelectedInterview(ob)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">{t('offboarding.interviews.notAvailable', 'N/A')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interview Detail Modal */}
        {selectedInterview && renderInterviewDetailModal()}
      </div>
    );
  };

  // ============================================================
  // EXIT INTERVIEW DETAIL MODAL
  // ============================================================
  const renderInterviewDetailModal = () => {
    const ob = selectedInterview;
    const responses = ob.exitInterview?.responses;
    if (!responses) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t('offboarding.interviews.detail', 'Exit Interview Responses')}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{ob.employee} &middot; {ob.location}</p>
            </div>
            <button onClick={() => setSelectedInterview(null)} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {ob.exitInterview.interviewer && (
              <div className="flex items-center justify-between text-sm text-slate-500 pb-4 border-b border-slate-200">
                <span>{t('offboarding.interviews.conductedBy', 'Conducted by')}: <span className="font-medium text-slate-700">{ob.exitInterview.interviewer}</span></span>
                <span>{formatDate(ob.exitInterview.date)}</span>
              </div>
            )}

            {EXIT_INTERVIEW_QUESTIONS.map((q) => {
              const answer = responses[q.id];
              if (answer == null) return null;

              return (
                <div key={q.id} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    {q.id}. {t(`offboarding.interviews.q${q.id}`, q.question)}
                  </p>
                  {q.type === 'rating' && (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-5 h-5 ${s <= answer ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                      <span className="text-sm text-slate-500 ml-2">{answer}/5</span>
                    </div>
                  )}
                  {q.type === 'nps' && (
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <span
                          key={n}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium ${
                            n === answer
                              ? n >= 9 ? 'bg-green-500 text-white' : n >= 7 ? 'bg-blue-500 text-white' : n >= 5 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                              : n <= answer ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {n}
                        </span>
                      ))}
                      <span className="text-sm text-slate-500 ml-2">
                        {answer >= 9 ? t('offboarding.nps.promoter', 'Promoter') : answer >= 7 ? t('offboarding.nps.passive', 'Passive') : t('offboarding.nps.detractor', 'Detractor')}
                      </span>
                    </div>
                  )}
                  {(q.type === 'single_choice') && (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-700 font-medium">{answer}</span>
                  )}
                  {q.type === 'free_text' && (
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{answer}"</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ADMIN TAB 3: EQUIPMENT TRACKING
  // ============================================================
  const renderEquipmentTracking = () => {
    const allEquipment = offboardings.flatMap(ob =>
      (ob.equipment || []).map(eq => ({
        ...eq,
        employee: ob.employee,
        location: ob.location,
        department: ob.department,
        lastDay: ob.lastWorkingDay,
      }))
    );

    const filtered = equipmentFilter === 'all' ? allEquipment : allEquipment.filter(eq => eq.status === equipmentFilter);
    const statusCounts = {
      all: allEquipment.length,
      returned: allEquipment.filter(e => e.status === 'returned').length,
      outstanding: allEquipment.filter(e => e.status === 'outstanding').length,
      lost: allEquipment.filter(e => e.status === 'lost').length,
    };

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { key: 'all', label: t('offboarding.equipment.total', 'Total Items'), color: 'bg-slate-50', iconColor: 'text-slate-500', icon: Package },
            { key: 'returned', label: t('offboarding.equipment.returned', 'Returned'), color: 'bg-green-50', iconColor: 'text-green-500', icon: CheckCircle },
            { key: 'outstanding', label: t('offboarding.equipment.outstanding', 'Outstanding'), color: 'bg-amber-50', iconColor: 'text-amber-500', icon: Clock },
            { key: 'lost', label: t('offboarding.equipment.lost', 'Lost'), color: 'bg-red-50', iconColor: 'text-red-500', icon: XCircle },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setEquipmentFilter(s.key)}
              className={`bg-white rounded-xl border p-5 text-left transition-all ${equipmentFilter === s.key ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{statusCounts[s.key]}</p>
                </div>
                <div className={`p-3 ${s.color} rounded-lg`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Equipment Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.equipment.item', 'Item')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.equipment.serialNumber', 'Serial Number')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.equipment.assignedTo', 'Assigned To')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.equipment.locationCol', 'Location')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.equipment.status', 'Status')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.equipment.returnDate', 'Return Date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((eq, idx) => {
                  const isOverdue = eq.status === 'outstanding' && daysUntil(eq.lastDay) < 0;
                  return (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{eq.item}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{eq.serial}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">{eq.employee}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{eq.location}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${EQUIPMENT_STATUS_STYLES[eq.status]}`}>
                          {isOverdue && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {t(`offboarding.equipmentStatus.${eq.status}`, eq.status)}
                          {isOverdue && ` (${t('offboarding.overdue', 'overdue')})`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {eq.returnDate ? formatDate(eq.returnDate) : '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm">{t('offboarding.equipment.noItems', 'No equipment items matching this filter')}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // ADMIN TAB 4: ANALYTICS
  // ============================================================
  const renderAnalytics = () => {
    // Turnover by reason
    const reasonBreakdown = [
      { label: t('offboarding.reason.new_opportunity', 'New Opportunity'), pct: 35, color: '#3b82f6' },
      { label: t('offboarding.reason.career_change', 'Career Change'), pct: 15, color: '#6366f1' },
      { label: t('offboarding.reason.relocation', 'Relocation'), pct: 12, color: '#14b8a6' },
      { label: t('offboarding.reason.compensation', 'Compensation'), pct: 12, color: '#f59e0b' },
      { label: t('offboarding.reason.work_life_balance', 'Work-life Balance'), pct: 10, color: '#a855f7' },
      { label: t('offboarding.reason.management_issues', 'Management'), pct: 8, color: '#ef4444' },
      { label: t('offboarding.reason.other', 'Other'), pct: 8, color: '#94a3b8' },
    ];

    // Average tenure by department
    const tenureByDept = [
      { dept: 'Front of House', years: 2.1 },
      { dept: 'Kitchen', years: 1.8 },
      { dept: 'Housekeeping', years: 2.5 },
      { dept: 'Bar', years: 1.4 },
      { dept: 'Management', years: 4.2 },
    ];

    // Monthly turnover trend (last 12 months)
    const turnoverTrend = [
      { month: 'Mar', rate: 6.8 },
      { month: 'Apr', rate: 7.1 },
      { month: 'May', rate: 7.5 },
      { month: 'Jun', rate: 8.0 },
      { month: 'Jul', rate: 9.2 },
      { month: 'Aug', rate: 8.8 },
      { month: 'Sep', rate: 7.9 },
      { month: 'Oct', rate: 7.6 },
      { month: 'Nov', rate: 7.2 },
      { month: 'Dec', rate: 7.8 },
      { month: 'Jan', rate: 8.0 },
      { month: 'Feb', rate: 8.2 },
    ];

    // Turnover by location
    const turnoverByLocation = [
      { location: 'London', rate: 9.1, label: 'LDN' },
      { location: 'Paris', rate: 7.8, label: 'PAR' },
      { location: 'Dubai', rate: 6.5, label: 'DXB' },
      { location: 'New York', rate: 10.2, label: 'NYC' },
      { location: 'Tokyo', rate: 5.8, label: 'TKY' },
    ];

    // Exit interview averages (questions 3-7 are ratings)
    const avgRatings = [
      { question: t('offboarding.analytics.managerRelationship', 'Manager Relationship'), avg: 3.4 },
      { question: t('offboarding.analytics.profDevelopment', 'Professional Development'), avg: 3.2 },
      { question: t('offboarding.analytics.companyCulture', 'Company Culture'), avg: 3.8 },
      { question: t('offboarding.analytics.compBenefits', 'Compensation & Benefits'), avg: 2.8 },
      { question: t('offboarding.analytics.recognition', 'Recognition & Value'), avg: 3.2 },
    ];

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t('offboarding.analytics.annualizedTurnover', 'Annualized Turnover')}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">8.2%</p>
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> +0.4% {t('offboarding.analytics.vsLastQuarter', 'vs last quarter')}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t('offboarding.analytics.avgTenure', 'Avg Tenure of Leavers')}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">2.1 {t('offboarding.analytics.yrs', 'yrs')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('offboarding.analytics.acrossAllLocations', 'Across all locations')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t('offboarding.analytics.regrettableLoss', 'Regrettable Loss')}</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">40%</p>
            <p className="text-xs text-slate-400 mt-1">{t('offboarding.analytics.ofAllDepartures', 'of all departures')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t('offboarding.analytics.rehireEligibility', 'Rehire Eligible')}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">72%</p>
            <p className="text-xs text-slate-400 mt-1">{t('offboarding.analytics.ofLeavers', 'of leavers')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t('offboarding.analytics.avgNPS', 'Avg Exit NPS')}</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">6.5</p>
            <p className="text-xs text-slate-400 mt-1">{t('offboarding.analytics.outOf10', 'out of 10')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reasons for Leaving (bar chart) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.reasonsForLeaving', 'Reasons for Leaving')}</h4>
            <div className="space-y-3">
              {reasonBreakdown.map((reason) => (
                <div key={reason.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{reason.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{reason.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{ width: `${reason.pct}%`, backgroundColor: reason.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Average Tenure by Department */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.avgTenureByDept', 'Average Tenure by Department')}</h4>
            <div className="space-y-3">
              {tenureByDept.map((dept) => (
                <div key={dept.dept} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 w-32 flex-shrink-0">{dept.dept}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden">
                    <div
                      className="bg-blue-500 h-7 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(dept.years / 5) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{dept.years} {t('offboarding.analytics.yrs', 'yrs')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regrettable vs Non-Regrettable (Donut) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.regrettableVsNon', 'Regrettable vs Non-Regrettable')}</h4>
            <div className="flex items-center justify-center gap-8">
              <DonutChart
                segments={[
                  { pct: 40, color: '#f59e0b' },
                  { pct: 60, color: '#10b981' },
                ]}
                size={160}
                strokeWidth={30}
                centerValue="40%"
                centerLabel={t('offboarding.analytics.regrettable', 'Regrettable')}
              />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-700">{t('offboarding.analytics.regrettable', 'Regrettable')} (40%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-700">{t('offboarding.analytics.nonRegrettable', 'Non-Regrettable')} (60%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rehire Eligibility (Donut) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.rehireEligibilityChart', 'Rehire Eligibility')}</h4>
            <div className="flex items-center justify-center gap-8">
              <DonutChart
                segments={[
                  { pct: 72, color: '#3b82f6' },
                  { pct: 28, color: '#e2e8f0' },
                ]}
                size={160}
                strokeWidth={30}
                centerValue="72%"
                centerLabel={t('offboarding.analytics.eligible', 'Eligible')}
              />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-700">{t('offboarding.analytics.eligible', 'Eligible')} (72%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                  <span className="text-sm text-slate-700">{t('offboarding.analytics.notEligible', 'Not Eligible')} (28%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Turnover Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.turnoverTrend', 'Monthly Turnover Rate (Last 12 Months)')}</h4>
          <div className="flex items-end gap-2 h-48">
            {turnoverTrend.map((month) => {
              const maxRate = Math.max(...turnoverTrend.map(m => m.rate));
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-semibold text-slate-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{month.rate}%</span>
                  <div
                    className={`w-full rounded-t-lg transition-all group-hover:opacity-80 ${month.rate >= 9 ? 'bg-red-500' : month.rate >= 8 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ height: `${(month.rate / maxRate) * 100}%` }}
                  />
                  <span className="text-[10px] text-slate-500 mt-2">{month.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-end gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-blue-500" />
              <span className="text-xs text-slate-500">&lt;8%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span className="text-xs text-slate-500">8-9%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-red-500" />
              <span className="text-xs text-slate-500">&gt;9%</span>
            </div>
          </div>
        </div>

        {/* Turnover by Location */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.turnoverByLocation', 'Turnover Rate by Location')}</h4>
          <div className="space-y-3">
            {turnoverByLocation.sort((a, b) => b.rate - a.rate).map((loc) => (
              <div key={loc.location} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm text-slate-700">{loc.location}</span>
                </div>
                <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden">
                  <div
                    className={`h-7 rounded-full flex items-center justify-end pr-2 ${loc.rate >= 9 ? 'bg-red-500' : loc.rate >= 7 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${(loc.rate / 12) * 100}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{loc.rate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exit Interview Score Averages */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.exitInterviewScores', 'Exit Interview Average Scores')}</h4>
          <div className="space-y-3">
            {avgRatings.map((item) => (
              <div key={item.question} className="flex items-center gap-4">
                <span className="text-sm text-slate-700 w-48 flex-shrink-0">{item.question}</span>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${item.avg >= 4 ? 'bg-green-500' : item.avg >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${(item.avg / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-10 text-right">{item.avg}/5</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              {t('offboarding.analytics.lowestScoreNote', 'Lowest scoring area: Compensation & Benefits (2.8/5) - consistent with "Compensation" being a top reason for leaving.')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // MANAGER TAB 1: TEAM EXITS
  // ============================================================
  const renderTeamExits = () => {
    // Manager sees their team offboardings (demo: show all)
    const teamExits = offboardings;

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">{t('offboarding.manager.teamExitsInfo', 'Team Departures')}</p>
            <p className="text-sm text-blue-700 mt-0.5">{t('offboarding.manager.teamExitsDesc', 'You have team members with active offboardings. Please ensure all assigned tasks are completed before their last working day.')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {teamExits.map((ob) => {
            const progress = countTasks(ob.tasks);
            const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
            const daysLeft = daysUntil(ob.lastWorkingDay);

            return (
              <div
                key={ob.id}
                onClick={() => setSelectedOffboarding(ob)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                    {ob.employee.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{ob.employee}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{ob.role} &middot; {ob.department} &middot; {ob.location}</p>
                      </div>
                      <span className={`text-sm font-bold ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {daysLeft >= 0 ? `${daysLeft} ${t('offboarding.daysLeft', 'days left')}` : t('offboarding.pastDue', 'Past due')}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">{progress.completed}/{progress.total} {t('offboarding.tasksComplete', 'tasks complete')}</span>
                        <span className="text-xs font-semibold text-slate-700">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{t('offboarding.lastDay', 'Last day')}: {formatDate(ob.lastWorkingDay)}</span>
                      <span>{t(`offboarding.reason.${ob.reason}`, ob.reason.replace(/_/g, ' '))}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>

        {selectedOffboarding && renderOffboardingDetail()}
      </div>
    );
  };

  // ============================================================
  // MANAGER TAB 2: MY TASKS
  // ============================================================
  const renderMyTasks = () => {
    // Collect all manager-assigned tasks from active offboardings
    const managerTasks = [];
    offboardings.forEach(ob => {
      Object.entries(ob.tasks).forEach(([catKey, tasks]) => {
        tasks.forEach(task => {
          if (task.assignee === 'Manager' || task.assignee === 'HR') {
            managerTasks.push({
              ...task,
              category: catKey,
              employee: ob.employee,
              employeeId: ob.id,
              location: ob.location,
              lastDay: ob.lastWorkingDay,
            });
          }
        });
      });
    });

    const pendingTasks = managerTasks.filter(t => !t.done);
    const completedTasks = managerTasks.filter(t => t.done);

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t('offboarding.myTasks.total', 'Total Assigned')}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{managerTasks.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t('offboarding.myTasks.pending', 'Pending')}</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingTasks.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t('offboarding.myTasks.completed', 'Completed')}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{completedTasks.length}</p>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">{t('offboarding.myTasks.pendingTasks', 'Pending Tasks')}</h4>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              {pendingTasks.length} {t('offboarding.myTasks.remaining', 'remaining')}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <p className="text-sm font-medium">{t('offboarding.myTasks.allDone', 'All tasks completed')}</p>
              </div>
            ) : (
              pendingTasks.map((task, idx) => {
                const daysLeft = daysUntil(task.lastDay);
                const isOverdue = daysLeft < 0;
                const cat = TASK_CATEGORIES.find(c => c.key === task.category);
                const CatIcon = cat?.icon || ClipboardList;

                return (
                  <div
                    key={`${task.employeeId}-${task.id}-${idx}`}
                    className={`flex items-center gap-3 px-5 py-3 ${isOverdue ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleTask(task.employeeId, task.category, task.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <CatIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isOverdue ? 'text-red-700 font-medium' : 'text-slate-700'}`}>{task.label}</p>
                      <p className="text-xs text-slate-400">{t('offboarding.for', 'For')}: {task.employee} &middot; {task.location} &middot; {task.due}</p>
                    </div>
                    {isOverdue && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />{t('offboarding.overdue', 'Overdue')}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900">{t('offboarding.myTasks.completedTasks', 'Completed Tasks')}</h4>
            </div>
            <div className="divide-y divide-slate-100">
              {completedTasks.map((task, idx) => (
                <div key={`${task.employeeId}-${task.id}-${idx}`} className="flex items-center gap-3 px-5 py-3">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleTask(task.employeeId, task.category, task.id)}
                    className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-400 line-through">{task.label}</p>
                    <p className="text-xs text-slate-300">{task.employee} &middot; {task.location}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('offboarding.title', 'Offboarding')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? t('offboarding.subtitle', 'Manage employee departures, exit interviews, equipment and analytics')
              : t('offboarding.subtitleManager', 'Track team departures and complete assigned offboarding tasks')
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
              <Download className="w-4 h-4" />
              {t('offboarding.export', 'Export')}
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey, tab.label)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'active' && renderActiveOffboardings()}
      {activeTab === 'interviews' && renderExitInterviews()}
      {activeTab === 'equipment' && renderEquipmentTracking()}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'team_exits' && renderTeamExits()}
      {activeTab === 'my_tasks' && renderMyTasks()}

      {/* Global Interview Detail Modal (can appear from multiple tabs) */}
      {selectedInterview && activeTab !== 'interviews' && renderInterviewDetailModal()}
    </div>
  );
}
