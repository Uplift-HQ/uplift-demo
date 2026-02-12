// ============================================================
// SURVEYS PAGE
// Employee engagement surveys, eNPS, lifecycle surveys,
// survey builder, results analytics, and template management
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api, { DEMO_MODE } from '../lib/api';
import {
  ClipboardList,
  Plus,
  Play,
  Bell,
  XCircle,
  BarChart3,
  Copy,
  Eye,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Star,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  FileText,
  Settings,
  Calendar,
  Clock,
  Target,
  Award,
  Sparkles,
  Gauge,
  ArrowRight,
  RefreshCw,
  Zap,
  Heart,
  UserCheck,
  Briefcase,
  MapPin,
  Hash,
  ToggleLeft,
  ToggleRight,
  CircleDot,
  ListChecks,
  Type,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertCircle,
  CheckCircle,
  Filter,
  PieChart,
  LayoutGrid,
} from 'lucide-react';

// ============================================================
// DEMO DATA
// ============================================================

const DEMO_SURVEYS = [
  { id: 1, name: 'Q1 Engagement Survey', type: 'Engagement', status: 'active', responses: 134, total: 200, participation: 67, enps: 42, closesOn: '2026-03-15', questions: 24 },
  { id: 2, name: 'Monthly Pulse - February', type: 'Pulse', status: 'active', responses: 89, total: 200, participation: 45, enps: 38, closesOn: '2026-02-28', questions: 8 },
  { id: 3, name: 'Onboarding 30-Day Check-in', type: 'Onboarding', status: 'active', responses: 12, total: 15, participation: 80, enps: 56, closesOn: '2026-02-20', questions: 12 },
  { id: 4, name: 'Q4 2025 Exit Survey', type: 'Exit', status: 'closed', responses: 8, total: 8, participation: 100, enps: -12, closesOn: '2025-12-31', questions: 18 },
  { id: 5, name: 'DEI Climate Assessment', type: 'DEI', status: 'draft', responses: 0, total: 200, participation: 0, enps: null, closesOn: null, questions: 30 },
  { id: 6, name: 'Manager Effectiveness 360', type: 'Manager', status: 'scheduled', responses: 0, total: 150, participation: 0, enps: null, closesOn: '2026-04-30', questions: 20 },
];

const TEMPLATES = [
  { id: 1, name: 'Employee Engagement', type: 'Engagement', questions: 24, description: 'Comprehensive engagement survey covering satisfaction, growth, and belonging', icon: Heart },
  { id: 2, name: 'Quick Pulse', type: 'Pulse', questions: 8, description: 'Short weekly or monthly check-in to gauge team morale', icon: Zap },
  { id: 3, name: 'Onboarding Experience', type: 'Onboarding', questions: 12, description: 'Evaluate the new hire experience at 30, 60, and 90 days', icon: UserCheck },
  { id: 4, name: 'Exit Interview', type: 'Exit', questions: 18, description: 'Understand why employees leave and capture departure insights', icon: Briefcase },
  { id: 5, name: 'DEI & Inclusion', type: 'DEI', questions: 20, description: 'Assess diversity, equity, and inclusion culture across the organization', icon: Users },
  { id: 6, name: 'Work Anniversary', type: 'Anniversary', questions: 10, description: 'Milestone check-in at 1, 3, and 5-year anniversaries', icon: Award },
  { id: 7, name: 'Manager Effectiveness', type: 'Manager', questions: 15, description: '360-degree feedback on management skills, communication, and support', icon: Target },
  { id: 8, name: 'Change Readiness', type: 'Change', questions: 14, description: 'Gauge employee sentiment during organizational changes or transitions', icon: RefreshCw },
];

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Product', 'Support'];
const CATEGORIES = ['Engagement', 'Growth', 'Leadership', 'Culture', 'Compensation', 'Work-Life Balance'];

const HEATMAP_DATA = DEPARTMENTS.map(dept => ({
  department: dept,
  scores: CATEGORIES.reduce((acc, cat) => {
    acc[cat] = Math.round(50 + Math.random() * 45);
    return acc;
  }, {}),
}));

const ENPS_BY_DEPT = [
  { dept: 'Engineering', score: 52 },
  { dept: 'Product', score: 48 },
  { dept: 'Marketing', score: 41 },
  { dept: 'HR', score: 38 },
  { dept: 'Sales', score: 32 },
  { dept: 'Operations', score: 28 },
  { dept: 'Finance', score: 24 },
  { dept: 'Support', score: 18 },
];

const ENPS_TREND = [
  { month: 'Mar', score: 28 }, { month: 'Apr', score: 30 }, { month: 'May', score: 26 },
  { month: 'Jun', score: 32 }, { month: 'Jul', score: 35 }, { month: 'Aug', score: 33 },
  { month: 'Sep', score: 38 }, { month: 'Oct', score: 36 }, { month: 'Nov', score: 40 },
  { month: 'Dec', score: 37 }, { month: 'Jan', score: 42 }, { month: 'Feb', score: 44 },
];

const QUESTION_RESULTS = [
  { id: 1, text: 'I feel valued at this organization', category: 'Engagement', avg: 4.2, distribution: [3, 8, 22, 48, 53] },
  { id: 2, text: 'My manager supports my professional growth', category: 'Leadership', avg: 3.9, distribution: [5, 12, 28, 45, 44] },
  { id: 3, text: 'I have the tools and resources to do my job well', category: 'Engagement', avg: 4.0, distribution: [4, 10, 25, 50, 45] },
  { id: 4, text: 'I see a clear career path at this company', category: 'Growth', avg: 3.5, distribution: [12, 18, 35, 40, 29] },
  { id: 5, text: 'Our company culture is inclusive and welcoming', category: 'Culture', avg: 4.3, distribution: [2, 6, 18, 50, 58] },
  { id: 6, text: 'I am fairly compensated for my work', category: 'Compensation', avg: 3.2, distribution: [15, 25, 38, 32, 24] },
  { id: 7, text: 'I have a healthy work-life balance', category: 'Work-Life Balance', avg: 3.7, distribution: [8, 15, 30, 45, 36] },
  { id: 8, text: 'I would recommend this company as a great place to work', category: 'Engagement', avg: 4.1, distribution: [4, 9, 20, 52, 49] },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

const TABS = [
  { id: 'active', labelKey: 'surveys.tabs.active', label: 'Active Surveys', icon: ClipboardList },
  { id: 'builder', labelKey: 'surveys.tabs.builder', label: 'Survey Builder', icon: Plus },
  { id: 'results', labelKey: 'surveys.tabs.results', label: 'Results & Analytics', icon: BarChart3 },
  { id: 'enps', labelKey: 'surveys.tabs.enps', label: 'eNPS Dashboard', icon: Gauge },
  { id: 'lifecycle', labelKey: 'surveys.tabs.lifecycle', label: 'Lifecycle Surveys', icon: RefreshCw },
  { id: 'templates', labelKey: 'surveys.tabs.templates', label: 'Templates', icon: FileText },
];

export default function Surveys() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [surveys, setSurveys] = useState(DEMO_MODE ? DEMO_SURVEYS : []);
  const [templates, setTemplates] = useState(DEMO_MODE ? TEMPLATES : []);
  const [stats, setStats] = useState(DEMO_MODE ? { active: 3, avgParticipation: 64, enps: 42, totalResponses: 243 } : { active: 0, avgParticipation: 0, enps: 0, totalResponses: 0 });
  const [enpsDashboard, setEnpsDashboard] = useState(null);

  const fetchData = useCallback(async () => {
    if (DEMO_MODE) return;
    try {
      setLoading(true);
      const [surveysRes, templatesRes, enpsRes] = await Promise.all([
        api.get('/surveys'),
        api.get('/surveys/templates'),
        api.get('/surveys/enps/dashboard'),
      ]);
      setSurveys(surveysRes.data.surveys || []);
      setTemplates((templatesRes.data.templates || []).map(tmpl => ({
        ...tmpl,
        icon: TEMPLATES.find(t => t.type.toLowerCase() === tmpl.type?.toLowerCase())?.icon || FileText,
      })));
      setStats(surveysRes.data.stats || { active: 0, avgParticipation: 0, enps: 0, totalResponses: 0 });
      setEnpsDashboard(enpsRes.data);
    } catch (err) {
      console.error('Failed to fetch surveys:', err);
      // Fallback to demo data on error
      setSurveys(DEMO_SURVEYS);
      setTemplates(TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-100 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="h-12 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('surveys.title', 'Surveys & Feedback')}</h1>
          <p className="text-slate-600">{t('surveys.subtitle', 'Measure engagement, collect feedback, and drive organizational improvement')}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-momentum-500 text-momentum-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(tab.labelKey, tab.label)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'active' && <ActiveSurveys surveys={surveys} stats={stats} onRefresh={fetchData} />}
      {activeTab === 'builder' && <SurveyBuilder templates={templates} onSurveyCreated={fetchData} />}
      {activeTab === 'results' && <ResultsAnalytics surveys={surveys} />}
      {activeTab === 'enps' && <ENPSDashboard dashboardData={enpsDashboard} />}
      {activeTab === 'lifecycle' && <LifecycleSurveys surveys={surveys} />}
      {activeTab === 'templates' && <TemplatesTab templates={templates} />}
    </div>
  );
}

// ============================================================
// TAB 1: ACTIVE SURVEYS
// ============================================================

function ActiveSurveys({ surveys = [], stats = {}, onRefresh }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const statusConfig = {
    draft: { label: t('surveys.status.draft', 'Draft'), color: 'bg-slate-100 text-slate-700' },
    scheduled: { label: t('surveys.status.scheduled', 'Scheduled'), color: 'bg-blue-100 text-blue-700' },
    active: { label: t('surveys.status.active', 'Active'), color: 'bg-green-100 text-green-700' },
    closed: { label: t('surveys.status.closed', 'Closed'), color: 'bg-momentum-100 text-momentum-700' },
  };

  const filtered = surveys.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Empty state for no surveys
  if (surveys.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {t('surveys.noSurveysYet', 'No surveys created')}
          </h3>
          <p className="text-slate-500 max-w-md mb-6">
            {t('surveys.noSurveysDesc', 'Create your first survey to start gathering employee feedback. You can use templates for engagement, pulse checks, or custom surveys.')}
          </p>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
            <Plus className="h-5 w-5" />
            {t('surveys.createFirstSurvey', 'Create First Survey')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <ClipboardList className="w-4 h-4" />
            <span className="text-sm">{t('surveys.stats.totalActive', 'Active Surveys')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.active || surveys.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">{t('surveys.stats.avgParticipation', 'Avg Participation')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.avgParticipation || 0}%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">{t('surveys.stats.overallEnps', 'Overall eNPS')}</span>
          </div>
          <p className={`text-2xl font-bold ${(stats.enps || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(stats.enps || 0) > 0 ? '+' : ''}{stats.enps || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">{t('surveys.stats.totalResponses', 'Total Responses')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalResponses || surveys.reduce((sum, s) => sum + (s.responses || 0), 0)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('surveys.searchSurveys', 'Search surveys...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
        >
          <option value="all">{t('surveys.allStatuses', 'All Statuses')}</option>
          <option value="active">{t('surveys.status.active', 'Active')}</option>
          <option value="scheduled">{t('surveys.status.scheduled', 'Scheduled')}</option>
          <option value="draft">{t('surveys.status.draft', 'Draft')}</option>
          <option value="closed">{t('surveys.status.closed', 'Closed')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('surveys.table.name', 'Survey Name')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('surveys.table.type', 'Type')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('surveys.table.status', 'Status')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('surveys.table.responses', 'Responses')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('surveys.table.participation', 'Participation')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('surveys.table.enps', 'eNPS')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('surveys.table.closesOn', 'Closes On')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('surveys.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((survey) => (
                <tr key={survey.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{survey.name}</p>
                    <p className="text-xs text-slate-500">{survey.questions} {t('surveys.questions', 'questions')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                      {survey.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig[survey.status]?.color}`}>
                      {statusConfig[survey.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    {survey.responses}/{survey.total}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${survey.participation >= 70 ? 'bg-green-500' : survey.participation >= 40 ? 'bg-momentum-500' : 'bg-red-400'}`}
                          style={{ width: `${survey.participation}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{survey.participation}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {survey.enps !== null ? (
                      <span className={`text-sm font-semibold ${survey.enps >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {survey.enps > 0 ? '+' : ''}{survey.enps}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {survey.closesOn || '--'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {survey.status === 'draft' && (
                        <button className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t('surveys.actions.launch', 'Launch')}>
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {survey.status === 'active' && (
                        <>
                          <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t('surveys.actions.remind', 'Remind')}>
                            <Bell className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-momentum-600 hover:bg-momentum-50 rounded-lg transition-colors" title={t('surveys.actions.close', 'Close')}>
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title={t('surveys.actions.viewResults', 'View Results')}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title={t('surveys.actions.clone', 'Clone')}>
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('surveys.noSurveysFound', 'No surveys match your filters')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB 2: SURVEY BUILDER
// ============================================================

function SurveyBuilder({ templates = TEMPLATES, onSurveyCreated }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [surveyData, setSurveyData] = useState({
    name: '',
    description: '',
    type: 'Engagement',
    anonymous: true,
    anonymityThreshold: 5,
  });
  const [questions, setQuestions] = useState([
    { id: 1, text: 'How likely are you to recommend this company as a place to work?', type: 'enps', category: 'Engagement', required: true },
    { id: 2, text: 'I feel valued at this organization', type: 'rating5', category: 'Engagement', required: true },
  ]);
  const [audience, setAudience] = useState({ mode: 'all', departments: [], locations: [], tenures: [], roleTypes: [] });
  const [schedule, setSchedule] = useState({
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    reminderFrequency: 'weekly',
    autoClose: true,
    recurring: 'none',
  });
  const [newQuestion, setNewQuestion] = useState({ text: '', type: 'rating5', category: 'Engagement', required: true });

  const stepLabels = [
    t('surveys.builder.step1', 'Template'),
    t('surveys.builder.step2', 'Details'),
    t('surveys.builder.step3', 'Questions'),
    t('surveys.builder.step4', 'Audience'),
    t('surveys.builder.step5', 'Schedule'),
    t('surveys.builder.step6', 'Review'),
  ];

  const questionTypes = [
    { value: 'rating5', label: t('surveys.builder.rating5', 'Rating 1-5') },
    { value: 'rating10', label: t('surveys.builder.rating10', 'Rating 1-10') },
    { value: 'enps', label: t('surveys.builder.enps', 'eNPS (0-10)') },
    { value: 'freetext', label: t('surveys.builder.freeText', 'Free Text') },
    { value: 'multichoice', label: t('surveys.builder.multipleChoice', 'Multiple Choice') },
    { value: 'yesno', label: t('surveys.builder.yesNo', 'Yes / No') },
  ];

  const questionTypeIcons = {
    rating5: Star,
    rating10: Star,
    enps: Gauge,
    freetext: Type,
    multichoice: ListChecks,
    yesno: CircleDot,
  };

  // Translation helper for departments
  const translateDepartment = (dept) => {
    const deptKeys = {
      'Engineering': t('surveys.departments.engineering', 'Engineering'),
      'Sales': t('surveys.departments.sales', 'Sales'),
      'Marketing': t('surveys.departments.marketing', 'Marketing'),
      'HR': t('surveys.departments.hr', 'HR'),
      'Finance': t('surveys.departments.finance', 'Finance'),
      'Operations': t('surveys.departments.operations', 'Operations'),
      'Product': t('surveys.departments.product', 'Product'),
      'Support': t('surveys.departments.support', 'Support'),
    };
    return deptKeys[dept] || dept;
  };

  // Translation helper for categories
  const translateCategory = (cat) => {
    const categoryKeys = {
      'Engagement': t('surveys.categories.engagement', 'Engagement'),
      'Growth': t('surveys.categories.growth', 'Growth'),
      'Leadership': t('surveys.categories.leadership', 'Leadership'),
      'Culture': t('surveys.categories.culture', 'Culture'),
      'Compensation': t('surveys.categories.compensation', 'Compensation'),
      'Work-Life Balance': t('surveys.categories.workLifeBalance', 'Work-Life Balance'),
    };
    return categoryKeys[cat] || cat;
  };

  const addQuestion = () => {
    if (!newQuestion.text.trim()) return;
    setQuestions([...questions, { ...newQuestion, id: Date.now() }]);
    setNewQuestion({ text: '', type: 'rating5', category: 'Engagement', required: true });
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setSurveyData(prev => ({ ...prev, name: template.name + ' Survey', type: template.type }));
    setStep(2);
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  i + 1 < step ? 'bg-green-500 text-white' :
                  i + 1 === step ? 'bg-momentum-500 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1 ${i + 1 === step ? 'text-momentum-600 font-medium' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`w-12 lg:w-24 h-0.5 mx-1 mt-[-14px] ${i + 1 < step ? 'bg-green-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t('surveys.builder.chooseTemplate', 'Choose a Template or Start from Scratch')}</h2>
            <button
              onClick={() => { setSelectedTemplate(null); setStep(2); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('surveys.builder.startScratch', 'Start from Scratch')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((tmpl) => {
              const Icon = tmpl.icon || FileText;
              const questionCount = typeof tmpl.questions === 'number' ? tmpl.questions : (Array.isArray(tmpl.questions) ? tmpl.questions.length : 0);
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleTemplateSelect(tmpl)}
                  className={`text-left bg-white rounded-xl border-2 p-5 hover:shadow-md transition-all ${
                    selectedTemplate?.id === tmpl.id ? 'border-momentum-500 bg-momentum-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-momentum-100 text-momentum-600 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{tmpl.name}</h3>
                  <p className="text-xs text-slate-500 mb-2">{tmpl.description}</p>
                  <span className="text-xs font-medium text-momentum-600">{questionCount} {t('surveys.questions', 'questions')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Survey Details */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">{t('surveys.builder.surveyDetails', 'Survey Details')}</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('surveys.builder.surveyName', 'Survey Name')}</label>
            <input
              type="text"
              value={surveyData.name}
              onChange={(e) => setSurveyData({ ...surveyData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('surveys.builder.namePlaceholder', 'e.g., Q1 2026 Employee Engagement Survey')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('surveys.builder.description', 'Description')}</label>
            <textarea
              rows={3}
              value={surveyData.description}
              onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('surveys.builder.descriptionPlaceholder', 'Briefly describe the purpose of this survey...')}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('surveys.builder.surveyType', 'Survey Type')}</label>
              <select
                value={surveyData.type}
                onChange={(e) => setSurveyData({ ...surveyData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              >
                <option value="Engagement">{t('surveys.types.engagement', 'Engagement')}</option>
                <option value="Pulse">{t('surveys.types.pulse', 'Pulse')}</option>
                <option value="Onboarding">{t('surveys.types.onboarding', 'Onboarding')}</option>
                <option value="Exit">{t('surveys.types.exit', 'Exit')}</option>
                <option value="DEI">{t('surveys.types.dei', 'DEI')}</option>
                <option value="Manager">{t('surveys.types.manager', 'Manager Effectiveness')}</option>
                <option value="Anniversary">{t('surveys.types.anniversary', 'Anniversary')}</option>
                <option value="Change">{t('surveys.types.change', 'Change Readiness')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('surveys.builder.anonymityThreshold', 'Anonymity Threshold')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={3}
                  max={20}
                  value={surveyData.anonymityThreshold}
                  onChange={(e) => setSurveyData({ ...surveyData, anonymityThreshold: parseInt(e.target.value) })}
                  className="flex-1 accent-momentum-500"
                />
                <span className="text-sm font-medium text-slate-700 w-12 text-center">{surveyData.anonymityThreshold}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{t('surveys.builder.thresholdHelp', 'Minimum responses required before results are visible')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setSurveyData({ ...surveyData, anonymous: !surveyData.anonymous })}
              className="flex items-center gap-2 text-sm"
            >
              {surveyData.anonymous ? (
                <ToggleRight className="w-8 h-8 text-momentum-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
              <span className={surveyData.anonymous ? 'text-momentum-600 font-medium' : 'text-slate-500'}>
                {t('surveys.builder.anonymousSurvey', 'Anonymous Survey')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Question Builder */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('surveys.builder.questions', 'Questions')}</h2>
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const Icon = questionTypeIcons[q.type] || Star;
                return (
                  <div key={q.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="flex-shrink-0 w-7 h-7 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{q.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Icon className="w-3 h-3" />
                          {questionTypes.find(qt => qt.value === q.type)?.label || q.type}
                        </span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-500">{q.category}</span>
                        {q.required && (
                          <>
                            <span className="text-xs text-slate-400">|</span>
                            <span className="text-xs text-red-500 font-medium">{t('surveys.builder.required', 'Required')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeQuestion(q.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Question Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('surveys.builder.addQuestion', 'Add a Question')}</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newQuestion.text}
                onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                placeholder={t('surveys.builder.questionPlaceholder', 'Enter your question...')}
                onKeyDown={(e) => { if (e.key === 'Enter') addQuestion(); }}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                >
                  {questionTypes.map(qt => (
                    <option key={qt.value} value={qt.value}>{qt.label}</option>
                  ))}
                </select>
                <select
                  value={newQuestion.category}
                  onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{translateCategory(cat)}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newQuestion.required}
                      onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                      className="rounded border-slate-300 text-momentum-500 focus:ring-momentum-500"
                    />
                    {t('surveys.builder.required', 'Required')}
                  </label>
                  <button
                    onClick={addQuestion}
                    disabled={!newQuestion.text.trim()}
                    className="ml-auto px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('surveys.builder.add', 'Add')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Audience Selector */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">{t('surveys.builder.selectAudience', 'Select Audience')}</h2>
          <div className="space-y-3">
            {[
              { value: 'all', label: t('surveys.builder.allEmployees', 'All Employees'), icon: Users, desc: t('surveys.builder.allEmployeesDesc', 'Send to every active employee') },
              { value: 'department', label: t('surveys.builder.byDepartment', 'By Department'), icon: Briefcase, desc: t('surveys.builder.byDepartmentDesc', 'Select specific departments') },
              { value: 'location', label: t('surveys.builder.byLocation', 'By Location'), icon: MapPin, desc: t('surveys.builder.byLocationDesc', 'Target specific office locations') },
              { value: 'tenure', label: t('surveys.builder.byTenure', 'By Tenure'), icon: Clock, desc: t('surveys.builder.byTenureDesc', 'Filter by time at company') },
              { value: 'role', label: t('surveys.builder.byRoleType', 'By Role Type'), icon: Award, desc: t('surveys.builder.byRoleTypeDesc', 'IC, Manager, or Executive') },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  audience.mode === opt.value ? 'border-momentum-500 bg-momentum-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value={opt.value}
                  checked={audience.mode === opt.value}
                  onChange={() => setAudience({ ...audience, mode: opt.value })}
                  className="sr-only"
                />
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  audience.mode === opt.value ? 'bg-momentum-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <opt.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
                {audience.mode === opt.value && <CheckCircle className="w-5 h-5 text-momentum-500" />}
              </label>
            ))}
          </div>

          {/* Department multi-select */}
          {audience.mode === 'department' && (
            <div className="pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('surveys.builder.selectDepartments', 'Select Departments')}</label>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept}
                    onClick={() => {
                      const depts = audience.departments.includes(dept)
                        ? audience.departments.filter(d => d !== dept)
                        : [...audience.departments, dept];
                      setAudience({ ...audience, departments: depts });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      audience.departments.includes(dept)
                        ? 'bg-momentum-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {translateDepartment(dept)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {audience.mode === 'location' && (
            <div className="pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('surveys.builder.selectLocations', 'Select Locations')}</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'newYork', label: t('surveys.builder.locations.newYork', 'New York') },
                  { key: 'sanFrancisco', label: t('surveys.builder.locations.sanFrancisco', 'San Francisco') },
                  { key: 'london', label: t('surveys.builder.locations.london', 'London') },
                  { key: 'berlin', label: t('surveys.builder.locations.berlin', 'Berlin') },
                  { key: 'singapore', label: t('surveys.builder.locations.singapore', 'Singapore') },
                  { key: 'remote', label: t('surveys.builder.locations.remote', 'Remote') },
                ].map(loc => (
                  <button
                    key={loc.key}
                    onClick={() => {
                      const locs = audience.locations.includes(loc.key)
                        ? audience.locations.filter(l => l !== loc.key)
                        : [...audience.locations, loc.key];
                      setAudience({ ...audience, locations: locs });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      audience.locations.includes(loc.key)
                        ? 'bg-momentum-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {audience.mode === 'tenure' && (
            <div className="pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('surveys.builder.selectTenure', 'Select Tenure Ranges')}</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: '0-6months', label: t('surveys.builder.tenure.0to6months', '0-6 months') },
                  { key: '6-12months', label: t('surveys.builder.tenure.6to12months', '6-12 months') },
                  { key: '1-2years', label: t('surveys.builder.tenure.1to2years', '1-2 years') },
                  { key: '2-5years', label: t('surveys.builder.tenure.2to5years', '2-5 years') },
                  { key: '5+years', label: t('surveys.builder.tenure.5plusYears', '5+ years') },
                ].map(tenure => (
                  <button
                    key={tenure.key}
                    onClick={() => {
                      const tenures = audience.tenures.includes(tenure.key)
                        ? audience.tenures.filter(x => x !== tenure.key)
                        : [...audience.tenures, tenure.key];
                      setAudience({ ...audience, tenures });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      audience.tenures.includes(tenure.key)
                        ? 'bg-momentum-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tenure.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {audience.mode === 'role' && (
            <div className="pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('surveys.builder.selectRoles', 'Select Role Types')}</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'ic', label: t('surveys.builder.roles.individualContributor', 'Individual Contributor') },
                  { key: 'manager', label: t('surveys.builder.roles.manager', 'Manager') },
                  { key: 'director', label: t('surveys.builder.roles.director', 'Director') },
                  { key: 'vp', label: t('surveys.builder.roles.vp', 'VP') },
                  { key: 'executive', label: t('surveys.builder.roles.executive', 'Executive') },
                ].map(role => (
                  <button
                    key={role.key}
                    onClick={() => {
                      const roles = audience.roleTypes.includes(role.key)
                        ? audience.roleTypes.filter(x => x !== role.key)
                        : [...audience.roleTypes, role.key];
                      setAudience({ ...audience, roleTypes: roles });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      audience.roleTypes.includes(role.key)
                        ? 'bg-momentum-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Schedule */}
      {step === 5 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">{t('surveys.builder.schedule', 'Schedule & Reminders')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('surveys.builder.startDate', 'Start Date')}</label>
              <input
                type="date"
                value={schedule.startDate}
                onChange={(e) => setSchedule({ ...schedule, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('surveys.builder.endDate', 'End Date')}</label>
              <input
                type="date"
                value={schedule.endDate}
                onChange={(e) => setSchedule({ ...schedule, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('surveys.builder.reminderFrequency', 'Reminder Frequency')}</label>
              <select
                value={schedule.reminderFrequency}
                onChange={(e) => setSchedule({ ...schedule, reminderFrequency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              >
                <option value="none">{t('surveys.builder.noReminders', 'No Reminders')}</option>
                <option value="daily">{t('surveys.builder.daily', 'Daily')}</option>
                <option value="every3days">{t('surveys.builder.every3Days', 'Every 3 Days')}</option>
                <option value="weekly">{t('surveys.builder.weekly', 'Weekly')}</option>
                <option value="biweekly">{t('surveys.builder.biweekly', 'Bi-weekly')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('surveys.builder.recurring', 'Recurring Survey')}</label>
              <select
                value={schedule.recurring}
                onChange={(e) => setSchedule({ ...schedule, recurring: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              >
                <option value="none">{t('surveys.builder.oneTime', 'One-time')}</option>
                <option value="monthly">{t('surveys.builder.monthly', 'Monthly')}</option>
                <option value="quarterly">{t('surveys.builder.quarterly', 'Quarterly')}</option>
                <option value="biannual">{t('surveys.builder.biannual', 'Bi-annually')}</option>
                <option value="annual">{t('surveys.builder.annual', 'Annually')}</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setSchedule({ ...schedule, autoClose: !schedule.autoClose })}
              className="flex items-center gap-2 text-sm"
            >
              {schedule.autoClose ? (
                <ToggleRight className="w-8 h-8 text-momentum-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
              <span className={schedule.autoClose ? 'text-momentum-600 font-medium' : 'text-slate-500'}>
                {t('surveys.builder.autoClose', 'Auto-close survey on end date')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Review */}
      {step === 6 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">{t('surveys.builder.reviewSummary', 'Review & Launch')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('surveys.builder.surveyName', 'Survey Name')}</p>
              <p className="text-sm font-medium text-slate-900">{surveyData.name || t('surveys.builder.untitled', 'Untitled Survey')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('surveys.builder.surveyType', 'Type')}</p>
              <p className="text-sm font-medium text-slate-900">{surveyData.type}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('surveys.builder.questionsCount', 'Questions')}</p>
              <p className="text-sm font-medium text-slate-900">{questions.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('surveys.builder.anonymous', 'Anonymous')}</p>
              <p className="text-sm font-medium text-slate-900">{surveyData.anonymous ? t('common.yes', 'Yes') : t('common.no', 'No')} ({t('surveys.builder.threshold', 'threshold')}: {surveyData.anonymityThreshold})</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('surveys.builder.audience', 'Audience')}</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{audience.mode === 'all' ? t('surveys.builder.allEmployees', 'All Employees') : audience.mode}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('surveys.builder.schedule', 'Schedule')}</p>
              <p className="text-sm font-medium text-slate-900">{schedule.startDate} - {schedule.endDate}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('surveys.builder.reminders', 'Reminders')}</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{schedule.reminderFrequency}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t('surveys.builder.recurring', 'Recurring')}</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{schedule.recurring === 'none' ? t('surveys.builder.oneTime', 'One-time') : schedule.recurring}</p>
            </div>
          </div>

          {/* Question Preview */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('surveys.builder.questionPreview', 'Question Preview')}</h3>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400 w-6 text-right">{i + 1}.</span>
                  <span className="text-slate-700">{q.text}</span>
                  <span className="text-xs text-slate-400 ml-auto">{questionTypes.find(qt => qt.value === q.type)?.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : null}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back', 'Back')}
        </button>
        <div className="flex items-center gap-3">
          {step === 6 && (
            <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              {t('surveys.builder.saveDraft', 'Save as Draft')}
            </button>
          )}
          {step < 6 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-momentum-500 rounded-lg hover:bg-momentum-600 transition-colors"
            >
              {t('common.next', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
              <Play className="w-4 h-4" />
              {t('surveys.builder.launch', 'Launch Survey')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 3: RESULTS & ANALYTICS
// ============================================================

function ResultsAnalytics({ surveys = [] }) {
  const { t } = useTranslation();
  const activeSurveys = surveys.length > 0 ? surveys : DEMO_SURVEYS;
  const [selectedSurvey] = useState(activeSurveys[0]);

  const highestScoring = [...QUESTION_RESULTS].sort((a, b) => b.avg - a.avg).slice(0, 3);
  const lowestScoring = [...QUESTION_RESULTS].sort((a, b) => a.avg - b.avg).slice(0, 3);

  // Translation helpers for categories and departments
  const translateCategory = (cat) => {
    const categoryKeys = {
      'Engagement': t('surveys.categories.engagement', 'Engagement'),
      'Growth': t('surveys.categories.growth', 'Growth'),
      'Leadership': t('surveys.categories.leadership', 'Leadership'),
      'Culture': t('surveys.categories.culture', 'Culture'),
      'Compensation': t('surveys.categories.compensation', 'Compensation'),
      'Work-Life Balance': t('surveys.categories.workLifeBalance', 'Work-Life Balance'),
    };
    return categoryKeys[cat] || cat;
  };

  const translateDepartment = (dept) => {
    const deptKeys = {
      'Engineering': t('surveys.departments.engineering', 'Engineering'),
      'Sales': t('surveys.departments.sales', 'Sales'),
      'Marketing': t('surveys.departments.marketing', 'Marketing'),
      'HR': t('surveys.departments.hr', 'HR'),
      'Finance': t('surveys.departments.finance', 'Finance'),
      'Operations': t('surveys.departments.operations', 'Operations'),
      'Product': t('surveys.departments.product', 'Product'),
      'Support': t('surveys.departments.support', 'Support'),
    };
    return deptKeys[dept] || dept;
  };

  return (
    <div className="space-y-6">
      {/* Survey Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{t('surveys.results.viewingResults', 'Viewing Results For')}</p>
          <h2 className="text-lg font-semibold text-slate-900">{selectedSurvey.name}</h2>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
          <Download className="w-4 h-4" />
          {t('surveys.results.exportResults', 'Export Results')}
        </button>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Score Gauge */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('surveys.results.overallScore', 'Overall Score')}</p>
          <div className="relative w-24 h-12 mb-2">
            <svg viewBox="0 0 120 60" className="w-full h-full">
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#f97316" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(4.1 / 5) * 157} 157`}
              />
            </svg>
            <div className="absolute inset-0 flex items-end justify-center">
              <span className="text-2xl font-bold text-slate-900">4.1</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t('surveys.results.outOf5', 'out of 5.0')}</p>
        </div>

        {/* Participation */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('surveys.results.participation', 'Participation')}</p>
          <p className="text-3xl font-bold text-green-600 mb-1">{selectedSurvey.participation}%</p>
          <p className="text-xs text-slate-500">{selectedSurvey.responses}/{selectedSurvey.total} {t('surveys.results.responded', 'responded')}</p>
        </div>

        {/* eNPS */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('surveys.results.enps', 'eNPS')}</p>
          <p className="text-3xl font-bold text-green-600 mb-1">+{selectedSurvey.enps}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-600">52% {t('surveys.results.promoters', 'P')}</span>
            <span className="text-slate-500">38% {t('surveys.results.passives', 'N')}</span>
            <span className="text-red-500">10% {t('surveys.results.detractors', 'D')}</span>
          </div>
        </div>

        {/* Response Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('surveys.results.vsPrevious', 'vs Previous')}</p>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-green-600">+5%</span>
          </div>
          <p className="text-xs text-slate-500">{t('surveys.results.scoreTrend', 'score improvement')}</p>
        </div>
      </div>

      {/* Highest & Lowest Scoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            {t('surveys.results.highestScoring', 'Highest Scoring Questions')}
          </h3>
          <div className="space-y-3">
            {highestScoring.map((q) => (
              <div key={q.id} className="flex items-center justify-between">
                <p className="text-sm text-slate-700 flex-1 mr-4">{q.text}</p>
                <span className="text-sm font-bold text-green-600 whitespace-nowrap">{q.avg.toFixed(1)}/5</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            {t('surveys.results.lowestScoring', 'Lowest Scoring Questions')}
          </h3>
          <div className="space-y-3">
            {lowestScoring.map((q) => (
              <div key={q.id} className="flex items-center justify-between">
                <p className="text-sm text-slate-700 flex-1 mr-4">{q.text}</p>
                <span className="text-sm font-bold text-red-500 whitespace-nowrap">{q.avg.toFixed(1)}/5</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('surveys.results.heatmap', 'Department vs Category Heatmap')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 text-xs font-semibold text-slate-500">{t('surveys.results.department', 'Department')}</th>
                {CATEGORIES.map(cat => (
                  <th key={cat} className="text-center p-2 text-xs font-semibold text-slate-500 whitespace-nowrap">{translateCategory(cat)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HEATMAP_DATA.map((row) => (
                <tr key={row.department}>
                  <td className="p-2 font-medium text-slate-700">{translateDepartment(row.department)}</td>
                  {CATEGORIES.map(cat => {
                    const score = row.scores[cat];
                    const bg = score >= 75 ? 'bg-green-100 text-green-800' : score >= 55 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                    return (
                      <td key={cat} className="p-1 text-center">
                        <span className={`inline-block w-full py-1.5 rounded text-xs font-semibold ${bg}`}>
                          {score}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('surveys.results.questionBreakdown', 'Per-Question Breakdown')}</h3>
        <div className="space-y-5">
          {QUESTION_RESULTS.map((q) => {
            const total = q.distribution.reduce((a, b) => a + b, 0);
            return (
              <div key={q.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-700 font-medium">{q.text}</p>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-slate-400">{q.category}</span>
                    <span className={`text-sm font-bold ${q.avg >= 4 ? 'text-green-600' : q.avg >= 3 ? 'text-momentum-600' : 'text-red-500'}`}>
                      {q.avg.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 h-5">
                  {q.distribution.map((count, i) => {
                    const pct = (count / total) * 100;
                    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500'];
                    return (
                      <div
                        key={i}
                        className={`h-full ${colors[i]} rounded-sm relative group`}
                        style={{ width: `${pct}%`, minWidth: pct > 0 ? '4px' : '0' }}
                        title={`${i + 1} star: ${count} (${pct.toFixed(0)}%)`}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {i + 1}: {count}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>1 ({q.distribution[0]})</span>
                  <span>5 ({q.distribution[4]})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 4: eNPS DASHBOARD
// ============================================================

function ENPSDashboard({ dashboardData }) {
  const { t } = useTranslation();
  const data = dashboardData || {};
  const enpsScore = data.currentScore ?? 42;
  const promoters = data.promotersPercent ?? 52;
  const passives = data.passivesPercent ?? 38;
  const detractors = data.detractorsPercent ?? 10;
  const departmentScores = data.departmentScores || ENPS_BY_DEPT;
  const trendData = data.trend || ENPS_TREND;

  // Arc calculation for gauge
  const gaugeAngle = ((enpsScore + 100) / 200) * 180; // -100 to +100 mapped to 0-180 degrees

  // Translation helper for departments
  const translateDepartment = (dept) => {
    const deptKeys = {
      'Engineering': t('surveys.departments.engineering', 'Engineering'),
      'Sales': t('surveys.departments.sales', 'Sales'),
      'Marketing': t('surveys.departments.marketing', 'Marketing'),
      'HR': t('surveys.departments.hr', 'HR'),
      'Finance': t('surveys.departments.finance', 'Finance'),
      'Operations': t('surveys.departments.operations', 'Operations'),
      'Product': t('surveys.departments.product', 'Product'),
      'Support': t('surveys.departments.support', 'Support'),
    };
    return deptKeys[dept] || dept;
  };

  return (
    <div className="space-y-6">
      {/* Main eNPS Score */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">{t('surveys.enps.companyEnps', 'Company-Wide eNPS')}</h2>

        {/* Gauge */}
        <div className="relative w-64 h-32 mb-4">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path d="M 15 95 A 85 85 0 0 1 185 95" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
            {/* Red zone (detractors) */}
            <path d="M 15 95 A 85 85 0 0 1 185 95" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round"
              strokeDasharray="89 267"
            />
            {/* Yellow zone (passives) */}
            <path d="M 15 95 A 85 85 0 0 1 185 95" fill="none" stroke="#f59e0b" strokeWidth="16" strokeLinecap="round"
              strokeDasharray="89 267" strokeDashoffset="-89"
            />
            {/* Green zone (promoters) */}
            <path d="M 15 95 A 85 85 0 0 1 185 95" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="round"
              strokeDasharray="89 267" strokeDashoffset="-178"
            />
            {/* Needle */}
            <line
              x1="100" y1="95"
              x2={100 + 65 * Math.cos(Math.PI - (gaugeAngle * Math.PI / 180))}
              y2={95 - 65 * Math.sin(Math.PI - (gaugeAngle * Math.PI / 180))}
              stroke="#1e293b" strokeWidth="3" strokeLinecap="round"
            />
            <circle cx="100" cy="95" r="5" fill="#1e293b" />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-slate-400">
            <span>-100</span>
            <span>0</span>
            <span>+100</span>
          </div>
        </div>

        <p className="text-5xl font-bold text-green-600 mb-2">+{enpsScore}</p>
        <p className="text-sm text-slate-500">{t('surveys.enps.greatScore', 'Great - Above industry average of +14')}</p>

        <button className="mt-6 flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-momentum-500 rounded-lg hover:bg-momentum-600 transition-colors">
          <Zap className="w-4 h-4" />
          {t('surveys.enps.runQuickEnps', 'Run Quick eNPS')}
        </button>
      </div>

      {/* Promoters / Passives / Detractors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-semibold text-slate-700">{t('surveys.enps.promoters', 'Promoters (9-10)')}</h3>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-2">{promoters}%</p>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${promoters}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">{Math.round(134 * promoters / 100)} {t('surveys.enps.employees', 'employees')}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Minus className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-semibold text-slate-700">{t('surveys.enps.passives', 'Passives (7-8)')}</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600 mb-2">{passives}%</p>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${passives}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">{Math.round(134 * passives / 100)} {t('surveys.enps.employees', 'employees')}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsDown className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-semibold text-slate-700">{t('surveys.enps.detractors', 'Detractors (0-6)')}</h3>
          </div>
          <p className="text-3xl font-bold text-red-500 mb-2">{detractors}%</p>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${detractors}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">{Math.round(134 * detractors / 100)} {t('surveys.enps.employees', 'employees')}</p>
        </div>
      </div>

      {/* eNPS by Department */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('surveys.enps.byDepartment', 'eNPS by Department')}</h3>
        <div className="space-y-3">
          {departmentScores.map((d) => {
            const barWidth = Math.max(0, ((d.score + 100) / 200) * 100);
            return (
              <div key={d.dept} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-28 shrink-0">{translateDepartment(d.dept)}</span>
                <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                  {/* Center line at 0 */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10" />
                  <div
                    className={`h-full rounded-lg ${d.score >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{
                      width: `${Math.abs(d.score) / 2}%`,
                      marginLeft: d.score >= 0 ? '50%' : `${50 - Math.abs(d.score) / 2}%`,
                    }}
                  />
                </div>
                <span className={`text-sm font-semibold w-10 text-right ${d.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {d.score > 0 ? '+' : ''}{d.score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* eNPS Trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('surveys.enps.trend', 'eNPS Trend (12 Months)')}</h3>
        <div className="relative h-48">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-slate-400">
            <span>60</span>
            <span>40</span>
            <span>20</span>
            <span>0</span>
          </div>
          {/* Chart area */}
          <div className="ml-10 h-full flex items-end pb-6 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 bottom-6 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="border-b border-slate-100 w-full" />
              ))}
            </div>
            {/* Data points and lines */}
            <svg viewBox={`0 0 ${trendData.length * 60} 180`} className="absolute inset-0 bottom-6 ml-0" preserveAspectRatio="none">
              <polyline
                points={trendData.map((d, i) => `${i * 60 + 30},${180 - (d.score / 60) * 180}`).join(' ')}
                fill="none"
                stroke="#f97316"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {trendData.map((d, i) => (
                <circle
                  key={i}
                  cx={i * 60 + 30}
                  cy={180 - (d.score / 60) * 180}
                  r="5"
                  fill="#f97316"
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
            </svg>
            {/* Month labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between">
              {trendData.map((d) => (
                <span key={d.month} className="text-xs text-slate-400 w-[60px] text-center">{d.month}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 5: LIFECYCLE SURVEYS
// ============================================================

function LifecycleSurveys({ surveys = [] }) {
  const { t } = useTranslation();

  const onboardingData = {
    triggers: [
      t('surveys.lifecycle.onboarding.30days', '30 days'),
      t('surveys.lifecycle.onboarding.60days', '60 days'),
      t('surveys.lifecycle.onboarding.90days', '90 days'),
    ],
    avgSatisfaction: [4.1, 4.3, 4.5],
    responseCounts: [12, 10, 8],
    totalSent: [15, 14, 12],
  };

  const exitData = {
    totalCompleted: 8,
    avgSatisfaction: 3.1,
    topReasons: [
      { reason: t('surveys.lifecycle.exit.compensation', 'Better compensation elsewhere'), pct: 35 },
      { reason: t('surveys.lifecycle.exit.growth', 'Limited career growth'), pct: 28 },
      { reason: t('surveys.lifecycle.exit.management', 'Management issues'), pct: 18 },
      { reason: t('surveys.lifecycle.exit.worklife', 'Work-life balance'), pct: 12 },
      { reason: t('surveys.lifecycle.exit.other', 'Other / personal'), pct: 7 },
    ],
  };

  const anniversaryData = {
    milestones: [
      t('surveys.lifecycle.anniversary.1year', '1 Year'),
      t('surveys.lifecycle.anniversary.3years', '3 Years'),
      t('surveys.lifecycle.anniversary.5years', '5 Years'),
    ],
    avgScores: [4.0, 4.2, 4.6],
    upcoming: 5,
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Surveys */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{t('surveys.lifecycle.onboarding.title', 'Onboarding Surveys')}</h3>
              <p className="text-xs text-slate-500">{t('surveys.lifecycle.onboarding.subtitle', 'Automated check-ins at 30, 60, and 90 days')}</p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">{t('surveys.lifecycle.enabled', 'Enabled')}</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {onboardingData.triggers.map((trigger, i) => (
              <div key={trigger} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">{trigger}</span>
                  <span className="text-xs text-slate-400">{onboardingData.responseCounts[i]}/{onboardingData.totalSent[i]} {t('surveys.lifecycle.responded', 'responded')}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900">{onboardingData.avgSatisfaction[i].toFixed(1)}</span>
                  <span className="text-sm text-slate-500 mb-0.5">/5.0</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(onboardingData.avgSatisfaction[i] / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>{t('surveys.lifecycle.onboarding.trend', 'Satisfaction trending upward across onboarding milestones')}</span>
          </div>
        </div>
      </div>

      {/* Exit Surveys */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-momentum-100 text-momentum-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{t('surveys.lifecycle.exit.title', 'Exit Surveys')}</h3>
              <p className="text-xs text-slate-500">{t('surveys.lifecycle.exit.subtitle', 'Automatically sent when an employee is marked as leaving')}</p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">{t('surveys.lifecycle.enabled', 'Enabled')}</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">{t('surveys.lifecycle.exit.completed', 'Completed')}</p>
                  <p className="text-2xl font-bold text-slate-900">{exitData.totalCompleted}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">{t('surveys.lifecycle.exit.avgSat', 'Avg Satisfaction')}</p>
                  <p className="text-2xl font-bold text-momentum-600">{exitData.avgSatisfaction.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">{t('surveys.lifecycle.exit.topReasons', 'Top Reasons for Leaving')}</h4>
              <div className="space-y-2">
                {exitData.topReasons.map((r) => (
                  <div key={r.reason} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700">{r.reason}</span>
                        <span className="text-slate-500 font-medium">{r.pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-momentum-400 rounded-full" style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anniversary Surveys */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{t('surveys.lifecycle.anniversary.title', 'Anniversary Surveys')}</h3>
              <p className="text-xs text-slate-500">{t('surveys.lifecycle.anniversary.subtitle', 'Milestone check-ins at 1, 3, and 5-year marks')}</p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">{t('surveys.lifecycle.enabled', 'Enabled')}</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {anniversaryData.milestones.map((ms, i) => (
              <div key={ms} className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-sm font-medium text-slate-700">{ms}</span>
                <p className="text-2xl font-bold text-purple-600 mt-1">{anniversaryData.avgScores[i].toFixed(1)}</p>
                <p className="text-xs text-slate-400">{t('surveys.lifecycle.anniversary.avgScore', 'avg score')}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700">
              {t('surveys.lifecycle.anniversary.upcoming', '{{count}} employees have upcoming anniversaries this month', { count: anniversaryData.upcoming })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 6: TEMPLATES
// ============================================================

function TemplatesTab({ templates = [] }) {
  const { t } = useTranslation();
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const allTemplates = templates.length > 0 ? templates : [
    ...TEMPLATES,
    { id: 9, name: 'Custom: Remote Work Satisfaction', type: 'Custom', questions: 16, description: 'Evaluate remote work experience, tooling, and team collaboration', icon: LayoutGrid },
  ];

  const previewQuestions = {
    1: ['I feel engaged in my daily work', 'I see a future for myself at this company', 'My contributions are recognized', 'I have the resources I need'],
    2: ['How are you feeling this week?', 'Do you feel supported by your manager?', 'Any blockers or concerns?'],
    3: ['My onboarding experience was smooth', 'I understand my role and responsibilities', 'I feel welcomed by my team'],
    4: ['What is your primary reason for leaving?', 'What could we have done differently?', 'Would you consider returning in the future?'],
    5: ['I feel included regardless of my background', 'Our company values diversity', 'I can be my authentic self at work'],
    6: ['I feel recognized for my contributions', 'I am excited about my next year here', 'My role has grown as expected'],
    7: ['My manager provides clear direction', 'I receive regular and constructive feedback', 'My manager supports my development'],
    8: ['I understand the reasons for this change', 'I feel supported through this transition', 'I believe this change will be positive'],
    9: ['My remote workspace is comfortable', 'I feel connected to my team', 'I have the right tools for remote work'],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('surveys.templates.title', 'Survey Templates')}</h2>
          <p className="text-sm text-slate-500">{t('surveys.templates.subtitle', 'Choose a pre-built template or create your own')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-momentum-500 rounded-lg hover:bg-momentum-600 transition-colors">
          <Plus className="w-4 h-4" />
          {t('surveys.templates.createCustom', 'Create Custom Template')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTemplates.map((tmpl) => {
          const Icon = tmpl.icon || FileText;
          const questionCount = typeof tmpl.questions === 'number' ? tmpl.questions : (Array.isArray(tmpl.questions) ? tmpl.questions.length : 0);
          return (
            <div key={tmpl.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-momentum-100 text-momentum-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">{tmpl.type}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{tmpl.name}</h3>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{tmpl.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">{questionCount} {t('surveys.questions', 'questions')}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTemplate(tmpl)}
                    className="p-1.5 text-slate-500 hover:text-momentum-600 hover:bg-momentum-50 rounded-lg transition-colors"
                    title={t('surveys.templates.preview', 'Preview')}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title={t('surveys.templates.clone', 'Clone & Customize')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{previewTemplate.name}</h2>
                <p className="text-sm text-slate-500">{typeof previewTemplate.questions === 'number' ? previewTemplate.questions : (Array.isArray(previewTemplate.questions) ? previewTemplate.questions.length : 0)} {t('surveys.questions', 'questions')} - {previewTemplate.type}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <p className="text-sm text-slate-600 mb-4">{previewTemplate.description}</p>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('surveys.templates.sampleQuestions', 'Sample Questions')}</h3>
              <div className="space-y-2">
                {(Array.isArray(previewTemplate.questions)
                  ? previewTemplate.questions.map(q => q.text || q)
                  : previewQuestions[previewTemplate.id] || []
                ).slice(0, 5).map((q, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="w-6 h-6 bg-momentum-100 text-momentum-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-700">{q}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
              >
                {t('common.close', 'Close')}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-momentum-500 rounded-lg hover:bg-momentum-600 transition-colors">
                <Copy className="w-4 h-4" />
                {t('surveys.templates.useTemplate', 'Use This Template')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
