// ============================================================
// UPLIFT ADMIN PORTAL
// Main application with routing
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, RequireAuth, RequireAdmin, RequireManager } from './lib/auth';
import { EntityProvider } from './lib/entityContext';
import { ViewProvider } from './lib/viewContext';

// Layout
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Schedule from './pages/Schedule';
import ShiftTemplates from './pages/ShiftTemplates';
import TimeTracking from './pages/TimeTracking';
import TimeOff from './pages/TimeOff';
import Locations from './pages/Locations';
import Skills from './pages/Skills';
import Jobs from './pages/Jobs';
import Career from './pages/Career';
import BulkImport from './pages/BulkImport';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';
import NotificationSettings from './pages/NotificationSettings';
import Activity from './pages/Activity';
import Onboarding from './pages/Onboarding';
import OrgOnboarding from './pages/OrgOnboarding';

// New E2E HR modules
import Performance from './pages/Performance';
import Compensation from './pages/Compensation';
import Documents from './pages/Documents';
import Learning from './pages/Learning';
import Surveys from './pages/Surveys';
import Expenses from './pages/Expenses';
import Offboarding from './pages/Offboarding';
import CorporateCards from './pages/CorporateCards';

// Payroll module
import Payroll from './pages/Payroll';
import PayrollRun from './pages/PayrollRun';
import PayrollConfig from './pages/PayrollConfig';
import MyPayslips from './pages/MyPayslips';

// Employee self-service pages
import Momentum from './pages/Momentum';
import Recognition from './pages/Recognition';
import Directory from './pages/Directory';

// Legal pages
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';

export default function App() {
  const { loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-momentum-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">U</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <EntityProvider>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* Protected routes with layout */}
      <Route
        element={
          <RequireAuth>
            <ViewProvider>
              <Layout />
            </ViewProvider>
          </RequireAuth>
        }
      >
        {/* Open to all roles */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/time-tracking" element={<TimeTracking />} />
        <Route path="/time-off" element={<TimeOff />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/compensation" element={<Compensation />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/corporate-cards" element={<CorporateCards />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/momentum" element={<Momentum />} />
        <Route path="/recognition" element={<Recognition />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/career" element={<Career />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/settings/notifications" element={<NotificationSettings />} />
        <Route path="/payroll/my-payslips" element={<MyPayslips />} />

        {/* Manager and above only */}
        <Route path="/employees" element={<RequireManager><Employees /></RequireManager>} />
        <Route path="/employees/:id" element={<RequireManager><EmployeeDetail /></RequireManager>} />
        <Route path="/onboarding" element={<RequireManager><Onboarding /></RequireManager>} />
        <Route path="/offboarding" element={<RequireManager><Offboarding /></RequireManager>} />
        <Route path="/reports" element={<RequireManager><Reports /></RequireManager>} />
        <Route path="/payroll/team" element={<RequireManager><Payroll /></RequireManager>} />

        {/* Admin only */}
        <Route path="/org-onboarding" element={<RequireAdmin><OrgOnboarding /></RequireAdmin>} />
        <Route path="/shift-templates" element={<RequireAdmin><ShiftTemplates /></RequireAdmin>} />
        <Route path="/locations" element={<RequireAdmin><Locations /></RequireAdmin>} />
        <Route path="/bulk-import" element={<RequireAdmin><BulkImport /></RequireAdmin>} />
        <Route path="/integrations" element={<RequireAdmin><Integrations /></RequireAdmin>} />
        <Route path="/activity" element={<RequireAdmin><Activity /></RequireAdmin>} />
        <Route path="/surveys" element={<RequireAdmin><Surveys /></RequireAdmin>} />
        <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
        <Route path="/payroll" element={<RequireAdmin><Payroll /></RequireAdmin>} />
        <Route path="/payroll/runs" element={<RequireAdmin><Payroll /></RequireAdmin>} />
        <Route path="/payroll/runs/:id" element={<RequireAdmin><PayrollRun /></RequireAdmin>} />
        <Route path="/payroll/config" element={<RequireAdmin><PayrollConfig /></RequireAdmin>} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </EntityProvider>
  );
}
