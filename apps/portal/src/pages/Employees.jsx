// ============================================================
// EMPLOYEES PAGE
// All data from API — no demo data fallbacks
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { employeesApi, reportsApi } from '../lib/api';
import { Search, Filter, ChevronLeft, ChevronRight, UserPlus, Download, Eye, Edit, X, AlertCircle, Users, Upload } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function Employees() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [departmentFilter, setDepartmentFilter] = useState(t('employees.allDepartments'));
  const [locationFilter, setLocationFilter] = useState(t('employees.allLocations'));
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const pageSize = 20;

  useEffect(() => {
    loadEmployees();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, departmentFilter, locationFilter]);

  const loadEmployees = async () => {
    try {
      setError(null);
      const data = await employeesApi.list();
      const employees = data.employees || [];
      setAllEmployees(employees);

      // Extract unique departments and locations for filters
      const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];
      const locs = [...new Set(employees.map(e => e.location).filter(Boolean))];
      setDepartments(depts);
      setLocations(locs);
    } catch (err) {
      setError(err.message || t('employees.loadError', 'Failed to load employees'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // reportsApi.exportEmployees returns a URL string
    const url = reportsApi.exportEmployees({ format: 'csv' });
    window.open(url, '_blank');
  };

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => {
      if (statusFilter === 'active' && emp.status !== 'active') return false;
      if (statusFilter === 'on_leave' && emp.status !== 'on_leave') return false;
      if (statusFilter === 'terminated' && emp.status !== 'terminated') return false;

      if (departmentFilter !== t('employees.allDepartments') && emp.department !== departmentFilter) return false;
      if (locationFilter !== t('employees.allLocations') && emp.location !== locationFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const email = (emp.email || '').toLowerCase();
        if (!fullName.includes(query) && !email.includes(query)) return false;
      }

      return true;
    });
  }, [allEmployees, statusFilter, departmentFilter, locationFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats by status
  const stats = {
    active: allEmployees.filter(e => e.status === 'active').length,
    on_leave: allEmployees.filter(e => e.status === 'on_leave').length,
    terminated: allEmployees.filter(e => e.status === 'terminated').length,
    all: allEmployees.length
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800'
    };
    const labels = {
      active: t('common.active', 'Active'),
      on_leave: t('timeOff.title', 'On Leave'),
      terminated: t('common.terminated', 'Terminated')
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium mb-1">{t('employees.loadError', 'Failed to load employees')}</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button onClick={loadEmployees} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('common.retry', 'Retry')}</button>
      </div>
    );
  }

  // Empty state when no employees exist at all
  if (allEmployees.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('manager.totalEmployees', 'Employees')}</h1>
            <p className="text-gray-600">{t('manager.teamOverview', 'Manage your workforce')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <EmptyState
            icon={Users}
            title={t('employees.noEmployeesYet', 'No employees yet')}
            description={t('employees.noEmployeesDescription', 'Add your first employee to get started with workforce management. You can add employees individually or import them from a CSV file.')}
            action={
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/onboarding')}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                  {t('employees.addFirstEmployee', 'Add First Employee')}
                </button>
                <button
                  onClick={() => navigate('/bulk-import')}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  {t('employees.importFromCSV', 'Import from CSV')}
                </button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('manager.totalEmployees', 'Employees')}</h1>
          <p className="text-gray-600">{t('manager.teamOverview', 'Manage your workforce')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            {t('settings.dataExport', 'Export')}
          </button>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            {t('common.add', 'Add')} {t('profile.title', 'Employee')}
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: 'active', label: t('common.active', 'Active') },
          { key: 'on_leave', label: t('timeOff.title', 'On Leave') },
          { key: 'terminated', label: t('common.inactive', 'Terminated') },
          { key: 'all', label: t('common.all', 'All') }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              statusFilter === tab.key
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {t('employees.tabs.' + tab.key, tab.label)} ({stats[tab.key]})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('employees.searchPlaceholder', 'Search by name or email...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={t('employees.allDepartments')}>{t('employees.allDepartments')}</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={t('employees.allLocations')}>{t('employees.allLocations')}</option>
          {locations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600">
        {t('common.showing', 'Showing')} {paginatedEmployees.length} {t('common.of', 'of')} {filteredEmployees.length} {t('employees.employees', 'employees')}
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('profile.title', 'Employee')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('profile.role', 'Role')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('profile.department', 'Department')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('schedule.location', 'Location')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('skills.title', 'Skills')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEmployees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                      <div className="text-sm text-gray-500">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{emp.role || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{emp.department || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{emp.location || '-'}</td>
                <td className="px-6 py-4">
                  {getStatusBadge(emp.status)}
                  {emp.status === 'on_leave' && emp.leave_type && (
                    <div className="text-xs text-gray-500 mt-1">{emp.leave_type}</div>
                  )}
                  {emp.status === 'terminated' && emp.termination_reason && (
                    <div className="text-xs text-gray-500 mt-1">{emp.termination_reason}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    {emp.skills_count || 0} {t('skills.title', 'skills')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title={t('common.view', 'View')}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title={t('common.edit', 'Edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t('employees.noResults', 'No employees found matching your criteria')}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {t('common.page', 'Page')} {currentPage} {t('common.of', 'of')} {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('common.previous', 'Previous')}
            </button>

            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.next', 'Next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{t('employees.details', 'Employee Details')}</h3>
              <button onClick={() => setSelectedEmployee(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-medium">
                  {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                </div>
                <div>
                  <h4 className="text-xl font-semibold">{selectedEmployee.first_name} {selectedEmployee.last_name}</h4>
                  <p className="text-gray-500">{selectedEmployee.role || '-'}</p>
                  {getStatusBadge(selectedEmployee.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="min-w-0">
                  <label className="text-sm text-gray-500">{t('profile.email', 'Email')}</label>
                  <p className="font-medium truncate" title={selectedEmployee.email}>{selectedEmployee.email}</p>
                </div>
                <div className="min-w-0">
                  <label className="text-sm text-gray-500">{t('profile.phone', 'Phone')}</label>
                  <p className="font-medium truncate">{selectedEmployee.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('profile.department', 'Department')}</label>
                  <p className="font-medium">{selectedEmployee.department || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('schedule.location', 'Location')}</label>
                  <p className="font-medium">{selectedEmployee.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('employees.hireDate', 'Hire Date')}</label>
                  <p className="font-medium">{formatDate(selectedEmployee.hire_date)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('skills.title', 'Skills')}</label>
                  <p className="font-medium">{selectedEmployee.skills_count || 0} {t('employees.assigned', 'assigned')}</p>
                </div>
              </div>

              {selectedEmployee.status === 'on_leave' && (
                <div className="pt-4 border-t">
                  <label className="text-sm text-gray-500">{t('employees.leaveDetails', 'Leave Details')}</label>
                  <p className="font-medium">{selectedEmployee.leave_type || t('timeOff.title', 'Leave')}</p>
                  {selectedEmployee.leave_until && (
                    <p className="text-sm text-gray-500">{t('employees.until', 'Until')} {formatDate(selectedEmployee.leave_until)}</p>
                  )}
                </div>
              )}

              {selectedEmployee.status === 'terminated' && (
                <div className="pt-4 border-t">
                  <label className="text-sm text-gray-500">{t('employees.terminationDetails', 'Termination Details')}</label>
                  <p className="font-medium">{selectedEmployee.termination_reason || 'N/A'}</p>
                  {selectedEmployee.termination_date && (
                    <p className="text-sm text-gray-500">{t('common.date', 'Date')}: {formatDate(selectedEmployee.termination_date)}</p>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                {t('common.close', 'Close')}
              </button>
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  navigate(`/employees/${selectedEmployee.id}`);
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {t('common.edit', 'Edit')} {t('profile.title', 'Employee')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
