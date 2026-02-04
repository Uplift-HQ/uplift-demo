// ============================================================
// COMPANY DIRECTORY PAGE
// Route: /directory — Visible to ALL roles
// Grid, List, and Org Chart views with search & filters
// ============================================================
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Grid3X3, List, GitBranch, MapPin, Mail, Building2, Filter, Heart, ChevronDown, ChevronRight } from 'lucide-react';

const DIRECTORY_EMPLOYEES = [
  // Frontline / Hospitality
  { id: 1, name: 'Sarah Mitchell', role: 'Senior Server', department: 'Front of House', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'sarah.mitchell@grandmetro.com', momentum: 94, level: 'team' },
  { id: 2, name: 'James Kimani', role: 'Senior Bartender', department: 'Bar & Lounge', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'james.kimani@grandmetro.com', momentum: 89, level: 'team' },
  { id: 3, name: 'Priya Patel', role: 'Hostess', department: 'Front of House', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'priya.patel@grandmetro.com', momentum: 87, level: 'team' },
  { id: 4, name: 'Thomas Cane', role: 'Head Waiter', department: 'Front of House', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'thomas.cane@grandmetro.com', momentum: 91, level: 'team' },
  { id: 5, name: 'Marc Hunt', role: 'Server', department: 'Front of House', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'marc.hunt@grandmetro.com', momentum: 91, level: 'team' },
  { id: 6, name: 'Sophie Bernard', role: 'Sommelier', department: 'Bar & Lounge', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'sophie.bernard@grandmetro.com', momentum: 96, level: 'team' },
  { id: 7, name: 'Chen Wei', role: 'Server', department: 'Front of House', location: 'Grand Metro Hotels - Singapore', flag: '\u{1F1F8}\u{1F1EC}', email: 'chen.wei@grandmetro.com', momentum: 72, level: 'team' },
  { id: 8, name: 'Alex Rivera', role: 'Server', department: 'Front of House', location: 'Grand Metro Hotels - USA', flag: '\u{1F1FA}\u{1F1F8}', email: 'alex.rivera@grandmetro.com', momentum: 85, level: 'team' },
  // Corporate / Office
  { id: 9, name: 'Sarah Chen', role: 'HR Director', department: 'Human Resources', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'sarah.chen@grandmetro.com', momentum: 95, level: 'director' },
  { id: 10, name: 'James Williams', role: 'Operations Manager', department: 'Operations', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'james.williams@grandmetro.com', momentum: 92, level: 'manager' },
  { id: 11, name: 'Victoria Harrington', role: 'Finance Director', department: 'Finance', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'victoria.h@grandmetro.com', momentum: 90, level: 'director' },
  { id: 12, name: 'David Park', role: 'IT Manager', department: 'Information Technology', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'david.park@grandmetro.com', momentum: 88, level: 'manager' },
  { id: 13, name: 'Maria Santos', role: 'Marketing Lead', department: 'Marketing', location: 'Grand Metro Hotels - Dubai', flag: '\u{1F1E6}\u{1F1EA}', email: 'maria.santos@grandmetro.com', momentum: 86, level: 'manager' },
  { id: 14, name: 'Robert Fischer', role: 'Head Chef', department: 'Kitchen', location: 'Grand Metro Hotels - Germany', flag: '\u{1F1E9}\u{1F1EA}', email: 'robert.fischer@grandmetro.com', momentum: 93, level: 'manager' },
  { id: 15, name: 'Emma Thompson', role: 'CEO', department: 'Executive', location: 'Grand Metro Hotels - UK', flag: '\u{1F1EC}\u{1F1E7}', email: 'emma.thompson@grandmetro.com', momentum: 97, level: 'executive' },
  { id: 16, name: 'Hassan Al-Rashid', role: 'Sales VP', department: 'Sales', location: 'Grand Metro Hotels - Dubai', flag: '\u{1F1E6}\u{1F1EA}', email: 'hassan.ar@grandmetro.com', momentum: 91, level: 'director' },
  { id: 17, name: 'Lisa M\u00FCller', role: 'R&D Manager', department: 'Research & Development', location: 'Grand Metro Hotels - Germany', flag: '\u{1F1E9}\u{1F1EA}', email: 'lisa.muller@grandmetro.com', momentum: 84, level: 'manager' },
];

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function getInitialsBg(momentum) {
  if (momentum >= 90) return 'bg-gradient-to-br from-momentum-400 to-momentum-600 text-white';
  if (momentum >= 80) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-200 text-slate-600';
}

export default function Directory() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | list | org
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Org chart expand/collapse state
  const [expandedLevels, setExpandedLevels] = useState({ executive: true, director: true, manager: true });

  const departments = useMemo(() => {
    return [...new Set(DIRECTORY_EMPLOYEES.map(e => e.department))].sort();
  }, []);

  const locations = useMemo(() => {
    return [...new Set(DIRECTORY_EMPLOYEES.map(e => e.location))].sort();
  }, []);

  const filteredEmployees = useMemo(() => {
    return DIRECTORY_EMPLOYEES.filter(emp => {
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;
      if (locationFilter !== 'all' && emp.location !== locationFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.role.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q) ||
          emp.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, departmentFilter, locationFilter]);

  // Org chart data
  const orgExecutive = DIRECTORY_EMPLOYEES.find(e => e.level === 'executive');
  const orgDirectors = DIRECTORY_EMPLOYEES.filter(e => e.level === 'director');
  const orgManagers = DIRECTORY_EMPLOYEES.filter(e => e.level === 'manager');

  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t('directory.title', 'Company Directory')}
        </h1>
        <p className="text-slate-600 mt-1">
          {t('directory.subtitle', 'Find and connect with colleagues across the organization')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder={t('directory.searchPlaceholder', 'Search by name, role, department, or location...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 text-sm bg-white shadow-sm"
        />
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-momentum-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title={t('directory.gridView', 'Grid View')}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('directory.grid', 'Grid')}</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-momentum-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title={t('directory.listView', 'List View')}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{t('directory.list', 'List')}</span>
          </button>
          <button
            onClick={() => setViewMode('org')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'org'
                ? 'bg-white text-momentum-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title={t('directory.orgChartView', 'Org Chart View')}
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">{t('directory.orgChart', 'Org Chart')}</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">{t('directory.allDepartments', 'All Departments')}</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">{t('directory.allLocations', 'All Locations')}</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-slate-500">
        {t('directory.showingResults', 'Showing {{count}} colleagues', { count: filteredEmployees.length })}
      </p>

      {/* ===== GRID VIEW ===== */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-momentum-300 transition-all"
            >
              {/* Initials Circle */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-3 ${getInitialsBg(emp.momentum)}`}>
                  {getInitials(emp.name)}
                </div>
                <h3 className="font-semibold text-slate-900">{emp.name}</h3>
                <p className="text-sm text-slate-600 mt-0.5">{emp.role}</p>
                <p className="text-xs text-slate-400 mt-0.5">{emp.department}</p>

                {/* Location with flag */}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                  <span>{emp.flag}</span>
                  <MapPin className="w-3 h-3" />
                  <span>{emp.location}</span>
                </div>

                {/* Email (truncated) */}
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[180px]">{emp.email}</span>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  to="/recognition"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-momentum-600 bg-momentum-50 rounded-lg hover:bg-momentum-100 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5" />
                  {t('directory.sendRecognition', 'Send Recognition')}
                </Link>
                <Link
                  to={`/employees/${emp.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {t('directory.viewProfile', 'View Profile')}
                </Link>
              </div>
            </div>
          ))}

          {filteredEmployees.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">{t('directory.noResults', 'No colleagues found')}</p>
              <p className="text-sm mt-1">{t('directory.noResultsHint', 'Try adjusting your search or filters')}</p>
            </div>
          )}
        </div>
      )}

      {/* ===== LIST VIEW ===== */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('directory.name', 'Name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('directory.role', 'Role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('directory.department', 'Department')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('directory.location', 'Location')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('directory.email', 'Email')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getInitialsBg(emp.momentum)}`}>
                        {getInitials(emp.name)}
                      </div>
                      <Link to={`/employees/${emp.id}`} className="font-medium text-slate-900 hover:text-momentum-600 transition-colors">
                        {emp.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.role}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.department}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    <span className="mr-1">{emp.flag}</span>
                    {emp.location}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{emp.email}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">{t('directory.noResults', 'No colleagues found')}</p>
              <p className="text-sm mt-1">{t('directory.noResultsHint', 'Try adjusting your search or filters')}</p>
            </div>
          )}
        </div>
      )}

      {/* ===== ORG CHART VIEW ===== */}
      {viewMode === 'org' && (
        <div className="space-y-2">
          {/* Level 1: Executive / CEO */}
          {orgExecutive && (
            <div className="flex flex-col items-center">
              <OrgNode
                employee={orgExecutive}
                tier="executive"
                t={t}
              />

              {/* Connector line down */}
              <div className="w-px h-8 bg-slate-300" />

              {/* Level 2: Directors */}
              <div className="w-full">
                <button
                  onClick={() => toggleLevel('director')}
                  className="flex items-center gap-2 mx-auto mb-3 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
                >
                  {expandedLevels.director ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {t('directory.directors', 'Directors')} ({orgDirectors.length})
                </button>

                {expandedLevels.director && (
                  <>
                    {/* Horizontal connector bar */}
                    <div className="relative flex justify-center mb-2">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-slate-300" style={{ width: `${Math.min(orgDirectors.length * 220, 700)}px` }} />
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                      {orgDirectors.map(emp => (
                        <div key={emp.id} className="flex flex-col items-center">
                          <div className="w-px h-4 bg-slate-300" />
                          <OrgNode employee={emp} tier="director" t={t} />
                        </div>
                      ))}
                    </div>

                    {/* Connector line down to managers */}
                    <div className="flex justify-center">
                      <div className="w-px h-8 bg-slate-300" />
                    </div>
                  </>
                )}
              </div>

              {/* Level 3: Managers */}
              <div className="w-full">
                <button
                  onClick={() => toggleLevel('manager')}
                  className="flex items-center gap-2 mx-auto mb-3 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
                >
                  {expandedLevels.manager ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {t('directory.managers', 'Managers')} ({orgManagers.length})
                </button>

                {expandedLevels.manager && (
                  <>
                    {/* Horizontal connector bar */}
                    <div className="relative flex justify-center mb-2">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-slate-300" style={{ width: `${Math.min(orgManagers.length * 200, 900)}px` }} />
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                      {orgManagers.map(emp => (
                        <div key={emp.id} className="flex flex-col items-center">
                          <div className="w-px h-4 bg-slate-300" />
                          <OrgNode employee={emp} tier="manager" t={t} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Org Chart Node Component */
function OrgNode({ employee, tier, t }) {
  const tierStyles = {
    executive: 'border-momentum-400 bg-gradient-to-br from-momentum-50 to-white shadow-md',
    director: 'border-blue-300 bg-blue-50/50',
    manager: 'border-slate-300 bg-slate-50/50',
  };

  const tierBadge = {
    executive: 'bg-momentum-100 text-momentum-700',
    director: 'bg-blue-100 text-blue-700',
    manager: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 border-2 rounded-xl transition-all hover:shadow-md ${tierStyles[tier]}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getInitialsBg(employee.momentum)}`}>
        {getInitials(employee.name)}
      </div>
      <div className="text-left">
        <p className="font-semibold text-slate-900 text-sm">{employee.name}</p>
        <p className="text-xs text-slate-500">{employee.role}</p>
        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${tierBadge[tier]}`}>
          {t(`directory.tier.${tier}`, tier.charAt(0).toUpperCase() + tier.slice(1))}
        </span>
      </div>
    </div>
  );
}
