// ============================================================
// API CLIENT
// Centralized HTTP client with Bearer token auth
// Falls back to demo data when API is unavailable
// ============================================================

import {
  locations,
  employees,
  skills,
  rewards,
  timeOff,
  activity,
  submissions,
  integrations,
  reports,
  settings,
  dashboard,
  demoUser,
  departments,
  roles,
  generateShifts,
  generateTimeEntries,
  timeEntries,
  getWeekStart,
  shiftTemplates,
} from '../data/mockData';

// Map mockData to expected names for compatibility
const DEMO_LOCATIONS = locations;
const DEMO_EMPLOYEES = employees;
const DEMO_SKILLS = skills;
const DEMO_INTEGRATIONS = integrations;
const DEMO_DEPARTMENTS = departments;
const DEMO_ROLES = roles;
const DEMO_DASHBOARD = dashboard;
const DEMO_USER = demoUser;
const DEMO_ACTIVITIES = activity;
const DEMO_TIME_ENTRIES = timeEntries;
const DEMO_TIME_OFF_REQUESTS = timeOff.requests;
const DEMO_TIME_OFF_BALANCES = [
  { id: 'bal-1', policy_name: 'Annual Leave', entitlement: 25, used: timeOff.balances.annual.used, pending: 0, remaining: timeOff.balances.annual.total - timeOff.balances.annual.used },
  { id: 'bal-2', policy_name: 'Sick Leave', entitlement: 10, used: timeOff.balances.sick.used, pending: 0, remaining: timeOff.balances.sick.total - timeOff.balances.sick.used },
  { id: 'bal-3', policy_name: 'Personal', entitlement: 5, used: timeOff.balances.personal.used, pending: 0, remaining: timeOff.balances.personal.total - timeOff.balances.personal.used },
];
const DEMO_TIME_OFF_POLICIES = [
  { id: 'pol-1', name: 'Annual Leave', days_per_year: 25, carry_over_limit: 5 },
  { id: 'pol-2', name: 'Sick Leave', days_per_year: 10, carry_over_limit: 0 },
  { id: 'pol-3', name: 'Personal', days_per_year: 5, carry_over_limit: 0 },
];
const DEMO_USERS = settings.users;
const DEMO_SESSIONS = [
  { id: 'sess-1', device: 'Chrome on MacOS', ip: '192.168.1.100', location: 'London, UK', lastActive: new Date().toISOString(), current: true },
];
const DEMO_WEBHOOKS = [
  { id: 'wh-1', name: 'Slack Notifications', url: 'https://hooks.slack.com/services/xxx', events: ['shift.created', 'employee.added'], status: 'active', lastTriggered: new Date(Date.now() - 1800000).toISOString(), successRate: 99 },
];
const DEMO_ORGANIZATION = settings.organization;
const DEMO_BRANDING = { primaryColor: '#6366f1', companyName: settings.organization.name, logo: null, favicon: null };
const DEMO_NAVIGATION = { employees: true, schedule: true, templates: true, timeTracking: true, timeOff: true, locations: true, skills: true, jobs: true, career: true, bulkImport: true, reports: true, integrations: true, activity: true };
const DEMO_EMPLOYEE_VISIBILITY = { email: { managers: true, employees: false }, phone: { managers: true, employees: false }, address: { managers: true, employees: false }, salary: { managers: false, employees: false }, emergencyContact: { managers: true, employees: false }, performanceScore: { managers: true, employees: true }, skills: { managers: true, employees: true } };
const DEMO_OPPORTUNITIES = [
  { id: 'opp-001', title: 'Team Supervisor', location: 'Main Office', location_id: 'l1', department: 'Operations', salary_min: 28000, salary_max: 32000, salary_display: '£28,000 - £32,000', type: 'Promotion', employment_type: 'Full-time', deadline: '2026-02-15', posted: '2026-01-10', status: 'open', description: 'Lead our operations team.', requirements: ['2+ years experience', 'Leadership skills'], applications: 3 },
  { id: 'opp-002', title: 'Senior Associate', location: 'Branch Office', location_id: 'l2', department: 'Operations', salary_min: 25000, salary_max: 28000, salary_display: '£25,000 - £28,000', type: 'Promotion', employment_type: 'Full-time', deadline: '2026-02-20', posted: '2026-01-12', status: 'open', description: 'Senior role in operations.', requirements: ['Relevant experience', 'Strong communication'], applications: 4 },
];
const DEMO_CAREER = { paths: [], insights: employees.slice(0, 5).map(e => ({ employeeId: e.id, employeeName: e.name, currentRole: e.role, nextRole: 'Supervisor', readiness: 75, gapCount: 2 })) };
const DEMO_IMPORT_TEMPLATES = [
  { id: 'tpl-1', name: 'Employees', description: 'Import employee records', fields: ['first_name', 'last_name', 'email', 'phone', 'role', 'department', 'start_date'] },
  { id: 'tpl-2', name: 'Shifts', description: 'Import shift schedules', fields: ['date', 'start_time', 'end_time', 'location', 'employee_email', 'role'] },
];
const DEMO_HOURS_REPORT = { summary: { totalScheduled: 1248, totalWorked: 1192, variance: -4.5, overtime: 48 }, byEmployee: employees.map(e => ({ id: e.id, name: e.name, scheduled: 140, worked: 132, overtime: 0 })) };
const DEMO_ATTENDANCE_REPORT = { summary: { totalShifts: 156, onTime: 142, late: 10, noShow: 4, punctualityRate: 91 }, byEmployee: employees.map(e => ({ id: e.id, name: e.name, shifts: 20, onTime: 18, late: 2, noShow: 0, punctualityRate: 90 })) };
const DEMO_LABOR_COST_REPORT = { summary: { totalCost: reports.laborCost.current, scheduledCost: reports.laborCost.budget, variance: reports.laborCost.variance, averageRate: 12.25 }, byLocation: locations.map(l => ({ id: l.id, name: l.name, cost: Math.round(Math.random() * 3000 + 2000), hours: Math.round(Math.random() * 200 + 100) })), trend: reports.laborCost.data.map((v, i) => ({ week: `Week ${i + 1}`, cost: v })) };
const DEMO_SHIFT_TEMPLATES = shiftTemplates;
const DEMO_API_KEYS = [
  { id: 'key-1', name: 'Production API Key', prefix: 'uplift_live_7x9k...mP2q', created_at: '2025-10-15', last_used: new Date(Date.now() - 300000).toISOString(), scope: 'Full access' },
];
const DEMO_CUSTOM_INTEGRATIONS = [];
const DEMO_NOTIFICATIONS = [
  { id: 'notif-1', type: 'shift_swap', title: 'Shift swap request', message: 'An employee requested to swap shifts', read: false, created_at: new Date().toISOString() },
  { id: 'notif-2', type: 'time_off', title: 'Time off request', message: 'An employee submitted a time off request', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
];
const DEMO_SHIFT_SWAPS = [
  { id: 'swap-1', from_employee: 'Employee A', to_employee: 'Employee B', shift_date: '2026-02-05', status: 'pending', reason: 'Personal appointment' },
];
const DEMO_SCHEDULE_PERIODS = [
  { id: 'period-1', name: 'Week 5 2026', start_date: '2026-01-27', end_date: '2026-02-02', status: 'published' },
  { id: 'period-2', name: 'Week 6 2026', start_date: '2026-02-03', end_date: '2026-02-09', status: 'draft' },
];
const generateDemoShifts = generateShifts;

// Demo Performance Data
const DEMO_PERFORMANCE_REVIEWS = [
  { id: 'rev-1', employee_id: 'emp-1', employee_name: 'Current User', reviewer_name: 'Sarah Chen', review_period: 'Q4 2025', type: 'quarterly', status: 'complete', overall_rating: 4, strengths: 'Excellent attention to detail in quality checks. Consistently meets deadlines.', development_areas: 'Could take on more leadership responsibilities.', manager_assessment_text: 'Strong performer, ready for senior role discussion.', completed_at: '2025-12-20' },
  { id: 'rev-2', employee_id: 'emp-1', employee_name: 'Current User', reviewer_name: 'Sarah Chen', review_period: 'Q1 2026', type: 'quarterly', status: 'self_review', overall_rating: null, self_assessment_text: 'Made good progress on key objectives.', manager_assessment_text: null, completed_at: null },
];
const DEMO_GOALS = [
  { id: 'goal-1', employee_id: 'emp-1', title: 'Complete Six Sigma Green Belt certification', description: 'Obtain certification to improve process quality skills', category: 'development', status: 'in_progress', priority: 'high', target_date: '2026-06-30', progress_percentage: 40 },
  { id: 'goal-2', employee_id: 'emp-1', title: 'Reduce defect rate on production line by 10%', description: 'Implement quality improvements to reduce defects', category: 'performance', status: 'in_progress', priority: 'high', target_date: '2026-03-31', progress_percentage: 75 },
  { id: 'goal-3', employee_id: 'emp-1', title: 'Complete team leader training programme', description: 'Develop leadership skills for future promotion', category: 'development', status: 'in_progress', priority: 'medium', target_date: '2026-09-30', progress_percentage: 15 },
  { id: 'goal-4', employee_id: 'emp-1', title: 'Achieve zero safety incidents in Q1', description: 'Maintain perfect safety record', category: 'performance', status: 'completed', priority: 'high', target_date: '2026-03-31', progress_percentage: 100, completed_date: '2026-02-01' },
];
const DEMO_OKRS = [
  { id: 'okr-1', title: 'Improve operational efficiency', type: 'team', status: 'on_track', progress: 65, key_results: [{ id: 'kr-1', description: 'Reduce processing time by 15%', progress: 70 }, { id: 'kr-2', description: 'Achieve 99% on-time delivery', progress: 60 }] },
];
const DEMO_ONE_ON_ONES = [
  { id: 'meeting-1', employee_id: 'emp-1', employee_name: 'Current User', manager_name: 'Sarah Chen', scheduled_date: '2026-02-15T10:00:00', status: 'scheduled', notes: '', action_items: [] },
  { id: 'meeting-2', employee_id: 'emp-1', employee_name: 'Current User', manager_name: 'Sarah Chen', scheduled_date: '2026-01-15T10:00:00', status: 'completed', notes: 'Discussed career progression and training opportunities.', action_items: [{ id: 'action-1', description: 'Research Six Sigma courses', is_completed: true }] },
];
const DEMO_FEEDBACK = [
  { id: 'fb-1', from_name: 'Sarah Chen', to_employee_id: 'emp-1', message: 'Great job handling the client presentation!', type: 'praise', visibility: 'public', created_at: '2026-02-05', reactions: { thumbsUp: 3, heart: 1 } },
  { id: 'fb-2', from_name: 'James Mitchell', to_employee_id: 'emp-1', message: 'Thanks for helping with the project deadline.', type: 'thanks', visibility: 'public', created_at: '2026-02-01', reactions: { thumbsUp: 2 } },
];
const DEMO_REVIEW_CYCLES = [
  { id: 'cycle-1', name: 'Q1 2026 Performance Review', status: 'active', start_date: '2026-01-01', end_date: '2026-03-31', type: 'quarterly', participants_count: 45, completed_count: 12 },
  { id: 'cycle-2', name: 'Q4 2025 Annual Review', status: 'completed', start_date: '2025-10-01', end_date: '2025-12-31', type: 'annual', participants_count: 42, completed_count: 42 },
];

// Demo Learning Data
const DEMO_COURSES = [
  { id: 'course-1', title: 'Health & Safety Essentials', description: 'Core workplace safety training', category: 'health_safety', difficulty: 'beginner', duration_minutes: 120, is_mandatory: true, status: 'published', passing_score: 80, lessons_count: 8 },
  { id: 'course-2', title: 'Fire Safety Awareness', description: 'Fire prevention and emergency procedures', category: 'health_safety', difficulty: 'beginner', duration_minutes: 60, is_mandatory: true, status: 'published', passing_score: 80, lessons_count: 5 },
  { id: 'course-3', title: 'Manual Handling Best Practices', description: 'Safe lifting and handling techniques', category: 'health_safety', difficulty: 'beginner', duration_minutes: 90, is_mandatory: true, status: 'published', passing_score: 80, lessons_count: 6 },
  { id: 'course-4', title: 'GDPR Data Protection', description: 'Understanding data protection regulations', category: 'compliance', difficulty: 'intermediate', duration_minutes: 60, is_mandatory: true, status: 'published', passing_score: 85, lessons_count: 4 },
  { id: 'course-5', title: 'Introduction to Lean Manufacturing', description: 'Fundamentals of lean principles', category: 'skills', difficulty: 'intermediate', duration_minutes: 240, is_mandatory: false, status: 'published', passing_score: 70, lessons_count: 12 },
  { id: 'course-6', title: 'Six Sigma Green Belt', description: 'Quality management methodology', category: 'skills', difficulty: 'advanced', duration_minutes: 2400, is_mandatory: false, status: 'published', passing_score: 75, lessons_count: 24 },
  { id: 'course-7', title: 'Leadership Fundamentals', description: 'Core leadership skills for managers', category: 'leadership', difficulty: 'intermediate', duration_minutes: 360, is_mandatory: false, status: 'published', passing_score: 70, lessons_count: 10 },
  { id: 'course-8', title: 'First Aid at Work', description: 'Essential first aid training', category: 'health_safety', difficulty: 'intermediate', duration_minutes: 480, is_mandatory: true, status: 'published', passing_score: 85, lessons_count: 15 },
];
const DEMO_ENROLLMENTS = [
  { id: 'enroll-1', course_id: 'course-1', course_title: 'Health & Safety Essentials', employee_id: 'emp-1', employee_name: 'Current User', status: 'completed', progress: 100, score: 92, enrolled_at: '2025-11-01', completed_at: '2025-11-15' },
  { id: 'enroll-2', course_id: 'course-2', course_title: 'Fire Safety Awareness', employee_id: 'emp-1', employee_name: 'Current User', status: 'completed', progress: 100, score: 88, enrolled_at: '2025-11-20', completed_at: '2025-12-01' },
  { id: 'enroll-3', course_id: 'course-3', course_title: 'Manual Handling Best Practices', employee_id: 'emp-1', employee_name: 'Current User', status: 'completed', progress: 100, score: 95, enrolled_at: '2025-10-01', completed_at: '2025-10-20' },
  { id: 'enroll-4', course_id: 'course-4', course_title: 'GDPR Data Protection', employee_id: 'emp-1', employee_name: 'Current User', status: 'completed', progress: 100, score: 100, enrolled_at: '2026-01-05', completed_at: '2026-01-10' },
  { id: 'enroll-5', course_id: 'course-5', course_title: 'Introduction to Lean Manufacturing', employee_id: 'emp-1', employee_name: 'Current User', status: 'in_progress', progress: 65, score: null, enrolled_at: '2026-01-15', completed_at: null },
  { id: 'enroll-6', course_id: 'course-6', course_title: 'Six Sigma Green Belt', employee_id: 'emp-1', employee_name: 'Current User', status: 'in_progress', progress: 40, score: null, enrolled_at: '2025-12-01', completed_at: null },
];
const DEMO_CERTIFICATIONS = [
  { id: 'cert-1', employee_id: 'emp-1', employee_name: 'Current User', course_id: 'course-1', course_title: 'Health & Safety Essentials', issued_at: '2025-11-15', expires_at: '2026-11-15', status: 'active' },
  { id: 'cert-2', employee_id: 'emp-1', employee_name: 'Current User', course_id: 'course-2', course_title: 'Fire Safety Awareness', issued_at: '2025-12-01', expires_at: '2026-12-01', status: 'active' },
  { id: 'cert-3', employee_id: 'emp-1', employee_name: 'Current User', course_id: 'course-4', course_title: 'GDPR Data Protection', issued_at: '2026-01-10', expires_at: '2027-01-10', status: 'active' },
];

// Demo Expense Data
const DEMO_EXPENSE_CATEGORIES = [
  { id: 'cat-1', name: 'Travel', code: 'TRAVEL', description: 'Transportation costs' },
  { id: 'cat-2', name: 'Meals & Entertainment', code: 'MEALS', description: 'Food and client entertainment' },
  { id: 'cat-3', name: 'Accommodation', code: 'HOTEL', description: 'Hotel and lodging' },
  { id: 'cat-4', name: 'Equipment', code: 'EQUIP', description: 'Work equipment purchases' },
  { id: 'cat-5', name: 'Office Supplies', code: 'OFFICE', description: 'Office supplies and stationery' },
];
const DEMO_EXPENSES = [
  { id: 'exp-1', employee_id: 'emp-1', employee_name: 'Sarah Mitchell', description: 'Uber to Manchester site visit', category: 'Travel', merchant: 'Uber', amount: 34.50, currency: 'GBP', expense_date: '2026-02-03', status: 'approved', receipt_url: '/receipts/uber.pdf' },
  { id: 'exp-2', employee_id: 'emp-1', employee_name: 'Sarah Mitchell', description: 'Team lunch - Pret A Manger', category: 'Meals & Entertainment', merchant: 'Pret A Manger', amount: 28.60, currency: 'GBP', expense_date: '2026-02-05', status: 'approved', receipt_url: '/receipts/pret.pdf' },
  { id: 'exp-3', employee_id: 'emp-1', employee_name: 'Sarah Mitchell', description: 'Premier Inn - overnight', category: 'Accommodation', merchant: 'Premier Inn', amount: 89.00, currency: 'GBP', expense_date: '2026-02-01', status: 'submitted', receipt_url: '/receipts/hotel.pdf' },
  { id: 'exp-4', employee_id: 'emp-2', employee_name: 'James Williams', description: 'Costa Coffee - client meeting', category: 'Meals & Entertainment', merchant: 'Costa Coffee', amount: 8.50, currency: 'GBP', expense_date: '2026-02-07', status: 'submitted', receipt_url: null },
  { id: 'exp-5', employee_id: 'emp-1', employee_name: 'Sarah Mitchell', description: 'Safety boots', category: 'Equipment', merchant: 'Amazon', amount: 45.00, currency: 'GBP', expense_date: '2026-01-28', status: 'approved', receipt_url: '/receipts/amazon.pdf' },
  { id: 'exp-6', employee_id: 'emp-3', employee_name: 'Maria Santos', description: 'Office supplies', category: 'Office Supplies', merchant: 'Ryman', amount: 15.90, currency: 'GBP', expense_date: '2026-02-04', status: 'approved', receipt_url: '/receipts/ryman.pdf' },
  { id: 'exp-7', employee_id: 'emp-1', employee_name: 'Sarah Mitchell', description: 'Train to London', category: 'Travel', merchant: 'Trainline', amount: 67.80, currency: 'GBP', expense_date: '2026-02-06', status: 'paid', receipt_url: '/receipts/train.pdf' },
  { id: 'exp-8', employee_id: 'emp-2', employee_name: 'James Williams', description: 'Parking at client site', category: 'Travel', merchant: 'NCP', amount: 12.00, currency: 'GBP', expense_date: '2026-02-08', status: 'draft', receipt_url: null },
  { id: 'exp-9', employee_id: 'emp-3', employee_name: 'Maria Santos', description: 'Client dinner - Dishoom', category: 'Meals & Entertainment', merchant: 'Dishoom', amount: 156.40, currency: 'GBP', expense_date: '2026-02-02', status: 'submitted', receipt_url: '/receipts/dishoom.pdf' },
  { id: 'exp-10', employee_id: 'emp-1', employee_name: 'Sarah Mitchell', description: 'Hilton Manchester 2 nights', category: 'Accommodation', merchant: 'Hilton Hotels', amount: 245.00, currency: 'GBP', expense_date: '2026-01-25', status: 'paid', receipt_url: '/receipts/hilton.pdf' },
];

// Demo Corporate Card Data
const DEMO_CORPORATE_CARDS = [
  { id: 'card-1', employee_id: 'emp-1', employee_name: 'Current User', card_type: 'HSBC Visa', last_four: '4821', cardholder_name: 'Sarah Mitchell', is_active: true, status: 'active', limit: 500000, balance: 34594, currency: 'GBP', last_synced_at: '2026-02-11T09:30:00Z' },
];
const DEMO_CARD_TRANSACTIONS = [
  { id: 'txn-1', card_id: 'card-1', description: 'Groceries for office kitchen', merchant_name: 'Tesco Express', amount: 8.45, currency: 'GBP', transaction_date: '2026-02-10', category_id: 'cat-2', status: 'pending', receipt_url: null },
  { id: 'txn-2', card_id: 'card-1', description: 'Fuel for site visit', merchant_name: 'Shell Petrol', amount: 65.00, currency: 'GBP', transaction_date: '2026-02-09', category_id: 'cat-1', status: 'categorized', receipt_url: '/receipts/shell.pdf' },
  { id: 'txn-3', card_id: 'card-1', description: 'Office supplies order', merchant_name: 'Amazon', amount: 34.99, currency: 'GBP', transaction_date: '2026-02-08', category_id: 'cat-5', status: 'categorized', receipt_url: '/receipts/amazon.pdf' },
  { id: 'txn-4', card_id: 'card-1', description: 'Client meeting refreshments', merchant_name: 'Costa Coffee', amount: 4.50, currency: 'GBP', transaction_date: '2026-02-07', category_id: 'cat-2', status: 'uncategorized', receipt_url: null },
  { id: 'txn-5', card_id: 'card-1', description: 'Train to London office', merchant_name: 'Trainline', amount: 45.60, currency: 'GBP', transaction_date: '2026-02-06', category_id: 'cat-1', status: 'submitted', receipt_url: '/receipts/train.pdf' },
  { id: 'txn-6', card_id: 'card-1', description: 'Team lunch', merchant_name: 'Pret A Manger', amount: 28.60, currency: 'GBP', transaction_date: '2026-02-05', category_id: 'cat-2', status: 'categorized', receipt_url: '/receipts/pret.pdf' },
  { id: 'txn-7', card_id: 'card-1', description: 'Parking at client site', merchant_name: 'NCP', amount: 12.00, currency: 'GBP', transaction_date: '2026-02-04', category_id: 'cat-1', status: 'categorized', receipt_url: null },
];
const DEMO_CARD_CLAIMS = [
  { id: 'claim-1', claim_number: 'EXP-2026-001', employee_id: 'emp-1', employee_name: 'Sarah Mitchell', expense_date: '2026-02-05', transaction_count: 3, total_amount: 108.44, status: 'pending', description: 'February week 1 expenses' },
  { id: 'claim-2', claim_number: 'EXP-2026-002', employee_id: 'emp-2', employee_name: 'James Williams', expense_date: '2026-02-03', transaction_count: 2, total_amount: 89.50, status: 'submitted', description: 'Client visit expenses' },
  { id: 'claim-3', claim_number: 'EXP-2026-003', employee_id: 'emp-3', employee_name: 'Maria Santos', expense_date: '2026-01-28', transaction_count: 5, total_amount: 245.20, status: 'approved', description: 'January training expenses' },
  { id: 'claim-4', claim_number: 'EXP-2025-098', employee_id: 'emp-1', employee_name: 'Sarah Mitchell', expense_date: '2025-12-15', transaction_count: 4, total_amount: 156.80, status: 'paid', description: 'December team event' },
];

// Demo Compliance Data
const DEMO_COMPLIANCE_ITEMS = [
  { id: 'comp-1', name: 'Health & Safety Induction', category: 'Safety', frequency: 'annual', is_mandatory: true },
  { id: 'comp-2', name: 'Fire Safety Training', category: 'Safety', frequency: 'annual', is_mandatory: true },
  { id: 'comp-3', name: 'First Aid Certificate', category: 'Safety', frequency: '3_years', is_mandatory: true },
  { id: 'comp-4', name: 'GDPR Training', category: 'Compliance', frequency: 'annual', is_mandatory: true },
  { id: 'comp-5', name: 'Manual Handling', category: 'Safety', frequency: '2_years', is_mandatory: true },
  { id: 'comp-6', name: 'Forklift Licence', category: 'Operations', frequency: '3_years', is_mandatory: false },
];
const DEMO_EMPLOYEE_COMPLIANCE = [
  { id: 'ec-1', employee_id: 'emp-1', employee_name: 'Current User', compliance_item_id: 'comp-1', compliance_item_name: 'Health & Safety Induction', status: 'compliant', completed_at: '2025-11-15', expires_at: '2026-11-15' },
  { id: 'ec-2', employee_id: 'emp-1', employee_name: 'Current User', compliance_item_id: 'comp-2', compliance_item_name: 'Fire Safety Training', status: 'compliant', completed_at: '2025-12-01', expires_at: '2026-12-01' },
  { id: 'ec-3', employee_id: 'emp-1', employee_name: 'Current User', compliance_item_id: 'comp-3', compliance_item_name: 'First Aid Certificate', status: 'compliant', completed_at: '2024-06-15', expires_at: '2027-06-15' },
  { id: 'ec-4', employee_id: 'emp-1', employee_name: 'Current User', compliance_item_id: 'comp-4', compliance_item_name: 'GDPR Training', status: 'compliant', completed_at: '2026-01-10', expires_at: '2027-01-10' },
  { id: 'ec-5', employee_id: 'emp-1', employee_name: 'Current User', compliance_item_id: 'comp-5', compliance_item_name: 'Manual Handling', status: 'expiring_soon', completed_at: '2024-10-20', expires_at: '2026-10-20' },
];

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Demo mode - controlled via environment variable
// Set VITE_DEMO_MODE=true for demo/showcase deployments
// Production always has this false (not set)
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('uplift_token');
    this.refreshToken = localStorage.getItem('uplift_refresh_token');
    this._refreshPromise = null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('uplift_token', token);
    } else {
      localStorage.removeItem('uplift_token');
    }
  }

  setRefreshToken(token) {
    this.refreshToken = token;
    if (token) {
      localStorage.setItem('uplift_refresh_token', token);
    } else {
      localStorage.removeItem('uplift_refresh_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('uplift_token');
  }

  getCsrfToken() {
    // Read CSRF token from cookie
    const match = document.cookie.match(/csrfToken=([^;]+)/);
    return match ? match[1] : null;
  }

  async request(method, path, data, options = {}) {
    // DEMO MODE: Intercept all requests and return demo data
    if (DEMO_MODE) {
      return this.getDemoData(path, method, data);
    }

    const url = `${API_URL}${path}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
      credentials: 'include',
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    try {
      let response = await fetch(url, config);

      // Token refresh on 401
      if (response.status === 401 && this.refreshToken && !options._isRetry) {
        const refreshed = await this._tryRefresh();
        if (refreshed) {
          // Retry the original request with new token
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          config.headers = headers;
          response = await fetch(url, { ...config });
        }
      }

      if (response.status === 401) {
        this.setToken(null);
        this.setRefreshToken(null);
        localStorage.removeItem('uplift_user');
        const error = new Error('Session expired');
        error.status = 401;
        throw error;
      }

      return this.handleResponse(response);
    } catch (error) {
      if (error.status !== 401) {
        console.error('API Error:', error);
      }
      throw error;
    }
  }

  async _tryRefresh() {
    // Deduplicate concurrent refresh requests
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
          credentials: 'include',
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.accessToken) {
          this.setToken(data.accessToken);
          if (data.refreshToken) this.setRefreshToken(data.refreshToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this._refreshPromise = null;
      }
    })();
    return this._refreshPromise;
  }

  // Demo data router - returns appropriate data based on path
  getDemoData(path, method, data) {
    // Dashboard
    if (path.startsWith('/dashboard')) {
      return DEMO_DASHBOARD;
    }

    // Employees
    if (path === '/employees' || path.startsWith('/employees?')) {
      return { employees: DEMO_EMPLOYEES };
    }
    // Employee's own record - return first employee or the logged-in persona's employee
    if (path === '/employees/me') {
      const stored = localStorage.getItem('uplift_user');
      const user = stored ? JSON.parse(stored) : null;
      // Find employee matching logged-in user, or default to first
      const emp = user ? DEMO_EMPLOYEES.find(e =>
        e.email?.toLowerCase().includes(user.firstName?.toLowerCase()) ||
        e.first_name?.toLowerCase() === user.firstName?.toLowerCase()
      ) : null;
      return { employee: emp || DEMO_EMPLOYEES[0] };
    }
    // Employee skills
    if (path.match(/^\/employees\/[^/]+\/skills$/)) {
      // Return demo skills for the employee
      const demoEmployeeSkills = DEMO_SKILLS.slice(0, 5).map((skill, idx) => ({
        id: `es-${idx}`,
        skill_id: skill.id,
        employee_id: path.split('/')[2],
        name: skill.name,
        category: skill.category,
        level: Math.floor(Math.random() * 3) + 2,
        verified: idx < 3,
        verified_at: idx < 3 ? new Date(Date.now() - idx * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        verified_by_name: idx < 3 ? 'Sarah' : null,
        verified_by_last: idx < 3 ? 'Chen' : null,
        expires_at: skill.category === 'Compliance' ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() : null,
      }));
      return { skills: demoEmployeeSkills };
    }
    // Employee career paths
    if (path.match(/^\/employees\/[^/]+\/career-paths$/)) {
      const demoCareerPaths = DEMO_OPPORTUNITIES.map(opp => ({
        ...opp,
        match_percentage: Math.floor(Math.random() * 40) + 60,
      }));
      const skillsGap = DEMO_SKILLS.slice(5, 8).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
      }));
      return { careerPaths: demoCareerPaths, skillsGap };
    }
    if (path.match(/^\/employees\/[^/]+$/)) {
      const id = path.split('/')[2];
      const emp = DEMO_EMPLOYEES.find(e => e.id === id);
      return emp ? { employee: emp } : { employee: DEMO_EMPLOYEES[0] };
    }

    // Locations
    if (path === '/locations' || path.startsWith('/locations?')) {
      return { locations: DEMO_LOCATIONS };
    }
    if (path.match(/^\/locations\/[^/]+$/)) {
      const id = path.split('/')[2];
      const loc = DEMO_LOCATIONS.find(l => l.id === id);
      return loc ? { location: loc } : { location: DEMO_LOCATIONS[0] };
    }

    // Departments
    if (path === '/departments') {
      return { departments: DEMO_DEPARTMENTS };
    }

    // Roles
    if (path === '/roles') {
      return { roles: DEMO_ROLES };
    }

    // Skills
    if (path === '/skills') {
      return { skills: DEMO_SKILLS };
    }

    // Shifts
    if (path === '/shifts' || path.startsWith('/shifts?')) {
      const shifts = generateDemoShifts(getWeekStart());
      return { shifts };
    }
    if (path.startsWith('/shifts/swaps')) {
      return { swaps: DEMO_SHIFT_SWAPS };
    }

    // Shift Templates
    if (path === '/shift-templates' || path.startsWith('/shift-templates?')) {
      return { templates: DEMO_SHIFT_TEMPLATES };
    }

    // Schedule Periods
    if (path.startsWith('/schedule/periods')) {
      return { periods: DEMO_SCHEDULE_PERIODS };
    }

    // Time Entries
    if (path.startsWith('/time/entries') || path.startsWith('/time/pending')) {
      if (path.includes('pending')) {
        const pending = DEMO_TIME_ENTRIES.filter(e => !e.approved).slice(0, 8);
        return { entries: pending };
      }
      return { entries: DEMO_TIME_ENTRIES };
    }

    // Time Off
    if (path === '/time-off/policies') {
      return { policies: DEMO_TIME_OFF_POLICIES };
    }
    if (path.startsWith('/time-off/requests')) {
      return { requests: DEMO_TIME_OFF_REQUESTS };
    }
    if (path.startsWith('/time-off/balances')) {
      return { balances: DEMO_TIME_OFF_BALANCES };
    }

    // Jobs/Opportunities
    if (path === '/jobs' || path.startsWith('/jobs?')) {
      return { jobs: DEMO_OPPORTUNITIES };
    }
    if (path.match(/^\/jobs\/[^/]+$/)) {
      const id = path.split('/')[2];
      const job = DEMO_OPPORTUNITIES.find(j => j.id === id);
      return job ? { job } : { job: DEMO_OPPORTUNITIES[0] };
    }

    // Integrations
    if (path === '/integrations') {
      return { integrations: DEMO_INTEGRATIONS };
    }
    if (path === '/integrations/api-keys') {
      return { apiKeys: DEMO_API_KEYS };
    }
    if (path === '/integrations/custom') {
      return { customIntegrations: DEMO_CUSTOM_INTEGRATIONS };
    }

    // Organization
    if (path === '/organization') {
      return { organization: DEMO_ORGANIZATION };
    }
    if (path === '/organization/branding') {
      return { branding: DEMO_BRANDING };
    }

    // Settings
    if (path === '/settings/navigation') {
      return { navigation: DEMO_NAVIGATION };
    }
    if (path === '/settings/employee-visibility') {
      return { visibility: DEMO_EMPLOYEE_VISIBILITY };
    }

    // Users
    if (path === '/users' || path.startsWith('/users?') || path === '/auth/users') {
      return { users: DEMO_USERS };
    }
    if (path.match(/\/users\/.*\/sessions/)) {
      return { sessions: DEMO_SESSIONS };
    }

    // Webhooks
    if (path === '/webhooks') {
      return { webhooks: DEMO_WEBHOOKS };
    }

    // Activity
    if (path.startsWith('/activity')) {
      return { activities: DEMO_ACTIVITIES, submissions: submissions };
    }

    // Career
    if (path.startsWith('/career')) {
      return DEMO_CAREER;
    }

    // Bulk Import
    if (path.startsWith('/import')) {
      return { templates: DEMO_IMPORT_TEMPLATES };
    }

    // Reports
    if (path.startsWith('/reports/hours')) {
      return DEMO_HOURS_REPORT;
    }
    if (path.startsWith('/reports/attendance')) {
      return DEMO_ATTENDANCE_REPORT;
    }
    if (path.startsWith('/reports/labor-cost')) {
      return DEMO_LABOR_COST_REPORT;
    }
    if (path.startsWith('/reports/coverage')) {
      return {
        summary: { coverageRate: 94, understaffedShifts: 4, overstaffedShifts: 2 },
        byLocation: DEMO_LOCATIONS.map(l => ({
          id: l.id, name: l.name, coverage: Math.round(Math.random() * 10 + 90),
        })),
      };
    }

    // Notifications
    if (path.startsWith('/notifications')) {
      return { notifications: DEMO_NOTIFICATIONS };
    }

    // Auth - read from localStorage to respect logged-in persona
    if (path === '/auth/me') {
      const stored = localStorage.getItem('uplift_user');
      return { user: stored ? JSON.parse(stored) : DEMO_USER };
    }

    // Performance endpoints
    if (path === '/performance/my-reviews' || path.startsWith('/performance/my-reviews?')) {
      return { reviews: DEMO_PERFORMANCE_REVIEWS };
    }
    if (path === '/performance/goals' || path.startsWith('/performance/goals?')) {
      return { goals: DEMO_GOALS };
    }
    if (path === '/performance/team-goals' || path.startsWith('/performance/team-goals?')) {
      return { goals: DEMO_GOALS };
    }
    if (path === '/performance/okrs' || path.startsWith('/performance/okrs?')) {
      return { okrs: DEMO_OKRS };
    }
    if (path === '/performance/one-on-ones' || path.startsWith('/performance/one-on-ones?')) {
      return { meetings: DEMO_ONE_ON_ONES };
    }
    if (path === '/performance/my-feedback' || path.startsWith('/performance/my-feedback?')) {
      return { feedback: DEMO_FEEDBACK };
    }
    if (path === '/performance/public-feedback' || path.startsWith('/performance/public-feedback?')) {
      return { feedback: DEMO_FEEDBACK };
    }
    if (path === '/performance/cycles' || path.startsWith('/performance/cycles?')) {
      return { cycles: DEMO_REVIEW_CYCLES };
    }
    if (path === '/performance/dashboard') {
      return { reviews_pending: 5, goals_on_track: 8, feedback_given: 12, one_on_ones_scheduled: 3 };
    }
    if (path === '/performance/team-reviews' || path.startsWith('/performance/team-reviews?')) {
      return { reviews: DEMO_PERFORMANCE_REVIEWS };
    }
    if (path === '/performance/development-plans' || path.startsWith('/performance/development-plans?')) {
      return { plans: [] };
    }
    if (path === '/performance/employees' || path.startsWith('/performance/employees?')) {
      return { employees: DEMO_EMPLOYEES };
    }
    if (path.startsWith('/performance/')) {
      return { success: true };
    }

    // Learning endpoints
    if (path === '/learning/courses' || path.startsWith('/learning/courses?')) {
      return { courses: DEMO_COURSES, pagination: { page: 1, limit: 20, total: DEMO_COURSES.length, totalPages: 1 } };
    }
    if (path === '/learning/my-courses') {
      return { enrollments: DEMO_ENROLLMENTS };
    }
    if (path === '/learning/enrollments' || path.startsWith('/learning/enrollments?')) {
      return { enrollments: DEMO_ENROLLMENTS, pagination: { page: 1, limit: 20, total: DEMO_ENROLLMENTS.length, totalPages: 1 } };
    }
    if (path === '/learning/certifications' || path.startsWith('/learning/certifications?')) {
      return { certifications: DEMO_CERTIFICATIONS };
    }
    if (path === '/learning/paths' || path.startsWith('/learning/paths?')) {
      return { paths: [] };
    }
    if (path === '/learning/team-compliance') {
      return { compliance: DEMO_EMPLOYEE_COMPLIANCE, items: DEMO_COMPLIANCE_ITEMS };
    }
    if (path === '/learning/dashboard') {
      return { courses_in_progress: 2, courses_completed: 4, certifications_active: 3, certifications_expiring: 1 };
    }
    if (path === '/learning/employees' || path.startsWith('/learning/employees?')) {
      return { employees: DEMO_EMPLOYEES };
    }
    if (path.startsWith('/learning/')) {
      return { success: true };
    }

    // Compliance endpoints
    if (path === '/compliance' || path.startsWith('/compliance?')) {
      return { items: DEMO_COMPLIANCE_ITEMS, employee_compliance: DEMO_EMPLOYEE_COMPLIANCE };
    }
    if (path === '/compliance/items' || path.startsWith('/compliance/items?')) {
      return { items: DEMO_COMPLIANCE_ITEMS };
    }
    if (path === '/compliance/employee' || path.startsWith('/compliance/employee?')) {
      return { compliance: DEMO_EMPLOYEE_COMPLIANCE };
    }
    if (path.startsWith('/compliance/')) {
      return { success: true };
    }

    // TrueLayer / Corporate Cards (Demo data)
    if (path.startsWith('/truelayer/connect')) {
      return { authUrl: 'https://auth.truelayer-sandbox.com/demo' };
    }
    if (path === '/truelayer/connections') {
      return { connections: [{ id: 'conn-1', provider: 'HSBC', status: 'active', connected_at: '2026-01-15' }] };
    }
    if (path === '/corporate-cards' || path.startsWith('/corporate-cards?')) {
      return { cards: DEMO_CORPORATE_CARDS, pagination: { page: 1, limit: 20, total: DEMO_CORPORATE_CARDS.length, totalPages: 1 } };
    }
    if (path.startsWith('/card-transactions')) {
      return { transactions: DEMO_CARD_TRANSACTIONS, pagination: { page: 1, limit: 50, total: DEMO_CARD_TRANSACTIONS.length, totalPages: 1 } };
    }
    if (path.startsWith('/expense-claims')) {
      return { claims: DEMO_CARD_CLAIMS, pagination: { page: 1, limit: 20, total: DEMO_CARD_CLAIMS.length, totalPages: 1 } };
    }
    if (path.startsWith('/expense-categories')) {
      return { categories: DEMO_EXPENSE_CATEGORIES, pagination: { page: 1, limit: 50, total: DEMO_EXPENSE_CATEGORIES.length, totalPages: 1 } };
    }
    if (path.startsWith('/payroll/expenses')) {
      const approvedClaims = DEMO_CARD_CLAIMS.filter(c => c.status === 'approved');
      return { claims: approvedClaims, exports: [], pagination: { page: 1, limit: 50, total: approvedClaims.length, totalPages: 1 } };
    }

    // Expenses page endpoints (general expense management)
    if (path === '/expenses/all' || path.startsWith('/expenses/all?')) {
      return { expenses: DEMO_EXPENSES, pagination: { page: 1, limit: 20, total: DEMO_EXPENSES.length, totalPages: 1 } };
    }
    if (path === '/expenses/my-expenses' || path.startsWith('/expenses/my-expenses?') || path.match(/^\/expenses\/my-expenses\/[^/]+$/)) {
      // Filter to only show current user's expenses in personal view
      const stored = localStorage.getItem('uplift_user');
      const user = stored ? JSON.parse(stored) : null;
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Sarah Mitchell';
      const myExpenses = DEMO_EXPENSES.filter(e => e.employee_name === userName);
      // If no matching expenses found, return first user's expenses as fallback
      const expenses = myExpenses.length > 0 ? myExpenses : DEMO_EXPENSES.filter(e => e.employee_name === 'Sarah Mitchell');
      return { expenses, pagination: { page: 1, limit: 20, total: expenses.length, totalPages: 1 } };
    }
    if (path === '/expenses/categories') {
      return { categories: DEMO_EXPENSE_CATEGORIES };
    }

    // Default empty response
    return {};
  }

  async handleResponse(response) {
    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      const error = new Error(data.error || data.message || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Convenience methods
  get(path, options) {
    return this.request('GET', path, null, options);
  }

  post(path, data, options) {
    return this.request('POST', path, data, options);
  }

  patch(path, data, options) {
    return this.request('PATCH', path, data, options);
  }

  put(path, data, options) {
    return this.request('PUT', path, data, options);
  }

  delete(path, options) {
    return this.request('DELETE', path, null, options);
  }

  async upload(path, formData) {
    if (DEMO_MODE) {
      return { success: true, message: 'Demo mode - upload simulated' };
    }
    const url = `${API_URL}${path}`;
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Add CSRF token if available (for cookie-based auth)
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      if (response.status === 401) {
        this.setToken(null);
        this.setRefreshToken(null);
        localStorage.removeItem('uplift_user');
        const error = new Error('Session expired');
        error.status = 401;
        throw error;
      }
      return this.handleResponse(response);
    } catch (error) {
      if (error.name !== 'TypeError') {
        console.error('API Error:', error);
      }
      throw error;
    }
  }
}

export const api = new ApiClient();

// ============================================================
// API ENDPOINTS
// ============================================================

const DEMO_PERSONAS = {
  'admin@demo.com': { ...DEMO_USER, id: 'demo-admin', email: 'admin@demo.com', firstName: 'Sarah', lastName: 'Chen', role: 'admin' },
  'manager@demo.com': { ...DEMO_USER, id: 'demo-manager', email: 'manager@demo.com', firstName: 'James', lastName: 'Williams', role: 'manager' },
  'worker@demo.com': { ...DEMO_USER, id: 'demo-worker', email: 'worker@demo.com', firstName: 'Maria', lastName: 'Santos', role: 'worker' },
};

export const authApi = {
  login: async (email, password) => {
    if (DEMO_MODE) {
      const persona = DEMO_PERSONAS[email] || DEMO_USER;
      const token = 'demo_token_' + Date.now();
      api.setToken(token);
      localStorage.setItem('uplift_user', JSON.stringify(persona));
      return { token, user: persona };
    }
    const result = await api.post('/auth/login', { email, password });
    // Backend returns { accessToken, refreshToken, user }
    if (result.accessToken) {
      api.setToken(result.accessToken);
      if (result.refreshToken) {
        api.setRefreshToken(result.refreshToken);
      }
      return { token: result.accessToken, user: result.user };
    }
    // Fallback for { token, user } format
    if (result.token) {
      api.setToken(result.token);
    }
    return result;
  },
  logout: () => {
    api.setToken(null);
    api.setRefreshToken(null);
    localStorage.removeItem('uplift_user');
    return Promise.resolve({ success: true });
  },
  me: async () => {
    if (DEMO_MODE) {
      const stored = localStorage.getItem('uplift_user');
      return { user: stored ? JSON.parse(stored) : DEMO_USER };
    }
    return api.get('/auth/me');
  },
  register: (data) => api.post('/auth/register', data),
  requestPasswordReset: (email) => api.post('/auth/password/reset-request', { email }),
  resetPassword: (token, password) => api.post('/auth/password/reset', { token, password }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/password/change', { currentPassword, newPassword }),
  inviteUser: (data) => api.post('/auth/users/invite', data),
  getUsers: async () => {
    if (DEMO_MODE) {
      return { users: DEMO_USERS };
    }
    return api.get('/auth/users');
  },
  updateProfile: (data) => api.patch('/users/me', data),
};

export const employeesApi = {
  list: async (params = {}) => {
    if (DEMO_MODE) {
      return { employees: DEMO_EMPLOYEES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/employees${query ? `?${query}` : ''}`);
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const emp = DEMO_EMPLOYEES.find(e => e.id === id);
      return emp ? { employee: emp } : { employee: DEMO_EMPLOYEES[0] };
    }
    return api.get(`/employees/${id}`);
  },
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.patch(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  addSkill: (employeeId, data) => api.post(`/employees/${employeeId}/skills`, data),
  verifySkill: (employeeId, skillId) => api.post(`/employees/${employeeId}/skills/${skillId}/verify`),
};

export const locationsApi = {
  list: async (params = {}) => {
    if (DEMO_MODE) {
      return { locations: DEMO_LOCATIONS };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/locations${query ? `?${query}` : ''}`);
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const loc = DEMO_LOCATIONS.find(l => l.id === id);
      return loc ? { location: loc } : { location: DEMO_LOCATIONS[0] };
    }
    return api.get(`/locations/${id}`);
  },
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.patch(`/locations/${id}`, data),
};

export const departmentsApi = {
  list: async () => {
    if (DEMO_MODE) {
      return { departments: DEMO_DEPARTMENTS };
    }
    return api.get('/departments');
  },
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
};

export const rolesApi = {
  // Job roles (Server, Bartender, etc.) - for scheduling/assignments
  list: async () => {
    if (DEMO_MODE) {
      return { roles: DEMO_ROLES };
    }
    return api.get('/roles');
  },
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
  get: (id) => api.get(`/roles/${id}`),
  getUsers: (id) => api.get(`/roles/${id}/users`),
  assignUser: (id, userId) => api.post(`/roles/${id}/assign`, { userId }),
  unassignUser: (id, userId) => api.post(`/roles/${id}/unassign`, { userId }),
};

export const skillsApi = {
  list: async () => {
    if (DEMO_MODE) {
      return { skills: DEMO_SKILLS };
    }
    return api.get('/skills');
  },
  create: (data) => api.post('/skills', data),
  getEmployeesForSkill: async (skillId) => {
    if (DEMO_MODE) {
      // Generate demo employee-skill assignments
      // Map skills to employees deterministically based on skill ID
      const skillIndex = DEMO_SKILLS.findIndex(s => s.id === skillId);
      const skill = DEMO_SKILLS[skillIndex];
      if (!skill) return { employees: [] };

      // Deterministically select employees for each skill based on employee_count
      const count = skill.employee_count || 0;
      const verifiedCount = skill.verified_count || 0;
      const selectedEmployees = DEMO_EMPLOYEES.slice(0, count).map((emp, idx) => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        avatar_url: emp.avatar_url || null,
        level: Math.floor(Math.random() * 3) + 1,
        verified: idx < verifiedCount,
        verified_at: idx < verifiedCount ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString() : null,
        verified_by_name: idx < verifiedCount ? 'Sarah' : null,
        verified_by_last: idx < verifiedCount ? 'Chen' : null,
        role: emp.role,
        department: emp.department,
      }));
      return { employees: selectedEmployees };
    }
    return api.get(`/skills/${skillId}/employees`);
  },
};

export const shiftsApi = {
  list: async (params) => {
    if (DEMO_MODE) {
      const shifts = generateDemoShifts(getWeekStart());
      return { shifts };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/shifts${query ? `?${query}` : ''}`);
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const shifts = generateDemoShifts(getWeekStart());
      const shift = shifts.find(s => s.id === id);
      return shift ? { shift } : { shift: shifts[0] };
    }
    return api.get(`/shifts/${id}`);
  },
  create: (data) => api.post('/shifts', data),
  createBulk: (shifts) => api.post('/shifts/bulk', { shifts }),
  update: (id, data) => api.patch(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  assignOpen: (id, employeeId) => api.post(`/shifts/${id}/assign`, { employeeId }),
  getSwaps: async (params = {}) => {
    if (DEMO_MODE) {
      return { swaps: DEMO_SHIFT_SWAPS };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/shifts/swaps${query ? `?${query}` : ''}`);
  },
  approveSwap: (id, notes) => api.post(`/shifts/swaps/${id}/approve`, { notes }),
  rejectSwap: (id, notes) => api.post(`/shifts/swaps/${id}/reject`, { notes }),
  getTemplates: async (params = {}) => {
    if (DEMO_MODE) {
      return { templates: DEMO_SHIFT_TEMPLATES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/shift-templates${query ? `?${query}` : ''}`);
  },
  createTemplate: (data) => api.post('/shift-templates', data),
  updateTemplate: (id, data) => api.put(`/shift-templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/shift-templates/${id}`),
  generateFromTemplate: (templateId, data) =>
    api.post(`/shift-templates/${templateId}/generate`, data),
  getPeriods: async (params = {}) => {
    if (DEMO_MODE) {
      return { periods: DEMO_SCHEDULE_PERIODS };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/schedule/periods${query ? `?${query}` : ''}`);
  },
  createPeriod: (data) => api.post('/schedule/periods', data),
  publishPeriod: (id) => api.post(`/schedule/periods/${id}/publish`),
};

export const timeApi = {
  getEntries: async (params = {}) => {
    if (DEMO_MODE) {
      return { entries: DEMO_TIME_ENTRIES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/time/entries${query ? `?${query}` : ''}`);
  },
  getPending: async (params = {}) => {
    if (DEMO_MODE) {
      const pending = DEMO_TIME_ENTRIES.filter(e => !e.approved).slice(0, 8);
      return { entries: pending };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/time/pending${query ? `?${query}` : ''}`);
  },
  // Get current clock-in status
  getStatus: () => api.get('/time/status'),
  approve: (id) => api.post(`/time/entries/${id}/approve`),
  reject: (id, reason) => api.post(`/time/entries/${id}/reject`, { reason }),
  bulkApprove: (entryIds) => api.post('/time/entries/bulk-approve', { entryIds }),
  adjust: (id, data) => api.patch(`/time/entries/${id}`, data),
  // Clock in/out - backend finds open entry automatically
  clockIn: (data) => api.post('/time/clock-in', data),
  clockOut: (data = {}) => api.post('/time/clock-out', data),
  // Breaks - backend finds open entry automatically
  startBreak: () => api.post('/time/break/start'),
  endBreak: () => api.post('/time/break/end'),
};

export const timeOffApi = {
  getPolicies: async () => {
    if (DEMO_MODE) {
      return { policies: DEMO_TIME_OFF_POLICIES };
    }
    return api.get('/time-off/policies');
  },
  createPolicy: (data) => api.post('/time-off/policies', data),
  getRequests: async (params = {}) => {
    if (DEMO_MODE) {
      return { requests: DEMO_TIME_OFF_REQUESTS };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/time-off/requests${query ? `?${query}` : ''}`);
  },
  approve: (id, notes) => api.post(`/time-off/requests/${id}/approve`, { notes }),
  reject: (id, notes) => api.post(`/time-off/requests/${id}/reject`, { notes }),
  getBalances: async (employeeId) => {
    if (DEMO_MODE) {
      return { balances: DEMO_TIME_OFF_BALANCES };
    }
    return api.get(`/time-off/balances?employeeId=${employeeId}`);
  },
};

export const dashboardApi = {
  get: async (params = {}) => {
    if (DEMO_MODE) {
      return DEMO_DASHBOARD;
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/dashboard${query ? `?${query}` : ''}`);
  },
};

export const reportsApi = {
  hours: async (params) => {
    if (DEMO_MODE) {
      // Format data as array of rows for the table
      const data = DEMO_EMPLOYEES.map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        location_name: e.location,
        total_hours: 140 + Math.floor(Math.random() * 20),
        regular_hours: 140,
        overtime_hours: Math.floor(Math.random() * 8),
        labor_cost: (140 * 12.5) + (Math.floor(Math.random() * 8) * 18.75),
      }));
      return { data, totals: DEMO_HOURS_REPORT.summary };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/hours?${query}`);
  },
  attendance: async (params) => {
    if (DEMO_MODE) {
      const data = DEMO_EMPLOYEES.map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        location_name: e.location,
        total_shifts: 20,
        on_time: 18,
        late: 2,
        no_show: 0,
        punctuality_rate: 90,
      }));
      return { data, totals: DEMO_ATTENDANCE_REPORT.summary };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/attendance?${query}`);
  },
  laborCost: async (params) => {
    if (DEMO_MODE) {
      const data = DEMO_LOCATIONS.map(l => ({
        id: l.id,
        location_name: l.name,
        hours: 200 + Math.floor(Math.random() * 100),
        cost: 2500 + Math.floor(Math.random() * 1500),
        budget: 4000,
        variance: -500 + Math.floor(Math.random() * 1000),
      }));
      return { data, totals: DEMO_LABOR_COST_REPORT.summary };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/labor-cost?${query}`);
  },
  coverage: async (params) => {
    if (DEMO_MODE) {
      const data = DEMO_LOCATIONS.map(l => ({
        id: l.id,
        location_name: l.name,
        total_shifts: 20 + Math.floor(Math.random() * 10),
        filled_shifts: 18 + Math.floor(Math.random() * 8),
        open_shifts: 2 + Math.floor(Math.random() * 3),
        coverage_rate: 85 + Math.floor(Math.random() * 15),
      }));
      return { data, totals: { coverageRate: 94, understaffedShifts: 4, overstaffedShifts: 2 } };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/coverage?${query}`);
  },
  exportTimesheets: (params) => {
    const query = new URLSearchParams(params).toString();
    return `${API_URL}/exports/timesheets?${query}`;
  },
  exportEmployees: (params) => {
    const query = new URLSearchParams(params).toString();
    return `${API_URL}/exports/employees?${query}`;
  },
};

export const organizationApi = {
  get: async () => {
    if (DEMO_MODE) {
      return { organization: DEMO_ORGANIZATION };
    }
    return api.get('/organization');
  },
  update: (data) => api.patch('/organization', data),
};

export const brandingApi = {
  get: async () => {
    if (DEMO_MODE) {
      return { branding: DEMO_BRANDING };
    }
    return api.get('/organization/branding');
  },
  update: (data) => api.put('/organization/branding', data),
  uploadLogo: (file, type) => {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('type', type);
    return api.upload('/organization/branding/logo', formData);
  },
  deleteLogo: (type) => api.delete(`/organization/branding/logo/${type}`),
};

export const notificationsApi = {
  list: async (unreadOnly = false) => {
    if (DEMO_MODE) {
      return { notifications: DEMO_NOTIFICATIONS };
    }
    return api.get(`/notifications?unreadOnly=${unreadOnly}`);
  },
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const jobsApi = {
  list: async (params = {}) => {
    if (DEMO_MODE) {
      return { jobs: DEMO_OPPORTUNITIES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/jobs${query ? `?${query}` : ''}`);
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const job = DEMO_OPPORTUNITIES.find(j => j.id === id);
      return job ? { job } : { job: DEMO_OPPORTUNITIES[0] };
    }
    return api.get(`/jobs/${id}`);
  },
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  apply: (id, data) => api.post(`/jobs/${id}/apply`, data),
};

export const integrationsApi = {
  list: async () => {
    if (DEMO_MODE) {
      return { integrations: DEMO_INTEGRATIONS };
    }
    return api.get('/integrations');
  },
  get: async (id) => {
    if (DEMO_MODE) {
      const integration = DEMO_INTEGRATIONS.find(i => i.id === id);
      return integration ? { integration } : { integration: DEMO_INTEGRATIONS[0] };
    }
    return api.get(`/integrations/${id}`);
  },
  create: (data) => api.post('/integrations', data),
  update: (id, data) => api.patch(`/integrations/${id}`, data),
  delete: (id) => api.delete(`/integrations/${id}`),
  test: (id) => api.post(`/integrations/${id}/test`),
  sync: (id) => api.post(`/integrations/${id}/sync`),
  getApiKeys: async () => {
    if (DEMO_MODE) {
      return { apiKeys: DEMO_API_KEYS };
    }
    return api.get('/integrations/api-keys');
  },
  createApiKey: (data) => api.post('/integrations/api-keys', data),
  revokeApiKey: (id) => api.delete(`/integrations/api-keys/${id}`),

  // Custom Endpoints (API Factory)
  getCustomEndpoints: async (params = {}) => {
    if (DEMO_MODE) {
      return { endpoints: DEMO_CUSTOM_INTEGRATIONS, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/integrations/custom-endpoints${query ? `?${query}` : ''}`);
  },
  getCustomEndpoint: async (id) => {
    if (DEMO_MODE) {
      const endpoint = DEMO_CUSTOM_INTEGRATIONS.find(e => e.id === id);
      return endpoint ? { endpoint } : { endpoint: null };
    }
    return api.get(`/integrations/custom-endpoints/${id}`);
  },
  createCustomEndpoint: (data) => api.post('/integrations/custom-endpoints', data),
  updateCustomEndpoint: (id, data) => api.put(`/integrations/custom-endpoints/${id}`, data),
  deleteCustomEndpoint: (id) => api.delete(`/integrations/custom-endpoints/${id}`),
  testCustomEndpoint: (id, overrides = {}) => api.post(`/integrations/custom-endpoints/${id}/test`, overrides),
  executeCustomEndpoint: (id, payload = {}) => api.post(`/integrations/custom-endpoints/${id}/execute`, { payload }),
  getCustomEndpointLogs: async (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/integrations/custom-endpoints/${id}/logs${query ? `?${query}` : ''}`);
  },
  getExecution: (id) => api.get(`/integrations/executions/${id}`),

  // Field Mappings
  getFieldMappings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/integrations/field-mappings${query ? `?${query}` : ''}`);
  },
  saveFieldMappings: (data) => api.post('/integrations/field-mappings', data),
  deleteFieldMappings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.delete(`/integrations/field-mappings${query ? `?${query}` : ''}`);
  },

  // Sync Logs (Activity Log)
  getSyncLogs: async (params = {}) => {
    if (DEMO_MODE) {
      return { logs: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/integrations/sync-logs${query ? `?${query}` : ''}`);
  },
};

// Settings API (for Settings page)
export const settingsApi = {
  getNavigation: async () => {
    if (DEMO_MODE) {
      return { navigation: DEMO_NAVIGATION };
    }
    return api.get('/settings/navigation');
  },
  updateNavigation: (data) => api.put('/settings/navigation', data),
  getEmployeeVisibility: async () => {
    if (DEMO_MODE) {
      return { visibility: DEMO_EMPLOYEE_VISIBILITY };
    }
    return api.get('/settings/employee-visibility');
  },
  updateEmployeeVisibility: (data) => api.put('/settings/employee-visibility', data),
  getUsers: async () => {
    if (DEMO_MODE) {
      return { users: DEMO_USERS };
    }
    return api.get('/users');
  },
  getSessions: async () => {
    if (DEMO_MODE) {
      return { sessions: DEMO_SESSIONS };
    }
    return api.get('/users/me/sessions');
  },
  getWebhooks: async () => {
    if (DEMO_MODE) {
      return { webhooks: DEMO_WEBHOOKS };
    }
    return api.get('/webhooks');
  },
  createWebhook: (data) => api.post('/webhooks', data),
  deleteWebhook: (id) => api.delete(`/webhooks/${id}`),
};

// Activity API
export const activityApi = {
  list: async (params = {}) => {
    if (DEMO_MODE) {
      return { activities: DEMO_ACTIVITIES };
    }
    const query = new URLSearchParams(params).toString();
    return api.get(`/activity${query ? `?${query}` : ''}`);
  },
};

// Career API
export const careerApi = {
  getPaths: async () => {
    if (DEMO_MODE) {
      return DEMO_CAREER;
    }
    return api.get('/career/paths');
  },
  getInsights: async () => {
    if (DEMO_MODE) {
      return { insights: DEMO_CAREER.insights };
    }
    return api.get('/career/insights');
  },
};

// Bulk Import API
export const bulkImportApi = {
  getTemplates: async () => {
    if (DEMO_MODE) {
      return { templates: DEMO_IMPORT_TEMPLATES };
    }
    return api.get('/import/templates');
  },
  upload: (formData) => api.upload('/import/upload', formData),
};

// Learning API
export const learningApi = {
  // Courses
  getCourses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/learning/courses${query ? `?${query}` : ''}`);
  },
  getCourse: (id) => api.get(`/learning/courses/${id}`),
  createCourse: (data) => api.post('/learning/courses', data),
  updateCourse: (id, data) => api.patch(`/learning/courses/${id}`, data),
  addLesson: (courseId, data) => api.post(`/learning/courses/${courseId}/lessons`, data),

  // My Learning (current user)
  getMyCourses: () => api.get('/learning/my-courses'),
  enrollSelf: (courseId, dueDate) => api.post('/learning/enroll', { course_id: courseId, due_date: dueDate }),
  completeLesson: (courseId, lessonId, data) =>
    api.post(`/learning/courses/${courseId}/lessons/${lessonId}/complete`, data),

  // Enrollments (manager/admin)
  getEnrollments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/learning/enrollments${query ? `?${query}` : ''}`);
  },
  enrollEmployee: (courseId, userId, dueDate) =>
    api.post('/learning/enroll', { course_id: courseId, user_id: userId, due_date: dueDate }),
  sendReminder: (enrollmentId) => api.post(`/learning/enrollments/${enrollmentId}/send-reminder`),
  sendRemindersBulk: () => api.post('/learning/enrollments/send-reminders-bulk'),

  // Certifications
  getCertifications: () => api.get('/learning/certifications'),
  getExpiringCertifications: (days = 30) => api.get(`/learning/certifications/expiring?days=${days}`),
  addCertification: (data) => api.post('/learning/certifications', data),
  downloadCertificate: (certId) => `/api/learning/certifications/${certId}/pdf`,

  // Learning Paths
  getPaths: () => api.get('/learning/paths'),
  createPath: (data) => api.post('/learning/paths', data),

  // Compliance & Dashboard
  getTeamCompliance: () => api.get('/learning/team-compliance'),
  getDashboard: () => api.get('/learning/dashboard'),

  // Employees for assignment
  getEmployees: () => api.get('/learning/employees'),
};

// Performance API
export const performanceApi = {
  // Reviews
  getMyReviews: () => api.get('/performance/my-reviews'),
  getReview: (id) => api.get(`/performance/reviews/${id}`),
  createReviewCycle: (data) => api.post('/performance/reviews', data),
  updateReview: (id, data) => api.patch(`/performance/reviews/${id}`, data),
  getTeamReviews: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/performance/team-reviews${query ? `?${query}` : ''}`);
  },

  // Review Cycles
  getCycles: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/performance/cycles${query ? `?${query}` : ''}`);
  },
  getCycle: (id) => api.get(`/performance/cycles/${id}`),
  createCycle: (data) => api.post('/performance/cycles', data),
  updateCycle: (id, data) => api.patch(`/performance/cycles/${id}`, data),
  updateCycleParticipant: (cycleId, participantId, data) =>
    api.patch(`/performance/cycles/${cycleId}/participants/${participantId}`, data),

  // Goals
  getGoals: () => api.get('/performance/goals'),
  createGoal: (data) => api.post('/performance/goals', data),
  updateGoal: (id, data) => api.patch(`/performance/goals/${id}`, data),
  addGoalUpdate: (goalId, data) => api.post(`/performance/goals/${goalId}/updates`, data),
  getTeamGoals: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/performance/team-goals${query ? `?${query}` : ''}`);
  },

  // OKRs
  getOkrs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/performance/okrs${query ? `?${query}` : ''}`);
  },
  createOkr: (data) => api.post('/performance/okrs', data),
  updateOkr: (id, data) => api.patch(`/performance/okrs/${id}`, data),
  updateKeyResult: (okrId, krId, data) => api.patch(`/performance/okrs/${okrId}/key-results/${krId}`, data),

  // 1-on-1 Meetings
  getOneOnOnes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/performance/one-on-ones${query ? `?${query}` : ''}`);
  },
  getOneOnOne: (id) => api.get(`/performance/one-on-ones/${id}`),
  createOneOnOne: (data) => api.post('/performance/one-on-ones', data),
  updateOneOnOne: (id, data) => api.patch(`/performance/one-on-ones/${id}`, data),
  addOneOnOneAction: (meetingId, data) => api.post(`/performance/one-on-ones/${meetingId}/actions`, data),
  updateOneOnOneAction: (meetingId, actionId, data) =>
    api.patch(`/performance/one-on-ones/${meetingId}/actions/${actionId}`, data),

  // Development Plans
  getDevelopmentPlans: () => api.get('/performance/development-plans'),
  createDevelopmentPlan: (data) => api.post('/performance/development-plans', data),
  updateDevelopmentAction: (planId, actionId, data) =>
    api.patch(`/performance/development-plans/${planId}/actions/${actionId}`, data),

  // Feedback
  giveFeedback: (data) => api.post('/performance/feedback', data),
  getMyFeedback: () => api.get('/performance/my-feedback'),
  getGivenFeedback: () => api.get('/performance/given-feedback'),
  getPublicFeedback: (limit = 50) => api.get(`/performance/public-feedback?limit=${limit}`),
  reactToFeedback: (feedbackId, reaction) => api.post(`/performance/feedback/${feedbackId}/react`, { reaction }),

  // Employees & Dashboard
  getEmployees: () => api.get('/performance/employees'),
  getDashboard: () => api.get('/performance/dashboard'),
};

// Payslips API
export const payslipsApi = {
  getMyPayslips: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/payslips/my-payslips${query ? `?${query}` : ''}`);
  },
  getPayslip: (id) => api.get(`/payslips/my-payslips/${id}`),
  getMyYtd: (taxYear) => api.get(`/payslips/my-ytd${taxYear ? `?taxYear=${taxYear}` : ''}`),
  getMyYears: () => api.get('/payslips/my-years'),
  // Admin endpoints
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/payslips${query ? `?${query}` : ''}`);
  },
};

// ============================================================
// CORPORATE CARDS & EXPENSES API
// HSBC Integration via TrueLayer Open Banking
// ============================================================

// TrueLayer Connections API (extends integrationsApi)
export const trueLayerApi = {
  // Get TrueLayer OAuth connect URL
  getConnectUrl: (redirectUri) => {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
    return api.get(`/integrations/truelayer/connect${params}`);
  },
  // List active TrueLayer connections
  getConnections: () => api.get('/integrations/truelayer/connections'),
  // Sync transactions from TrueLayer
  syncTransactions: (connectionId) => api.post('/integrations/truelayer/sync', { connectionId }),
  // Disconnect TrueLayer connection
  disconnect: (connectionId) => api.delete(`/integrations/truelayer/connections/${connectionId}`),
};

// Corporate Cards API
export const corporateCardsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/corporate-cards${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/corporate-cards/${id}`),
  create: (data) => api.post('/corporate-cards', data),
  update: (id, data) => api.patch(`/corporate-cards/${id}`, data),
  delete: (id) => api.delete(`/corporate-cards/${id}`),
  getTransactions: (cardId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/corporate-cards/${cardId}/transactions${query ? `?${query}` : ''}`);
  },
};

// Card Transactions API
export const cardTransactionsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/card-transactions${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/card-transactions/${id}`),
  update: (id, data) => api.patch(`/card-transactions/${id}`, data),
  uploadReceipt: (id, formData) => api.upload(`/card-transactions/${id}/receipt`, formData),
  // Bulk operations
  bulkUpdate: (transactionIds, data) => api.patch('/card-transactions/bulk', { transactionIds, ...data }),
};

// Expenses API (for Expenses page - general expense management)
export const expensesApi = {
  // Get all expenses (admin/manager) - /api/expenses/all
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/expenses/all${query ? `?${query}` : ''}`);
  },
  // Get my expenses only (for personal view) - /api/expenses/my-expenses
  getMyExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/expenses/my-expenses${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/expenses/my-expenses/${id}`),
  create: (data) => api.post('/expenses/claims', data),
  update: (id, data) => api.patch(`/expenses/claims/${id}`, data),
  submit: (id) => api.post(`/expenses/claims/${id}/submit`),
  // Get categories
  getCategories: () => api.get('/expenses/categories'),
};

// Expense Claims API (for Corporate Cards / TrueLayer)
export const expenseClaimsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/expense-claims${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/expense-claims/${id}`),
  create: (data) => api.post('/expense-claims', data),
  // Submit claim with selected transactions
  submit: (data) => api.post('/expense-claims', data),
  // Review claim (approve/reject)
  review: (id, data) => api.post(`/expense-claims/${id}/review`, data),
  // Get claims ready for payroll export
  getForPayroll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/payroll/expenses${query ? `?${query}` : ''}`);
  },
};

// Payroll Expenses API (for finance team)
export const payrollExpensesApi = {
  // Get approved claims ready for payroll
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/payroll/expenses${query ? `?${query}` : ''}`);
  },
  // Export claims to payroll (marks as paid)
  export: (data) => api.post('/payroll/expenses/export', data),
  // Get export history
  getExports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/payroll/expenses/exports${query ? `?${query}` : ''}`);
  },
  // Get specific export details
  getExport: (id) => api.get(`/payroll/expenses/exports/${id}`),
  // Download export file
  downloadExport: (id) => `${API_URL}/payroll/expenses/exports/${id}/download`,
};

// Expense Categories API
export const expenseCategoriesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/expense-categories${query ? `?${query}` : ''}`);
  },
  get: (id) => api.get(`/expense-categories/${id}`),
  create: (data) => api.post('/expense-categories', data),
  update: (id, data) => api.patch(`/expense-categories/${id}`, data),
  delete: (id) => api.delete(`/expense-categories/${id}`),
  // Category mappings (for auto-categorization)
  getMappings: (categoryId) => api.get(`/expense-categories/${categoryId}/mappings`),
  createMapping: (categoryId, data) => api.post(`/expense-categories/${categoryId}/mappings`, data),
  deleteMapping: (categoryId, mappingId) => api.delete(`/expense-categories/${categoryId}/mappings/${mappingId}`),
};

export default api;
