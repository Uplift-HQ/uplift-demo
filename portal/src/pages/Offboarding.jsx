// ============================================================
// OFFBOARDING PAGE
// Employee offboarding, exit interviews, templates, analytics
// Fully internationalized - all strings use t() for translation
// ============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserMinus, ClipboardList, FileText, BarChart3, Plus, X, Eye,
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronRight, ChevronDown,
  Calendar, Users, TrendingDown, Star, Lock, Laptop, Shield,
  Brain, DollarSign, Megaphone, MessageSquare, Edit2, Save,
  ArrowRight, Check, RefreshCw, Search, Filter, Download,
  Building2, Mail, Key, CreditCard, Smartphone, BadgeCheck,
  BookOpen, UserCheck, ToggleLeft, ToggleRight,
} from 'lucide-react';

// ============================================================
// DEMO DATA
// ============================================================

const DEMO_OFFBOARDINGS = [
  {
    id: 1,
    employee: 'Marcus Thompson',
    role: 'Senior Developer',
    department: 'Engineering',
    lastWorkingDay: '2026-02-14',
    noticeDate: '2026-01-15',
    reason: 'resignation',
    voluntary: true,
    progress: { completed: 8, total: 14 },
    status: 'in_progress',
    template: 'Resignation',
    rehireEligible: true,
    tasks: {
      access: [
        { id: 'a1', label: 'Revoke email access', done: true },
        { id: 'a2', label: 'Disable SSO/Active Directory', done: true },
        { id: 'a3', label: 'Revoke VPN access', done: false },
        { id: 'a4', label: 'Deactivate building access card', done: false },
      ],
      equipment: [
        { id: 'e1', label: 'Return laptop (MacBook Pro 14")', done: true },
        { id: 'e2', label: 'Return mobile phone', done: false },
        { id: 'e3', label: 'Return ID badge', done: true },
        { id: 'e4', label: 'Return office keys', done: true },
      ],
      documents: [
        { id: 'd1', label: 'Sign NDA reminder acknowledgement', done: true },
        { id: 'd2', label: 'Return confidential documents', done: true },
        { id: 'd3', label: 'Sign final paperwork', done: false },
      ],
      knowledge: [
        { id: 'k1', label: 'Document current responsibilities', done: true },
        { id: 'k2', label: 'Handover to successor (Priya Sharma)', done: false },
      ],
      pay: [
        { id: 'p1', label: 'Process final payslip', done: false },
        { id: 'p2', label: 'Calculate outstanding holiday pay (8 days)', done: true },
        { id: 'p3', label: 'Settle pending expense claims', done: false },
      ],
      communication: [
        { id: 'c1', label: 'Manager announcement to team', done: false },
        { id: 'c2', label: 'Update org chart', done: false },
      ],
    },
    exitInterview: { scheduled: '2026-02-10', status: 'pending' },
  },
  {
    id: 2,
    employee: 'Linda Okafor',
    role: 'Marketing Manager',
    department: 'Marketing',
    lastWorkingDay: '2026-02-28',
    noticeDate: '2026-01-28',
    reason: 'redundancy',
    voluntary: false,
    progress: { completed: 3, total: 12 },
    status: 'in_progress',
    template: 'Redundancy',
    rehireEligible: true,
    tasks: {
      access: [
        { id: 'a1', label: 'Revoke email access', done: false },
        { id: 'a2', label: 'Disable SSO/Active Directory', done: false },
        { id: 'a3', label: 'Revoke VPN access', done: false },
        { id: 'a4', label: 'Deactivate building access card', done: false },
      ],
      equipment: [
        { id: 'e1', label: 'Return laptop (ThinkPad X1)', done: true },
        { id: 'e2', label: 'Return ID badge', done: true },
      ],
      documents: [
        { id: 'd1', label: 'Sign redundancy agreement', done: true },
        { id: 'd2', label: 'Return confidential documents', done: false },
      ],
      knowledge: [
        { id: 'k1', label: 'Document campaign handover notes', done: false },
        { id: 'k2', label: 'Transfer social media credentials', done: false },
      ],
      pay: [
        { id: 'p1', label: 'Process redundancy payment', done: false },
        { id: 'p2', label: 'Calculate statutory notice pay', done: false },
      ],
      communication: [
        { id: 'c1', label: 'HR announcement email', done: false },
        { id: 'c2', label: 'Update org chart', done: false },
      ],
    },
    exitInterview: { scheduled: '2026-02-20', status: 'pending' },
  },
  {
    id: 3,
    employee: 'Robert Williams',
    role: 'Finance Director',
    department: 'Finance',
    lastWorkingDay: '2026-03-31',
    noticeDate: '2025-12-31',
    reason: 'retirement',
    voluntary: true,
    progress: { completed: 10, total: 13 },
    status: 'in_progress',
    template: 'Retirement',
    rehireEligible: false,
    tasks: {
      access: [
        { id: 'a1', label: 'Revoke email access', done: true },
        { id: 'a2', label: 'Disable SSO/Active Directory', done: true },
        { id: 'a3', label: 'Revoke VPN access', done: true },
        { id: 'a4', label: 'Deactivate building access card', done: true },
      ],
      equipment: [
        { id: 'e1', label: 'Return laptop (Dell Latitude)', done: true },
        { id: 'e2', label: 'Return ID badge', done: true },
        { id: 'e3', label: 'Return company car keys', done: true },
      ],
      documents: [
        { id: 'd1', label: 'Sign NDA reminder acknowledgement', done: true },
        { id: 'd2', label: 'Return confidential documents', done: true },
        { id: 'd3', label: 'Sign pension finalisation papers', done: false },
      ],
      knowledge: [
        { id: 'k1', label: 'Complete knowledge transfer to Deputy CFO', done: true },
      ],
      pay: [
        { id: 'p1', label: 'Process final payslip', done: false },
        { id: 'p2', label: 'Confirm pension arrangements', done: false },
      ],
      communication: [
        { id: 'c1', label: 'CEO retirement announcement', done: true },
      ],
    },
    exitInterview: { scheduled: '2026-03-15', status: 'completed', rating: 5 },
  },
  {
    id: 4,
    employee: 'Aisha Patel',
    role: 'UX Designer',
    department: 'Product',
    lastWorkingDay: '2026-02-07',
    noticeDate: '2026-01-07',
    reason: 'end_of_contract',
    voluntary: false,
    progress: { completed: 11, total: 11 },
    status: 'completed',
    template: 'End of Contract',
    rehireEligible: true,
    tasks: {
      access: [
        { id: 'a1', label: 'Revoke email access', done: true },
        { id: 'a2', label: 'Disable SSO/Active Directory', done: true },
        { id: 'a3', label: 'Revoke Figma seat', done: true },
      ],
      equipment: [
        { id: 'e1', label: 'Return laptop (MacBook Air)', done: true },
        { id: 'e2', label: 'Return ID badge', done: true },
      ],
      documents: [
        { id: 'd1', label: 'Sign contract completion form', done: true },
        { id: 'd2', label: 'Return confidential documents', done: true },
      ],
      knowledge: [
        { id: 'k1', label: 'Upload final design files to shared drive', done: true },
        { id: 'k2', label: 'Document design system updates', done: true },
      ],
      pay: [
        { id: 'p1', label: 'Process final invoice', done: true },
      ],
      communication: [
        { id: 'c1', label: 'Team farewell notification', done: true },
      ],
    },
    exitInterview: { scheduled: '2026-02-05', status: 'completed', rating: 4 },
  },
  {
    id: 5,
    employee: 'Daniel Cross',
    role: 'Sales Representative',
    department: 'Sales',
    lastWorkingDay: '2026-01-31',
    noticeDate: '2026-01-17',
    reason: 'termination',
    voluntary: false,
    progress: { completed: 6, total: 10 },
    status: 'in_progress',
    template: 'Termination',
    rehireEligible: false,
    tasks: {
      access: [
        { id: 'a1', label: 'Revoke email access (immediate)', done: true },
        { id: 'a2', label: 'Disable SSO/Active Directory (immediate)', done: true },
        { id: 'a3', label: 'Revoke CRM access', done: true },
        { id: 'a4', label: 'Deactivate building access card', done: true },
      ],
      equipment: [
        { id: 'e1', label: 'Return laptop (ThinkPad)', done: true },
        { id: 'e2', label: 'Return company mobile', done: false },
        { id: 'e3', label: 'Return ID badge', done: true },
      ],
      documents: [
        { id: 'd1', label: 'Issue termination letter', done: false },
      ],
      knowledge: [],
      pay: [
        { id: 'p1', label: 'Process final payslip', done: false },
      ],
      communication: [
        { id: 'c1', label: 'HR notification to department', done: false },
      ],
    },
    exitInterview: null,
  },
];

const DEMO_EXIT_INTERVIEWS = [
  {
    id: 1,
    employee: 'Robert Williams',
    department: 'Finance',
    interviewDate: '2026-03-15',
    status: 'completed',
    rating: 5,
    interviewer: 'Jane Richards (HR)',
    responses: [
      { question: 'What prompted your decision to leave?', answer: 'Retirement after 22 years of service. It has been an incredible journey with the company.' },
      { question: 'What did you enjoy most about working here?', answer: 'The people and the culture. I always felt supported by leadership and valued for my contributions.' },
      { question: 'What could the company improve?', answer: 'Invest more in succession planning. I wish we had started my handover process 6 months earlier.' },
      { question: 'Would you recommend this company to others?', answer: 'Absolutely. This is a fantastic place to build a long career.' },
    ],
  },
  {
    id: 2,
    employee: 'Aisha Patel',
    department: 'Product',
    interviewDate: '2026-02-05',
    status: 'completed',
    rating: 4,
    interviewer: 'Tom Henderson (HR)',
    responses: [
      { question: 'What prompted your decision to leave?', answer: 'My contract ended. I would have loved a permanent role but understand the budget constraints.' },
      { question: 'What did you enjoy most about working here?', answer: 'The design team was brilliant. Great collaboration and creative freedom on projects.' },
      { question: 'What could the company improve?', answer: 'Better pathway from contract to permanent roles. Also, the design tooling budget was quite limited.' },
      { question: 'Would you recommend this company to others?', answer: 'Yes, especially for designers looking to grow. The mentorship was excellent.' },
    ],
  },
  {
    id: 3,
    employee: 'Sarah Chen',
    department: 'Engineering',
    interviewDate: '2025-12-20',
    status: 'completed',
    rating: 3,
    interviewer: 'Jane Richards (HR)',
    responses: [
      { question: 'What prompted your decision to leave?', answer: 'I received an offer with a 30% salary increase. I flagged compensation concerns multiple times.' },
      { question: 'What did you enjoy most about working here?', answer: 'The technical challenges were great and I learned a lot from senior engineers.' },
      { question: 'What could the company improve?', answer: 'Compensation benchmarking needs a complete overhaul. We are significantly below market for engineering roles. Also, the promotion criteria are unclear.' },
      { question: 'Would you recommend this company to others?', answer: 'With reservations. Great for learning but you will eventually need to leave for fair compensation.' },
    ],
  },
];

const DEMO_TEMPLATES = [
  { id: 1, name: 'Resignation', reasonType: 'resignation', taskCount: 14, exitInterview: true, description: 'Standard voluntary resignation process' },
  { id: 2, name: 'Termination', reasonType: 'termination', taskCount: 10, exitInterview: false, description: 'Involuntary termination with immediate access revocation' },
  { id: 3, name: 'Redundancy', reasonType: 'redundancy', taskCount: 12, exitInterview: true, description: 'Role redundancy with enhanced support package' },
  { id: 4, name: 'End of Contract', reasonType: 'end_of_contract', taskCount: 11, exitInterview: true, description: 'Fixed-term contract completion process' },
  { id: 5, name: 'Retirement', reasonType: 'retirement', taskCount: 13, exitInterview: true, description: 'Retirement with extended knowledge transfer period' },
];

const REASON_STYLES = {
  resignation: 'bg-blue-100 text-blue-700',
  redundancy: 'bg-amber-100 text-amber-700',
  retirement: 'bg-purple-100 text-purple-700',
  end_of_contract: 'bg-slate-100 text-slate-700',
  termination: 'bg-red-100 text-red-700',
};

const STATUS_STYLES = {
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  not_started: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  declined: 'bg-red-100 text-red-700',
};

const TASK_CATEGORIES = [
  { key: 'access', icon: Lock, label: 'Access & Security', emoji: '' },
  { key: 'equipment', icon: Laptop, label: 'Equipment', emoji: '' },
  { key: 'documents', icon: FileText, label: 'Documents', emoji: '' },
  { key: 'knowledge', icon: Brain, label: 'Knowledge Transfer', emoji: '' },
  { key: 'pay', icon: DollarSign, label: 'Final Pay', emoji: '' },
  { key: 'communication', icon: Megaphone, label: 'Communication', emoji: '' },
];

const TABS = [
  { id: 'active', labelKey: 'offboarding.tabs.active', icon: UserMinus },
  { id: 'interviews', labelKey: 'offboarding.tabs.exitInterviews', icon: MessageSquare },
  { id: 'templates', labelKey: 'offboarding.tabs.templates', icon: ClipboardList },
  { id: 'analytics', labelKey: 'offboarding.tabs.analytics', icon: BarChart3 },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Offboarding() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('active');
  const [offboardings, setOffboardings] = useState(DEMO_OFFBOARDINGS);
  const [selectedOffboarding, setSelectedOffboarding] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showNewOffboarding, setShowNewOffboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New offboarding form
  const [newForm, setNewForm] = useState({
    employee: '',
    lastWorkingDay: '',
    noticeDate: '',
    reason: 'resignation',
    voluntary: true,
    template: 'Resignation',
  });

  // Toggle a task completion
  const toggleTask = (offboardingId, categoryKey, taskId) => {
    setOffboardings(prev => prev.map(ob => {
      if (ob.id !== offboardingId) return ob;
      const updatedTasks = { ...ob.tasks };
      updatedTasks[categoryKey] = updatedTasks[categoryKey].map(task =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );
      const allTasks = Object.values(updatedTasks).flat();
      const completed = allTasks.filter(t => t.done).length;
      return {
        ...ob,
        tasks: updatedTasks,
        progress: { completed, total: allTasks.length },
        status: completed === allTasks.length ? 'completed' : 'in_progress',
      };
    }));
    // Update selected view if open
    if (selectedOffboarding && selectedOffboarding.id === offboardingId) {
      setSelectedOffboarding(prev => {
        const updatedTasks = { ...prev.tasks };
        updatedTasks[categoryKey] = updatedTasks[categoryKey].map(task =>
          task.id === taskId ? { ...task, done: !task.done } : task
        );
        const allTasks = Object.values(updatedTasks).flat();
        const completed = allTasks.filter(t => t.done).length;
        return {
          ...prev,
          tasks: updatedTasks,
          progress: { completed, total: allTasks.length },
          status: completed === allTasks.length ? 'completed' : 'in_progress',
        };
      });
    }
  };

  // ============================================================
  // TAB 1: ACTIVE OFFBOARDINGS
  // ============================================================
  const renderActiveOffboardings = () => {
    const filtered = offboardings.filter(ob =>
      !searchQuery || ob.employee.toLowerCase().includes(searchQuery.toLowerCase()) || ob.department.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('offboarding.search', 'Search by employee or department...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowNewOffboarding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('offboarding.startOffboarding', 'Start Offboarding')}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.table.employee', 'Employee')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.table.role', 'Role')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.table.department', 'Department')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.table.lastDay', 'Last Working Day')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.table.reason', 'Reason')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.table.progress', 'Progress')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.table.status', 'Status')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ob) => (
                  <tr
                    key={ob.id}
                    onClick={() => setSelectedOffboarding(ob)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                          {ob.employee.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{ob.employee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{ob.role}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{ob.department}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{ob.lastWorkingDay}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${REASON_STYLES[ob.reason]}`}>
                        {t(`offboarding.reason.${ob.reason}`, ob.reason.replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${ob.progress.completed === ob.progress.total ? 'bg-green-500' : 'bg-momentum-500'}`}
                            style={{ width: `${(ob.progress.completed / ob.progress.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{ob.progress.completed}/{ob.progress.total}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ob.status]}`}>
                        {t(`offboarding.status.${ob.status}`, ob.status.replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedOffboarding(ob); }}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Offboarding Modal */}
        {showNewOffboarding && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{t('offboarding.new.title', 'Start Offboarding')}</h3>
                <button onClick={() => setShowNewOffboarding(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.employee', 'Employee')}</label>
                  <select
                    value={newForm.employee}
                    onChange={(e) => setNewForm({ ...newForm, employee: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
                  >
                    <option value="">{t('offboarding.new.selectEmployee', 'Select employee...')}</option>
                    <option value="Anna Richardson">Anna Richardson - Product Manager</option>
                    <option value="Ben Clarke">Ben Clarke - Backend Developer</option>
                    <option value="Claire Murphy">Claire Murphy - Account Executive</option>
                    <option value="David Singh">David Singh - Data Analyst</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.noticeDate', 'Notice Date')}</label>
                    <input
                      type="date"
                      value={newForm.noticeDate}
                      onChange={(e) => setNewForm({ ...newForm, noticeDate: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.lastDay', 'Last Working Day')}</label>
                    <input
                      type="date"
                      value={newForm.lastWorkingDay}
                      onChange={(e) => setNewForm({ ...newForm, lastWorkingDay: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.reason', 'Reason')}</label>
                  <select
                    value={newForm.reason}
                    onChange={(e) => setNewForm({ ...newForm, reason: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
                  >
                    <option value="resignation">{t('offboarding.reason.resignation', 'Resignation')}</option>
                    <option value="redundancy">{t('offboarding.reason.redundancy', 'Redundancy')}</option>
                    <option value="retirement">{t('offboarding.reason.retirement', 'Retirement')}</option>
                    <option value="end_of_contract">{t('offboarding.reason.end_of_contract', 'End of Contract')}</option>
                    <option value="termination">{t('offboarding.reason.termination', 'Termination')}</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">{t('offboarding.new.voluntary', 'Voluntary Departure')}</label>
                  <button
                    onClick={() => setNewForm({ ...newForm, voluntary: !newForm.voluntary })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${newForm.voluntary ? 'bg-momentum-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${newForm.voluntary ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('offboarding.new.template', 'Offboarding Template')}</label>
                  <select
                    value={newForm.template}
                    onChange={(e) => setNewForm({ ...newForm, template: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-500"
                  >
                    {DEMO_TEMPLATES.map(tmpl => (
                      <option key={tmpl.id} value={tmpl.name}>{tmpl.name}</option>
                    ))}
                  </select>
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
                  className="flex-1 px-4 py-2.5 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600"
                >
                  {t('offboarding.new.start', 'Start Offboarding')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offboarding Detail Modal */}
        {selectedOffboarding && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{t('offboarding.detail.title', 'Offboarding Dashboard')}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{selectedOffboarding.employee}</p>
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
                      {selectedOffboarding.employee.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900">{selectedOffboarding.employee}</h4>
                      <p className="text-sm text-slate-600">{selectedOffboarding.role} - {selectedOffboarding.department}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${REASON_STYLES[selectedOffboarding.reason]}`}>
                          {t(`offboarding.reason.${selectedOffboarding.reason}`, selectedOffboarding.reason.replace(/_/g, ' '))}
                        </span>
                        {selectedOffboarding.voluntary ? (
                          <span className="text-xs text-slate-500">{t('offboarding.detail.voluntary', 'Voluntary')}</span>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">{t('offboarding.detail.involuntary', 'Involuntary')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[selectedOffboarding.status]}`}>
                        {t(`offboarding.status.${selectedOffboarding.status}`, selectedOffboarding.status.replace(/_/g, ' '))}
                      </span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>{t('offboarding.detail.noticeGiven', 'Notice Given')}</span>
                        <span>{t('offboarding.detail.lastDay', 'Last Day')}</span>
                      </div>
                      <div className="relative w-full bg-slate-200 rounded-full h-2">
                        {(() => {
                          const notice = new Date(selectedOffboarding.noticeDate).getTime();
                          const last = new Date(selectedOffboarding.lastWorkingDay).getTime();
                          const now = new Date().getTime();
                          const pct = Math.min(100, Math.max(0, ((now - notice) / (last - notice)) * 100));
                          return (
                            <div
                              className="bg-momentum-500 h-2 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          );
                        })()}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                        <span>{selectedOffboarding.noticeDate}</span>
                        <span>{selectedOffboarding.lastWorkingDay}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Categories */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900">{t('offboarding.detail.tasks', 'Offboarding Tasks')}</h4>
                    <span className="text-sm text-slate-500">
                      {selectedOffboarding.progress.completed}/{selectedOffboarding.progress.total} {t('offboarding.detail.complete', 'complete')}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {TASK_CATEGORIES.map((cat) => {
                      const tasks = selectedOffboarding.tasks[cat.key] || [];
                      if (tasks.length === 0) return null;
                      const CategoryIcon = cat.icon;
                      const doneCount = tasks.filter(t => t.done).length;
                      return (
                        <div key={cat.key} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryIcon className="w-4 h-4 text-momentum-500" />
                              <span className="text-sm font-semibold text-slate-900">{t(`offboarding.taskCategory.${cat.key}`, cat.label)}</span>
                            </div>
                            <span className="text-xs text-slate-500">{doneCount}/{tasks.length}</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {tasks.map((task) => (
                              <label
                                key={task.id}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={task.done}
                                  onChange={() => toggleTask(selectedOffboarding.id, cat.key, task.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-momentum-500 focus:ring-momentum-500"
                                />
                                <span className={`text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {task.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Exit Interview Section */}
                {selectedOffboarding.exitInterview && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-momentum-500" />
                        <span className="text-sm font-semibold text-slate-900">{t('offboarding.detail.exitInterview', 'Exit Interview')}</span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[selectedOffboarding.exitInterview.status]}`}>
                        {t(`offboarding.interviewStatus.${selectedOffboarding.exitInterview.status}`, selectedOffboarding.exitInterview.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      {t('offboarding.detail.scheduledFor', 'Scheduled for')} {selectedOffboarding.exitInterview.scheduled}
                    </p>
                    {selectedOffboarding.exitInterview.rating && (
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= selectedOffboarding.exitInterview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Rehire Eligibility */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{t('offboarding.detail.rehireEligible', 'Rehire Eligible')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${selectedOffboarding.rehireEligible ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedOffboarding.rehireEligible ? t('offboarding.detail.yes', 'Yes') : t('offboarding.detail.no', 'No')}
                    </span>
                    <button
                      onClick={() => {
                        const updated = { ...selectedOffboarding, rehireEligible: !selectedOffboarding.rehireEligible };
                        setSelectedOffboarding(updated);
                        setOffboardings(prev => prev.map(ob => ob.id === updated.id ? updated : ob));
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${selectedOffboarding.rehireEligible ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${selectedOffboarding.rehireEligible ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // TAB 2: EXIT INTERVIEWS
  // ============================================================
  const renderExitInterviews = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{t('offboarding.interviews.title', 'Exit Interviews')}</h3>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.employee', 'Employee')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.department', 'Department')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.date', 'Interview Date')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.status', 'Status')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.rating', 'Rating')}</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.interviews.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_EXIT_INTERVIEWS.map((interview) => (
              <tr
                key={interview.id}
                onClick={() => setSelectedInterview(interview)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{interview.employee}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{interview.department}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{interview.interviewDate}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[interview.status]}`}>
                    {t(`offboarding.interviewStatus.${interview.status}`, interview.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= interview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedInterview(interview); }} className="p-1 hover:bg-slate-100 rounded">
                    <Eye className="w-4 h-4 text-slate-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interview Detail Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t('offboarding.interviews.detail', 'Exit Interview')}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{selectedInterview.employee} - {selectedInterview.department}</p>
              </div>
              <button onClick={() => setSelectedInterview(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{t('offboarding.interviews.conductedBy', 'Conducted by')}</p>
                  <p className="text-sm font-medium text-slate-900">{selectedInterview.interviewer}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-5 h-5 ${s <= selectedInterview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {selectedInterview.responses.map((response, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-900 mb-2">{response.question}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{response.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  // TAB 3: TEMPLATES
  // ============================================================
  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{t('offboarding.templates.title', 'Offboarding Templates')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t('offboarding.templates.subtitle', 'Pre-configured task checklists for different departure types')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 text-sm font-medium">
          <Plus className="w-4 h-4" />
          {t('offboarding.templates.create', 'Create Template')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.templates.name', 'Template Name')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.templates.reasonType', 'Reason Type')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.templates.description', 'Description')}</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.templates.taskCount', 'Tasks')}</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.templates.exitInterview', 'Exit Interview')}</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('offboarding.templates.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEMO_TEMPLATES.map((template) => (
              <tr key={template.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-momentum-500" />
                    <span className="text-sm font-medium text-slate-900">{template.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${REASON_STYLES[template.reasonType]}`}>
                    {t(`offboarding.reason.${template.reasonType}`, template.reasonType.replace(/_/g, ' '))}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{template.description}</td>
                <td className="px-4 py-3 text-sm text-slate-700 text-center font-medium">{template.taskCount}</td>
                <td className="px-4 py-3 text-center">
                  {template.exitInterview ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-momentum-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================
  // TAB 4: ANALYTICS
  // ============================================================
  const renderAnalytics = () => {
    const reasons = [
      { label: 'Better Opportunity', pct: 35, color: 'bg-blue-500' },
      { label: 'Compensation', pct: 20, color: 'bg-green-500' },
      { label: 'Management', pct: 15, color: 'bg-red-500' },
      { label: 'Work-Life Balance', pct: 12, color: 'bg-purple-500' },
      { label: 'Career Growth', pct: 10, color: 'bg-amber-500' },
      { label: 'Other', pct: 8, color: 'bg-slate-400' },
    ];

    const turnoverByDept = [
      { department: 'Sales', rate: 14.2 },
      { department: 'Engineering', rate: 8.5 },
      { department: 'Marketing', rate: 11.0 },
      { department: 'HR', rate: 5.2 },
      { department: 'Finance', rate: 3.8 },
      { department: 'Product', rate: 7.1 },
    ];
    const maxRate = Math.max(...turnoverByDept.map(d => d.rate));

    const turnoverTrend = [
      { month: 'Feb', leavers: 2 },
      { month: 'Mar', leavers: 1 },
      { month: 'Apr', leavers: 3 },
      { month: 'May', leavers: 1 },
      { month: 'Jun', leavers: 2 },
      { month: 'Jul', leavers: 4 },
      { month: 'Aug', leavers: 2 },
      { month: 'Sep', leavers: 1 },
      { month: 'Oct', leavers: 3 },
      { month: 'Nov', leavers: 2 },
      { month: 'Dec', leavers: 1 },
      { month: 'Jan', leavers: 2 },
    ];
    const maxLeavers = Math.max(...turnoverTrend.map(m => m.leavers));

    const rehirePool = [
      { name: 'Aisha Patel', role: 'UX Designer', department: 'Product', leftDate: '2026-02-07', reason: 'End of Contract', rating: 4 },
      { name: 'Sarah Chen', role: 'Software Engineer', department: 'Engineering', leftDate: '2025-12-20', reason: 'Resignation', rating: 3 },
      { name: 'Marcus Thompson', role: 'Senior Developer', department: 'Engineering', leftDate: '2026-02-14', reason: 'Resignation', rating: 5 },
      { name: 'Linda Okafor', role: 'Marketing Manager', department: 'Marketing', leftDate: '2026-02-28', reason: 'Redundancy', rating: 4 },
    ];

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('offboarding.analytics.leaversQuarter', 'Leavers This Quarter')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">12</p>
              </div>
              <div className="p-3 bg-momentum-50 rounded-lg">
                <UserMinus className="w-5 h-5 text-momentum-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('offboarding.analytics.voluntaryTurnover', 'Voluntary Turnover Rate')}</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">8.2%</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('offboarding.analytics.avgTenure', 'Avg Tenure of Leavers')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{t('offboarding.analytics.years', '2.4 yrs')}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{t('offboarding.analytics.regrettable', 'Regrettable Attrition')}</p>
                <p className="text-2xl font-bold text-red-600 mt-1">3.1%</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reasons for Leaving */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.reasonsForLeaving', 'Reasons for Leaving')}</h4>
            <div className="space-y-3">
              {reasons.map((reason) => (
                <div key={reason.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{t(`offboarding.analytics.reason.${reason.label.toLowerCase().replace(/[^a-z]/g, '')}`, reason.label)}</span>
                    <span className="text-sm font-semibold text-slate-900">{reason.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`${reason.color} h-2.5 rounded-full`} style={{ width: `${reason.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Turnover by Department */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.turnoverByDept', 'Turnover by Department')}</h4>
            <div className="space-y-3">
              {turnoverByDept.map((dept) => (
                <div key={dept.department} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 w-24 flex-shrink-0">{dept.department}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-momentum-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(dept.rate / maxRate) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{dept.rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Turnover Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">{t('offboarding.analytics.turnoverTrend', 'Monthly Turnover Trend (Last 12 Months)')}</h4>
          <div className="flex items-end gap-2 h-48">
            {turnoverTrend.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs font-semibold text-slate-700 mb-1">{month.leavers}</span>
                <div
                  className="w-full bg-momentum-500 rounded-t-lg transition-all hover:bg-momentum-600"
                  style={{ height: `${(month.leavers / maxLeavers) * 100}%` }}
                />
                <span className="text-xs text-slate-500 mt-2">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rehire Pool */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">{t('offboarding.analytics.rehirePool', 'Rehire Pool')}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{t('offboarding.analytics.rehirePoolDesc', 'Former employees marked as eligible for rehire')}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {rehirePool.length} {t('offboarding.analytics.candidates', 'candidates')}
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('offboarding.analytics.name', 'Name')}</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('offboarding.analytics.previousRole', 'Previous Role')}</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('offboarding.analytics.dept', 'Department')}</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('offboarding.analytics.leftDate', 'Left Date')}</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('offboarding.analytics.reason', 'Reason')}</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">{t('offboarding.analytics.exitRating', 'Exit Rating')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rehirePool.map((person) => (
                <tr key={person.name} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                        <RefreshCw className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{person.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{person.role}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{person.department}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{person.leftDate}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{person.reason}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= person.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <p className="text-sm text-slate-500 mt-1">{t('offboarding.subtitle', 'Manage employee departures, exit interviews and analytics')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
            <Download className="w-4 h-4" />
            {t('offboarding.export', 'Export')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-momentum-500 text-momentum-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey, tab.id)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'active' && renderActiveOffboardings()}
      {activeTab === 'interviews' && renderExitInterviews()}
      {activeTab === 'templates' && renderTemplates()}
      {activeTab === 'analytics' && renderAnalytics()}
    </div>
  );
}
