// ============================================================
// COMPANY DIRECTORY PAGE
// Route: /directory -- Visible to ALL roles
// Grid, List, and Org Chart views with search, filters, detail modal
// Fetches real employee data from API
// ============================================================
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { employeesApi, departmentsApi, locationsApi } from '../lib/api';
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
  Calendar,
  Tag,
  Briefcase,
  ArrowUpDown,
  Circle,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ============================================================
// HELPER UTILITIES
// ============================================================

/** Full display name */
function fullName(emp, t) {
  const first = emp.first_name || emp.firstName || '';
  const last = emp.last_name || emp.lastName || '';
  const unknownFallback = t ? t('directory.unknown', 'Unknown') : 'Unknown';
  return `${first} ${last}`.trim() || emp.name || unknownFallback;
}

/** Initials from first + last */
function getInitials(emp) {
  const first = emp.first_name || emp.firstName || '';
  const last = emp.last_name || emp.lastName || '';
  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  if (emp.name) {
    const parts = emp.name.split(' ');
    return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }
  return '??';
}

/** Deterministic avatar colour based on employee id */
const AVATAR_PALETTE = [
  'bg-rose-600',    'bg-sky-600',    'bg-emerald-600', 'bg-violet-600',
  'bg-amber-600',   'bg-teal-600',   'bg-pink-600',    'bg-indigo-600',
  'bg-orange-600',  'bg-cyan-600',   'bg-fuchsia-600', 'bg-lime-600',
];
function avatarColor(id) {
  const numId = typeof id === 'string' ? parseInt(id, 10) || id.charCodeAt(0) : id;
  return AVATAR_PALETTE[numId % AVATAR_PALETTE.length];
}

/** Tenure string from startDate */
function tenure(startDate) {
  if (!startDate) return '-';
  const start = new Date(startDate);
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 0) return '-';
  if (totalMonths < 12) return `${totalMonths}mo`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}y ${m}mo` : `${y}y`;
}

// ============================================================
// STATUS BADGE
// ============================================================
function StatusBadge({ status, t }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    on_leave: 'bg-amber-50 text-amber-700 border-amber-200',
    inactive: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  const labels = {
    active: t('directory.statusActive', 'Active'),
    on_leave: t('directory.statusOnLeave', 'On Leave'),
    inactive: t('directory.statusInactive', 'Inactive'),
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.active}`}>
      <Circle className="w-2 h-2 fill-current" />
      {labels[status] || status || 'Active'}
    </span>
  );
}

// ============================================================
// EMPLOYEE DETAIL MODAL
// ============================================================
function EmployeeDetailModal({ employee, employees, onClose, onNavigate, t }) {
  if (!employee) return null;

  const manager = employee.manager_id ? employees.find(e => e.id === employee.manager_id) : null;
  const reports = employees.filter(e => e.manager_id === employee.id);
  const skills = employee.skills || [];

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
              <h2 className="text-xl font-bold text-slate-900">{fullName(employee, t)}</h2>
              <p className="text-sm text-slate-600 mt-0.5">{employee.role_name || employee.role || employee.title || '-'}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={employee.status} t={t} />
                {employee.employment_type && (
                  <span className="text-xs text-slate-400 capitalize">{employee.employment_type.replace('-', ' ').replace('_', ' ')}</span>
                )}
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
                {employee.department_name || employee.department || '-'}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('directory.location', 'Location')}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {employee.location_name || employee.location || '-'}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              {t('directory.contact', 'Contact')}
            </p>
            <div className="space-y-2">
              {employee.email && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${employee.email}`} className="text-momentum-600 hover:underline truncate">
                    {employee.email}
                  </a>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  {employee.phone}
                </div>
              )}
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
                    {fullName(manager, t)}
                  </p>
                  <p className="text-xs text-slate-500">{manager.role_name || manager.role || manager.title || '-'}</p>
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
                        {fullName(r, t)}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{r.role_name || r.role || r.title || '-'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                {t('directory.skills', 'Skills')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, idx) => (
                  <span
                    key={skill.id || skill.name || idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    <Tag className="w-3 h-3" />
                    {skill.name || skill}
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
                {employee.start_date || employee.hire_date ?
                  new Date(employee.start_date || employee.hire_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '-'}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('directory.tenure', 'Tenure')}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                {tenure(employee.start_date || employee.hire_date)}
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
function OrgChartNode({ employee, employees, depth, expandedNodes, toggleNode, onSelect, t }) {
  const reports = employees.filter(e => e.manager_id === employee.id);
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
            <p className="font-semibold text-slate-900 text-sm">{fullName(employee, t)}</p>
            <p className="text-xs text-slate-500 truncate">{employee.role_name || employee.role || employee.title || '-'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-slate-400">{employee.location_name || employee.location || '-'}</span>
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
              employees={employees}
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
      sorted.sort((a, b) => {
        const aDept = a.department_name || a.department || '';
        const bDept = b.department_name || b.department || '';
        const aLast = a.last_name || a.lastName || '';
        const bLast = b.last_name || b.lastName || '';
        return aDept.localeCompare(bDept) || aLast.localeCompare(bLast);
      });
      break;
    case 'location':
      sorted.sort((a, b) => {
        const aLoc = a.location_name || a.location || '';
        const bLoc = b.location_name || b.location || '';
        const aLast = a.last_name || a.lastName || '';
        const bLast = b.last_name || b.lastName || '';
        return aLoc.localeCompare(bLoc) || aLast.localeCompare(bLast);
      });
      break;
    case 'alpha':
    default:
      sorted.sort((a, b) => {
        const aLast = a.last_name || a.lastName || '';
        const bLast = b.last_name || b.lastName || '';
        const aFirst = a.first_name || a.firstName || '';
        const bFirst = b.first_name || b.firstName || '';
        return aLast.localeCompare(bLast) || aFirst.localeCompare(bFirst);
      });
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

  // --- Data State ---
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- UI State ---
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

  // Org chart expanded nodes
  const [expandedNodes, setExpandedNodes] = useState({});

  // --- Fetch Data ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [empResult, deptResult, locResult] = await Promise.all([
          employeesApi.list(),
          departmentsApi.list(),
          locationsApi.list(),
        ]);

        const empList = empResult.employees || [];
        setEmployees(empList);
        setDepartments(deptResult.departments || []);
        setLocations(locResult.locations || []);

        // Expand top managers in org chart by default
        const initialExpanded = {};
        empList.forEach(e => {
          // Expand employees with no manager (top level) and their direct reports
          if (!e.manager_id) {
            initialExpanded[e.id] = true;
          }
        });
        // Also expand direct reports of top level
        empList.forEach(e => {
          if (e.manager_id && initialExpanded[e.manager_id]) {
            initialExpanded[e.id] = true;
          }
        });
        setExpandedNodes(initialExpanded);
      } catch (err) {
        console.error('Failed to load directory data:', err);
        setError(err.message || 'Failed to load directory');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Derived Data ---
  const uniqueDepartments = useMemo(() => {
    const names = new Set(employees.map(e => e.department_name || e.department).filter(Boolean));
    return [...names].sort();
  }, [employees]);

  const uniqueLocations = useMemo(() => {
    const names = new Set(employees.map(e => e.location_name || e.location).filter(Boolean));
    return [...names].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let list = employees.filter(emp => {
      const empDept = emp.department_name || emp.department || '';
      const empLoc = emp.location_name || emp.location || '';
      const empType = emp.employment_type || '';

      if (departmentFilter !== 'all' && empDept !== departmentFilter) return false;
      if (locationFilter !== 'all' && empLoc !== locationFilter) return false;
      if (employmentTypeFilter !== 'all' && empType !== employmentTypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = fullName(emp, t).toLowerCase();
        const skills = (emp.skills || []).map(s => s.name || s).join(' ').toLowerCase();
        const role = (emp.role_name || emp.role || emp.title || '').toLowerCase();
        const dept = empDept.toLowerCase();
        return (
          name.includes(q) ||
          role.includes(q) ||
          dept.includes(q) ||
          skills.includes(q)
        );
      }
      return true;
    });
    return sortEmployees(list, sortKey);
  }, [employees, searchQuery, departmentFilter, locationFilter, employmentTypeFilter, sortKey, t]);

  // List-view sorting (overrides default sort)
  const listSortedEmployees = useMemo(() => {
    const sorted = [...filteredEmployees];
    sorted.sort((a, b) => {
      let valA, valB;
      switch (listSortCol) {
        case 'firstName':
          valA = a.first_name || a.firstName || '';
          valB = b.first_name || b.firstName || '';
          break;
        case 'lastName':
          valA = a.last_name || a.lastName || '';
          valB = b.last_name || b.lastName || '';
          break;
        case 'title':
          valA = a.role_name || a.role || a.title || '';
          valB = b.role_name || b.role || b.title || '';
          break;
        case 'department':
          valA = a.department_name || a.department || '';
          valB = b.department_name || b.department || '';
          break;
        case 'location':
          valA = a.location_name || a.location || '';
          valB = b.location_name || b.location || '';
          break;
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          break;
        default:
          valA = a.last_name || a.lastName || '';
          valB = b.last_name || b.lastName || '';
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

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-momentum-500 mx-auto mb-3" />
          <p className="text-slate-500">{t('directory.loading', 'Loading directory...')}</p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium mb-1">{t('directory.loadError', 'Failed to load directory')}</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

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
              {uniqueDepartments.map(d => (
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
              {uniqueLocations.map(l => (
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
              <option value="full_time">{t('directory.fullTime', 'Full-time')}</option>
              <option value="part-time">{t('directory.partTime', 'Part-time')}</option>
              <option value="part_time">{t('directory.partTime', 'Part-time')}</option>
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
                <h3 className="font-semibold text-slate-900 text-sm">{fullName(emp, t)}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{emp.role_name || emp.role || emp.title || '-'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{emp.department_name || emp.department || '-'}</p>
              </div>

              {/* Location */}
              <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{emp.location_name || emp.location || '-'}</span>
              </div>

              {/* Contact */}
              <div className="mt-3 space-y-1">
                {emp.email && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                )}
                {emp.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                )}
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
                        <span className="font-medium text-slate-900 text-sm">{fullName(emp, t)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{emp.role_name || emp.role || emp.title || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{emp.department_name || emp.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {emp.location_name || emp.location || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[200px]">{emp.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{emp.phone || '-'}</td>
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

          {/* Start from employees with no manager (top level) */}
          {(() => {
            const topLevel = employees.filter(e => !e.manager_id);
            if (topLevel.length === 0) {
              return (
                <div className="text-center py-8 text-slate-500">
                  <p>{t('directory.noOrgData', 'No organizational structure available')}</p>
                </div>
              );
            }
            return topLevel.map(emp => (
              <OrgChartNode
                key={emp.id}
                employee={emp}
                employees={employees}
                depth={0}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                onSelect={handleSelectEmployee}
                t={t}
              />
            ));
          })()}
        </div>
      )}

      {/* ============================================================
          EMPLOYEE DETAIL MODAL
          ============================================================ */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          employees={employees}
          onClose={() => setSelectedEmployee(null)}
          onNavigate={handleModalNavigate}
          t={t}
        />
      )}
    </div>
  );
}
