// ============================================================
// PERFORMANCE MANAGEMENT PAGE
// Review cycles, goals & OKRs, 1-on-1 meetings,
// continuous feedback, and development plans
// ============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  ClipboardCheck, Target, Users, MessageSquare, BookOpen,
  Plus, X, ChevronRight, ChevronDown, Star, Calendar,
  Clock, CheckCircle, AlertCircle, TrendingUp, Award,
  Heart, ThumbsUp, Sparkles, Eye, Edit3, BarChart3,
  ArrowRight, Filter, Search, RotateCcw, UserCheck,
  Smile, Meh, Frown, FileText, Briefcase, Flag
} from 'lucide-react';

// ============================================================
// DEMO DATA
// ============================================================

const EMPLOYEES = [
  { id: 1, name: 'Sarah Chen', role: 'VP Operations', initials: 'SC', dept: 'Operations' },
  { id: 2, name: 'Marcus Johnson', role: 'Production Manager', initials: 'MJ', dept: 'Production' },
  { id: 3, name: 'Priya Patel', role: 'Quality Lead', initials: 'PP', dept: 'Quality' },
  { id: 4, name: 'James Wilson', role: 'Shift Supervisor', initials: 'JW', dept: 'Production' },
  { id: 5, name: 'Ana Rodriguez', role: 'HR Director', initials: 'AR', dept: 'Human Resources' },
  { id: 6, name: 'Thomas Brown', role: 'Engineering Manager', initials: 'TB', dept: 'Engineering' },
  { id: 7, name: 'Lisa Zhang', role: 'Safety Officer', initials: 'LZ', dept: 'EHS' },
  { id: 8, name: 'David Kim', role: 'Warehouse Lead', initials: 'DK', dept: 'Logistics' },
];

const REVIEW_CYCLES = [
  { id: 1, name: 'Annual Performance Review 2025', type: 'annual', status: 'active', startDate: '2025-01-15', endDate: '2025-02-28', completed: 312, total: 487, selfAssessment: true, managerReview: true, peerReview: true,
    employees: [
      { employeeId: 1, name: 'Sarah Chen', dept: 'Operations', selfDone: true, managerDone: true, peerDone: false, rating: 4.5 },
      { employeeId: 2, name: 'Marcus Johnson', dept: 'Production', selfDone: true, managerDone: false, peerDone: false, rating: null },
      { employeeId: 3, name: 'Priya Patel', dept: 'Quality', selfDone: true, managerDone: true, peerDone: true, rating: 4.8 },
      { employeeId: 4, name: 'James Wilson', dept: 'Production', selfDone: false, managerDone: false, peerDone: false, rating: null },
      { employeeId: 6, name: 'Thomas Brown', dept: 'Engineering', selfDone: true, managerDone: true, peerDone: true, rating: 4.2 },
    ]},
  { id: 2, name: 'Q1 2025 Quarterly Check-in', type: 'quarterly', status: 'in_review', startDate: '2025-03-01', endDate: '2025-03-31', completed: 198, total: 487, selfAssessment: true, managerReview: true, peerReview: false,
    employees: [
      { employeeId: 5, name: 'Ana Rodriguez', dept: 'Human Resources', selfDone: true, managerDone: true, peerDone: false, rating: 4.6 },
      { employeeId: 7, name: 'Lisa Zhang', dept: 'EHS', selfDone: true, managerDone: false, peerDone: false, rating: null },
      { employeeId: 8, name: 'David Kim', dept: 'Logistics', selfDone: false, managerDone: false, peerDone: false, rating: null },
    ]},
  { id: 3, name: '360-Degree Leadership Assessment', type: '360', status: 'calibration', startDate: '2025-01-01', endDate: '2025-01-31', completed: 24, total: 32, selfAssessment: true, managerReview: true, peerReview: true,
    employees: [
      { employeeId: 1, name: 'Sarah Chen', dept: 'Operations', selfDone: true, managerDone: true, peerDone: true, rating: 4.7 },
      { employeeId: 6, name: 'Thomas Brown', dept: 'Engineering', selfDone: true, managerDone: true, peerDone: true, rating: 4.3 },
    ]},
  { id: 4, name: 'Probation Review - New Hires Jan 2025', type: 'probation', status: 'completed', startDate: '2025-01-01', endDate: '2025-03-31', completed: 18, total: 18, selfAssessment: false, managerReview: true, peerReview: false,
    employees: [
      { employeeId: 4, name: 'James Wilson', dept: 'Production', selfDone: false, managerDone: true, peerDone: false, rating: 3.8 },
    ]},
  { id: 5, name: 'Q2 2025 Quarterly Review', type: 'quarterly', status: 'draft', startDate: '2025-06-01', endDate: '2025-06-30', completed: 0, total: 487, selfAssessment: true, managerReview: true, peerReview: false,
    employees: [] },
];

const GOALS = [
  { id: 1, title: 'Increase Production Efficiency by 15%', level: 'company', owner: 'Sarah Chen', progress: 62, status: 'on_track', department: 'Operations',
    keyResults: [
      { id: 'kr1', title: 'Reduce machine downtime to < 3%', progress: 75, target: '3%', current: '3.8%' },
      { id: 'kr2', title: 'Implement lean manufacturing in 4 lines', progress: 50, target: '4 lines', current: '2 lines' },
      { id: 'kr3', title: 'Reduce scrap rate by 20%', progress: 60, target: '20% reduction', current: '12% reduction' },
    ]},
  { id: 2, title: 'Achieve Zero Lost-Time Incidents', level: 'company', owner: 'Lisa Zhang', progress: 88, status: 'on_track', department: 'EHS',
    keyResults: [
      { id: 'kr4', title: 'Complete safety training for 100% of staff', progress: 92, target: '900 employees', current: '828 employees' },
      { id: 'kr5', title: 'Conduct monthly safety audits across all facilities', progress: 83, target: '12 audits', current: '10 audits' },
    ]},
  { id: 3, title: 'Reduce Quality Defects by 25%', level: 'department', owner: 'Priya Patel', progress: 45, status: 'at_risk', department: 'Quality',
    keyResults: [
      { id: 'kr6', title: 'Implement SPC on critical processes', progress: 60, target: '8 processes', current: '5 processes' },
      { id: 'kr7', title: 'Reduce customer complaints by 30%', progress: 35, target: '30% reduction', current: '11% reduction' },
      { id: 'kr8', title: 'Achieve ISO 9001 re-certification', progress: 40, target: 'Certified', current: 'Audit scheduled' },
    ]},
  { id: 4, title: 'Optimize Warehouse Operations', level: 'department', owner: 'David Kim', progress: 30, status: 'off_track', department: 'Logistics',
    keyResults: [
      { id: 'kr9', title: 'Reduce order fulfillment time by 20%', progress: 25, target: '20% reduction', current: '5% reduction' },
      { id: 'kr10', title: 'Implement barcode scanning system', progress: 35, target: 'Full deployment', current: 'Pilot phase' },
    ]},
  { id: 5, title: 'Launch Employee Development Program', level: 'department', owner: 'Ana Rodriguez', progress: 72, status: 'on_track', department: 'Human Resources',
    keyResults: [
      { id: 'kr11', title: 'Create career paths for all departments', progress: 80, target: '8 departments', current: '6 departments' },
      { id: 'kr12', title: 'Enroll 200 employees in upskilling courses', progress: 65, target: '200 employees', current: '130 employees' },
    ]},
  { id: 6, title: 'Improve Production Line Throughput', level: 'individual', owner: 'Marcus Johnson', progress: 55, status: 'on_track', department: 'Production',
    keyResults: [
      { id: 'kr13', title: 'Reduce changeover time by 30%', progress: 60, target: '30% reduction', current: '18% reduction' },
      { id: 'kr14', title: 'Achieve 95% OEE on Line A', progress: 50, target: '95% OEE', current: '91% OEE' },
    ]},
  { id: 7, title: 'Develop Predictive Maintenance System', level: 'individual', owner: 'Thomas Brown', progress: 40, status: 'at_risk', department: 'Engineering',
    keyResults: [
      { id: 'kr15', title: 'Install IoT sensors on 20 critical assets', progress: 55, target: '20 assets', current: '11 assets' },
      { id: 'kr16', title: 'Build ML model for failure prediction', progress: 25, target: 'Production model', current: 'Data collection' },
    ]},
  { id: 8, title: 'Cross-train Shift Team Members', level: 'individual', owner: 'James Wilson', progress: 68, status: 'on_track', department: 'Production',
    keyResults: [
      { id: 'kr17', title: 'Each team member certified on 3+ stations', progress: 70, target: '12 members', current: '8 members' },
      { id: 'kr18', title: 'Reduce dependency on single-skilled operators', progress: 65, target: '0 single-skill', current: '4 remaining' },
    ]},
];

const ONE_ON_ONES = [
  { id: 1, manager: EMPLOYEES[0], employee: EMPLOYEES[1], date: '2025-02-10', time: '10:00', recurring: 'weekly', status: 'upcoming',
    agenda: ['Review production targets for Q1', 'Discuss team hiring needs', 'Follow up on equipment maintenance request'],
    notes: 'Marcus raised concerns about overtime levels on Line B. Action: review scheduling with HR.',
    actionItems: [
      { id: 'a1', text: 'Submit equipment purchase request by Feb 14', done: false },
      { id: 'a2', text: 'Review Line B overtime reports', done: true },
      { id: 'a3', text: 'Schedule team building activity for March', done: false },
    ], mood: 4 },
  { id: 2, manager: EMPLOYEES[4], employee: EMPLOYEES[6], date: '2025-02-11', time: '14:00', recurring: 'biweekly', status: 'upcoming',
    agenda: ['Safety audit findings review', 'Training completion rates', 'Incident near-miss discussion'],
    notes: '',
    actionItems: [
      { id: 'a4', text: 'Prepare safety audit report for board', done: false },
      { id: 'a5', text: 'Update emergency evacuation procedures', done: false },
    ], mood: 3 },
  { id: 3, manager: EMPLOYEES[0], employee: EMPLOYEES[2], date: '2025-02-12', time: '09:00', recurring: 'weekly', status: 'upcoming',
    agenda: ['Quality metrics weekly review', 'Customer complaint follow-up', 'ISO audit preparation status'],
    notes: 'Priya is confident about the ISO audit timeline. Need to finalize documentation.',
    actionItems: [
      { id: 'a6', text: 'Compile quality metrics dashboard', done: true },
      { id: 'a7', text: 'Send customer response letters', done: true },
      { id: 'a8', text: 'Review audit checklist with team', done: false },
    ], mood: 5 },
  { id: 4, manager: EMPLOYEES[5], employee: EMPLOYEES[3], date: '2025-02-13', time: '11:00', recurring: 'monthly', status: 'upcoming',
    agenda: ['Performance check-in post-probation', 'Skill development progress', 'Shift scheduling feedback'],
    notes: '',
    actionItems: [
      { id: 'a9', text: 'Complete forklift certification renewal', done: false },
    ], mood: null },
  { id: 5, manager: EMPLOYEES[4], employee: EMPLOYEES[0], date: '2025-02-14', time: '15:00', recurring: 'monthly', status: 'upcoming',
    agenda: ['Leadership development plan review', 'Succession planning discussion', 'Budget review for Q2'],
    notes: 'Sarah is interested in executive coaching program.',
    actionItems: [
      { id: 'a10', text: 'Research executive coaching providers', done: false },
      { id: 'a11', text: 'Prepare succession planning document', done: false },
    ], mood: 4 },
  { id: 6, manager: EMPLOYEES[0], employee: EMPLOYEES[7], date: '2025-02-07', time: '10:00', recurring: 'biweekly', status: 'completed',
    agenda: ['Warehouse KPIs review', 'Barcode system implementation update', 'Staffing levels discussion'],
    notes: 'David presented the barcode pilot results. Positive ROI projected. Proceeding with full rollout.',
    actionItems: [
      { id: 'a12', text: 'Submit barcode system full rollout proposal', done: true },
      { id: 'a13', text: 'Hire 2 additional warehouse associates', done: false },
    ], mood: 4 },
];

const FEEDBACK_ITEMS = [
  { id: 1, from: EMPLOYEES[0], to: EMPLOYEES[2], type: 'praise', message: 'Priya went above and beyond leading the ISO 9001 audit preparation. Her attention to detail and ability to rally the team around quality standards has been exceptional. The auditors were impressed with our documentation.', value: 'Excellence', timestamp: '2025-02-04T09:30:00', public: true, reactions: { thumbsUp: 12, heart: 5, sparkle: 3 } },
  { id: 2, from: EMPLOYEES[4], to: EMPLOYEES[1], type: 'praise', message: 'Marcus demonstrated outstanding leadership during the production surge last week. He reorganized shift schedules to meet demand while keeping overtime within budget.', value: 'Leadership', timestamp: '2025-02-03T14:15:00', public: true, reactions: { thumbsUp: 8, heart: 3, sparkle: 1 } },
  { id: 3, from: EMPLOYEES[5], to: EMPLOYEES[3], type: 'praise', message: 'James has shown remarkable growth since completing his probation period. His shift team consistently meets production targets and maintains strong safety records.', value: 'Growth', timestamp: '2025-02-02T11:00:00', public: true, reactions: { thumbsUp: 6, heart: 4, sparkle: 2 } },
  { id: 4, from: EMPLOYEES[0], to: EMPLOYEES[6], type: 'constructive', message: 'Lisa, while your safety audit reports are thorough, we could improve how we communicate findings to production teams. Consider creating visual summaries for the shop floor.', value: 'Communication', timestamp: '2025-02-01T16:30:00', public: false, reactions: { thumbsUp: 0, heart: 0, sparkle: 0 } },
  { id: 5, from: EMPLOYEES[2], to: EMPLOYEES[1], type: 'praise', message: 'Thank you Marcus for immediately addressing the quality concern on Line C. Your quick response prevented a potential batch recall and saved us significant costs.', value: 'Accountability', timestamp: '2025-01-31T08:45:00', public: true, reactions: { thumbsUp: 15, heart: 7, sparkle: 4 } },
  { id: 6, from: EMPLOYEES[7], to: EMPLOYEES[5], type: 'request', message: 'Thomas, could you provide engineering support for the new barcode scanner mounting solutions? We need brackets designed for the warehouse racking system.', value: 'Collaboration', timestamp: '2025-01-30T13:20:00', public: false, reactions: { thumbsUp: 2, heart: 0, sparkle: 0 } },
  { id: 7, from: EMPLOYEES[4], to: EMPLOYEES[0], type: 'praise', message: 'Sarah\'s strategic vision for operations transformation has been a driving force this quarter. The production efficiency improvements are directly tied to her leadership in championing lean manufacturing.', value: 'Innovation', timestamp: '2025-01-29T10:00:00', public: true, reactions: { thumbsUp: 20, heart: 9, sparkle: 6 } },
  { id: 8, from: EMPLOYEES[1], to: EMPLOYEES[7], type: 'praise', message: 'David has been fantastic to work with on the inventory accuracy initiative. His warehouse team reduced discrepancies by 40% in just two months.', value: 'Teamwork', timestamp: '2025-01-28T15:45:00', public: true, reactions: { thumbsUp: 10, heart: 4, sparkle: 2 } },
];

const DEVELOPMENT_PLANS = [
  { id: 1, employeeId: 2, employee: 'Marcus Johnson', title: 'Path to Senior Production Manager', status: 'active', reviewDate: '2025-06-30',
    focusAreas: [
      { id: 'f1', title: 'Strategic Leadership', actions: [
        { id: 'act1', text: 'Complete Leadership Excellence program', type: 'training', status: 'in_progress' },
        { id: 'act2', text: 'Lead cross-functional process improvement project', type: 'stretch', status: 'pending' },
        { id: 'act3', text: 'Read "The Toyota Way" by Jeffrey Liker', type: 'reading', status: 'completed' },
      ]},
      { id: 'f2', title: 'Financial Acumen', actions: [
        { id: 'act4', text: 'Shadow Finance team during budget cycle', type: 'stretch', status: 'pending' },
        { id: 'act5', text: 'Complete manufacturing cost accounting course', type: 'training', status: 'in_progress' },
      ]},
    ]},
  { id: 2, employeeId: 3, employee: 'Priya Patel', title: 'Quality Director Development', status: 'active', reviewDate: '2025-09-30',
    focusAreas: [
      { id: 'f3', title: 'Six Sigma Black Belt', actions: [
        { id: 'act6', text: 'Enroll in Six Sigma Black Belt certification', type: 'training', status: 'in_progress' },
        { id: 'act7', text: 'Lead two DMAIC projects', type: 'stretch', status: 'in_progress' },
      ]},
      { id: 'f4', title: 'People Management', actions: [
        { id: 'act8', text: 'Mentor two junior quality analysts', type: 'mentoring', status: 'in_progress' },
        { id: 'act9', text: 'Attend management coaching workshop', type: 'training', status: 'pending' },
        { id: 'act10', text: 'Read "Crucial Conversations"', type: 'reading', status: 'completed' },
      ]},
    ]},
  { id: 3, employeeId: 4, employee: 'James Wilson', title: 'Shift Supervisor Skills Development', status: 'active', reviewDate: '2025-04-30',
    focusAreas: [
      { id: 'f5', title: 'Technical Skills Expansion', actions: [
        { id: 'act11', text: 'Complete advanced CNC programming course', type: 'training', status: 'pending' },
        { id: 'act12', text: 'Cross-train on 3 additional production stations', type: 'stretch', status: 'in_progress' },
      ]},
      { id: 'f6', title: 'Team Leadership', actions: [
        { id: 'act13', text: 'Pair with Thomas Brown for mentoring sessions', type: 'mentoring', status: 'in_progress' },
        { id: 'act14', text: 'Lead daily stand-up meetings independently', type: 'stretch', status: 'completed' },
      ]},
    ]},
  { id: 4, employeeId: 8, employee: 'David Kim', title: 'Logistics Operations Advancement', status: 'draft', reviewDate: '2025-07-31',
    focusAreas: [
      { id: 'f7', title: 'Supply Chain Management', actions: [
        { id: 'act15', text: 'Pursue APICS CSCP certification', type: 'training', status: 'pending' },
        { id: 'act16', text: 'Lead warehouse automation feasibility study', type: 'stretch', status: 'pending' },
        { id: 'act17', text: 'Read "The Goal" by Eliyahu Goldratt', type: 'reading', status: 'pending' },
      ]},
      { id: 'f8', title: 'Data-Driven Decision Making', actions: [
        { id: 'act18', text: 'Complete data analytics for operations course', type: 'training', status: 'pending' },
        { id: 'act19', text: 'Build warehouse performance dashboard', type: 'stretch', status: 'pending' },
      ]},
    ]},
];

const TABS = [
  { id: 'reviews', icon: ClipboardCheck, labelKey: 'performance.reviewCycles' },
  { id: 'goals', icon: Target, labelKey: 'performance.goalsOkrs' },
  { id: 'oneOnOnes', icon: Users, labelKey: 'performance.oneOnOnes' },
  { id: 'feedback', icon: MessageSquare, labelKey: 'performance.continuousFeedback' },
  { id: 'development', icon: BookOpen, labelKey: 'performance.developmentPlans' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Performance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const visibleTabs = isManager ? TABS : TABS.filter(t => ['reviews', 'goals', 'feedback', 'development'].includes(t.id));
  const [activeTab, setActiveTab] = useState('reviews');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isManager ? t('performance.title', 'Performance Management') : t('performance.myTitle', 'My Performance')}
        </h1>
        <p className="text-slate-500 mt-1">
          {isManager ? t('performance.subtitle', 'Reviews, goals, feedback, and employee development') : t('performance.mySubtitle', 'Your reviews, goals, and development')}
        </p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
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
      {activeTab === 'reviews' && <ReviewCyclesTab />}
      {activeTab === 'goals' && <GoalsTab />}
      {activeTab === 'oneOnOnes' && <OneOnOnesTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
      {activeTab === 'development' && <DevelopmentPlansTab />}
    </div>
  );
}

// ============================================================
// TAB 1: REVIEW CYCLES
// ============================================================

function ReviewCyclesTab() {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [cycles] = useState(REVIEW_CYCLES);

  const activeCycles = cycles.filter(c => c.status === 'active' || c.status === 'in_review').length;
  const totalCompleted = cycles.reduce((sum, c) => sum + c.completed, 0);
  const avgRating = (() => {
    const rated = cycles.flatMap(c => c.employees).filter(e => e.rating);
    return rated.length ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1) : '0.0';
  })();
  const pendingReviews = cycles.reduce((sum, c) => sum + (c.total - c.completed), 0);

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-600',
      active: 'bg-blue-100 text-blue-700',
      in_review: 'bg-amber-100 text-amber-700',
      calibration: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
    };
    const labels = {
      draft: t('performance.statusDraft', 'Draft'),
      active: t('performance.statusActive', 'Active'),
      in_review: t('performance.statusInReview', 'In Review'),
      calibration: t('performance.statusCalibration', 'Calibration'),
      completed: t('performance.statusCompleted', 'Completed'),
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const labels = {
      annual: t('performance.typeAnnual', 'Annual'),
      quarterly: t('performance.typeQuarterly', 'Quarterly'),
      '360': t('performance.type360', '360-Degree'),
      probation: t('performance.typeProbation', 'Probation'),
    };
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
        {labels[type] || type}
      </span>
    );
  };

  if (selectedCycle) {
    return (
      <CycleDetailView
        cycle={selectedCycle}
        onBack={() => setSelectedCycle(null)}
        getStatusBadge={getStatusBadge}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{activeCycles}</p>
              <p className="text-sm text-slate-500">{t('performance.activeCycles', 'Active Cycles')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{totalCompleted}</p>
              <p className="text-sm text-slate-500">{t('performance.reviewsCompleted', 'Reviews Completed')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Star className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{avgRating}</p>
              <p className="text-sm text-slate-500">{t('performance.avgRating', 'Avg Rating')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-momentum-100 rounded-xl">
              <Clock className="w-6 h-6 text-momentum-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{pendingReviews}</p>
              <p className="text-sm text-slate-500">{t('performance.pendingReviews', 'Pending Reviews')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('performance.allCycles', 'All Review Cycles')}
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('performance.createCycle', 'Create Review Cycle')}
        </button>
      </div>

      {/* Cycles Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.cycleName', 'Cycle Name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.type', 'Type')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.status', 'Status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.period', 'Period')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.completion', 'Completion')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cycles.map(cycle => {
              const pct = cycle.total > 0 ? Math.round((cycle.completed / cycle.total) * 100) : 0;
              return (
                <tr key={cycle.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedCycle(cycle)}
                      className="font-medium text-slate-900 hover:text-momentum-600 transition-colors text-left"
                    >
                      {cycle.name}
                    </button>
                  </td>
                  <td className="px-6 py-4">{getTypeBadge(cycle.type)}</td>
                  <td className="px-6 py-4">{getStatusBadge(cycle.status)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {cycle.startDate} - {cycle.endDate}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {cycle.completed}/{cycle.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCycle(cycle)}
                        className="p-1.5 text-slate-400 hover:text-momentum-600 hover:bg-momentum-50 rounded-lg transition-colors"
                        title={t('performance.viewDetails', 'View Details')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('performance.edit', 'Edit')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Review Cycle Modal */}
      {showCreateModal && (
        <CreateCycleModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CycleDetailView({ cycle, onBack, getStatusBadge }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        {t('performance.backToCycles', 'Back to Review Cycles')}
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{cycle.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{cycle.startDate} - {cycle.endDate}</p>
          </div>
          {getStatusBadge(cycle.status)}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">{t('performance.selfAssessment', 'Self-Assessment')}</p>
            <p className="font-semibold text-slate-900">{cycle.selfAssessment ? t('performance.enabled', 'Enabled') : t('performance.disabled', 'Disabled')}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">{t('performance.managerReview', 'Manager Review')}</p>
            <p className="font-semibold text-slate-900">{cycle.managerReview ? t('performance.enabled', 'Enabled') : t('performance.disabled', 'Disabled')}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">{t('performance.peerReview', 'Peer Review')}</p>
            <p className="font-semibold text-slate-900">{cycle.peerReview ? t('performance.enabled', 'Enabled') : t('performance.disabled', 'Disabled')}</p>
          </div>
        </div>
      </div>

      {/* Employee Review Status Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">
            {t('performance.employeeReviewStatus', 'Employee Review Status')}
          </h3>
        </div>
        {cycle.employees.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t('performance.noEmployeesInCycle', 'No employees assigned to this cycle yet')}</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('performance.employee', 'Employee')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('performance.department', 'Department')}</th>
                {cycle.selfAssessment && <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('performance.self', 'Self')}</th>}
                {cycle.managerReview && <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('performance.manager', 'Manager')}</th>}
                {cycle.peerReview && <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('performance.peer', 'Peer')}</th>}
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('performance.rating', 'Rating')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cycle.employees.map(emp => (
                <tr key={emp.employeeId} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{emp.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{emp.dept}</td>
                  {cycle.selfAssessment && (
                    <td className="px-6 py-4 text-center">
                      {emp.selfDone
                        ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        : <Clock className="w-5 h-5 text-slate-300 mx-auto" />}
                    </td>
                  )}
                  {cycle.managerReview && (
                    <td className="px-6 py-4 text-center">
                      {emp.managerDone
                        ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        : <Clock className="w-5 h-5 text-slate-300 mx-auto" />}
                    </td>
                  )}
                  {cycle.peerReview && (
                    <td className="px-6 py-4 text-center">
                      {emp.peerDone
                        ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        : <Clock className="w-5 h-5 text-slate-300 mx-auto" />}
                    </td>
                  )}
                  <td className="px-6 py-4 text-center">
                    {emp.rating ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {emp.rating}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">{t('performance.pending', 'Pending')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CreateCycleModal({ onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '', type: 'annual', startDate: '', endDate: '',
    selfAssessment: true, managerReview: true, peerReview: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('performance.createReviewCycle', 'Create Review Cycle')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.cycleName', 'Cycle Name')} *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('performance.cycleNamePlaceholder', 'e.g. Annual Performance Review 2025')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.reviewType', 'Review Type')} *
            </label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="annual">{t('performance.typeAnnual', 'Annual')}</option>
              <option value="quarterly">{t('performance.typeQuarterly', 'Quarterly')}</option>
              <option value="360">{t('performance.type360', '360-Degree')}</option>
              <option value="probation">{t('performance.typeProbation', 'Probation')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('performance.startDate', 'Start Date')} *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('performance.endDate', 'End Date')} *
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-slate-700">{t('performance.reviewComponents', 'Review Components')}</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.selfAssessment}
                onChange={e => setForm({ ...form, selfAssessment: e.target.checked })}
                className="h-4 w-4 text-momentum-500 rounded border-slate-300 focus:ring-momentum-500"
              />
              <span className="text-sm text-slate-700">{t('performance.selfAssessment', 'Self-Assessment')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.managerReview}
                onChange={e => setForm({ ...form, managerReview: e.target.checked })}
                className="h-4 w-4 text-momentum-500 rounded border-slate-300 focus:ring-momentum-500"
              />
              <span className="text-sm text-slate-700">{t('performance.managerReview', 'Manager Review')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.peerReview}
                onChange={e => setForm({ ...form, peerReview: e.target.checked })}
                className="h-4 w-4 text-momentum-500 rounded border-slate-300 focus:ring-momentum-500"
              />
              <span className="text-sm text-slate-700">{t('performance.peerReview', 'Peer Review')}</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors"
            >
              {t('performance.createCycle', 'Create Review Cycle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TAB 2: GOALS & OKRs
// ============================================================

function GoalsTab() {
  const { t } = useTranslation();
  const [goalView, setGoalView] = useState('company');
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState(null);

  const viewOptions = [
    { id: 'company', label: t('performance.companyGoals', 'Company Goals') },
    { id: 'department', label: t('performance.teamGoals', 'Team Goals') },
    { id: 'individual', label: t('performance.myGoals', 'My Goals') },
  ];

  const filteredGoals = GOALS.filter(g => g.level === goalView);

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
      case 'at_risk': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
      case 'off_track': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'on_track': return t('performance.onTrack', 'On Track');
      case 'at_risk': return t('performance.atRisk', 'At Risk');
      case 'off_track': return t('performance.offTrack', 'Off Track');
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle + Create */}
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 rounded-lg p-1">
          {viewOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setGoalView(opt.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                goalView === opt.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateGoal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('performance.createGoal', 'Create Goal')}
        </button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900">{t('performance.noGoalsFound', 'No goals found')}</h3>
            <p className="text-sm text-slate-500 mt-1">{t('performance.createFirstGoal', 'Create your first goal to get started')}</p>
          </div>
        ) : (
          filteredGoals.map(goal => {
            const statusStyle = getStatusColor(goal.status);
            const isExpanded = expandedGoal === goal.id;
            return (
              <div key={goal.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{goal.title}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {getStatusLabel(goal.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          {goal.owner}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {goal.department}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{goal.progress}%</p>
                        <p className="text-xs text-slate-500">{t('performance.progress', 'Progress')}</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.status === 'on_track' ? 'bg-green-500' :
                        goal.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                {/* Key Results */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <Flag className="w-4 h-4" />
                      {t('performance.keyResults', 'Key Results')}
                    </h4>
                    <div className="space-y-4">
                      {goal.keyResults.map(kr => (
                        <div key={kr.id} className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-900">{kr.title}</p>
                            <span className="text-sm font-semibold text-slate-600">{kr.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full bg-momentum-500 rounded-full transition-all"
                              style={{ width: `${kr.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('performance.current', 'Current')}: {kr.current}</span>
                            <span>{t('performance.target', 'Target')}: {kr.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreateGoal && (
        <CreateGoalModal onClose={() => setShowCreateGoal(false)} />
      )}
    </div>
  );
}

function CreateGoalModal({ onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: '', level: 'individual', owner: '', department: '',
    targetDate: '', description: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('performance.createNewGoal', 'Create New Goal')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.goalTitle', 'Goal Title')} *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('performance.goalTitlePlaceholder', 'e.g. Increase production efficiency by 15%')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.goalLevel', 'Goal Level')} *
            </label>
            <select
              value={form.level}
              onChange={e => setForm({ ...form, level: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="company">{t('performance.company', 'Company')}</option>
              <option value="department">{t('performance.department', 'Department')}</option>
              <option value="individual">{t('performance.individual', 'Individual')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.owner', 'Owner')} *
            </label>
            <select
              value={form.owner}
              onChange={e => setForm({ ...form, owner: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="">{t('performance.selectOwner', 'Select an owner...')}</option>
              {EMPLOYEES.map(emp => (
                <option key={emp.id} value={emp.name}>{emp.name} - {emp.role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.targetDate', 'Target Date')}
            </label>
            <input
              type="date"
              value={form.targetDate}
              onChange={e => setForm({ ...form, targetDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.description', 'Description')}
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('performance.descriptionPlaceholder', 'Describe the goal and expected outcomes...')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors">
              {t('performance.createGoal', 'Create Goal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TAB 3: 1-ON-1 MEETINGS
// ============================================================

function OneOnOnesTab() {
  const { t } = useTranslation();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetings, setMeetings] = useState(ONE_ON_ONES);

  const upcomingMeetings = meetings.filter(m => m.status === 'upcoming');
  const completedMeetings = meetings.filter(m => m.status === 'completed');

  const getRecurringBadge = (recurring) => {
    const labels = {
      weekly: t('performance.weekly', 'Weekly'),
      biweekly: t('performance.biweekly', 'Biweekly'),
      monthly: t('performance.monthly', 'Monthly'),
    };
    const colors = {
      weekly: 'bg-blue-100 text-blue-700',
      biweekly: 'bg-purple-100 text-purple-700',
      monthly: 'bg-slate-100 text-slate-600',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[recurring] || colors.monthly}`}>
        <RotateCcw className="w-3 h-3" />
        {labels[recurring] || recurring}
      </span>
    );
  };

  const getMoodEmoji = (mood) => {
    const moods = ['', '\u{1F622}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F60A}'];
    return moods[mood] || '';
  };

  if (selectedMeeting) {
    return (
      <MeetingDetailView
        meeting={selectedMeeting}
        meetings={meetings}
        setMeetings={setMeetings}
        onBack={() => setSelectedMeeting(null)}
        getMoodEmoji={getMoodEmoji}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('performance.upcomingMeetings', 'Upcoming 1-on-1 Meetings')}
        </h2>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('performance.schedule1on1', 'Schedule 1-on-1')}
        </button>
      </div>

      {/* Upcoming */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {upcomingMeetings.map(meeting => (
          <div
            key={meeting.id}
            onClick={() => setSelectedMeeting(meeting)}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-momentum-300 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-semibold flex-shrink-0">
                {meeting.employee.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-slate-900">{meeting.employee.name}</h3>
                  {getRecurringBadge(meeting.recurring)}
                </div>
                <p className="text-sm text-slate-500">{meeting.employee.role}</p>
                <div className="flex items-center gap-3 mt-3 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {meeting.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {meeting.time}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {t('performance.withManager', 'with')} {meeting.manager.name}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Completed Section */}
      {completedMeetings.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-900 pt-2">
            {t('performance.recentlyCompleted', 'Recently Completed')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedMeetings.map(meeting => (
              <div
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className="bg-white rounded-xl border border-slate-200 p-5 opacity-75 hover:opacity-100 hover:border-slate-300 cursor-pointer transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold flex-shrink-0">
                    {meeting.employee.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-700">{meeting.employee.name}</h3>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-sm text-slate-500">{meeting.employee.role}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                      <span>{meeting.date}</span>
                      <span>{meeting.time}</span>
                      {meeting.mood && <span className="text-base">{getMoodEmoji(meeting.mood)}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleMeetingModal onClose={() => setShowScheduleModal(false)} />
      )}
    </div>
  );
}

function MeetingDetailView({ meeting, meetings, setMeetings, onBack, getMoodEmoji }) {
  const { t } = useTranslation();
  const [selectedMood, setSelectedMood] = useState(meeting.mood);

  const toggleActionItem = (actionId) => {
    setMeetings(prev => prev.map(m => {
      if (m.id !== meeting.id) return m;
      return {
        ...m,
        actionItems: m.actionItems.map(a =>
          a.id === actionId ? { ...a, done: !a.done } : a
        ),
      };
    }));
  };

  const currentMeeting = meetings.find(m => m.id === meeting.id) || meeting;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        {t('performance.backToMeetings', 'Back to 1-on-1 Meetings')}
      </button>

      {/* Meeting Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-bold text-lg">
            {meeting.employee.initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">
              {t('performance.oneOnOneWith', '1-on-1 with')} {meeting.employee.name}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              <span>{meeting.employee.role}</span>
              <span>{meeting.date} {t('performance.at', 'at')} {meeting.time}</span>
              <span>{t('performance.withManager', 'with')} {meeting.manager.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Agenda + Notes */}
        <div className="col-span-2 space-y-6">
          {/* Agenda */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                {t('performance.sharedAgenda', 'Shared Agenda')}
              </h3>
            </div>
            <div className="p-6">
              {meeting.agenda.length === 0 ? (
                <p className="text-sm text-slate-400">{t('performance.noAgendaItems', 'No agenda items yet')}</p>
              ) : (
                <ul className="space-y-3">
                  {meeting.agenda.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Meeting Notes */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-400" />
                {t('performance.meetingNotes', 'Meeting Notes')}
              </h3>
            </div>
            <div className="p-6">
              {meeting.notes ? (
                <p className="text-sm text-slate-700 leading-relaxed">{meeting.notes}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">{t('performance.noNotesYet', 'No notes yet. Notes will appear here after the meeting.')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Items */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                {t('performance.actionItems', 'Action Items')}
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {currentMeeting.actionItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleActionItem(item.id)}
                    className="h-4 w-4 mt-0.5 text-momentum-500 rounded border-slate-300 focus:ring-momentum-500"
                  />
                  <span className={`text-sm ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Mood Selector */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">
                {t('performance.meetingMood', 'Meeting Mood')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {t('performance.howDidItGo', 'How did the conversation go?')}
              </p>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4, 5].map(mood => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all ${
                      selectedMood === mood
                        ? 'bg-momentum-100 ring-2 ring-momentum-500 scale-110'
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    {getMoodEmoji(mood)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleMeetingModal({ onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    employee: '', date: '', time: '10:00', recurring: 'weekly',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('performance.scheduleOneOnOne', 'Schedule 1-on-1')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.employee', 'Employee')} *
            </label>
            <select
              required
              value={form.employee}
              onChange={e => setForm({ ...form, employee: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="">{t('performance.selectEmployee', 'Select an employee...')}</option>
              {EMPLOYEES.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('performance.date', 'Date')} *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('performance.time', 'Time')} *
              </label>
              <input
                type="time"
                required
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.recurring', 'Recurring')}
            </label>
            <select
              value={form.recurring}
              onChange={e => setForm({ ...form, recurring: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="weekly">{t('performance.weekly', 'Weekly')}</option>
              <option value="biweekly">{t('performance.biweekly', 'Biweekly')}</option>
              <option value="monthly">{t('performance.monthly', 'Monthly')}</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors">
              {t('performance.schedule', 'Schedule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TAB 4: CONTINUOUS FEEDBACK
// ============================================================

function FeedbackTab() {
  const { t } = useTranslation();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [feedbackItems, setFeedbackItems] = useState(FEEDBACK_ITEMS);

  const filteredFeedback = feedbackFilter === 'all'
    ? feedbackItems
    : feedbackItems.filter(f => f.type === feedbackFilter);

  const getTypeColor = (type) => {
    switch (type) {
      case 'praise': return 'bg-green-100 text-green-700 border-green-200';
      case 'constructive': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'request': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'praise': return t('performance.praise', 'Praise');
      case 'constructive': return t('performance.constructive', 'Constructive');
      case 'request': return t('performance.request', 'Request');
      default: return type;
    }
  };

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return t('performance.justNow', 'Just now');
    if (diffHours < 24) return t('performance.hoursAgo', '{{count}}h ago', { count: diffHours });
    if (diffDays < 7) return t('performance.daysAgo', '{{count}}d ago', { count: diffDays });
    return date.toLocaleDateString();
  };

  const handleReaction = (feedbackId, reactionType) => {
    setFeedbackItems(prev => prev.map(f => {
      if (f.id !== feedbackId) return f;
      return {
        ...f,
        reactions: {
          ...f.reactions,
          [reactionType]: f.reactions[reactionType] + 1,
        },
      };
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('performance.companyFeed', 'Company Feed')}
          </h2>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {['all', 'praise', 'constructive', 'request'].map(filter => (
              <button
                key={filter}
                onClick={() => setFeedbackFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  feedbackFilter === filter
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {filter === 'all' ? t('performance.all', 'All') : getTypeLabel(filter)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('performance.giveFeedback', 'Give Feedback')}
        </button>
      </div>

      {/* Feedback Feed */}
      <div className="space-y-4 max-w-2xl">
        {filteredFeedback.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-semibold text-sm">
                  {item.from.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{item.from.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-900 text-sm">{item.to.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{formatTimestamp(item.timestamp)}</span>
                    {!item.public && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {t('performance.private', 'Private')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(item.type)}`}>
                  {getTypeLabel(item.type)}
                </span>
              </div>
            </div>

            {/* Message */}
            <p className="text-sm text-slate-700 leading-relaxed mb-3">{item.message}</p>

            {/* Value Tag */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
                <Award className="w-3 h-3" />
                {item.value}
              </span>

              {/* Reactions */}
              {item.public && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReaction(item.id, 'thumbsUp')}
                    className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-slate-100 transition-colors text-xs text-slate-500"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {item.reactions.thumbsUp > 0 && <span>{item.reactions.thumbsUp}</span>}
                  </button>
                  <button
                    onClick={() => handleReaction(item.id, 'heart')}
                    className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-slate-100 transition-colors text-xs text-slate-500"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    {item.reactions.heart > 0 && <span>{item.reactions.heart}</span>}
                  </button>
                  <button
                    onClick={() => handleReaction(item.id, 'sparkle')}
                    className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-slate-100 transition-colors text-xs text-slate-500"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {item.reactions.sparkle > 0 && <span>{item.reactions.sparkle}</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Give Feedback Modal */}
      {showFeedbackModal && (
        <GiveFeedbackModal onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
}

function GiveFeedbackModal({ onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    to: '', type: 'praise', message: '', value: '', isPublic: true,
  });

  const values = ['Excellence', 'Leadership', 'Innovation', 'Teamwork', 'Accountability', 'Growth', 'Communication', 'Collaboration'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('performance.giveFeedback', 'Give Feedback')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.to', 'To')} *
            </label>
            <select
              required
              value={form.to}
              onChange={e => setForm({ ...form, to: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="">{t('performance.selectEmployee', 'Select an employee...')}</option>
              {EMPLOYEES.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.feedbackType', 'Feedback Type')} *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['praise', 'constructive', 'request'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, type })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.type === type
                      ? 'bg-momentum-50 border-momentum-500 text-momentum-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {type === 'praise' ? t('performance.praise', 'Praise') :
                   type === 'constructive' ? t('performance.constructive', 'Constructive') :
                   t('performance.request', 'Request')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.message', 'Message')} *
            </label>
            <textarea
              required
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('performance.messagePlaceholder', 'Share your feedback...')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('performance.companyValue', 'Link to Company Value')}
            </label>
            <div className="flex flex-wrap gap-2">
              {values.map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, value: form.value === value ? '' : value })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.value === value
                      ? 'bg-momentum-50 border-momentum-500 text-momentum-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={e => setForm({ ...form, isPublic: e.target.checked })}
              className="h-4 w-4 text-momentum-500 rounded border-slate-300 focus:ring-momentum-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">
                {t('performance.makePublic', 'Make public')}
              </span>
              <p className="text-xs text-slate-500">
                {t('performance.publicDesc', 'Visible to everyone in the company feed')}
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors">
              {t('performance.sendFeedback', 'Send Feedback')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TAB 5: DEVELOPMENT PLANS
// ============================================================

function DevelopmentPlansTab() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState(DEVELOPMENT_PLANS);

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      draft: 'bg-slate-100 text-slate-600',
      completed: 'bg-blue-100 text-blue-700',
    };
    const labels = {
      active: t('performance.statusActive', 'Active'),
      draft: t('performance.statusDraft', 'Draft'),
      completed: t('performance.statusCompleted', 'Completed'),
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (selectedPlan) {
    return (
      <PlanDetailView
        plan={selectedPlan}
        plans={plans}
        setPlans={setPlans}
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('performance.developmentPlans', 'Development Plans')}
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 transition-colors">
          <Plus className="w-4 h-4" />
          {t('performance.createPlan', 'Create Plan')}
        </button>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.employee', 'Employee')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.planTitle', 'Plan Title')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.focusAreas', 'Focus Areas')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.status', 'Status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.reviewDate', 'Review Date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {t('performance.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map(plan => (
              <tr
                key={plan.id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedPlan(plan)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 text-sm font-semibold">
                      {plan.employee.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-medium text-slate-900">{plan.employee}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">{plan.title}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {plan.focusAreas.length}
                  </span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(plan.status)}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{plan.reviewDate}</td>
                <td className="px-6 py-4">
                  <button
                    className="p-1.5 text-slate-400 hover:text-momentum-600 hover:bg-momentum-50 rounded-lg transition-colors"
                    title={t('performance.viewDetails', 'View Details')}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanDetailView({ plan, plans, setPlans, onBack }) {
  const { t } = useTranslation();

  const getActionTypeIcon = (type) => {
    switch (type) {
      case 'training': return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'stretch': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'mentoring': return <Users className="w-4 h-4 text-green-500" />;
      case 'reading': return <FileText className="w-4 h-4 text-amber-500" />;
      default: return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionTypeLabel = (type) => {
    switch (type) {
      case 'training': return t('performance.training', 'Training');
      case 'stretch': return t('performance.stretchAssignment', 'Stretch Assignment');
      case 'mentoring': return t('performance.mentoring', 'Mentoring');
      case 'reading': return t('performance.reading', 'Reading');
      default: return type;
    }
  };

  const getActionStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getActionStatusLabel = (status) => {
    switch (status) {
      case 'completed': return t('performance.completed', 'Completed');
      case 'in_progress': return t('performance.inProgress', 'In Progress');
      case 'pending': return t('performance.pending', 'Pending');
      default: return status;
    }
  };

  const cycleActionStatus = (planId, focusAreaId, actionId) => {
    const statusOrder = ['pending', 'in_progress', 'completed'];
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        focusAreas: p.focusAreas.map(fa => {
          if (fa.id !== focusAreaId) return fa;
          return {
            ...fa,
            actions: fa.actions.map(a => {
              if (a.id !== actionId) return a;
              const currentIdx = statusOrder.indexOf(a.status);
              const nextIdx = (currentIdx + 1) % statusOrder.length;
              return { ...a, status: statusOrder[nextIdx] };
            }),
          };
        }),
      };
    }));
  };

  const currentPlan = plans.find(p => p.id === plan.id) || plan;
  const totalActions = currentPlan.focusAreas.reduce((sum, fa) => sum + fa.actions.length, 0);
  const completedActions = currentPlan.focusAreas.reduce(
    (sum, fa) => sum + fa.actions.filter(a => a.status === 'completed').length, 0
  );
  const progressPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        {t('performance.backToPlans', 'Back to Development Plans')}
      </button>

      {/* Plan Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-bold text-lg">
              {currentPlan.employee.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{currentPlan.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{currentPlan.employee}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{progressPct}%</p>
            <p className="text-xs text-slate-500">{t('performance.overallProgress', 'Overall Progress')}</p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-momentum-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
          <span>{completedActions}/{totalActions} {t('performance.actionsCompleted', 'actions completed')}</span>
          <span>{t('performance.reviewBy', 'Review by')} {currentPlan.reviewDate}</span>
        </div>
      </div>

      {/* Focus Areas */}
      <div className="space-y-4">
        {currentPlan.focusAreas.map(area => (
          <div key={area.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-momentum-500" />
                {area.title}
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {area.actions.map(action => (
                <div key={action.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {getActionTypeIcon(action.type)}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{action.text}</p>
                      <span className="text-xs text-slate-500">{getActionTypeLabel(action.type)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => cycleActionStatus(currentPlan.id, area.id, action.id)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${getActionStatusColor(action.status)}`}
                  >
                    {getActionStatusLabel(action.status)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
