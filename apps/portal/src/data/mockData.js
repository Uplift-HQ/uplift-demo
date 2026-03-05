// ============================================================
// MOCK DATA FOR DEMO - Grand Metropolitan Hotel Group
// Field names match what pages expect
// ============================================================

// Locations - 9 hotel properties across key cities
export const locations = [
  { id: 'l1', name: 'London Mayfair', address: '45 Park Lane, Mayfair, London W1K 1PN', address_line1: '45 Park Lane', city: 'London', postcode: 'W1K 1PN', status: 'active', employee_count: 45, shiftsThisWeek: 120, manager: 'James Wilson' },
  { id: 'l2', name: 'Paris Champs-Élysées', address: '25 Avenue des Champs-Élysées, 75008 Paris', address_line1: '25 Avenue des Champs-Élysées', city: 'Paris', postcode: '75008', status: 'active', employee_count: 38, shiftsThisWeek: 95, manager: 'Sophie Laurent' },
  { id: 'l3', name: 'Dubai Marina', address: 'Marina Walk, Dubai Marina, Dubai', address_line1: 'Marina Walk', city: 'Dubai', postcode: 'UAE', status: 'active', employee_count: 32, shiftsThisWeek: 88, manager: 'Ahmed Al-Hassan' },
  { id: 'l4', name: 'New York Times Square', address: '234 West 42nd Street, New York, NY 10036', address_line1: '234 West 42nd Street', city: 'New York', postcode: '10036', status: 'active', employee_count: 42, shiftsThisWeek: 110, manager: 'Michael Chen' },
  { id: 'l5', name: 'Tokyo Ginza', address: '1-5-3 Ginza, Chuo City, Tokyo 104-0061', address_line1: '1-5-3 Ginza', city: 'Tokyo', postcode: '104-0061', status: 'active', employee_count: 28, shiftsThisWeek: 75, manager: 'Yuki Tanaka' }
];

// Default visibility settings for employees
const defaultVisibility = { team_schedules: true, internal_jobs: true, career_paths: true, analytics: false, peer_recognition: true };

// Employees (16 staff) - hospitality roles
export const employees = [
  { id: 'e1', first_name: 'Marc', last_name: 'Hunt', name: 'Marc Hunt', role: 'Server', department: 'Front of House', location: 'London Mayfair', location_id: 'l1', status: 'active', momentum_score: 82, start_date: '2025-05-15', email: 'marc.hunt@grandmetropolitan.com', phone: '+44 7700 900123', visibility: { ...defaultVisibility } },
  { id: 'e2', first_name: 'Jessica', last_name: 'Bano', name: 'Jessica Bano', role: 'Bartender', department: 'Bar & Beverage', location: 'London Mayfair', location_id: 'l1', status: 'active', momentum_score: 91, start_date: '2024-11-01', email: 'jessica.bano@grandmetropolitan.com', phone: '+44 7700 900124', visibility: { ...defaultVisibility } },
  { id: 'e3', first_name: 'Thomas', last_name: 'Cane', name: 'Thomas Cane', role: 'Line Cook', department: 'Kitchen', location: 'London Mayfair', location_id: 'l1', status: 'active', momentum_score: 76, start_date: '2025-02-20', email: 'thomas.cane@grandmetropolitan.com', phone: '+44 7700 900125', visibility: { ...defaultVisibility, analytics: true } },
  { id: 'e4', first_name: 'Anna', last_name: 'Martinez', name: 'Anna Martinez', role: 'Hostess', department: 'Front of House', location: 'Paris Champs-Élysées', location_id: 'l2', status: 'active', momentum_score: 88, start_date: '2024-08-10', email: 'anna.martinez@grandmetropolitan.com', phone: '+33 6 12 34 56 78', visibility: { ...defaultVisibility } },
  { id: 'e5', first_name: 'Sofia', last_name: 'Chen', name: 'Sofia Chen', role: 'Front Desk Agent', department: 'Front of House', location: 'London Mayfair', location_id: 'l1', status: 'active', momentum_score: 79, start_date: '2025-01-05', email: 'sofia.chen@grandmetropolitan.com', phone: '+44 7700 900127', visibility: { ...defaultVisibility } },
  { id: 'e6', first_name: 'James', last_name: 'Williams', name: 'James Williams', role: 'Restaurant Manager', department: 'Front of House', location: 'Paris Champs-Élysées', location_id: 'l2', status: 'active', momentum_score: 94, start_date: '2023-06-15', email: 'james.williams@grandmetropolitan.com', phone: '+33 6 23 45 67 89', visibility: { ...defaultVisibility, analytics: true } },
  { id: 'e7', first_name: 'Priya', last_name: 'Patel', name: 'Priya Patel', role: 'Sous Chef', department: 'Kitchen', location: 'Dubai Marina', location_id: 'l3', status: 'active', momentum_score: 85, start_date: '2024-03-01', email: 'priya.patel@grandmetropolitan.com', phone: '+971 50 123 4567', visibility: { ...defaultVisibility, analytics: true } },
  { id: 'e8', first_name: 'Tom', last_name: 'Richards', name: 'Tom Richards', role: 'F&B Manager', department: 'Front of House', location: 'New York Times Square', location_id: 'l4', status: 'active', momentum_score: 90, start_date: '2023-09-20', email: 'tom.richards@grandmetropolitan.com', phone: '+1 212 555 0198', visibility: { ...defaultVisibility, analytics: true } },
  { id: 'e9', first_name: 'Fiona', last_name: 'Campbell', name: 'Fiona Campbell', role: 'General Manager', department: 'Management', location: 'Tokyo Ginza', location_id: 'l5', status: 'active', momentum_score: 96, start_date: '2022-11-01', email: 'fiona.campbell@grandmetropolitan.com', phone: '+81 3 1234 5678', visibility: { ...defaultVisibility, analytics: true } },
  { id: 'e10', first_name: 'Liam', last_name: 'O\'Brien', name: 'Liam O\'Brien', role: 'Concierge', department: 'Front of House', location: 'New York Times Square', location_id: 'l4', status: 'active', momentum_score: 71, start_date: '2025-06-01', email: 'liam.obrien@grandmetropolitan.com', phone: '+1 212 555 0199', visibility: { ...defaultVisibility } },
  { id: 'e11', first_name: 'Emma', last_name: 'Watson', name: 'Emma Watson', role: 'Spa Manager', department: 'Spa & Wellness', location: 'Tokyo Ginza', location_id: 'l5', status: 'active', momentum_score: 83, start_date: '2024-12-15', email: 'emma.watson@grandmetropolitan.com', phone: '+81 3 2345 6789', visibility: { ...defaultVisibility } },
  { id: 'e12', first_name: 'David', last_name: 'Kim', name: 'David Kim', role: 'Room Attendant', department: 'Housekeeping', location: 'Paris Champs-Élysées', location_id: 'l2', status: 'active', momentum_score: 77, start_date: '2025-03-10', email: 'david.kim@grandmetropolitan.com', phone: '+33 6 34 56 78 90', visibility: { ...defaultVisibility } },
  { id: 'e13', first_name: 'Rachel', last_name: 'Green', name: 'Rachel Green', role: 'Events Coordinator', department: 'Events & Banqueting', location: 'Dubai Marina', location_id: 'l3', status: 'on_leave', momentum_score: 80, start_date: '2024-07-22', email: 'rachel.green@grandmetropolitan.com', phone: '+971 50 234 5678', visibility: { ...defaultVisibility } },
  { id: 'e14', first_name: 'Ahmed', last_name: 'Hassan', name: 'Ahmed Hassan', role: 'Kitchen Porter', department: 'Kitchen', location: 'London Mayfair', location_id: 'l1', status: 'active', momentum_score: 74, start_date: '2025-04-05', email: 'ahmed.hassan@grandmetropolitan.com', phone: '+44 7700 900136', visibility: { ...defaultVisibility } },
  { id: 'e15', first_name: 'Lucy', last_name: 'Taylor', name: 'Lucy Taylor', role: 'HR Coordinator', department: 'HR & Admin', location: 'Paris Champs-Élysées', location_id: 'l2', status: 'active', momentum_score: 86, start_date: '2024-10-30', email: 'lucy.taylor@grandmetropolitan.com', phone: '+33 6 45 67 89 01', visibility: { ...defaultVisibility } },
  { id: 'e16', first_name: 'Maria', last_name: 'Santos', name: 'Maria Santos', role: 'Front Desk Manager', department: 'Front of House', location: 'London Mayfair', location_id: 'l1', status: 'active', momentum_score: 78, start_date: '2024-09-15', email: 'maria.santos@grandmetropolitan.com', phone: '+44 7700 900138', visibility: { ...defaultVisibility } }
];

// Skills - hospitality certifications and operational skills
export const skills = [
  { id: 'sk1', name: 'Food Safety Level 2', category: 'Compliance', employee_count: 45, verified_count: 42, mandatory: true },
  { id: 'sk2', name: 'WSET Level 2 Wine', category: 'Specialist', employee_count: 18, verified_count: 16, mandatory: false },
  { id: 'sk3', name: 'Barista Certification', category: 'Operations', employee_count: 22, verified_count: 20, mandatory: false },
  { id: 'sk4', name: 'Silver Service', category: 'Operations', employee_count: 35, verified_count: 32, mandatory: false },
  { id: 'sk5', name: 'Opera PMS', category: 'Technology', employee_count: 28, verified_count: 25, mandatory: true },
  { id: 'sk6', name: 'First Aid', category: 'Compliance', employee_count: 30, verified_count: 28, mandatory: true },
  { id: 'sk7', name: 'Fire Safety', category: 'Compliance', employee_count: 48, verified_count: 46, mandatory: true },
  { id: 'sk8', name: 'Mixology', category: 'Specialist', employee_count: 15, verified_count: 14, mandatory: false },
  { id: 'sk9', name: 'Revenue Management', category: 'Management', employee_count: 8, verified_count: 7, mandatory: false },
  { id: 'sk10', name: 'Guest Relations', category: 'Core', employee_count: 42, verified_count: 40, mandatory: true }
];

// Rewards / Perks
export const rewards = {
  points: 2450,
  level: 'Diamond',
  levelNumber: 12,
  totalSaved: 848,
  perks: [
    { id: 'r1', name: '20% off Nando\'s', category: 'Dining', provider: 'Nando\'s', discount: '20%', description: 'Valid at all UK locations', pointsCost: 0, type: 'perk' },
    { id: 'r2', name: 'Free coffee at Costa', category: 'Dining', provider: 'Costa Coffee', discount: '100%', description: 'One free drink per week', pointsCost: 0, type: 'perk' },
    { id: 'r3', name: '15% off Pizza Express', category: 'Dining', provider: 'Pizza Express', discount: '15%', description: 'Dine-in and takeaway', pointsCost: 0, type: 'perk' },
    { id: 'r4', name: '10% off ASOS', category: 'Shopping', provider: 'ASOS', discount: '10%', description: 'Full price items only', pointsCost: 0, type: 'perk' },
    { id: 'r5', name: '£5 off Boots', category: 'Shopping', provider: 'Boots', discount: '£5', description: 'When you spend £20+', pointsCost: 0, type: 'perk' },
    { id: 'r6', name: '2-for-1 Odeon cinema', category: 'Entertainment', provider: 'Odeon', discount: '50%', description: 'Any standard screening', pointsCost: 0, type: 'perk' },
    { id: 'r7', name: '30% off PureGym', category: 'Wellness', provider: 'PureGym', discount: '30%', description: 'Monthly membership', pointsCost: 0, type: 'perk' },
    { id: 'r8', name: 'Free month Spotify Premium', category: 'Entertainment', provider: 'Spotify', discount: '100%', description: 'New subscribers', pointsCost: 200, type: 'reward' },
    { id: 'r9', name: '£10 Amazon voucher', category: 'Shopping', provider: 'Amazon', discount: '£10', description: 'Emailed within 24hrs', pointsCost: 500, type: 'reward' },
    { id: 'r10', name: 'Extra day off', category: 'Wellness', provider: 'Grand Metropolitan', discount: '1 day', description: 'Use within 3 months', pointsCost: 1000, type: 'reward' }
  ]
};

// Time Off
export const timeOff = {
  balances: { annual: { used: 8, total: 25 }, sick: { used: 1, total: 10 }, personal: { used: 2, total: 5 } },
  requests: [
    { id: 'to1', employee_id: 'e1', employee_name: 'Marc Hunt', type: 'Annual Leave', start_date: '2026-02-10', end_date: '2026-02-14', days: 5, status: 'pending', reason: 'Family holiday' },
    { id: 'to2', employee_id: 'e2', employee_name: 'Jessica Bano', type: 'Personal', start_date: '2026-01-20', end_date: '2026-01-20', days: 1, status: 'approved', reason: 'Appointment' },
    { id: 'to3', employee_id: 'e3', employee_name: 'Thomas Cane', type: 'Sick Leave', start_date: '2026-01-06', end_date: '2026-01-07', days: 2, status: 'approved', reason: 'Flu' },
    { id: 'to4', employee_id: 'e4', employee_name: 'Anna Martinez', type: 'Annual Leave', start_date: '2026-03-01', end_date: '2026-03-05', days: 5, status: 'pending', reason: 'Visiting family in Spain' },
    { id: 'to5', employee_id: 'e10', employee_name: 'Liam O\'Brien', type: 'Personal', start_date: '2026-01-22', end_date: '2026-01-22', days: 1, status: 'pending', reason: 'Moving house' }
  ]
};

// Activity (dashboard feed)
export const activity = [
  { id: 'act1', type: 'clock_in', user: 'Marc Hunt', action: 'clocked in', location: 'London Mayfair', time: '5 min ago' },
  { id: 'act2', type: 'clock_in', user: 'Jessica Bano', action: 'clocked in', location: 'London Mayfair', time: '15 min ago' },
  { id: 'act3', type: 'shift_swap', user: 'Thomas Cane', action: 'requested shift swap', message: 'Fri 5-11pm → Sat 11-7pm', time: '30 min ago' },
  { id: 'act4', type: 'skill_verified', user: 'Anna Martinez', action: 'completed skill verification', message: 'Food Safety Level 2', time: '1 hr ago' },
  { id: 'act5', type: 'time_off', user: 'Marc Hunt', action: 'submitted time off request', message: 'Feb 10-14 (Annual Leave)', time: '2 hr ago' },
  { id: 'act6', type: 'schedule_published', user: 'Sarah Chen', action: 'published schedule', message: 'Week of Jan 12-18', time: '4 hr ago' },
  { id: 'act7', type: 'employee_added', user: 'Admin', target: 'Ahmed Hassan', message: 'Kitchen Porter - London Mayfair', time: '1 day ago' },
  { id: 'act8', type: 'employee_promoted', user: 'Admin', target: 'James Williams', message: 'Promoted to Restaurant Manager', time: '2 days ago' }
];

// Submissions (for Activity review page)
export const submissions = [
  { id: 'sub1', type: 'task_completion', status: 'pending', employee_id: 'e1', employee_name: 'Marc Hunt', title: 'Complete shift checklist', description: 'Dining room setup completed', submitted_at: new Date(Date.now() - 1800000).toISOString(), location: 'London Mayfair' },
  { id: 'sub2', type: 'proof_upload', status: 'pending', employee_id: 'e2', employee_name: 'Jessica Bano', title: 'WSET Certificate', description: 'Uploaded WSET Level 2 Wine certificate', submitted_at: new Date(Date.now() - 3600000).toISOString(), location: 'London Mayfair', attachment: 'certificate.pdf' },
  { id: 'sub3', type: 'form_submission', status: 'pending', employee_id: 'e3', employee_name: 'Thomas Cane', title: 'Incident Report', description: 'Minor slip reported in kitchen', submitted_at: new Date(Date.now() - 5400000).toISOString(), location: 'London Mayfair' },
  { id: 'sub4', type: 'task_completion', status: 'pending', employee_id: 'e4', employee_name: 'Anna Martinez', title: 'Complete shift handover', description: 'End of shift duties completed', submitted_at: new Date(Date.now() - 7200000).toISOString(), location: 'Paris Champs-Élysées' },
  { id: 'sub5', type: 'proof_upload', status: 'pending', employee_id: 'e5', employee_name: 'Sofia Chen', title: 'Fire Safety Training Certificate', description: 'Completed fire safety training', submitted_at: new Date(Date.now() - 10800000).toISOString(), location: 'London Mayfair', attachment: 'fire_cert.pdf' },
  { id: 'sub6', type: 'task_completion', status: 'approved', employee_id: 'e6', employee_name: 'James Williams', title: 'Complete inventory count', description: 'Weekly F&B stock take completed', submitted_at: new Date(Date.now() - 86400000).toISOString(), location: 'Paris Champs-Élysées', approved_by: 'Sarah Chen', approved_at: new Date(Date.now() - 82800000).toISOString() },
  { id: 'sub7', type: 'proof_upload', status: 'approved', employee_id: 'e7', employee_name: 'Priya Patel', title: 'First Aid Certificate', description: 'Renewed first aid certification', submitted_at: new Date(Date.now() - 172800000).toISOString(), location: 'Dubai Marina', attachment: 'firstaid.pdf', approved_by: 'Tom Richards', approved_at: new Date(Date.now() - 169200000).toISOString() },
  { id: 'sub8', type: 'form_submission', status: 'approved', employee_id: 'e8', employee_name: 'Tom Richards', title: 'Equipment Request', description: 'New espresso machine for lobby bar', submitted_at: new Date(Date.now() - 259200000).toISOString(), location: 'New York Times Square', approved_by: 'Fiona Campbell', approved_at: new Date(Date.now() - 255600000).toISOString() },
  { id: 'sub9', type: 'task_completion', status: 'approved', employee_id: 'e9', employee_name: 'Fiona Campbell', title: 'Monthly safety audit', description: 'Completed fire safety check', submitted_at: new Date(Date.now() - 345600000).toISOString(), location: 'Tokyo Ginza', approved_by: 'Admin', approved_at: new Date(Date.now() - 342000000).toISOString() },
  { id: 'sub10', type: 'form_submission', status: 'rejected', employee_id: 'e10', employee_name: 'Liam O\'Brien', title: 'Time off request', description: 'Requested 2 weeks during peak season', submitted_at: new Date(Date.now() - 432000000).toISOString(), location: 'New York Times Square', rejected_by: 'Tom Richards', rejected_at: new Date(Date.now() - 428400000).toISOString(), rejection_reason: 'Insufficient coverage during peak period' },
  { id: 'sub11', type: 'proof_upload', status: 'pending', employee_id: 'e11', employee_name: 'Emma Watson', title: 'Spa Therapy Certification', description: 'Advanced massage therapy completed', submitted_at: new Date(Date.now() - 14400000).toISOString(), location: 'Tokyo Ginza', attachment: 'spa_cert.pdf' },
  { id: 'sub12', type: 'task_completion', status: 'pending', employee_id: 'e12', employee_name: 'David Kim', title: 'Room inspection', description: 'Weekly room quality check completed', submitted_at: new Date(Date.now() - 21600000).toISOString(), location: 'Paris Champs-Élysées' }
];

// Integrations
export const integrations = [
  { id: 'int1', name: 'BambooHR', type: 'hris', category: 'HRIS', status: 'connected', last_sync: new Date(Date.now() - 900000).toISOString(), logo: '🎋' },
  { id: 'int2', name: 'Slack', type: 'communication', category: 'Communication', status: 'connected', last_sync: new Date(Date.now() - 300000).toISOString(), logo: '💬' },
  { id: 'int3', name: 'Google Calendar', type: 'calendar', category: 'Calendar', status: 'connected', last_sync: new Date(Date.now() - 480000).toISOString(), logo: '📅' },
  { id: 'int4', name: 'QuickBooks', type: 'payroll', category: 'Payroll', status: 'connected', last_sync: new Date(Date.now() - 3600000).toISOString(), logo: '📗' },
  { id: 'int5', name: 'Xero', type: 'payroll', category: 'Payroll', status: 'connected', last_sync: new Date(Date.now() - 3300000).toISOString(), logo: '📊' },
  { id: 'int6', name: 'ADP Workforce Now', type: 'hris', category: 'HRIS', status: 'available', last_sync: null, logo: '💵' },
  { id: 'int7', name: 'Workday', type: 'hris', category: 'HRIS', status: 'available', last_sync: null, logo: '☀️' },
  { id: 'int8', name: 'Microsoft Teams', type: 'communication', category: 'Communication', status: 'available', last_sync: null, logo: '🟣' },
  { id: 'int9', name: 'SAP SuccessFactors', type: 'hris', category: 'HRIS', status: 'available', last_sync: null, logo: '🔷' },
  { id: 'int10', name: 'Gusto', type: 'payroll', category: 'Payroll', status: 'available', last_sync: null, logo: '💰' }
];

// Reports data
export const reports = {
  momentum: { current: 78, previous: 72, trend: 'up', data: [65, 68, 70, 72, 71, 74, 76, 78] },
  retention: { current: 91, previous: 87, trend: 'up', data: [84, 85, 86, 87, 88, 89, 90, 91] },
  shiftFill: { current: 94, previous: 90, trend: 'up', data: [88, 89, 90, 91, 92, 93, 93, 94] },
  laborCost: { current: 12400, budget: 14000, variance: -1600, data: [13200, 12800, 13100, 12600, 12900, 12500, 12700, 12400] },
  overtime: { hours: 24, cost: 720, employees: 4 },
  topPerformers: [
    { name: 'Fiona Campbell', score: 96, role: 'General Manager' },
    { name: 'James Williams', score: 94, role: 'Restaurant Manager' },
    { name: 'Jessica Bano', score: 91, role: 'Bartender' },
    { name: 'Tom Richards', score: 90, role: 'F&B Manager' },
    { name: 'Anna Martinez', score: 88, role: 'Hostess' }
  ]
};

// Settings
export const settings = {
  organization: { name: 'Grand Metropolitan Hotel Group', industry: 'Hospitality', timezone: 'Europe/London', currency: 'GBP', logo: null },
  users: [
    { id: 'u1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@grandmetropolitan.com', role: 'admin', status: 'active', lastLogin: new Date(Date.now() - 120000).toISOString() },
    { id: 'u2', firstName: 'James', lastName: 'Williams', email: 'james.williams@grandmetropolitan.com', role: 'manager', status: 'active', lastLogin: new Date(Date.now() - 3600000).toISOString() },
    { id: 'u3', firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@grandmetropolitan.com', role: 'manager', status: 'active', lastLogin: new Date(Date.now() - 10800000).toISOString() }
  ]
};

// Dashboard stats (for the manager portal dashboard)
export const dashboard = {
  realtime: { onShiftNow: 6, onBreak: 2, clockedIn: 3, runningLate: 1, openShifts: 4 },
  today: { shifts: { total: 24, filled: 22 } },
  activeEmployees: employees.length,
  openShifts: 4,
  pendingApprovals: { timesheets: 8, time_off: 3, swaps: 2 },
  lifecycleMetrics: { retentionRate: 91, newHires: 2, onboarding: 1, avgTenure: '2.4 years' },
  weekMetrics: { scheduled: 312, worked: 298, cost_scheduled: 4680, cost_actual: 4470 },
  weeklyChart: [
    { day: 'Mon', scheduled: 48, worked: 46 },
    { day: 'Tue', scheduled: 52, worked: 50 },
    { day: 'Wed', scheduled: 44, worked: 44 },
    { day: 'Thu', scheduled: 48, worked: 45 },
    { day: 'Fri', scheduled: 56, worked: 54 },
    { day: 'Sat', scheduled: 40, worked: 38 },
    { day: 'Sun', scheduled: 24, worked: 21 },
  ],
  complianceAlerts: [
    { id: 'alert-1', type: 'expiring', severity: 'warning', title: 'Certifications expiring within 30 days', employees: [
      { id: 'e13', name: 'Rachel Green', skill: 'Food Safety Level 2', expiresIn: '12 days' },
    ]},
    { id: 'alert-2', type: 'training', severity: 'info', title: 'Training in progress or pending', employees: [
      { id: 'e1', name: 'Marc Hunt', skill: 'WSET Level 2 Wine', status: 'in_progress' },
      { id: 'e10', name: 'Liam O\'Brien', skill: 'Silver Service', status: 'pending' },
      { id: 'e14', name: 'Ahmed Hassan', skill: 'Food Safety Level 2', status: 'in_progress' },
    ]},
    { id: 'alert-3', type: 'document', severity: 'warning', title: 'Probation reviews due', employees: [
      { id: 'e10', name: 'Liam O\'Brien', reviewDue: '5 days' },
    ]},
  ],
  activityFeed: activity.slice(0, 5),
  recentRecognitions: [
    { id: 'rec-1', emoji: '🌟', message: 'Outstanding guest satisfaction scores this quarter!', from: 'Sarah Chen', to: 'James Williams', likes: 12 },
    { id: 'rec-2', emoji: '🍸', message: 'Perfect cocktail presentation at VIP event', from: 'Manager', to: 'Jessica Bano', likes: 8 },
  ],
  metrics: {
    totalEmployees: employees.length,
    activeToday: 6, onShiftNow: 6, onBreak: 2, clockedIn: 3, runningLate: 1,
    openShifts: 4, pendingApprovals: 13, certificationsExpiring: 3, trainingOverdue: 1,
    avgMomentum: 78, shiftsFilled: 94, retention: 91, hoursThisWeek: 312, taskCompletion: 87,
  },
};

// Demo user for login
export const demoUser = {
  id: 'demo-user',
  email: 'demo@grandmetropolitan.com',
  firstName: 'Sarah',
  lastName: 'Chen',
  role: 'admin',
  permissions: ['manage_employees', 'manage_schedules', 'approve_time', 'view_reports', 'manage_settings', 'manage_integrations', 'manage_org'],
};

// Departments — hospitality departments
export const departments = [
  { id: 'dept-foh', name: 'Front of House', code: 'FOH', employee_count: 45 },
  { id: 'dept-kitchen', name: 'Kitchen', code: 'KIT', employee_count: 32 },
  { id: 'dept-housekeeping', name: 'Housekeeping', code: 'HSK', employee_count: 28 },
  { id: 'dept-bar', name: 'Bar & Beverage', code: 'BAR', employee_count: 18 },
  { id: 'dept-spa', name: 'Spa & Wellness', code: 'SPA', employee_count: 12 },
  { id: 'dept-events', name: 'Events & Banqueting', code: 'EVT', employee_count: 15 },
  { id: 'dept-eng', name: 'Engineering & Maintenance', code: 'ENG', employee_count: 10 },
  { id: 'dept-hr', name: 'HR & Admin', code: 'HR', employee_count: 8 },
  { id: 'dept-mgmt', name: 'Management', code: 'MGT', employee_count: 5 },
];

// Roles - hospitality roles
export const roles = [
  { id: 'role-1', name: 'Server', department: 'Front of House' },
  { id: 'role-2', name: 'Hostess', department: 'Front of House' },
  { id: 'role-3', name: 'Front Desk Agent', department: 'Front of House' },
  { id: 'role-4', name: 'Concierge', department: 'Front of House' },
  { id: 'role-5', name: 'Restaurant Manager', department: 'Front of House' },
  { id: 'role-6', name: 'Bartender', department: 'Bar & Beverage' },
  { id: 'role-7', name: 'Sommelier', department: 'Bar & Beverage' },
  { id: 'role-8', name: 'Room Attendant', department: 'Housekeeping' },
  { id: 'role-9', name: 'Line Cook', department: 'Kitchen' },
  { id: 'role-10', name: 'Sous Chef', department: 'Kitchen' },
  { id: 'role-11', name: 'Head Chef', department: 'Kitchen' },
  { id: 'role-12', name: 'Kitchen Porter', department: 'Kitchen' },
];

// Shift generation helper
export const generateShifts = (weekStart) => {
  const shifts = [];
  const ws = new Date(weekStart);
  const dateStr = (dayOffset) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + dayOffset);
    return d.toISOString().split('T')[0];
  };
  const locMap = Object.fromEntries(locations.map(l => [l.id, l.name]));
  const empMap = Object.fromEntries(employees.map(e => [e.id, { name: e.name, role: e.role }]));

  // [empId, dayOffset, start, end, locId, status]
  const schedule = [
    // Marc Hunt (e1) Server — 5 days, Mon-Fri mix
    ['e1', 0, '09:00', '17:00', 'l1', 'published'],
    ['e1', 1, '09:00', '17:00', 'l1', 'published'],
    ['e1', 2, '14:00', '22:00', 'l1', 'published'],
    ['e1', 3, '09:00', '17:00', 'l1', 'published'],
    ['e1', 4, '09:00', '17:00', 'l1', 'draft'],
    // Jessica Bano (e2) Bartender — 4 evenings
    ['e2', 1, '16:00', '00:00', 'l1', 'published'],
    ['e2', 2, '16:00', '00:00', 'l1', 'published'],
    ['e2', 4, '16:00', '00:00', 'l1', 'published'],
    ['e2', 5, '16:00', '00:00', 'l1', 'draft'],
    // Thomas Cane (e3) Line Cook — 5 days
    ['e3', 0, '06:00', '14:00', 'l1', 'published'],
    ['e3', 1, '06:00', '14:00', 'l1', 'published'],
    ['e3', 2, '06:00', '14:00', 'l1', 'published'],
    ['e3', 3, '14:00', '22:00', 'l1', 'published'],
    ['e3', 4, '14:00', '22:00', 'l1', 'draft'],
    // Anna Martinez (e4) Hostess — 4 days
    ['e4', 0, '10:00', '18:00', 'l2', 'published'],
    ['e4', 1, '10:00', '18:00', 'l2', 'published'],
    ['e4', 3, '10:00', '18:00', 'l2', 'published'],
    ['e4', 4, '14:00', '22:00', 'l2', 'draft'],
    // Sofia Chen (e5) Front Desk Agent — 5 days
    ['e5', 0, '07:00', '15:00', 'l1', 'published'],
    ['e5', 1, '07:00', '15:00', 'l1', 'published'],
    ['e5', 2, '07:00', '15:00', 'l1', 'published'],
    ['e5', 3, '15:00', '23:00', 'l1', 'published'],
    ['e5', 5, '07:00', '15:00', 'l1', 'draft'],
    // James Williams (e6) Restaurant Manager — 5 days
    ['e6', 0, '08:00', '16:00', 'l2', 'published'],
    ['e6', 1, '08:00', '16:00', 'l2', 'published'],
    ['e6', 2, '08:00', '16:00', 'l2', 'published'],
    ['e6', 3, '08:00', '16:00', 'l2', 'published'],
    ['e6', 4, '08:00', '16:00', 'l2', 'published'],
    // Priya Patel (e7) Sous Chef — 5 days
    ['e7', 0, '07:00', '15:00', 'l3', 'published'],
    ['e7', 1, '07:00', '15:00', 'l3', 'published'],
    ['e7', 2, '14:00', '22:00', 'l3', 'published'],
    ['e7', 3, '07:00', '15:00', 'l3', 'published'],
    ['e7', 5, '07:00', '15:00', 'l3', 'published'],
    // Tom Richards (e8) F&B Manager — 4 days
    ['e8', 0, '08:00', '16:00', 'l4', 'published'],
    ['e8', 1, '08:00', '16:00', 'l4', 'published'],
    ['e8', 3, '08:00', '16:00', 'l4', 'published'],
    ['e8', 4, '08:00', '16:00', 'l4', 'published'],
    // Fiona Campbell (e9) General Manager — 5 days
    ['e9', 0, '09:00', '17:00', 'l5', 'published'],
    ['e9', 1, '09:00', '17:00', 'l5', 'published'],
    ['e9', 2, '09:00', '17:00', 'l5', 'published'],
    ['e9', 3, '09:00', '17:00', 'l5', 'published'],
    ['e9', 4, '09:00', '17:00', 'l5', 'published'],
    // Liam O'Brien (e10) Concierge — 4 days
    ['e10', 1, '10:00', '18:00', 'l4', 'published'],
    ['e10', 2, '10:00', '18:00', 'l4', 'published'],
    ['e10', 4, '14:00', '22:00', 'l4', 'published'],
    ['e10', 5, '10:00', '18:00', 'l4', 'draft'],
    // Emma Watson (e11) Spa Manager — 4 days
    ['e11', 0, '09:00', '17:00', 'l5', 'published'],
    ['e11', 2, '09:00', '17:00', 'l5', 'published'],
    ['e11', 3, '09:00', '17:00', 'l5', 'published'],
    ['e11', 5, '09:00', '17:00', 'l5', 'published'],
    // David Kim (e12) Room Attendant — 5 days
    ['e12', 0, '06:00', '14:00', 'l2', 'published'],
    ['e12', 1, '06:00', '14:00', 'l2', 'published'],
    ['e12', 2, '14:00', '22:00', 'l2', 'published'],
    ['e12', 3, '06:00', '14:00', 'l2', 'published'],
    ['e12', 4, '06:00', '14:00', 'l2', 'published'],
    // Rachel Green (e13) — on_leave, no shifts
    // Ahmed Hassan (e14) Kitchen Porter — 4 part-time shifts
    ['e14', 0, '08:00', '13:00', 'l1', 'published'],
    ['e14', 2, '08:00', '13:00', 'l1', 'published'],
    ['e14', 4, '08:00', '13:00', 'l1', 'draft'],
    ['e14', 5, '09:00', '14:00', 'l1', 'draft'],
    // Lucy Taylor (e15) HR Coordinator — 4 days
    ['e15', 0, '09:00', '17:00', 'l2', 'published'],
    ['e15', 1, '09:00', '17:00', 'l2', 'published'],
    ['e15', 3, '09:00', '17:00', 'l2', 'published'],
    ['e15', 4, '09:00', '17:00', 'l2', 'draft'],
  ];

  schedule.forEach(([empId, day, start, end, locId, status], i) => {
    const ds = dateStr(day);
    const emp = empMap[empId];
    shifts.push({
      id: `shift-${i + 1}`,
      date: ds,
      start_time: `${ds}T${start}:00`,
      end_time: `${ds}T${end}:00`,
      shift_type: start < '10:00' ? 'Morning' : start < '14:00' ? 'Day' : 'Evening',
      location_id: locId,
      location_name: locMap[locId],
      employee_id: empId,
      employee_name: emp.name,
      employee_role: emp.role,
      is_open: false,
      status,
      break_minutes: 30,
      hourly_rate: 12.50,
      cost: 100,
    });
  });

  // Open shifts (unfilled)
  [
    [1, '14:00', '22:00', 'l1', 'Server'],
    [3, '06:00', '14:00', 'l3', 'Line Cook'],
    [5, '07:00', '15:00', 'l5', 'Front Desk Agent'],
  ].forEach(([day, start, end, locId, role], i) => {
    const ds = dateStr(day);
    shifts.push({
      id: `open-${i + 1}`,
      date: ds,
      start_time: `${ds}T${start}:00`,
      end_time: `${ds}T${end}:00`,
      shift_type: start < '10:00' ? 'Morning' : start < '14:00' ? 'Day' : 'Evening',
      location_id: locId,
      location_name: locMap[locId],
      employee_id: null,
      employee_name: null,
      employee_role: role,
      is_open: true,
      status: 'open',
      required_skills: ['Guest Relations'],
      break_minutes: 30,
      hourly_rate: 14.00,
      cost: 112,
    });
  });

  return shifts;
};

// Time entries generation
export const generateTimeEntries = () => {
  const entries = [];
  const today = new Date();
  employees.forEach(emp => {
    for (let day = 0; day < 14; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      if (date.getDay() === 0) continue; // Skip Sundays
      const dateStr = date.toISOString().split('T')[0];
      const patterns = [
        { start: '09:00', end: '17:00' },
        { start: '10:00', end: '18:00' },
        { start: '14:00', end: '22:00' },
      ];
      const pattern = patterns[day % patterns.length];
      entries.push({
        id: `time-${emp.id}-${dateStr}`,
        employee_id: emp.id,
        employee_name: emp.name,
        date: dateStr,
        location: emp.location,
        location_id: emp.location_id,
        scheduled_start: `${dateStr}T${pattern.start}:00`,
        scheduled_end: `${dateStr}T${pattern.end}:00`,
        clock_in: `${dateStr}T${pattern.start}:00`,
        clock_out: `${dateStr}T${pattern.end}:00`,
        scheduled_hours: 8,
        actual_hours: 8,
        status: 'completed',
        approved: day > 3,
      });
    }
  });
  return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const timeEntries = generateTimeEntries();

// Get week start helper
export const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
};

// Shift Templates - hospitality shift patterns
export const shiftTemplates = [
  { id: 'st1', name: 'Morning F&B', role: 'Server', start_time: '06:00', end_time: '14:00', duration: 8, location_id: 'l1', location_name: 'London Mayfair', break_minutes: 30, notes: 'Breakfast and lunch service', days_of_week: [1, 2, 3, 4, 5], headcount: 6 },
  { id: 'st2', name: 'Evening Service', role: 'Server', start_time: '14:00', end_time: '22:00', duration: 8, location_id: 'l1', location_name: 'London Mayfair', break_minutes: 30, notes: 'Dinner service - handover duties included', days_of_week: [1, 2, 3, 4, 5], headcount: 8 },
  { id: 'st3', name: 'Night Audit', role: 'Front Desk Agent', start_time: '22:00', end_time: '06:00', duration: 8, location_id: 'l1', location_name: 'London Mayfair', break_minutes: 30, notes: 'Night audit and overnight reception', days_of_week: [1, 2, 3, 4, 5, 6, 0], headcount: 2 },
  { id: 'st4', name: 'Kitchen Day', role: 'Line Cook', start_time: '07:00', end_time: '15:00', duration: 8, location_id: 'l1', location_name: 'London Mayfair', break_minutes: 30, notes: 'Prep and lunch service', days_of_week: [1, 2, 3, 4, 5], headcount: 4 },
  { id: 'st5', name: 'Housekeeping AM', role: 'Room Attendant', start_time: '07:00', end_time: '15:00', duration: 8, location_id: 'l2', location_name: 'Paris Champs-Élysées', break_minutes: 30, notes: 'Morning room cleaning', days_of_week: [1, 2, 3, 4, 5, 6], headcount: 6 },
  { id: 'st6', name: 'Weekend Brunch', role: 'Server', start_time: '08:00', end_time: '16:00', duration: 8, location_id: 'l3', location_name: 'Dubai Marina', break_minutes: 30, notes: 'Weekend brunch service', days_of_week: [0, 6], headcount: 4 }
];
