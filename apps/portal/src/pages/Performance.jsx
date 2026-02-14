// ============================================================
// PERFORMANCE MANAGEMENT PAGE
// Review cycles, goals & OKRs, 1-on-1 meetings,
// continuous feedback, and development plans
// Supports both Management View (team) and Personal View (my performance)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { useView } from '../lib/viewContext';
import { performanceApi } from '../lib/api';
import {
  ClipboardCheck, Target, Users, MessageSquare, BookOpen,
  Plus, X, ChevronRight, ChevronDown, Star, Calendar,
  Clock, CheckCircle, AlertCircle, TrendingUp, Award,
  Heart, ThumbsUp, Sparkles, Eye, Edit3, BarChart3,
  ArrowRight, Filter, Search, RotateCcw, UserCheck,
  Smile, Meh, Frown, FileText, Briefcase, Flag, RefreshCw, Loader2
} from 'lucide-react';

const TABS = [
  { id: 'reviews', icon: ClipboardCheck, labelKey: 'performance.reviewCycles' },
  { id: 'goals', icon: Target, labelKey: 'performance.goalsOkrs' },
  { id: 'oneOnOnes', icon: Users, labelKey: 'performance.oneOnOnes' },
  { id: 'feedback', icon: MessageSquare, labelKey: 'performance.continuousFeedback' },
  { id: 'development', icon: BookOpen, labelKey: 'performance.developmentPlans' },
];

// ============================================================
// LOADING & EMPTY STATES
// ============================================================

function LoadingSkeleton({ count = 3, type = 'card' }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'list') {
    return (
      <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 max-w-md mb-6">{description}</p>
        {action && (
          <button
            onClick={action}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('errors.somethingWentWrong', 'Something went wrong')}</h3>
        <p className="text-slate-500 max-w-md mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors"
        >
          <RefreshCw className="h-5 w-5" />
          {t('common.tryAgain', 'Try Again')}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Performance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPersonalView } = useView();

  // In personal view, always show the personal experience, even for managers
  // In management view, show team management features for managers
  const isManagerRole = user?.role === 'admin' || user?.role === 'manager';
  const showManagementFeatures = isManagerRole && !isPersonalView;

  const visibleTabs = showManagementFeatures ? TABS : TABS.filter(tab => ['reviews', 'goals', 'feedback', 'development'].includes(tab.id));
  const [activeTab, setActiveTab] = useState('reviews');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {showManagementFeatures ? t('performance.title', 'Performance Management') : t('performance.myTitle', 'My Performance')}
        </h1>
        <p className="text-slate-500 mt-1">
          {showManagementFeatures ? t('performance.subtitle', 'Reviews, goals, feedback, and employee development') : t('performance.mySubtitle', 'Your reviews, goals, and development')}
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
      {activeTab === 'reviews' && <ReviewCyclesTab t={t} isManager={showManagementFeatures} />}
      {activeTab === 'goals' && <GoalsTab t={t} isManager={showManagementFeatures} />}
      {activeTab === 'oneOnOnes' && <OneOnOnesTab t={t} isManager={showManagementFeatures} />}
      {activeTab === 'feedback' && <FeedbackTab t={t} isManager={showManagementFeatures} />}
      {activeTab === 'development' && <DevelopmentPlansTab t={t} isManager={showManagementFeatures} />}
    </div>
  );
}

// ============================================================
// TAB 1: REVIEW CYCLES
// ============================================================

function ReviewCyclesTab({ t, isManager }) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const fetchCycles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cyclesRes, dashboardRes] = await Promise.all([
        performanceApi.getCycles(),
        isManager ? performanceApi.getDashboard() : Promise.resolve(null)
      ]);
      setCycles(cyclesRes.cycles || []);
      setDashboard(dashboardRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

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

  if (loading) return <LoadingSkeleton count={6} type="card" />;
  if (error) return <ErrorState error={error} onRetry={fetchCycles} />;

  if (selectedCycle) {
    return (
      <CycleDetailView
        cycle={selectedCycle}
        onBack={() => { setSelectedCycle(null); fetchCycles(); }}
        getStatusBadge={getStatusBadge}
        t={t}
      />
    );
  }

  if (cycles.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t('performance.noReviewsYet', 'No performance reviews')}
        description={t('performance.noReviewsDesc', 'Create your first review cycle to start evaluating employee performance.')}
        action={isManager ? () => setShowCreateModal(true) : null}
        actionLabel={t('performance.createFirstReview', 'Start First Review Cycle')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <ClipboardCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{dashboard.activeCycles || 0}</p>
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
                <p className="text-3xl font-bold text-slate-900">{dashboard.completedReviews || 0}</p>
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
                <p className="text-3xl font-bold text-slate-900">{dashboard.avgRating || '0.0'}</p>
                <p className="text-sm text-slate-500">{t('performance.avgRating', 'Avg Rating')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{dashboard.upcomingMeetings || 0}</p>
                <p className="text-sm text-slate-500">{t('performance.upcomingMeetings', 'Upcoming 1:1s')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t('performance.allCycles', 'Review Cycles')}</h2>
        {isManager && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            {t('performance.newCycle', 'New Cycle')}
          </button>
        )}
      </div>

      {/* Cycles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cycles.map(cycle => (
          <div
            key={cycle.id}
            onClick={() => setSelectedCycle(cycle)}
            className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900">{cycle.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {getTypeBadge(cycle.type)}
                  {getStatusBadge(cycle.status)}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
              </span>
            </div>
            {cycle.total_participants > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">{t('performance.progress', 'Progress')}</span>
                  <span className="text-slate-700 font-medium">
                    {cycle.completed_count}/{cycle.total_participants}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${(cycle.completed_count / cycle.total_participants) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateCycleModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchCycles(); }}
          t={t}
        />
      )}
    </div>
  );
}

function CycleDetailView({ cycle, onBack, getStatusBadge, t }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await performanceApi.getCycle(cycle.id);
        setParticipants(res.participants || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load cycle details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [cycle.id]);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
        <ArrowRight className="w-4 h-4 rotate-180" />
        {t('common.back', 'Back')}
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{cycle.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(cycle.status)}
              <span className="text-slate-500 text-sm">
                {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 text-sm text-slate-600 border-t border-slate-100 pt-4">
          {cycle.self_assessment && <span>{t('performance.selfAssessment', 'Self Assessment')}</span>}
          {cycle.manager_review && <span>{t('performance.managerReview', 'Manager Review')}</span>}
          {cycle.peer_review && <span>{t('performance.peerReview', 'Peer Review')}</span>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{t('performance.participants', 'Participants')}</h3>
        </div>
        {loading ? (
          <div className="p-4"><LoadingSkeleton count={5} type="list" /></div>
        ) : participants.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {t('performance.noParticipants', 'No participants added yet')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {participants.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                    {p.employee_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{p.employee_name}</p>
                    <p className="text-sm text-slate-500">{p.department_name || t('performance.noDepartment', 'No department')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {cycle.self_assessment && (
                      <span className={`px-2 py-1 rounded text-xs ${p.self_done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {t('performance.selfBadge', 'Self')}
                      </span>
                    )}
                    {cycle.manager_review && (
                      <span className={`px-2 py-1 rounded text-xs ${p.manager_done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {t('performance.managerBadge', 'Manager')}
                      </span>
                    )}
                    {cycle.peer_review && (
                      <span className={`px-2 py-1 rounded text-xs ${p.peer_done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {t('performance.peerBadge', 'Peer')}
                      </span>
                    )}
                  </div>
                  {p.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-medium">{p.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCycleModal({ onClose, onCreated, t }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'quarterly',
    start_date: '',
    end_date: '',
    self_assessment: true,
    manager_review: true,
    peer_review: false,
    employee_ids: []
  });

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await performanceApi.getEmployees();
        setEmployees(res.employees || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load employees:', err);
      }
    }
    loadEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await performanceApi.createCycle(formData);
      onCreated();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to create cycle:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold">{t('performance.createCycle', 'Create Review Cycle')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.cycleName', 'Cycle Name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.type', 'Type')}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="quarterly">{t('performance.cycleTypes.quarterly', 'Quarterly')}</option>
                <option value="annual">{t('performance.cycleTypes.annual', 'Annual')}</option>
                <option value="360">{t('performance.cycleTypes.360', '360-Degree')}</option>
                <option value="probation">{t('performance.cycleTypes.probation', 'Probation')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.startDate', 'Start Date')}</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.endDate', 'End Date')}</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.self_assessment}
                onChange={(e) => setFormData({ ...formData, self_assessment: e.target.checked })}
              />
              <span className="text-sm">{t('performance.selfAssessment', 'Self Assessment')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.manager_review}
                onChange={(e) => setFormData({ ...formData, manager_review: e.target.checked })}
              />
              <span className="text-sm">{t('performance.managerReview', 'Manager Review')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.peer_review}
                onChange={(e) => setFormData({ ...formData, peer_review: e.target.checked })}
              />
              <span className="text-sm">{t('performance.peerReview', 'Peer Review')}</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('performance.createCycleBtn', 'Create Cycle')}
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

function GoalsTab({ t, isManager }) {
  const [goals, setGoals] = useState([]);
  const [okrs, setOkrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('goals'); // 'goals' or 'okrs'
  const [expandedOkrs, setExpandedOkrs] = useState(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [goalsRes, okrsRes] = await Promise.all([
        isManager ? performanceApi.getTeamGoals() : performanceApi.getGoals(),
        performanceApi.getOkrs()
      ]);
      setGoals(goalsRes.goals || []);
      setOkrs(okrsRes.okrs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleOkr = (id) => {
    const newExpanded = new Set(expandedOkrs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedOkrs(newExpanded);
  };

  const getStatusColor = (status) => {
    const colors = {
      on_track: 'text-green-600 bg-green-100',
      at_risk: 'text-amber-600 bg-amber-100',
      off_track: 'text-red-600 bg-red-100',
      completed: 'text-blue-600 bg-blue-100',
      in_progress: 'text-blue-600 bg-blue-100',
      not_started: 'text-slate-600 bg-slate-100',
    };
    return colors[status] || colors.not_started;
  };

  if (loading) return <LoadingSkeleton count={6} type="card" />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('goals')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${viewMode === 'goals' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {t('performance.goals', 'Goals')}
          </button>
          <button
            onClick={() => setViewMode('okrs')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${viewMode === 'okrs' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {t('performance.okrs', 'OKRs')}
          </button>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          {viewMode === 'goals' ? t('performance.newGoal', 'New Goal') : t('performance.newOkr', 'New OKR')}
        </button>
      </div>

      {viewMode === 'goals' ? (
        goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title={t('performance.noGoals', 'No goals yet')}
            description={t('performance.noGoalsDesc', 'Create your first goal to start tracking progress.')}
            action={() => setShowCreateModal(true)}
            actionLabel={t('performance.createGoal', 'Create Goal')}
          />
        ) : (
          <div className="space-y-4">
            {goals.map(goal => (
              <div key={goal.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{goal.title}</h3>
                    {goal.description && <p className="text-sm text-slate-500 mt-1">{goal.description}</p>}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                    {goal.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">{t('performance.progress', 'Progress')}</span>
                    <span className="font-medium text-slate-700">{goal.progress_percentage || 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div
                      className={`h-2 rounded-full ${goal.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${goal.progress_percentage || 0}%` }}
                    />
                  </div>
                </div>
                {goal.target_date && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    Due {new Date(goal.target_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        okrs.length === 0 ? (
          <EmptyState
            icon={Target}
            title={t('performance.noOkrs', 'No OKRs yet')}
            description={t('performance.noOkrsDesc', 'Create your first OKR to align team objectives.')}
            action={() => setShowCreateModal(true)}
            actionLabel={t('performance.createOkr', 'Create OKR')}
          />
        ) : (
          <div className="space-y-4">
            {okrs.map(okr => (
              <div key={okr.id} className="bg-white rounded-xl border border-slate-200">
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => toggleOkr(okr.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <button className="mt-1">
                        {expandedOkrs.has(okr.id) ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      <div>
                        <h3 className="font-semibold text-slate-900">{okr.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{okr.level}</span>
                          {okr.owner_name && <span className="text-sm text-slate-500">{okr.owner_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(okr.status)}`}>
                        {okr.status?.replace('_', ' ')}
                      </span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-slate-900">{okr.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                {expandedOkrs.has(okr.id) && okr.key_results && okr.key_results.length > 0 && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">{t('performance.keyResults', 'Key Results')}</h4>
                    <div className="space-y-3">
                      {okr.key_results.map(kr => (
                        <div key={kr.id} className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-700">{kr.title}</span>
                            <span className="text-sm font-medium text-slate-900">{kr.progress || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full">
                            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${kr.progress || 0}%` }} />
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-slate-500">
                            <span>{t('performance.current', 'Current')}: {kr.current || '-'}</span>
                            <span>{t('performance.target', 'Target')}: {kr.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {showCreateModal && (
        <CreateGoalModal
          isOkr={viewMode === 'okrs'}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchData(); }}
          t={t}
        />
      )}
    </div>
  );
}

function CreateGoalModal({ isOkr, onClose, onCreated, t }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(
    isOkr
      ? { title: '', level: 'team', period: 'Q1 2026', key_results: [{ title: '', target: '' }] }
      : { title: '', description: '', category: 'performance', priority: 'medium', target_date: '' }
  );

  const addKeyResult = () => {
    setFormData({ ...formData, key_results: [...formData.key_results, { title: '', target: '' }] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isOkr) {
        await performanceApi.createOkr(formData);
      } else {
        await performanceApi.createGoal(formData);
      }
      onCreated();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to create:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold">{isOkr ? t('performance.createOkrTitle', 'Create OKR') : t('performance.createGoalTitle', 'Create Goal')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.titleLabel', 'Title')}</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          {isOkr ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.level', 'Level')}</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="company">{t('performance.levels.company', 'Company')}</option>
                    <option value="department">{t('performance.levels.department', 'Department')}</option>
                    <option value="team">{t('performance.levels.team', 'Team')}</option>
                    <option value="individual">{t('performance.levels.individual', 'Individual')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.period', 'Period')}</label>
                  <input
                    type="text"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder={t('performance.periodPlaceholder', 'Q1 2026')}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">{t('performance.keyResults', 'Key Results')}</label>
                  <button type="button" onClick={addKeyResult} className="text-sm text-blue-600 hover:text-blue-700">
                    {t('performance.addKeyResult', '+ Add Key Result')}
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.key_results.map((kr, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={kr.title}
                        onChange={(e) => {
                          const newKrs = [...formData.key_results];
                          newKrs[i].title = e.target.value;
                          setFormData({ ...formData, key_results: newKrs });
                        }}
                        placeholder={t('performance.keyResultPlaceholder', 'Key result title')}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={kr.target}
                        onChange={(e) => {
                          const newKrs = [...formData.key_results];
                          newKrs[i].target = e.target.value;
                          setFormData({ ...formData, key_results: newKrs });
                        }}
                        placeholder={t('performance.targetPlaceholder', 'Target')}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.description', 'Description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.category', 'Category')}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="performance">{t('performance.categories.performance', 'Performance')}</option>
                    <option value="development">{t('performance.categories.development', 'Development')}</option>
                    <option value="stretch">{t('performance.categories.stretch', 'Stretch')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.priority', 'Priority')}</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="high">{t('common.priority.high', 'High')}</option>
                    <option value="medium">{t('common.priority.medium', 'Medium')}</option>
                    <option value="low">{t('common.priority.low', 'Low')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.targetDate', 'Target Date')}</label>
                <input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('performance.createBtn', 'Create')}
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

function OneOnOnesTab({ t, isManager }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await performanceApi.getOneOnOnes();
      setMeetings(res.meetings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const getMoodIcon = (mood) => {
    if (!mood) return null;
    if (mood >= 4) return <Smile className="w-5 h-5 text-green-500" />;
    if (mood >= 3) return <Meh className="w-5 h-5 text-amber-500" />;
    return <Frown className="w-5 h-5 text-red-500" />;
  };

  if (loading) return <LoadingSkeleton count={4} type="list" />;
  if (error) return <ErrorState error={error} onRetry={fetchMeetings} />;

  if (selectedMeeting) {
    return (
      <MeetingDetailView
        meeting={selectedMeeting}
        onBack={() => { setSelectedMeeting(null); fetchMeetings(); }}
        t={t}
      />
    );
  }

  if (meetings.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t('performance.noMeetings', 'No 1-on-1 meetings')}
        description={t('performance.noMeetingsDesc', 'Schedule your first 1-on-1 meeting to start meaningful conversations.')}
        action={isManager ? () => setShowCreateModal(true) : null}
        actionLabel={t('performance.scheduleMeeting', 'Schedule Meeting')}
      />
    );
  }

  const upcoming = meetings.filter(m => m.status === 'scheduled' && new Date(m.scheduled_date) >= new Date());
  const past = meetings.filter(m => m.status === 'completed' || new Date(m.scheduled_date) < new Date());

  return (
    <div className="space-y-6">
      {isManager && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            {t('performance.scheduleMeeting', 'Schedule Meeting')}
          </button>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">{t('performance.upcoming', 'Upcoming')}</h3>
          <div className="space-y-3">
            {upcoming.map(meeting => (
              <div
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                      {meeting.employee_initials || meeting.manager_initials}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {isManager ? meeting.employee_name : meeting.manager_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(meeting.scheduled_date).toLocaleDateString()}
                        {meeting.scheduled_time && ` at ${meeting.scheduled_time}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {meeting.recurring && meeting.recurring !== 'none' && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        {meeting.recurring}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">{t('performance.pastMeetings', 'Past Meetings')}</h3>
          <div className="space-y-3">
            {past.slice(0, 5).map(meeting => (
              <div
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
                      {meeting.employee_initials || meeting.manager_initials}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {isManager ? meeting.employee_name : meeting.manager_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(meeting.scheduled_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getMoodIcon(meeting.mood)}
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchMeetings(); }}
          t={t}
        />
      )}
    </div>
  );
}

function MeetingDetailView({ meeting, onBack, t }) {
  const [notes, setNotes] = useState(meeting.notes || '');
  const [saving, setSaving] = useState(false);

  const agenda = meeting.agenda ? (typeof meeting.agenda === 'string' ? JSON.parse(meeting.agenda) : meeting.agenda) : [];
  const actionItems = meeting.action_items || [];

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await performanceApi.updateOneOnOne(meeting.id, { notes });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
        <ArrowRight className="w-4 h-4 rotate-180" />
        {t('common.back', 'Back')}
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-semibold">
            {meeting.employee_initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{meeting.employee_name}</h2>
            <p className="text-slate-500">with {meeting.manager_name}</p>
            <p className="text-sm text-slate-500 mt-1">
              {new Date(meeting.scheduled_date).toLocaleDateString()}
              {meeting.scheduled_time && ` at ${meeting.scheduled_time}`}
            </p>
          </div>
        </div>

        {agenda.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">{t('performance.agenda', 'Agenda')}</h3>
            <ul className="space-y-2">
              {agenda.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">{t('performance.notes', 'Notes')}</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder={t('performance.addMeetingNotesPlaceholder', 'Add meeting notes...')}
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {saving ? t('performance.saving', 'Saving...') : t('performance.saveNotes', 'Save Notes')}
          </button>
        </div>

        {actionItems.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">{t('performance.actionItems', 'Action Items')}</h3>
            <div className="space-y-2">
              {actionItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={async () => {
                      try {
                        await performanceApi.updateOneOnOneAction(meeting.id, item.id, { is_completed: !item.is_completed });
                      } catch (err) {
                        if (import.meta.env.DEV) console.error('Failed to update action:', err);
                      }
                    }}
                    className="w-5 h-5 rounded border-slate-300"
                  />
                  <span className={item.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateMeetingModal({ onClose, onCreated, t }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    scheduled_date: '',
    scheduled_time: '',
    recurring: 'none',
    agenda: ['']
  });

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await performanceApi.getEmployees();
        setEmployees(res.employees || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load employees:', err);
      }
    }
    loadEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await performanceApi.createOneOnOne({
        ...formData,
        agenda: formData.agenda.filter(a => a.trim())
      });
      onCreated();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to create meeting:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold">{t('performance.scheduleMeeting', 'Schedule 1-on-1')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.employee', 'Employee')}</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            >
              <option value="">{t('common.selectEmployee', 'Select employee...')}</option>
              {employees.map(emp => (
                <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.date', 'Date')}</label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.time', 'Time')}</label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.recurring', 'Recurring')}</label>
            <select
              value={formData.recurring}
              onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="none">{t('performance.oneTime', 'One-time')}</option>
              <option value="weekly">{t('performance.weekly', 'Weekly')}</option>
              <option value="biweekly">{t('performance.biweekly', 'Every 2 Weeks')}</option>
              <option value="monthly">{t('performance.monthly', 'Monthly')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('performance.scheduleBtn', 'Schedule')}
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

function FeedbackTab({ t, isManager }) {
  const [myFeedback, setMyFeedback] = useState([]);
  const [publicFeed, setPublicFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGiveModal, setShowGiveModal] = useState(false);
  const [viewMode, setViewMode] = useState('received'); // 'received', 'given', 'public'

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [myRes, publicRes] = await Promise.all([
        performanceApi.getMyFeedback(),
        performanceApi.getPublicFeedback()
      ]);
      setMyFeedback(myRes.feedback || []);
      setPublicFeed(publicRes.feedback || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleReact = async (feedbackId, reaction) => {
    try {
      await performanceApi.reactToFeedback(feedbackId, reaction);
      fetchFeedback();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to react:', err);
    }
  };

  if (loading) return <LoadingSkeleton count={4} type="list" />;
  if (error) return <ErrorState error={error} onRetry={fetchFeedback} />;

  const getTypeIcon = (type) => {
    if (type === 'praise') return <ThumbsUp className="w-5 h-5 text-green-500" />;
    if (type === 'constructive') return <MessageSquare className="w-5 h-5 text-amber-500" />;
    return <MessageSquare className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('received')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${viewMode === 'received' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Received
          </button>
          <button
            onClick={() => setViewMode('public')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${viewMode === 'public' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Public Feed
          </button>
        </div>
        <button
          onClick={() => setShowGiveModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          {t('performance.giveFeedbackBtn', 'Give Feedback')}
        </button>
      </div>

      {viewMode === 'received' ? (
        myFeedback.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={t('performance.noFeedbackReceived', 'No feedback received')}
            description={t('performance.noFeedbackReceivedDesc', "You haven't received any feedback yet.")}
          />
        ) : (
          <div className="space-y-4">
            {myFeedback.map(fb => (
              <div key={fb.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-4">
                  {getTypeIcon(fb.feedback_type)}
                  <div className="flex-1">
                    <p className="text-slate-700">{fb.feedback_text}</p>
                    <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                      <span>{t('common.from', 'From')}: {fb.from_name}</span>
                      <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        publicFeed.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={t('performance.noPublicFeedback', 'No public feedback')}
            description={t('performance.noPublicFeedbackDesc', "Share positive feedback publicly to celebrate your team's achievements.")}
          />
        ) : (
          <div className="space-y-4">
            {publicFeed.map(fb => (
              <div key={fb.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                    {fb.from_initials || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-slate-900">{fb.from_name}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{fb.to_name}</span>
                    </div>
                    <p className="text-slate-700">{fb.feedback_text}</p>
                    {fb.value_tag && (
                      <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                        {fb.value_tag}
                      </span>
                    )}
                    <div className="flex items-center gap-4 mt-4">
                      <button
                        onClick={() => handleReact(fb.id, 'thumbsUp')}
                        className="flex items-center gap-1 text-slate-500 hover:text-blue-600"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-sm">{fb.reactions?.thumbsUp || 0}</span>
                      </button>
                      <button
                        onClick={() => handleReact(fb.id, 'heart')}
                        className="flex items-center gap-1 text-slate-500 hover:text-red-500"
                      >
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{fb.reactions?.heart || 0}</span>
                      </button>
                      <button
                        onClick={() => handleReact(fb.id, 'sparkle')}
                        className="flex items-center gap-1 text-slate-500 hover:text-amber-500"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm">{fb.reactions?.sparkle || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showGiveModal && (
        <GiveFeedbackModal
          onClose={() => setShowGiveModal(false)}
          onGiven={() => { setShowGiveModal(false); fetchFeedback(); }}
          t={t}
        />
      )}
    </div>
  );
}

function GiveFeedbackModal({ onClose, onGiven, t }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to_user_id: '',
    feedback_text: '',
    feedback_type: 'praise',
    visibility: 'private',
    value_tag: ''
  });

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await performanceApi.getEmployees();
        setEmployees(res.employees || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load employees:', err);
      }
    }
    loadEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await performanceApi.giveFeedback(formData);
      onGiven();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to give feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold">{t('performance.giveFeedback', 'Give Feedback')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.to', 'To')}</label>
            <select
              value={formData.to_user_id}
              onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            >
              <option value="">{t('common.selectPerson', 'Select person...')}</option>
              {employees.map(emp => (
                <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.feedbackType', 'Type')}</label>
            <div className="flex gap-2">
              {['praise', 'constructive', 'general'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, feedback_type: type })}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize ${
                    formData.feedback_type === type
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.feedback', 'Feedback')}</label>
            <textarea
              value={formData.feedback_text}
              onChange={(e) => setFormData({ ...formData, feedback_text: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.visibility', 'Visibility')}</label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="private">{t('performance.privateVisibility', 'Private (only recipient sees)')}</option>
              <option value="shared_with_manager">{t('performance.publicVisibility', 'Public (visible on feed)')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('performance.sendFeedback', 'Send Feedback')}
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

function DevelopmentPlansTab({ t, isManager }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await performanceApi.getDevelopmentPlans();
      setPlans(res.plans || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleUpdateAction = async (planId, actionId, status) => {
    try {
      await performanceApi.updateDevelopmentAction(planId, actionId, { status });
      fetchPlans();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to update action:', err);
    }
  };

  const getActionTypeIcon = (type) => {
    const icons = {
      training: BookOpen,
      stretch: TrendingUp,
      mentoring: Users,
      reading: FileText,
      other: Briefcase
    };
    const Icon = icons[type] || icons.other;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) return <LoadingSkeleton count={3} type="card" />;
  if (error) return <ErrorState error={error} onRetry={fetchPlans} />;

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t('performance.noPlans', 'No development plans')}
        description={t('performance.noPlansDesc', 'Create your first development plan to track career growth.')}
        action={isManager ? () => setShowCreateModal(true) : null}
        actionLabel={t('performance.createPlan', 'Create Plan')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {isManager && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        </div>
      )}

      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-xl border border-slate-200">
            <div
              className="p-5 cursor-pointer"
              onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <button>
                    {expandedPlan === plan.id ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <div>
                    <h3 className="font-semibold text-slate-900">{plan.title}</h3>
                    <p className="text-sm text-slate-500">{plan.employee_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {plan.status}
                  </span>
                  {plan.review_date && (
                    <span className="text-sm text-slate-500">
                      Review: {new Date(plan.review_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {expandedPlan === plan.id && plan.focus_areas && (
              <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                <div className="space-y-6">
                  {plan.focus_areas.map(area => (
                    <div key={area.id}>
                      <h4 className="font-medium text-slate-900 mb-3">{area.title}</h4>
                      <div className="space-y-2">
                        {area.actions?.map(action => (
                          <div key={action.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                            <button
                              onClick={() => handleUpdateAction(
                                plan.id,
                                action.id,
                                action.status === 'completed' ? 'pending' : 'completed'
                              )}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                action.status === 'completed'
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : action.status === 'in_progress'
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-300'
                              }`}
                            >
                              {action.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                            </button>
                            <div className="flex-1">
                              <span className={action.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}>
                                {action.text}
                              </span>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {getActionTypeIcon(action.type)}
                              {action.type}
                            </span>
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

      {showCreateModal && (
        <CreateDevelopmentPlanModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchPlans(); }}
          t={t}
        />
      )}
    </div>
  );
}

function CreateDevelopmentPlanModal({ onClose, onCreated, t }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    review_date: '',
    focus_areas: [{ title: '', actions: [{ text: '', type: 'training' }] }]
  });

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await performanceApi.getEmployees();
        setEmployees(res.employees || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load employees:', err);
      }
    }
    loadEmployees();
  }, []);

  const addFocusArea = () => {
    setFormData({
      ...formData,
      focus_areas: [...formData.focus_areas, { title: '', actions: [{ text: '', type: 'training' }] }]
    });
  };

  const addAction = (areaIndex) => {
    const newAreas = [...formData.focus_areas];
    newAreas[areaIndex].actions.push({ text: '', type: 'training' });
    setFormData({ ...formData, focus_areas: newAreas });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await performanceApi.createDevelopmentPlan(formData);
      onCreated();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to create plan:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold">{t('performance.createDevelopmentPlan', 'Create Development Plan')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.employee', 'Employee')}</label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              >
                <option value="">{t('common.selectEmployee', 'Select employee...')}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.reviewDate', 'Review Date')}</label>
              <input
                type="date"
                value={formData.review_date}
                onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('performance.planTitle', 'Plan Title')}</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="e.g., Path to Senior Engineer"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">{t('performance.focusAreas', 'Focus Areas')}</label>
              <button type="button" onClick={addFocusArea} className="text-sm text-blue-600 hover:text-blue-700">
                {t('performance.addFocusArea', '+ Add Focus Area')}
              </button>
            </div>
            {formData.focus_areas.map((area, areaIndex) => (
              <div key={areaIndex} className="border border-slate-200 rounded-lg p-4">
                <input
                  type="text"
                  value={area.title}
                  onChange={(e) => {
                    const newAreas = [...formData.focus_areas];
                    newAreas[areaIndex].title = e.target.value;
                    setFormData({ ...formData, focus_areas: newAreas });
                  }}
                  placeholder={t('performance.focusAreaPlaceholder', 'Focus area title')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3"
                />
                <div className="space-y-2">
                  {area.actions.map((action, actionIndex) => (
                    <div key={actionIndex} className="flex gap-2">
                      <input
                        type="text"
                        value={action.text}
                        onChange={(e) => {
                          const newAreas = [...formData.focus_areas];
                          newAreas[areaIndex].actions[actionIndex].text = e.target.value;
                          setFormData({ ...formData, focus_areas: newAreas });
                        }}
                        placeholder={t('performance.actionItemPlaceholder', 'Action item')}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <select
                        value={action.type}
                        onChange={(e) => {
                          const newAreas = [...formData.focus_areas];
                          newAreas[areaIndex].actions[actionIndex].type = e.target.value;
                          setFormData({ ...formData, focus_areas: newAreas });
                        }}
                        className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="training">{t('performance.training', 'Training')}</option>
                        <option value="stretch">{t('performance.stretch', 'Stretch')}</option>
                        <option value="mentoring">{t('performance.mentoring', 'Mentoring')}</option>
                        <option value="reading">{t('performance.reading', 'Reading')}</option>
                        <option value="other">{t('performance.otherAction', 'Other')}</option>
                      </select>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addAction(areaIndex)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t('performance.addAction', '+ Add Action')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('performance.createPlanBtn', 'Create Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
