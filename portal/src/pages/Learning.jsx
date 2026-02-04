// ============================================================
// LEARNING & DEVELOPMENT PAGE
// Course catalogue, learning paths, enrollments, compliance,
// personal learning, and analytics dashboard
// ============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  BookOpen, GraduationCap, Users, ShieldCheck, User, BarChart3,
  Plus, Search, Filter, Grid3X3, List, Clock, Award, CheckCircle,
  AlertTriangle, AlertCircle, ChevronRight, Download, Send,
  Star, TrendingUp, Trophy, Target, Eye, X, Play, FileText,
  Building, MapPin, Flame, Lock, Unlock, LayoutGrid, Route,
  ClipboardCheck, Brain, Zap, ArrowRight, Calendar, Mail,
  ChevronDown, MoreVertical, RefreshCw
} from 'lucide-react';

// ============================================================
// DEMO DATA
// ============================================================

const DEMO_COURSES = [
  { id: 1, title: 'Workplace Health & Safety Induction', category: 'health_safety', audience: 'all', duration: 45, mandatory: true, difficulty: 'beginner', enrolled: 342, completionRate: 94, color: 'bg-red-500', icon: ShieldCheck },
  { id: 2, title: 'PPE Usage & Care', category: 'health_safety', audience: 'production', duration: 30, mandatory: true, difficulty: 'beginner', enrolled: 186, completionRate: 88, color: 'bg-orange-500', icon: ShieldCheck },
  { id: 3, title: 'Manual Handling', category: 'health_safety', audience: 'warehouse', duration: 25, mandatory: true, difficulty: 'beginner', enrolled: 214, completionRate: 91, color: 'bg-amber-500', icon: Flame },
  { id: 4, title: 'Fire Safety & Evacuation', category: 'health_safety', audience: 'all', duration: 20, mandatory: true, difficulty: 'beginner', enrolled: 340, completionRate: 97, color: 'bg-red-600', icon: Flame },
  { id: 5, title: 'First Aid Awareness', category: 'health_safety', audience: 'all', duration: 60, mandatory: true, difficulty: 'intermediate', enrolled: 298, completionRate: 82, color: 'bg-green-500', icon: ShieldCheck },
  { id: 6, title: 'COSHH Hazardous Substances', category: 'health_safety', audience: 'production', duration: 40, mandatory: true, difficulty: 'intermediate', enrolled: 178, completionRate: 79, color: 'bg-purple-500', icon: AlertTriangle },
  { id: 7, title: 'Machine Safety & Lockout/Tagout', category: 'health_safety', audience: 'production', duration: 35, mandatory: true, difficulty: 'advanced', enrolled: 164, completionRate: 85, color: 'bg-slate-600', icon: Lock },
  { id: 8, title: 'Quality Management ISO 9001', category: 'compliance', audience: 'all', duration: 50, mandatory: true, difficulty: 'intermediate', enrolled: 310, completionRate: 76, color: 'bg-blue-500', icon: Award },
  { id: 9, title: 'GDPR & Data Protection', category: 'compliance', audience: 'all', duration: 20, mandatory: true, difficulty: 'beginner', enrolled: 348, completionRate: 92, color: 'bg-indigo-500', icon: Lock },
  { id: 10, title: 'Anti-Bribery & Corruption', category: 'compliance', audience: 'all', duration: 15, mandatory: true, difficulty: 'beginner', enrolled: 346, completionRate: 95, color: 'bg-teal-500', icon: ShieldCheck },
  { id: 11, title: 'DEI Training', category: 'soft_skills', audience: 'all', duration: 30, mandatory: true, difficulty: 'beginner', enrolled: 338, completionRate: 87, color: 'bg-pink-500', icon: Users },
  { id: 12, title: 'Manager Leadership Essentials', category: 'leadership', audience: 'managers', duration: 90, mandatory: true, difficulty: 'advanced', enrolled: 42, completionRate: 71, color: 'bg-momentum-500', icon: GraduationCap },
];

const DEMO_PATHS = [
  {
    id: 1, title: 'New Starter Safety Path', description: 'Essential safety training for all new employees joining the organisation.',
    courseIds: [1, 4, 3, 9, 11], totalDuration: 140, completionRate: 88,
  },
  {
    id: 2, title: 'Production Floor Certification', description: 'Complete certification path for production floor operatives.',
    courseIds: [2, 6, 7, 8], totalDuration: 155, completionRate: 74,
  },
  {
    id: 3, title: 'Management Development', description: 'Leadership and compliance training for new and existing managers.',
    courseIds: [12, 10, 5], totalDuration: 165, completionRate: 66,
  },
];

const DEMO_EMPLOYEES = [
  { id: 1, name: 'James Whitfield', department: 'Production', location: 'Birmingham, UK' },
  { id: 2, name: 'Sophie Anderson', department: 'Warehouse', location: 'Manchester, UK' },
  { id: 3, name: 'Markus Braun', department: 'Production', location: 'Stuttgart, DE' },
  { id: 4, name: 'Fatima Al-Rashid', department: 'Quality', location: 'Dubai, UAE' },
  { id: 5, name: 'Wei Chen', department: 'Engineering', location: 'Shenzhen, CN' },
  { id: 6, name: 'Michael Torres', department: 'Operations', location: 'Houston, US' },
  { id: 7, name: 'Priya Sharma', department: 'HR', location: 'Birmingham, UK' },
  { id: 8, name: 'Lena Hoffmann', department: 'Production', location: 'Stuttgart, DE' },
  { id: 9, name: 'Ahmed Hassan', department: 'Logistics', location: 'Dubai, UAE' },
  { id: 10, name: 'Yuki Tanaka', department: 'Engineering', location: 'Shenzhen, CN' },
  { id: 11, name: 'Rachel Davies', department: 'Finance', location: 'Manchester, UK' },
  { id: 12, name: 'Carlos Mendez', department: 'Maintenance', location: 'Houston, US' },
  { id: 13, name: 'Hannah Mitchell', department: 'Production', location: 'Birmingham, UK' },
  { id: 14, name: 'Thomas Weber', department: 'Quality', location: 'Stuttgart, DE' },
  { id: 15, name: 'Li Na', department: 'Production', location: 'Shenzhen, CN' },
];

const DEMO_ENROLLMENTS = [
  { id: 1, employeeId: 1, courseId: 1, status: 'completed', progress: 100, score: 92, dueDate: '2025-12-15', completedDate: '2025-12-10' },
  { id: 2, employeeId: 1, courseId: 7, status: 'in_progress', progress: 65, score: null, dueDate: '2026-02-28', completedDate: null },
  { id: 3, employeeId: 2, courseId: 3, status: 'completed', progress: 100, score: 88, dueDate: '2025-11-30', completedDate: '2025-11-22' },
  { id: 4, employeeId: 3, courseId: 2, status: 'overdue', progress: 40, score: null, dueDate: '2026-01-15', completedDate: null },
  { id: 5, employeeId: 4, courseId: 8, status: 'in_progress', progress: 72, score: null, dueDate: '2026-03-10', completedDate: null },
  { id: 6, employeeId: 5, courseId: 9, status: 'completed', progress: 100, score: 96, dueDate: '2025-12-01', completedDate: '2025-11-28' },
  { id: 7, employeeId: 6, courseId: 6, status: 'enrolled', progress: 0, score: null, dueDate: '2026-03-31', completedDate: null },
  { id: 8, employeeId: 7, courseId: 11, status: 'completed', progress: 100, score: 90, dueDate: '2025-10-30', completedDate: '2025-10-15' },
  { id: 9, employeeId: 8, courseId: 7, status: 'failed', progress: 100, score: 42, dueDate: '2026-01-20', completedDate: '2026-01-18' },
  { id: 10, employeeId: 9, courseId: 4, status: 'overdue', progress: 10, score: null, dueDate: '2026-01-05', completedDate: null },
  { id: 11, employeeId: 10, courseId: 5, status: 'in_progress', progress: 50, score: null, dueDate: '2026-04-15', completedDate: null },
  { id: 12, employeeId: 11, courseId: 10, status: 'completed', progress: 100, score: 98, dueDate: '2025-12-20', completedDate: '2025-12-12' },
  { id: 13, employeeId: 12, courseId: 1, status: 'enrolled', progress: 0, score: null, dueDate: '2026-02-15', completedDate: null },
  { id: 14, employeeId: 13, courseId: 12, status: 'in_progress', progress: 30, score: null, dueDate: '2026-05-01', completedDate: null },
  { id: 15, employeeId: 14, courseId: 8, status: 'overdue', progress: 55, score: null, dueDate: '2026-01-31', completedDate: null },
];

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
      {activeTab === 'my_learning' && <MyLearningTab t={t} />}
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

  const filtered = DEMO_COURSES.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchMandatory = mandatoryFilter === 'all' || (mandatoryFilter === 'mandatory' ? c.mandatory : !c.mandatory);
    const matchDifficulty = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
    return matchSearch && matchCategory && matchMandatory && matchDifficulty;
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
      <p className="text-sm text-slate-500">
        {t('learning.showingCourses', 'Showing {{count}} courses', { count: filtered.length })}
      </p>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((course) => {
            const Icon = course.icon;
            return (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group cursor-pointer"
              >
                {/* Thumbnail */}
                <div className={`${course.color} h-32 flex items-center justify-center relative`}>
                  <Icon className="w-12 h-12 text-white/80" />
                  {course.mandatory && (
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
                      {course.duration} {t('learning.mins', 'mins')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {course.enrolled}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('learning.completionRate', 'Completion')}</span>
                      <span className={`font-semibold ${
                        course.completionRate >= 90 ? 'text-green-600' :
                        course.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {course.completionRate}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          course.completionRate >= 90 ? 'bg-green-500' :
                          course.completionRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${course.completionRate}%` }}
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.course', 'Course')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.category', 'Category')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.type', 'Type')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.difficulty', 'Difficulty')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.duration', 'Duration')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.enrolled', 'Enrolled')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.completion', 'Completion')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((course) => {
                const Icon = course.icon;
                return (
                  <tr key={course.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`${course.color} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
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
                      {course.mandatory ? (
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
                      {course.duration} {t('learning.mins', 'mins')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{course.enrolled}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              course.completionRate >= 90 ? 'bg-green-500' :
                              course.completionRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${course.completionRate}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${
                          course.completionRate >= 90 ? 'text-green-600' :
                          course.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {course.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {t('learning.pathsDescription', 'Structured sequences of courses for role-based development')}
        </p>
        <button className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors">
          <Plus className="w-4 h-4" />
          {t('learning.createPath', 'Create Path')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {DEMO_PATHS.map((path) => {
          const courses = path.courseIds.map((id) => DEMO_COURSES.find((c) => c.id === id)).filter(Boolean);
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
                  <p className="text-lg font-bold text-slate-900">{courses.length}</p>
                  <p className="text-xs text-slate-500">{t('learning.courses', 'Courses')}</p>
                </div>
                <div className="p-3 text-center border-r border-slate-200">
                  <p className="text-lg font-bold text-slate-900">{path.totalDuration}</p>
                  <p className="text-xs text-slate-500">{t('learning.mins', 'mins')}</p>
                </div>
                <div className="p-3 text-center">
                  <p className={`text-lg font-bold ${
                    path.completionRate >= 80 ? 'text-green-600' :
                    path.completionRate >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>{path.completionRate}%</p>
                  <p className="text-xs text-slate-500">{t('learning.complete', 'Complete')}</p>
                </div>
              </div>

              {/* Course list */}
              <div className="p-4">
                <div className="space-y-2">
                  {courses.map((course, idx) => {
                    const Icon = course.icon;
                    return (
                      <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className={`${course.color} w-7 h-7 rounded flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{course.title}</p>
                          <p className="text-xs text-slate-500">{course.duration} {t('learning.mins', 'mins')}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Completion bar */}
              <div className="px-4 pb-4">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      path.completionRate >= 80 ? 'bg-green-500' :
                      path.completionRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${path.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
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

  const getEmployee = (id) => DEMO_EMPLOYEES.find((e) => e.id === id);
  const getCourse = (id) => DEMO_COURSES.find((c) => c.id === id);

  const departments = [...new Set(DEMO_EMPLOYEES.map((e) => e.department))];

  const filtered = DEMO_ENROLLMENTS.filter((e) => {
    const emp = getEmployee(e.employeeId);
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchCourse = courseFilter === 'all' || String(e.courseId) === courseFilter;
    const matchDept = deptFilter === 'all' || emp?.department === deptFilter;
    return matchStatus && matchCourse && matchDept;
  });

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
            <option value="overdue">{t('learning.status.overdue', 'Overdue')}</option>
            <option value="failed">{t('learning.status.failed', 'Failed')}</option>
          </select>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="all">{t('learning.allCourses', 'All Courses')}</option>
            {DEMO_COURSES.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.title}</option>
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

      {/* Table */}
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
              {filtered.map((enrollment) => {
                const emp = getEmployee(enrollment.employeeId);
                const course = getCourse(enrollment.courseId);
                if (!emp || !course) return null;
                return (
                  <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs flex-shrink-0">
                          {emp.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.department} - {emp.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{course.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(enrollment.status)}`}>
                        {getStatusLabel(enrollment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              enrollment.progress === 100 ? 'bg-green-500' :
                              enrollment.progress > 0 ? 'bg-momentum-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 font-medium">{enrollment.progress}%</span>
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
                      <span className={`text-sm ${
                        enrollment.status === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-600'
                      }`}>
                        {enrollment.dueDate}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {enrollment.status === 'overdue' && (
                          <button
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('learning.sendReminder', 'Send Reminder')}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('learning.viewDetails', 'View Details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('learning.noEnrollments', 'No enrollments match your filters')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB 4: COMPLIANCE
// ============================================================

function ComplianceTab({ t }) {
  const mandatoryCourses = DEMO_COURSES.filter((c) => c.mandatory);
  const totalRequired = mandatoryCourses.reduce((sum, c) => sum + c.enrolled, 0);
  const totalCompleted = mandatoryCourses.reduce((sum, c) => sum + Math.round(c.enrolled * c.completionRate / 100), 0);
  const overallRate = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;
  const overdueEnrollments = DEMO_ENROLLMENTS.filter((e) => e.status === 'overdue');
  const expiringCount = 18;
  const certificatesIssued = DEMO_ENROLLMENTS.filter((e) => e.status === 'completed').length;

  const departmentCompliance = [
    { name: 'Production', rate: 82 },
    { name: 'Warehouse', rate: 91 },
    { name: 'Engineering', rate: 88 },
    { name: 'Quality', rate: 76 },
    { name: 'Operations', rate: 85 },
    { name: 'HR', rate: 95 },
    { name: 'Finance', rate: 93 },
    { name: 'Logistics', rate: 78 },
    { name: 'Maintenance', rate: 72 },
  ];

  const getTrafficLight = (rate) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTrafficBorder = (rate) => {
    if (rate >= 90) return 'border-green-200 bg-green-50';
    if (rate >= 70) return 'border-amber-200 bg-amber-50';
    return 'border-red-200 bg-red-50';
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
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{expiringCount}</p>
              <p className="text-sm text-slate-500">{t('learning.expiringSoon', 'Expiring Soon')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{overdueEnrollments.length}</p>
              <p className="text-sm text-slate-500">{t('learning.overdueCount', 'Overdue')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{certificatesIssued}</p>
              <p className="text-sm text-slate-500">{t('learning.certificatesIssued', 'Certificates Issued')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance by Department */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">{t('learning.complianceByDept', 'Compliance by Department')}</h3>
          </div>
          <div className="p-5 space-y-3">
            {departmentCompliance.map((dept) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700">{dept.name}</span>
                  <span className={`font-semibold ${
                    dept.rate >= 90 ? 'text-green-600' :
                    dept.rate >= 70 ? 'text-amber-600' : 'text-red-600'
                  }`}>{dept.rate}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getTrafficLight(dept.rate)}`}
                    style={{ width: `${dept.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Course Compliance Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t('learning.courseCompliance', 'Course Compliance')}</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">
              <Send className="w-3.5 h-3.5" />
              {t('learning.sendReminderAll', 'Send Reminder to All Overdue')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t('learning.course', 'Course')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.required', 'Required')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.completed', 'Completed')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.rate', 'Rate')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.overdue', 'Overdue')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">{t('learning.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mandatoryCourses.map((course) => {
                  const completed = Math.round(course.enrolled * course.completionRate / 100);
                  const overdue = Math.round(course.enrolled * (100 - course.completionRate) / 100 * 0.3);
                  return (
                    <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{course.title}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{course.enrolled}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{completed}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${
                          course.completionRate >= 90 ? 'text-green-600' :
                          course.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'
                        }`}>{course.completionRate}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {overdue > 0 ? (
                          <span className="text-red-600 font-medium">{overdue}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${getTrafficLight(course.completionRate)}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 5: MY LEARNING
// ============================================================

function MyLearningTab({ t }) {
  const myCourses = [
    { courseId: 1, progress: 100, score: 94, status: 'completed', completedDate: '2025-11-15' },
    { courseId: 4, progress: 100, score: 88, status: 'completed', completedDate: '2025-11-20' },
    { courseId: 9, progress: 100, score: 96, status: 'completed', completedDate: '2025-12-01' },
    { courseId: 8, progress: 65, score: null, status: 'in_progress', completedDate: null },
    { courseId: 5, progress: 30, score: null, status: 'in_progress', completedDate: null },
    { courseId: 11, progress: 0, score: null, status: 'enrolled', completedDate: null },
  ];

  const myCertificates = [
    { id: 1, name: 'Workplace Health & Safety Induction', issueDate: '2025-11-15', expiryDate: '2026-11-15', issuer: 'Uplift Academy' },
    { id: 2, name: 'Fire Safety & Evacuation', issueDate: '2025-11-20', expiryDate: '2026-11-20', issuer: 'Uplift Academy' },
    { id: 3, name: 'GDPR & Data Protection', issueDate: '2025-12-01', expiryDate: '2027-12-01', issuer: 'Uplift Academy' },
  ];

  const completedCount = myCourses.filter((c) => c.status === 'completed').length;
  const inProgressCount = myCourses.filter((c) => c.status === 'in_progress').length;

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
              <p className="text-3xl font-bold text-slate-900">{myCertificates.length}</p>
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
          <div className="divide-y divide-slate-100">
            {myCourses.map((enrollment) => {
              const course = DEMO_COURSES.find((c) => c.id === enrollment.courseId);
              if (!course) return null;
              const Icon = course.icon;
              const circumference = 2 * Math.PI * 18;
              const offset = circumference - (enrollment.progress / 100) * circumference;
              return (
                <div key={enrollment.courseId} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  {/* Progress ring */}
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle
                        cx="20" cy="20" r="18" fill="none"
                        stroke={enrollment.progress === 100 ? '#22c55e' : '#f97316'}
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                      {enrollment.progress}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{course.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.duration} {t('learning.mins', 'mins')}
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
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-momentum-500 text-white text-xs font-medium rounded-lg hover:bg-momentum-600 transition-colors">
                        <Play className="w-3.5 h-3.5" />
                        {t('learning.continue', 'Continue')}
                      </button>
                    ) : (
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors">
                        <Play className="w-3.5 h-3.5" />
                        {t('learning.start', 'Start')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-4 border-t border-slate-200">
            <button className="flex items-center gap-2 text-sm text-momentum-600 hover:text-momentum-700 font-medium">
              <BookOpen className="w-4 h-4" />
              {t('learning.browseCatalogue', 'Browse Course Catalogue')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificates */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-momentum-500" />
              <h3 className="font-semibold text-slate-900">{t('learning.myCertificates', 'My Certificates')}</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {myCertificates.map((cert) => (
              <div key={cert.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{cert.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{cert.issuer}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>{t('learning.issued', 'Issued')}: {cert.issueDate}</span>
                      <span>{t('learning.expires', 'Expires')}: {cert.expiryDate}</span>
                    </div>
                  </div>
                  <button
                    className="p-1.5 text-slate-400 hover:text-momentum-500 hover:bg-momentum-50 rounded-lg transition-colors flex-shrink-0"
                    title={t('learning.downloadCert', 'Download Certificate')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {myCertificates.length === 0 && (
            <div className="p-8 text-center">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{t('learning.noCertificates', 'No certificates earned yet')}</p>
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
  const activeCourses = DEMO_COURSES.length;
  const totalEnrollments = DEMO_ENROLLMENTS.length;
  const completedEnrollments = DEMO_ENROLLMENTS.filter((e) => e.status === 'completed').length;
  const completionRate = Math.round((completedEnrollments / totalEnrollments) * 100);
  const avgScore = Math.round(
    DEMO_ENROLLMENTS
      .filter((e) => e.score !== null)
      .reduce((sum, e) => sum + e.score, 0) /
    DEMO_ENROLLMENTS.filter((e) => e.score !== null).length
  );
  const certificatesIssued = completedEnrollments;
  const learningHours = Math.round(
    DEMO_ENROLLMENTS.reduce((sum, e) => {
      const course = DEMO_COURSES.find((c) => c.id === e.courseId);
      return sum + (course ? (course.duration * e.progress / 100) / 60 : 0);
    }, 0)
  );

  const kpis = [
    { label: t('learning.kpi.activeCourses', 'Active Courses'), value: activeCourses, icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
    { label: t('learning.kpi.totalEnrollments', 'Total Enrollments'), value: totalEnrollments, icon: Users, color: 'bg-purple-100 text-purple-600' },
    { label: t('learning.kpi.completionRate', 'Completion Rate'), value: `${completionRate}%`, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: t('learning.kpi.avgScore', 'Avg Score'), value: `${avgScore}%`, icon: Target, color: 'bg-amber-100 text-amber-600' },
    { label: t('learning.kpi.certificates', 'Certificates'), value: certificatesIssued, icon: Award, color: 'bg-momentum-100 text-momentum-600' },
    { label: t('learning.kpi.learningHours', 'Learning Hours'), value: learningHours, icon: Clock, color: 'bg-indigo-100 text-indigo-600' },
  ];

  const departmentCompletion = [
    { name: 'Production', completed: 78, total: 95 },
    { name: 'Warehouse', completed: 32, total: 38 },
    { name: 'Engineering', completed: 24, total: 28 },
    { name: 'Quality', completed: 18, total: 24 },
    { name: 'HR', completed: 12, total: 12 },
    { name: 'Logistics', completed: 15, total: 20 },
    { name: 'Finance', completed: 10, total: 11 },
    { name: 'Operations', completed: 14, total: 18 },
    { name: 'Maintenance', completed: 8, total: 14 },
  ];

  const popularCourses = [...DEMO_COURSES]
    .sort((a, b) => b.enrolled - a.enrolled)
    .slice(0, 5);

  const monthlyTrend = [
    { month: 'Sep', enrollments: 42 },
    { month: 'Oct', enrollments: 58 },
    { month: 'Nov', enrollments: 71 },
    { month: 'Dec', enrollments: 35 },
    { month: 'Jan', enrollments: 64 },
    { month: 'Feb', enrollments: 48 },
  ];
  const maxEnrollments = Math.max(...monthlyTrend.map((m) => m.enrollments));

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
          <div className="p-5 space-y-4">
            {departmentCompletion.map((dept) => {
              const rate = Math.round((dept.completed / dept.total) * 100);
              return (
                <div key={dept.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-700 font-medium">{dept.name}</span>
                    <span className="text-slate-500">
                      {dept.completed}/{dept.total}{' '}
                      <span className={`font-semibold ${
                        rate >= 90 ? 'text-green-600' :
                        rate >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}>({rate}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        rate >= 90 ? 'bg-green-500' :
                        rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Popular Courses */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">{t('learning.popularCourses', 'Most Popular Courses')}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {popularCourses.map((course, idx) => {
              const Icon = course.icon;
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
                  <div className={`${course.color} w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{course.title}</p>
                    <p className="text-xs text-slate-500">{course.duration} {t('learning.mins', 'mins')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-900">{course.enrolled}</p>
                    <p className="text-xs text-slate-500">{t('learning.enrolled', 'enrolled')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Enrollment Trend */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{t('learning.monthlyTrend', 'Monthly Enrollment Trend')}</h3>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-4 h-48">
            {monthlyTrend.map((month) => {
              const height = (month.enrollments / maxEnrollments) * 100;
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">{month.enrollments}</span>
                  <div className="w-full relative" style={{ height: '160px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-momentum-500 to-momentum-400 rounded-t-lg transition-all hover:from-momentum-600 hover:to-momentum-500 cursor-pointer"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{month.month}</span>
                </div>
              );
            })}
          </div>
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
    duration: '',
    mandatory: false,
    difficulty: 'beginner',
    description: '',
  });

  const update = (field, value) => setFormData({ ...formData, [field]: value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
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
                value={formData.duration}
                onChange={(e) => update('duration', e.target.value)}
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
                  checked={formData.mandatory}
                  onChange={(e) => update('mandatory', e.target.checked)}
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
              className="px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
            >
              {t('learning.createCourse', 'Create Course')}
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

  const departments = [...new Set(DEMO_EMPLOYEES.map((e) => e.department))];
  const employeesInDept = selectedDept
    ? DEMO_EMPLOYEES.filter((e) => e.department === selectedDept)
    : DEMO_EMPLOYEES;

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
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
              {DEMO_COURSES.map((c) => (
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
              {t('learning.dueDate', 'Due Date')} *
            </label>
            <input
              type="date"
              required
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
              className="flex items-center gap-2 px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
            >
              <Users className="w-4 h-4" />
              {t('learning.enrollNow', 'Enroll Now')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
