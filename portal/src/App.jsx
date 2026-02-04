// ============================================================
// UPLIFT ADMIN PORTAL
// Main application with routing
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, RequireAuth, RequireAdmin } from './lib/auth';

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
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* Protected routes with layout */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:id" element={<EmployeeDetail />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/org-onboarding" element={<RequireAdmin><OrgOnboarding /></RequireAdmin>} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/shift-templates" element={<ShiftTemplates />} />
        <Route path="/time-tracking" element={<TimeTracking />} />
        <Route path="/time-off" element={<TimeOff />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/career" element={<Career />} />
        <Route path="/bulk-import" element={<BulkImport />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/compensation" element={<Compensation />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/surveys" element={<Surveys />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/offboarding" element={<Offboarding />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/notifications" element={<NotificationSettings />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
