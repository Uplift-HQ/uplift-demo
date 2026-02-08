// ============================================================
// LEARNING & DEVELOPMENT PAGE
// Course catalogue, learning paths, enrollments, compliance,
// personal learning, and analytics dashboard
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { learningApi } from '../lib/api';
import EmptyState from '../components/EmptyState';
import {
  BookOpen, GraduationCap, Users, ShieldCheck, User, BarChart3,
  Plus, Search, Filter, Grid3X3, List, Clock, Award, CheckCircle,
  AlertTriangle, AlertCircle, ChevronRight, Download, Send,
  Star, TrendingUp, Trophy, Target, Eye, X, Play, FileText,
  Building, MapPin, Flame, Lock, Unlock, LayoutGrid, Route,
  ClipboardCheck, Brain, Zap, ArrowRight, Calendar, Mail,
  ChevronDown, MoreVertical, RefreshCw, Loader2
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================

const TABS = [
  { id: 'catalogue', labelKey: 'learning.tabs.catalogue', label: 'Course Catalogue', icon: BookOpen },
  { id: 'paths', labelKey: 'learning.tabs.paths', label: 'Learning Paths', icon: Route },
  { id: 'enrollments', labelKey: 'learning.tabs.enrollments', label: 'Enrollments', icon: ClipboardCheck },
  { id: 'compliance', labelKey: 'learning.tabs.compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'my_learning', labelKey: 'learning.tabs.myLearning', label: 'My Learning', icon: User },
  { id: 'dashboard', labelKey: 'learning.tabs.dashboard', label: 'Dashboard', icon: BarChart3 },
];

const CATEGORIES = [
  { value: 'all', labelKey: 'learning.categories.all', label: 'All Categories' },
  { value: 'health_safety', labelKey: 'learning.categories.healthSafety', label: 'Health & Safety' },
  { value: 'compliance', labelKey: 'learning.categories.compliance', label: 'Compliance' },
  { value: 'soft_skills', labelKey: 'learning.categories.softSkills', label: 'Soft Skills' },
  { value: 'leadership', labelKey: 'learning.categories.leadership', label: 'Leadership' },
];

const DIFFICULTIES = [
  { value: 'all', labelKey: 'learning.difficulty.all', label: 'All Levels' },
  { value: 'beginner', labelKey: 'learning.difficulty.beginner', label: 'Beginner' },
  { value: 'intermediate', labelKey: 'learning.difficulty.intermediate', label: 'Intermediate' },
  { value: 'advanced', labelKey: 'learning.difficulty.advanced', label: 'Advanced' },
];

const CATEGORY_ICONS = {
  health_safety: ShieldCheck,
  compliance: Award,
  soft_skills: Users,
  leadership: GraduationCap,
};

const CATEGORY_COLORS = {
  health_safety: 'bg-red-500',
  compliance: 'bg-blue-500',
  soft_skills: 'bg-purple-500',
  leadership: 'bg-momentum-500',
};

// ============================================================
// LOADING SKELETON
// ============================================================

function LoadingSkeleton({ count = 3, type = 'card' }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="h-32 bg-slate-200" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-2 bg-slate-200 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'table') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 space-y-3 animate-pulse">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
              <div className="h-6 bg-slate-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Learning() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [activeTab, setActiveTab] = useState(isManager ? 'catalogue' : 'my_learning');
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('learning.title', 'Learning & Development')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('learning.subtitle', 'Manage training courses, compliance, and employee development')}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {(isManager ? TABS : TABS.filter(t => ['catalogue', 'paths', 'my_learning'].includes(t.id))).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-momentum-500 text-momentum-600'
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
      {activeTab === 'catalogue' && (
        <CatalogueTab t={t} onCreateCourse={() => setShowCreateCourse(true)} />
      )}
      {activeTab === 'paths' && <PathsTab t={t} />}
      {activeTab === 'enrollments' && (
        <EnrollmentsTab t={t} onBulkEnroll={() => setShowBulkEnroll(true)} />
      )}
      {activeTab === 'compliance' && <ComplianceTab t={t} />}
      {activeTab === 'my_learning' && <MyLearningTab t={t} onBrowseCatalogue={() => setActiveTab('catalogue')} />}
      {activeTab === 'dashboard' && <DashboardTab t={t} />}

      {/* Create Course Modal */}
      {showCreateCourse && (
        <CreateCourseModal t={t} onClose={() => setShowCreateCourse(false)} />
      )}

      {/* Bulk Enroll Modal */}
      {showBulkEnroll && (
        <BulkEnrollModal t={t} onClose={() => setShowBulkEnroll(false)} />
      )}
    </div>
  );
}

// ============================================================
// TAB 1: COURSE CATALOGUE
// ============================================================

function CatalogueTab({ t, onCreateCourse }) {
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mandatoryFilter, setMandatoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (mandatoryFilter === 'mandatory') params.mandatory = 'true';
      if (mandatoryFilter === 'optional') params.mandatory = 'false';
      const response = await learningApi.getCourses(params);
      setCourses(response.courses || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, mandatoryFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filtered = courses.filter((c) => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase());
    const matchDifficulty = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
    return matchSearch && matchDifficulty;
  });

  const getCategoryBadge = (category) => {
    const map = {
      health_safety: 'bg-red-100 text-red-700',
      compliance: 'bg-blue-100 text-blue-700',
      soft_skills: 'bg-purple-100 text-purple-700',
      leadership: 'bg-momentum-100 text-momentum-700',
    };
    return map[category] || 'bg-slate-100 text-slate-700';
  };

  const getCategoryLabel = (category) => {
    const map = {
      health_safety: t('learning.categories.healthSafety', 'Health & Safety'),
      compliance: t('learning.categories.compliance', 'Compliance'),
      soft_skills: t('learning.categories.softSkills', 'Soft Skills'),
      leadership: t('learning.categories.leadership', 'Leadership'),
    };
    return map[category] || category;
  };

  const getDifficultyBadge = (difficulty) => {
    const map = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-amber-100 text-amber-700',
      advanced: 'bg-red-100 text-red-700',
    };
    return map[difficulty] || 'bg-slate-100 text-slate-700';
  };

  const getCourseIcon = (category) => {
    return CATEGORY_ICONS[category] || BookOpen;
  };

  const getCourseColor = (category) => {
    return CATEGORY_COLORS[category] || 'bg-slate-500';
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-700 font-medium">{t('common.error', 'Error')}</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchCourses}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('learning.searchCourses', 'Search courses...')}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{t(c.labelKey, c.label)}</option>
            ))}
          </select>
          <select
            value={mandatoryFilter}
            onChange={(e) => setMandatoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="all">{t('learning.allTypes', 'All Types')}</option>
            <option value="mandatory">{t('learning.mandatory', 'Mandatory')}</option>
            <option value="optional">{t('learning.optional', 'Optional')}</option>
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>{t(d.labelKey, d.label)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-momentum-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-momentum-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onCreateCourse}
            className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('learning.createCourse', 'Create Course')}
          </button>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-slate-500">
          {t('learning.showingCourses', 'Showing {{count}} courses', { count: filtered.length })}
        </p>
      )}

      {/* Loading */}
      {loading && <LoadingSkeleton count={8} type="card" />}

      {/* Empty State for no courses */}
      {!loading && courses.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={BookOpen}
            title={t('learning.noCoursesYet', 'No courses yet')}
            description={t('learning.noCoursesDesc', 'Create your first learning course to start developing your team. Courses can include compliance training, skills development, and more.')}
            action={
              <button
                onClick={onCreateCourse}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                {t('learning.createFirstCourse', 'Create First Course')}
              </button>
            }
          />
        </div>
      )}

      {/* Grid View */}
      {!loading && courses.length > 0 && viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((course) => {
            const Icon = getCourseIcon(course.category);
            const color = getCourseColor(course.category);
            const completionRate = course.completion_rate || 0;
            return (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group cursor-pointer"
              >
                {/* Thumbnail */}
                <div className={`${color} h-32 flex items-center justify-center relative`}>
                  <Icon className="w-12 h-12 text-white/80" />
                  {course.is_mandatory && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded">
                      {t('learning.mandatory', 'Mandatory')}
                    </span>
                  )}
                  <span className={`absolute bottom-2 left-2 px-2 py-0.5 text-xs font-medium rounded ${getDifficultyBadge(course.difficulty)}`}>
                    {t(`learning.difficulty.${course.difficulty}`, course.difficulty)}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2 ${getCategoryBadge(course.category)}`}>
                    {getCategoryLabel(course.category)}
                  </span>
                  <h3 className="font-semibold text-slate-900 text-sm group-hover:text-momentum-600 transition-colors line-clamp-2 mb-2">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {course.duration_minutes || course.total_duration || 30} {t('learning.mins', 'mins')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {course.lesson_count || 0} {t('learning.lessons', 'lessons')}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('learning.completionRate', 'Completion')}</span>
                      <span className={`font-semibold ${
                        completionRate >= 90 ? 'text-green-600' :
                        completionRate >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {completionRate}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          completionRate >= 90 ? 'bg-green-500' :
                          completionRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        !loading && courses.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.course', 'Course')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.category', 'Category')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.type', 'Type')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.difficulty', 'Difficulty')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.duration', 'Duration')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.lessons', 'Lessons')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((course) => {
                  const Icon = getCourseIcon(course.category);
                  const color = getCourseColor(course.category);
                  return (
                    <tr key={course.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`${color} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-slate-900">{course.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryBadge(course.category)}`}>
                          {getCategoryLabel(course.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {course.is_mandatory ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            {t('learning.mandatory', 'Mandatory')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                            {t('learning.optional', 'Optional')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyBadge(course.difficulty)}`}>
                          {t(`learning.difficulty.${course.difficulty}`, course.difficulty)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {course.duration_minutes || course.total_duration || 30} {t('learning.mins', 'mins')}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{course.lesson_count || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {!loading && filtered.length === 0 && courses.length > 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t('learning.noCoursesFound', 'No courses match your filters')}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 2: LEARNING PATHS
// ============================================================

function PathsTab({ t }) {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreatePath, setShowCreatePath] = useState(false);

  const fetchPaths = useCallback(async () => {
    try {
      setLoading(true);
      const response = await learningApi.getPaths();
      setPaths(response.paths || []);
    } catch (err) {
      console.error('Failed to fetch paths:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaths();
  }, [fetchPaths]);

  if (loading) {
    return <LoadingSkeleton count={3} type="card" />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-700">{error}</p>
        <button onClick={fetchPaths} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {t('learning.pathsDescription', 'Structured sequences of courses for role-based development')}
        </p>
        <button
          onClick={() => setShowCreatePath(true)}
          className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('learning.createPath', 'Create Path')}
        </button>
      </div>

      {paths.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={Route}
            title={t('learning.noPathsYet', 'No learning paths yet')}
            description={t('learning.noPathsDesc', 'Create structured sequences of courses for role-based development and onboarding.')}
            action={
              <button
                onClick={() => setShowCreatePath(true)}
                className="flex items-center gap-2 px-6 py-3 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 font-medium"
              >
                <Plus className="h-5 w-5" />
                {t('learning.createFirstPath', 'Create First Path')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {paths.map((path) => {
            const courses = path.courses || [];
            return (
              <div
                key={path.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all"
              >
                {/* Path header */}
                <div className="bg-gradient-to-r from-momentum-500 to-momentum-600 p-5 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-5 h-5 text-momentum-200" />
                    <span className="text-momentum-200 text-xs font-medium uppercase tracking-wide">
                      {t('learning.learningPath', 'Learning Path')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{path.title}</h3>
                  <p className="text-momentum-100 text-sm mt-1">{path.description}</p>
                </div>

                {/* Path stats */}
                <div className="grid grid-cols-3 border-b border-slate-200">
                  <div className="p-3 text-center border-r border-slate-200">
                    <p className="text-lg font-bold text-slate-900">{path.course_count || courses.length}</p>
                    <p className="text-xs text-slate-500">{t('learning.courses', 'Courses')}</p>
                  </div>
                  <div className="p-3 text-center border-r border-slate-200">
                    <p className="text-lg font-bold text-slate-900">{path.total_duration || 0}</p>
                    <p className="text-xs text-slate-500">{t('learning.mins', 'mins')}</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-lg font-bold text-green-600">-</p>
                    <p className="text-xs text-slate-500">{t('learning.complete', 'Complete')}</p>
                  </div>
                </div>

                {/* Course list */}
                <div className="p-4">
                  <div className="space-y-2">
                    {courses.slice(0, 5).map((course, idx) => {
                      const Icon = CATEGORY_ICONS[course.category] || BookOpen;
                      const color = CATEGORY_COLORS[course.category] || 'bg-slate-500';
                      return (
                        <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className={`${color} w-7 h-7 rounded flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{course.title}</p>
                            <p className="text-xs text-slate-500">{course.duration_minutes || 30} {t('learning.mins', 'mins')}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </div>
                      );
                    })}
                    {courses.length > 5 && (
                      <p className="text-xs text-slate-500 text-center py-2">+{courses.length - 5} more courses</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Path Modal */}
      {showCreatePath && (
        <CreatePathModal t={t} onClose={() => setShowCreatePath(false)} onCreated={fetchPaths} />
      )}
    </div>
  );
}

// ============================================================
// TAB 3: ENROLLMENTS
// ============================================================

function EnrollmentsTab({ t, onBulkEnroll }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (courseFilter !== 'all') params.course_id = courseFilter;
      if (deptFilter !== 'all') params.department = deptFilter;

      const [enrollmentsRes, coursesRes] = await Promise.all([
        learningApi.getEnrollments(params),
        learningApi.getCourses()
      ]);
      setEnrollments(enrollmentsRes.enrollments || []);
      setCourses(coursesRes.courses || []);
    } catch (err) {
      console.error('Failed to fetch enrollments:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, courseFilter, deptFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const departments = [...new Set(enrollments.map(e => e.department).filter(Boolean))];

  const getStatusBadge = (status) => {
    const map = {
      enrolled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      failed: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status) => {
    const map = {
      enrolled: t('learning.status.enrolled', 'Enrolled'),
      in_progress: t('learning.status.inProgress', 'In Progress'),
      completed: t('learning.status.completed', 'Completed'),
      overdue: t('learning.status.overdue', 'Overdue'),
      failed: t('learning.status.failed', 'Failed'),
    };
    return map[status] || status;
  };

  const handleSendReminder = async (enrollmentId) => {
    try {
      setSendingReminder(enrollmentId);
      await learningApi.sendReminder(enrollmentId);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to send reminder:', err);
    } finally {
      setSendingReminder(null);
    }
  };

  const isOverdue = (enrollment) => {
    if (!enrollment.due_date) return false;
    return new Date(enrollment.due_date) < new Date() && enrollment.status !== 'completed';
  };

  if (loading) {
    return <LoadingSkeleton count={5} type="table" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="all">{t('learning.allStatuses', 'All Statuses')}</option>
            <option value="enrolled">{t('learning.status.enrolled', 'Enrolled')}</option>
            <option value="in_progress">{t('learning.status.inProgress', 'In Progress')}</option>
            <option value="completed">{t('learning.status.completed', 'Completed')}</option>
            <option value="failed">{t('learning.status.failed', 'Failed')}</option>
          </select>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="all">{t('learning.allCourses', 'All Courses')}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="all">{t('learning.allDepartments', 'All Departments')}</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onBulkEnroll}
          className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
        >
          <Users className="w-4 h-4" />
          {t('learning.bulkEnroll', 'Bulk Enroll')}
        </button>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={ClipboardCheck}
            title={t('learning.noEnrollmentsYet', 'No enrollments yet')}
            description={t('learning.noEnrollmentsDesc', 'Enroll employees in courses to start tracking their learning progress.')}
            action={
              <button
                onClick={onBulkEnroll}
                className="flex items-center gap-2 px-6 py-3 bg-momentum-500 text-white rounded-lg hover:bg-momentum-600 font-medium"
              >
                <Users className="h-5 w-5" />
                {t('learning.enrollEmployees', 'Enroll Employees')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.employee', 'Employee')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.course', 'Course')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.status', 'Status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.progress', 'Progress')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.score', 'Score')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.dueDate', 'Due Date')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((enrollment) => {
                  const progress = enrollment.total_lessons > 0
                    ? Math.round((enrollment.completed_lessons / enrollment.total_lessons) * 100)
                    : 0;
                  const overdue = isOverdue(enrollment);
                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs flex-shrink-0">
                            {enrollment.employee_name?.split(' ').map((n) => n[0]).join('') || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{enrollment.employee_name}</p>
                            <p className="text-xs text-slate-500">{enrollment.department} {enrollment.job_title && `- ${enrollment.job_title}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{enrollment.course_title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${overdue ? 'bg-red-100 text-red-700' : getStatusBadge(enrollment.status)}`}>
                          {overdue ? t('learning.status.overdue', 'Overdue') : getStatusLabel(enrollment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                progress === 100 ? 'bg-green-500' :
                                progress > 0 ? 'bg-momentum-500' : 'bg-slate-300'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 font-medium">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {enrollment.score !== null ? (
                          <span className={`font-semibold ${
                            enrollment.score >= 80 ? 'text-green-600' :
                            enrollment.score >= 60 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {enrollment.score}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                          {enrollment.due_date ? new Date(enrollment.due_date).toLocaleDateString() : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {(overdue || enrollment.status === 'enrolled' || enrollment.status === 'in_progress') && (
                            <button
                              onClick={() => handleSendReminder(enrollment.id)}
                              disabled={sendingReminder === enrollment.id}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title={t('learning.sendReminder', 'Send Reminder')}
                            >
                              {sendingReminder === enrollment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 4: COMPLIANCE
// ============================================================

function ComplianceTab({ t }) {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);

  const fetchCompliance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await learningApi.getTeamCompliance();
      setCompliance(response);
    } catch (err) {
      console.error('Failed to fetch compliance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  const handleSendAllReminders = async () => {
    try {
      setSendingReminders(true);
      await learningApi.sendRemindersBulk();
    } catch (err) {
      console.error('Failed to send reminders:', err);
    } finally {
      setSendingReminders(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton count={3} type="card" />;
  }

  const mandatoryCourses = (compliance?.courses || []).filter(c => c.is_mandatory);
  const overallRate = compliance?.overall?.completion_rate || 0;
  const totalOverdue = compliance?.overall?.total_overdue || 0;

  const getTrafficLight = (rate) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{overallRate}%</p>
              <p className="text-sm text-slate-500">{t('learning.overallCompliance', 'Overall Compliance')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{totalOverdue}</p>
              <p className="text-sm text-slate-500">{t('learning.overdueCount', 'Overdue')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{mandatoryCourses.length}</p>
              <p className="text-sm text-slate-500">{t('learning.mandatoryCourses', 'Mandatory Courses')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">-</p>
              <p className="text-sm text-slate-500">{t('learning.expiringSoon', 'Expiring Soon')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Course Compliance Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{t('learning.courseCompliance', 'Course Compliance')}</h3>
          <button
            onClick={handleSendAllReminders}
            disabled={sendingReminders}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {sendingReminders ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {t('learning.sendReminderAll', 'Send Reminder to All Overdue')}
          </button>
        </div>
        {mandatoryCourses.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('learning.noMandatoryCourses', 'No mandatory courses configured')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.course', 'Course')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.completed', 'Completed')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.inProgressCount', 'In Progress')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.overdue', 'Overdue')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mandatoryCourses.map((course) => {
                  const rate = course.total_employees > 0
                    ? Math.round((course.completed_count / course.total_employees) * 100)
                    : 0;
                  return (
                    <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{course.title}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{course.completed_count || 0}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{course.in_progress_count || 0}</td>
                      <td className="px-4 py-3 text-center">
                        {(course.overdue_count || 0) > 0 ? (
                          <span className="text-red-600 font-medium">{course.overdue_count}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${getTrafficLight(rate)}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB 5: MY LEARNING
// ============================================================

function MyLearningTab({ t, onBrowseCatalogue }) {
  const [myCourses, setMyCourses] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launchingCourse, setLaunchingCourse] = useState(null);

  const fetchMyLearning = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesRes, certsRes] = await Promise.all([
        learningApi.getMyCourses(),
        learningApi.getCertifications()
      ]);
      setMyCourses(coursesRes.enrollments || []);
      setCertifications(certsRes.certifications || []);
    } catch (err) {
      console.error('Failed to fetch my learning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLearning();
  }, [fetchMyLearning]);

  const handleLaunchCourse = async (enrollment) => {
    try {
      setLaunchingCourse(enrollment.id);
      // Navigate to course detail or open course player
      // For now, we'll fetch course details
      const response = await learningApi.getCourse(enrollment.course_id);
      // In production, this would open a course player modal or navigate to course page
      console.log('Course details:', response.course);
      // Could open modal with course content here
    } catch (err) {
      console.error('Failed to launch course:', err);
    } finally {
      setLaunchingCourse(null);
    }
  };

  const handleDownloadCertificate = (certId) => {
    window.open(learningApi.downloadCertificate(certId), '_blank');
  };

  if (loading) {
    return <LoadingSkeleton count={3} type="table" />;
  }

  const completedCount = myCourses.filter(c => c.status === 'completed').length;
  const inProgressCount = myCourses.filter(c => c.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Personal Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{completedCount}</p>
              <p className="text-sm text-slate-500">{t('learning.completedCourses', 'Completed')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Play className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{inProgressCount}</p>
              <p className="text-sm text-slate-500">{t('learning.inProgress', 'In Progress')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{certifications.length}</p>
              <p className="text-sm text-slate-500">{t('learning.certificates', 'Certificates')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Courses */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">{t('learning.myCourses', 'My Courses')}</h3>
            <p className="text-sm text-slate-500">{t('learning.myCoursesDesc', 'Your assigned and enrolled training')}</p>
          </div>
          {myCourses.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{t('learning.noEnrolledCourses', 'You have no enrolled courses yet')}</p>
              <button
                onClick={onBrowseCatalogue}
                className="mt-4 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600"
              >
                {t('learning.browseCatalogue', 'Browse Course Catalogue')}
              </button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {myCourses.map((enrollment) => {
                  const progress = enrollment.total_lessons > 0
                    ? Math.round((enrollment.completed_lessons / enrollment.total_lessons) * 100)
                    : 0;
                  const circumference = 2 * Math.PI * 18;
                  const offset = circumference - (progress / 100) * circumference;
                  return (
                    <div key={enrollment.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      {/* Progress ring */}
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r="18" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <circle
                            cx="20" cy="20" r="18" fill="none"
                            stroke={progress === 100 ? '#22c55e' : '#f97316'}
                            strokeWidth="3"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                          {progress}%
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{enrollment.title}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {enrollment.completed_lessons || 0}/{enrollment.total_lessons || 0} {t('learning.lessons', 'lessons')}
                          </span>
                          {enrollment.score !== null && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5" />
                              {t('learning.score', 'Score')}: {enrollment.score}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        {enrollment.status === 'completed' ? (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            {t('learning.status.completed', 'Completed')}
                          </span>
                        ) : enrollment.status === 'in_progress' ? (
                          <button
                            onClick={() => handleLaunchCourse(enrollment)}
                            disabled={launchingCourse === enrollment.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-momentum-500 text-white text-xs font-medium rounded-lg hover:bg-momentum-600 transition-colors disabled:opacity-50"
                          >
                            {launchingCourse === enrollment.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            {t('learning.continue', 'Continue')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLaunchCourse(enrollment)}
                            disabled={launchingCourse === enrollment.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            {launchingCourse === enrollment.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            {t('learning.start', 'Start')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-4 border-t border-slate-200">
                <button
                  onClick={onBrowseCatalogue}
                  className="flex items-center gap-2 text-sm text-momentum-600 hover:text-momentum-700 font-medium"
                >
                  <BookOpen className="w-4 h-4" />
                  {t('learning.browseCatalogue', 'Browse Course Catalogue')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Certificates */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-momentum-500" />
              <h3 className="font-semibold text-slate-900">{t('learning.myCertificates', 'My Certificates')}</h3>
            </div>
          </div>
          {certifications.length === 0 ? (
            <div className="p-8 text-center">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{t('learning.noCertificates', 'No certificates earned yet')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {certifications.map((cert) => (
                <div key={cert.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{cert.certification_name || cert.course_title}</p>
                      <p className="text-xs text-slate-500 mt-1">{cert.issuing_body || 'Uplift Learning'}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>{t('learning.issued', 'Issued')}: {new Date(cert.issue_date).toLocaleDateString()}</span>
                        {cert.expiry_date && (
                          <span>{t('learning.expires', 'Expires')}: {new Date(cert.expiry_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadCertificate(cert.id)}
                      className="p-1.5 text-slate-400 hover:text-momentum-500 hover:bg-momentum-50 rounded-lg transition-colors flex-shrink-0"
                      title={t('learning.downloadCert', 'Download Certificate')}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 6: DASHBOARD
// ============================================================

function DashboardTab({ t }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await learningApi.getDashboard();
      setDashboard(response);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <LoadingSkeleton count={6} type="card" />;
  }

  const stats = dashboard?.stats || {};
  const departmentBreakdown = dashboard?.departmentBreakdown || [];
  const popularCourses = dashboard?.popularCourses || [];

  const kpis = [
    { label: t('learning.kpi.activeCourses', 'Active Courses'), value: stats.activeCourses || 0, icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
    { label: t('learning.kpi.totalEnrollments', 'Total Enrollments'), value: stats.totalEnrollments || 0, icon: Users, color: 'bg-purple-100 text-purple-600' },
    { label: t('learning.kpi.completionRate', 'Completion Rate'), value: `${stats.completionRate || 0}%`, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: t('learning.kpi.avgScore', 'Avg Score'), value: `${stats.avgScore || 0}%`, icon: Target, color: 'bg-amber-100 text-amber-600' },
    { label: t('learning.kpi.certificates', 'Certificates'), value: stats.certificatesIssued || 0, icon: Award, color: 'bg-momentum-100 text-momentum-600' },
    { label: t('learning.kpi.overdue', 'Overdue'), value: stats.overdueCount || 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`p-2 rounded-lg w-fit mb-3 ${kpi.color.split(' ')[0]}`}>
                <Icon className={`w-5 h-5 ${kpi.color.split(' ')[1]}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion by Department */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">{t('learning.completionByDept', 'Completion by Department')}</h3>
          </div>
          {departmentBreakdown.length === 0 ? (
            <div className="p-8 text-center">
              <Building className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{t('learning.noDeptData', 'No department data available')}</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {departmentBreakdown.map((dept) => (
                <div key={dept.department}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-700 font-medium">{dept.department}</span>
                    <span className="text-slate-500">
                      {dept.completed}/{dept.total}{' '}
                      <span className={`font-semibold ${
                        dept.rate >= 90 ? 'text-green-600' :
                        dept.rate >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}>({dept.rate}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dept.rate >= 90 ? 'bg-green-500' :
                        dept.rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dept.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Popular Courses */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">{t('learning.popularCourses', 'Most Popular Courses')}</h3>
          </div>
          {popularCourses.length === 0 ? (
            <div className="p-8 text-center">
              <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{t('learning.noCourseData', 'No course data available')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {popularCourses.map((course, idx) => {
                const Icon = CATEGORY_ICONS[course.category] || BookOpen;
                const color = CATEGORY_COLORS[course.category] || 'bg-slate-500';
                return (
                  <div key={course.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className={`${color} w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{course.title}</p>
                      <p className="text-xs text-slate-500">{course.completion_rate}% completion</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900">{course.enrolled_count}</p>
                      <p className="text-xs text-slate-500">{t('learning.enrolled', 'enrolled')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CREATE COURSE MODAL
// ============================================================

function CreateCourseModal({ t, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    duration_minutes: '',
    is_mandatory: false,
    difficulty: 'beginner',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const update = (field, value) => setFormData({ ...formData, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await learningApi.createCourse(formData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{t('learning.createCourse', 'Create Course')}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('learning.courseTitle', 'Course Title')} *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('learning.courseTitlePlaceholder', 'Enter course title')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('learning.category', 'Category')} *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              >
                <option value="">{t('learning.selectCategory', 'Select...')}</option>
                {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                  <option key={c.value} value={c.value}>{t(c.labelKey, c.label)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('learning.durationMins', 'Duration (mins)')} *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.duration_minutes}
                onChange={(e) => update('duration_minutes', parseInt(e.target.value) || '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                placeholder="45"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('learning.difficultyLevel', 'Difficulty Level')}
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => update('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              >
                {DIFFICULTIES.filter((d) => d.value !== 'all').map((d) => (
                  <option key={d.value} value={d.value}>{t(d.labelKey, d.label)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_mandatory}
                  onChange={(e) => update('is_mandatory', e.target.checked)}
                  className="w-4 h-4 text-momentum-500 border-slate-300 rounded focus:ring-momentum-500"
                />
                <span className="text-sm text-slate-700 font-medium">
                  {t('learning.markMandatory', 'Mark as mandatory')}
                </span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('learning.description', 'Description')}
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('learning.descriptionPlaceholder', 'Describe the course content and objectives...')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('learning.createCourse', 'Create Course')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CREATE PATH MODAL
// ============================================================

function CreatePathModal({ t, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_ids: [],
  });
  const [courses, setCourses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    learningApi.getCourses().then(res => setCourses(res.courses || [])).catch(console.error);
  }, []);

  const update = (field, value) => setFormData({ ...formData, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await learningApi.createPath(formData);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{t('learning.createPath', 'Create Learning Path')}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('learning.pathTitle', 'Path Title')} *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('learning.pathTitlePlaceholder', 'e.g., New Starter Onboarding')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('learning.description', 'Description')}
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              placeholder={t('learning.pathDescPlaceholder', 'Describe what this learning path covers...')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('learning.selectCourses', 'Select Courses')}
            </label>
            <div className="border border-slate-300 rounded-lg max-h-48 overflow-y-auto">
              {courses.map((course) => (
                <label key={course.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.course_ids.includes(course.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        update('course_ids', [...formData.course_ids, course.id]);
                      } else {
                        update('course_ids', formData.course_ids.filter(id => id !== course.id));
                      }
                    }}
                    className="w-4 h-4 text-momentum-500 border-slate-300 rounded focus:ring-momentum-500"
                  />
                  <span className="text-sm text-slate-700">{course.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('learning.createPath', 'Create Path')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// BULK ENROLL MODAL
// ============================================================

function BulkEnrollModal({ t, onClose }) {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [courses, setCourses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      learningApi.getCourses(),
      learningApi.getEmployees()
    ]).then(([coursesRes, employeesRes]) => {
      setCourses(coursesRes.courses || []);
      setEmployees(employeesRes.employees || []);
    }).catch(console.error);
  }, []);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const employeesInDept = selectedDept
    ? employees.filter(e => e.department === selectedDept)
    : employees;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      // Enroll each employee in the selected department
      for (const emp of employeesInDept) {
        await learningApi.enrollEmployee(selectedCourse, emp.user_id, dueDate || null);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{t('learning.bulkEnroll', 'Bulk Enroll')}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('learning.selectCourse', 'Select Course')} *
            </label>
            <select
              required
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="">{t('learning.chooseCourse', 'Choose a course...')}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('learning.department', 'Department')} *
            </label>
            <select
              required
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="">{t('learning.allDepartments', 'All Departments')}</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('learning.dueDate', 'Due Date')}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            />
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              {t('learning.willEnroll', 'This will enroll')}
              {' '}
              <span className="font-bold text-slate-900">{employeesInDept.length}</span>
              {' '}
              {t('learning.employeesInCourse', 'employees in the selected course.')}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || employeesInDept.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Users className="w-4 h-4" />
              {t('learning.enrollNow', 'Enroll Now')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
