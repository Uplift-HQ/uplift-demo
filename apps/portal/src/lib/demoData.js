// ============================================================
// UPLIFT PORTAL - DEMO DATA
// Complete demo data for all pages
// ============================================================

// ============================================================
// LOCATIONS (5 Grand Hotel Locations)
// ============================================================
export const DEMO_LOCATIONS = [
  { id: 'loc-main', name: 'The Grand Hotel - Main Restaurant', code: 'GH-MAIN', capacity: 40, type: 'restaurant', status: 'active', employee_count: 4, address: '1 Grand Plaza, London W1K 1AB' },
  { id: 'loc-bar', name: 'The Grand Hotel - Bar & Lounge', code: 'GH-BAR', capacity: 15, type: 'bar', status: 'active', employee_count: 2, address: '1 Grand Plaza, London W1K 1AB' },
  { id: 'loc-events', name: 'The Grand Hotel - Events/Banqueting', code: 'GH-EVENTS', capacity: 25, type: 'events', status: 'active', employee_count: 1, address: '1 Grand Plaza, London W1K 1AB' },
  { id: 'loc-room', name: 'The Grand Hotel - Room Service', code: 'GH-ROOM', capacity: 12, type: 'room_service', status: 'active', employee_count: 1, address: '1 Grand Plaza, London W1K 1AB' },
  { id: 'loc-pool', name: 'The Grand Hotel - Pool Bar', code: 'GH-POOL', capacity: 8, type: 'seasonal', status: 'active', employee_count: 0, address: '1 Grand Plaza, London W1K 1AB', seasonal: true },
];

// ============================================================
// DEPARTMENTS
// ============================================================
export const DEMO_DEPARTMENTS = [
  { id: 'dept-foh', name: 'Front of House', code: 'FOH' },
  { id: 'dept-boh', name: 'Back of House', code: 'BOH' },
  { id: 'dept-mgmt', name: 'Management', code: 'MGMT' },
  { id: 'dept-events', name: 'Events', code: 'EVENTS' },
];

// ============================================================
// SKILLS (Flat array with employee counts)
// ============================================================
export const DEMO_SKILLS = [
  // Certifications
  { id: 'cert-food2', name: 'Food Safety Level 2', category: 'Certifications', employee_count: 7, verified_count: 6, mandatory: true },
  { id: 'cert-food3', name: 'Food Safety Level 3', category: 'Certifications', employee_count: 2, verified_count: 1, mandatory: false },
  { id: 'cert-license', name: 'Personal License Holder', category: 'Certifications', employee_count: 3, verified_count: 2, mandatory: false },
  { id: 'cert-firstaid', name: 'First Aid at Work', category: 'Certifications', employee_count: 3, verified_count: 2, mandatory: false },
  { id: 'cert-fire', name: 'Fire Marshal', category: 'Certifications', employee_count: 1, verified_count: 1, mandatory: false },
  { id: 'cert-manual', name: 'Manual Handling', category: 'Certifications', employee_count: 2, verified_count: 2, mandatory: false },
  { id: 'cert-allergen', name: 'Allergen Awareness', category: 'Certifications', employee_count: 8, verified_count: 5, mandatory: true },
  { id: 'cert-wset3', name: 'WSET Level 3 Wine', category: 'Certifications', employee_count: 1, verified_count: 1, mandatory: false },
  // Operational Skills
  { id: 'op-table', name: 'Table Service', category: 'Operational Skills', employee_count: 6, verified_count: 4 },
  { id: 'op-wine', name: 'Wine Service / Sommelier', category: 'Operational Skills', employee_count: 2, verified_count: 2 },
  { id: 'op-cocktail', name: 'Cocktail Making', category: 'Operational Skills', employee_count: 2, verified_count: 2 },
  { id: 'op-barista', name: 'Barista', category: 'Operational Skills', employee_count: 2, verified_count: 2 },
  { id: 'op-till', name: 'Till/POS Operation', category: 'Operational Skills', employee_count: 7, verified_count: 5 },
  { id: 'op-reservations', name: 'Reservation Management', category: 'Operational Skills', employee_count: 2, verified_count: 2 },
  { id: 'op-events', name: 'Events Setup', category: 'Operational Skills', employee_count: 1, verified_count: 1 },
  { id: 'op-roomservice', name: 'Room Service Etiquette', category: 'Operational Skills', employee_count: 1, verified_count: 1 },
  { id: 'op-upselling', name: 'Upselling', category: 'Operational Skills', employee_count: 3, verified_count: 3 },
  // Languages
  { id: 'lang-en', name: 'English', category: 'Languages', employee_count: 8, verified_count: 8 },
  { id: 'lang-fr', name: 'French', category: 'Languages', employee_count: 2, verified_count: 2 },
  { id: 'lang-es', name: 'Spanish', category: 'Languages', employee_count: 1, verified_count: 1 },
  { id: 'lang-de', name: 'German', category: 'Languages', employee_count: 1, verified_count: 1 },
  { id: 'lang-it', name: 'Italian', category: 'Languages', employee_count: 1, verified_count: 1 },
  { id: 'lang-zh', name: 'Mandarin', category: 'Languages', employee_count: 1, verified_count: 1 },
  { id: 'lang-ar', name: 'Arabic', category: 'Languages', employee_count: 1, verified_count: 1 },
  // Soft Skills
  { id: 'soft-customer', name: 'Customer Handling', category: 'Soft Skills', employee_count: 8, verified_count: 6 },
  { id: 'soft-conflict', name: 'Conflict Resolution', category: 'Soft Skills', employee_count: 3, verified_count: 3 },
  { id: 'soft-leadership', name: 'Team Leadership', category: 'Soft Skills', employee_count: 2, verified_count: 2 },
  { id: 'soft-training', name: 'Training/Mentoring', category: 'Soft Skills', employee_count: 1, verified_count: 1 },
];

// ============================================================
// 8 EMPLOYEES
// ============================================================
export const DEMO_EMPLOYEES = [
  {
    id: 'emp-001', first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah.mitchell@grandhotel.com', phone: '+44 7700 900001',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    role: 'Senior Server', department: 'Front of House', department_id: 'dept-foh',
    location: 'The Grand Hotel - Main Restaurant', location_id: 'loc-main',
    start_date: '2022-03-15', status: 'active', contract_type: 'Full-time',
    hours_target: 35, hours_this_week: 32, hourly_rate: 12.50, momentum_score: 94,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-06-15', expires: '2027-06-15' },
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'valid', obtained: '2025-01-10', expires: '2028-01-10' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'valid', obtained: '2025-03-20', expires: '2027-03-20' },
    ],
    operational_skills: [
      { skill_id: 'op-table', name: 'Table Service', level: 5 },
      { skill_id: 'op-wine', name: 'Wine Service', level: 4 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 5 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Native' }, { skill_id: 'lang-fr', name: 'French', level: 'Conversational' }],
  },
  {
    id: 'emp-002', first_name: 'James', last_name: 'Kimani', email: 'james.kimani@grandhotel.com', phone: '+44 7700 900002',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    role: 'Bartender', department: 'Front of House', department_id: 'dept-foh',
    location: 'The Grand Hotel - Bar & Lounge', location_id: 'loc-bar',
    start_date: '2023-06-01', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 38, hourly_rate: 13.00, momentum_score: 89,
    certifications: [
      { skill_id: 'cert-license', name: 'Personal License Holder', status: 'valid', obtained: '2024-07-20', expires: null },
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-06-15', expires: '2027-06-15' },
    ],
    operational_skills: [
      { skill_id: 'op-cocktail', name: 'Cocktail Making', level: 5 },
      { skill_id: 'op-barista', name: 'Barista', level: 4 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 5 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Native' }],
  },
  {
    id: 'emp-003', first_name: 'Maria', last_name: 'Lopez', email: 'maria.lopez@grandhotel.com', phone: '+44 7700 900003',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    role: 'Server', department: 'Events', department_id: 'dept-events',
    location: 'The Grand Hotel - Events/Banqueting', location_id: 'loc-events',
    start_date: '2023-09-10', status: 'active', contract_type: 'Part-time',
    hours_target: 30, hours_this_week: 28, hourly_rate: 11.50, momentum_score: 86,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-09-25', expires: '2027-09-25' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'expiring_soon', obtained: '2024-02-15', expires: '2026-02-15' },
    ],
    operational_skills: [
      { skill_id: 'op-table', name: 'Table Service', level: 4 },
      { skill_id: 'op-events', name: 'Events Setup', level: 4 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Fluent' }, { skill_id: 'lang-es', name: 'Spanish', level: 'Native' }],
  },
  {
    id: 'emp-004', first_name: 'Ahmed', last_name: 'Rahman', email: 'ahmed.rahman@grandhotel.com', phone: '+44 7700 900004',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    role: 'Senior Server', department: 'Front of House', department_id: 'dept-foh',
    location: 'The Grand Hotel - Room Service', location_id: 'loc-room',
    start_date: '2021-11-20', status: 'active', contract_type: 'Full-time',
    hours_target: 35, hours_this_week: 35, hourly_rate: 12.50, momentum_score: 91,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2023-05-10', expires: '2026-05-10' },
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'valid', obtained: '2024-03-15', expires: '2027-03-15' },
      { skill_id: 'cert-fire', name: 'Fire Marshal', status: 'valid', obtained: '2025-06-01', expires: '2026-06-01' },
    ],
    operational_skills: [
      { skill_id: 'op-table', name: 'Table Service', level: 5 },
      { skill_id: 'op-roomservice', name: 'Room Service Etiquette', level: 5 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Fluent' }, { skill_id: 'lang-ar', name: 'Arabic', level: 'Native' }],
  },
  {
    id: 'emp-005', first_name: 'Chen', last_name: 'Wei', email: 'chen.wei@grandhotel.com', phone: '+44 7700 900005',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    role: 'Server (New)', department: 'Front of House', department_id: 'dept-foh',
    location: 'The Grand Hotel - Main Restaurant', location_id: 'loc-main',
    start_date: '2024-12-02', status: 'active', contract_type: 'Full-time',
    hours_target: 25, hours_this_week: 20, hourly_rate: 11.00, momentum_score: 72,
    probation: { status: true, end_date: '2025-03-02' },
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'pending_exam', scheduled: '2026-02-01' },
    ],
    operational_skills: [
      { skill_id: 'op-table', name: 'Table Service', level: 2 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 2 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Conversational' }, { skill_id: 'lang-zh', name: 'Mandarin', level: 'Native' }],
  },
  {
    id: 'emp-006', first_name: 'Emma', last_name: 'Thompson', email: 'emma.thompson@grandhotel.com', phone: '+44 7700 900006',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    role: 'Host', department: 'Front of House', department_id: 'dept-foh',
    location: 'The Grand Hotel - Main Restaurant', location_id: 'loc-main',
    start_date: '2022-08-14', status: 'active', contract_type: 'Part-time',
    hours_target: 32, hours_this_week: 30, hourly_rate: 12.00, momentum_score: 88,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2023-09-01', expires: '2026-09-01' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'valid', obtained: '2025-04-10', expires: '2027-04-10' },
    ],
    operational_skills: [
      { skill_id: 'op-reservations', name: 'Reservation Management', level: 5 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 4 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Native' }, { skill_id: 'lang-de', name: 'German', level: 'Basic' }],
  },
  {
    id: 'emp-007', first_name: 'Oluwaseun', last_name: 'Adebayo', email: 'seun.adebayo@grandhotel.com', phone: '+44 7700 900007',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    role: 'Barback / Trainee Bartender', department: 'Front of House', department_id: 'dept-foh',
    location: 'The Grand Hotel - Bar & Lounge', location_id: 'loc-bar',
    start_date: '2024-04-22', status: 'active', contract_type: 'Full-time',
    hours_target: 38, hours_this_week: 36, hourly_rate: 11.50, momentum_score: 84,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-05-10', expires: '2027-05-10' },
      { skill_id: 'cert-manual', name: 'Manual Handling', status: 'valid', obtained: '2024-05-15', expires: '2026-05-15' },
    ],
    operational_skills: [
      { skill_id: 'op-cocktail', name: 'Cocktail Making', level: 3 },
      { skill_id: 'op-barista', name: 'Barista', level: 4 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 4 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Fluent' }],
  },
  {
    id: 'emp-008', first_name: 'Sophie', last_name: 'Bernard', email: 'sophie.bernard@grandhotel.com', phone: '+44 7700 900008',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    role: 'Sommelier / Senior Server', department: 'Front of House', department_id: 'dept-foh',
    location: 'The Grand Hotel - Main Restaurant', location_id: 'loc-main',
    start_date: '2020-09-01', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 38, hourly_rate: 15.00, momentum_score: 96,
    certifications: [
      { skill_id: 'cert-food3', name: 'Food Safety Level 3', status: 'valid', obtained: '2024-03-20', expires: '2027-03-20' },
      { skill_id: 'cert-wset3', name: 'WSET Level 3 Wine', status: 'valid', obtained: '2023-11-15', expires: null },
      { skill_id: 'cert-license', name: 'Personal License Holder', status: 'valid', obtained: '2022-01-10', expires: null },
    ],
    operational_skills: [
      { skill_id: 'op-wine', name: 'Wine Service / Sommelier', level: 5 },
      { skill_id: 'op-table', name: 'Table Service', level: 5 },
      { skill_id: 'op-upselling', name: 'Upselling', level: 5 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Fluent' }, { skill_id: 'lang-fr', name: 'French', level: 'Native' }, { skill_id: 'lang-it', name: 'Italian', level: 'Conversational' }],
  },
];

// ============================================================
// CAREER OPPORTUNITIES
// ============================================================
export const DEMO_OPPORTUNITIES = [
  {
    id: 'opp-001', title: 'Front of House Supervisor', location: 'The Grand Hotel - Main Restaurant', location_id: 'loc-main',
    department: 'Front of House', salary_min: 28000, salary_max: 32000, salary_display: '£28,000 - £32,000',
    type: 'Promotion', employment_type: 'Full-time', deadline: '2026-02-15', posted: '2026-01-10', status: 'open',
    description: 'Lead our main restaurant team, ensuring exceptional service standards and team development.',
    requirements: ['2+ years FOH experience', 'Food Safety Level 3', 'Team leadership experience'],
    applications: 3,
  },
  {
    id: 'opp-002', title: 'Events Coordinator', location: 'The Grand Hotel - Events/Banqueting', location_id: 'loc-events',
    department: 'Events', salary_min: 26000, salary_max: 30000, salary_display: '£26,000 - £30,000',
    type: 'Lateral Move', employment_type: 'Full-time', deadline: '2026-02-28', posted: '2026-01-15', status: 'open',
    description: 'Coordinate events from planning through execution.',
    requirements: ['Events experience', 'AV equipment knowledge', 'Strong customer handling'],
    applications: 5,
  },
  {
    id: 'opp-003', title: 'Bar Team Lead', location: 'The Grand Hotel - Bar & Lounge', location_id: 'loc-bar',
    department: 'Front of House', salary_min: 25000, salary_max: 28000, salary_display: '£25,000 - £28,000',
    type: 'Promotion', employment_type: 'Full-time', deadline: '2026-02-20', posted: '2026-01-12', status: 'open',
    description: 'Lead the bar team, manage stock, create cocktail menus.',
    requirements: ['Personal License Holder', 'Cocktail expertise', 'Stock management'],
    applications: 4,
  },
  {
    id: 'opp-004', title: 'Assistant Restaurant Manager', location: 'The Grand Hotel - Main Restaurant', location_id: 'loc-main',
    department: 'Management', salary_min: 32000, salary_max: 38000, salary_display: '£32,000 - £38,000',
    type: 'Promotion', employment_type: 'Full-time', deadline: '2026-03-10', posted: '2026-01-20', status: 'open',
    description: 'Support the Restaurant Manager in daily operations.',
    requirements: ['Supervisor experience', 'P&L awareness', 'Food Safety Level 3'],
    applications: 2,
  },
];

// ============================================================
// TIME TRACKING
// ============================================================
export const generateTimeEntries = () => {
  const entries = [];
  const today = new Date();
  DEMO_EMPLOYEES.forEach(emp => {
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
        employee_name: `${emp.first_name} ${emp.last_name}`,
        employee_photo: emp.photo,
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

export const DEMO_TIME_ENTRIES = generateTimeEntries();

// ============================================================
// SHIFTS
// ============================================================
export const generateDemoShifts = (weekStart) => {
  const shifts = [];
  const patterns = [
    { name: 'Morning', start: '06:00', end: '14:00' },
    { name: 'Day', start: '09:00', end: '17:00' },
    { name: 'Evening', start: '14:00', end: '22:00' },
  ];
  DEMO_LOCATIONS.forEach(loc => {
    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      const staffNeeded = loc.capacity > 30 ? 4 : loc.capacity > 15 ? 3 : 2;
      const availableEmps = DEMO_EMPLOYEES.filter(e => e.location_id === loc.id || Math.random() < 0.2);
      for (let i = 0; i < Math.min(staffNeeded, availableEmps.length); i++) {
        const emp = availableEmps[i];
        const pattern = patterns[i % patterns.length];
        shifts.push({
          id: `shift-${loc.id}-${dateStr}-${i}`,
          date: dateStr,
          start_time: `${dateStr}T${pattern.start}:00`,
          end_time: `${dateStr}T${pattern.end}:00`,
          shift_type: pattern.name,
          location_id: loc.id,
          location_name: loc.name,
          employee_id: emp.id,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          employee_photo: emp.photo,
          employee_role: emp.role,
          is_open: false,
          status: 'confirmed',
          hourly_rate: emp.hourly_rate,
          cost: emp.hourly_rate * 8,
        });
      }
      // Add open shift
      if (Math.random() > 0.5) {
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        shifts.push({
          id: `open-${loc.id}-${dateStr}`,
          date: dateStr,
          start_time: `${dateStr}T${pattern.start}:00`,
          end_time: `${dateStr}T${pattern.end}:00`,
          shift_type: pattern.name,
          location_id: loc.id,
          location_name: loc.name,
          employee_id: null,
          employee_name: null,
          is_open: true,
          status: 'open',
          required_skills: ['Food Safety Level 2'],
          hourly_rate: 12.00,
          cost: 96,
        });
      }
    }
  });
  return shifts;
};

// ============================================================
// DASHBOARD
// ============================================================
export const DEMO_DASHBOARD = {
  realtime: { onShiftNow: 6, onBreak: 2, clockedIn: 3, runningLate: 1, openShifts: 4 },
  today: { shifts: { total: 24, filled: 22 } },
  activeEmployees: DEMO_EMPLOYEES.length,
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
      { id: 'emp-003', name: 'Maria Lopez', skill: 'Allergen Awareness', expiresIn: '12 days' },
    ]},
  ],
  activityFeed: [
    { id: 'act-1', type: 'clock_in', user: 'Emma Thompson', action: 'clocked in', location: 'Main Restaurant', time: '5 min ago' },
    { id: 'act-2', type: 'shift_swap', user: 'James Kimani', action: 'requested shift swap with Sarah Mitchell', time: '12 min ago' },
    { id: 'act-3', type: 'recognition', user: 'Sophie Bernard', action: 'received recognition', message: 'Excellent wine service!', time: '1 hr ago' },
  ],
  recentRecognitions: [
    { id: 'rec-1', emoji: '🌟', message: 'Outstanding guest feedback!', from: 'Sarah Mitchell', to: 'James Kimani', likes: 12 },
    { id: 'rec-2', emoji: '🍷', message: 'Perfect wine pairing', from: 'Manager', to: 'Sophie Bernard', likes: 8 },
  ],
  metrics: {
    totalEmployees: DEMO_EMPLOYEES.length,
    activeToday: 6, onShiftNow: 6, onBreak: 2, clockedIn: 3, runningLate: 1,
    openShifts: 4, pendingApprovals: 13, certificationsExpiring: 3, trainingOverdue: 1,
    avgMomentum: 78, shiftsFilled: 94, retention: 91, hoursThisWeek: 312, taskCompletion: 87,
  },
};

// ============================================================
// INTEGRATIONS
// ============================================================
export const DEMO_INTEGRATIONS = [
  { id: 'int-bamboo', name: 'BambooHR', type: 'hris', category: 'HRIS', status: 'connected', last_sync: new Date(Date.now() - 900000).toISOString(), logo: '🎋' },
  { id: 'int-workday', name: 'Workday', type: 'hris', category: 'HRIS', status: 'connected', last_sync: new Date(Date.now() - 3600000).toISOString(), logo: '☀️' },
  { id: 'int-hibob', name: 'HiBob', type: 'hris', category: 'HRIS', status: 'connected', last_sync: new Date(Date.now() - 7200000).toISOString(), logo: '👋' },
  { id: 'int-personio', name: 'Personio', type: 'hris', category: 'HRIS', status: 'connected', last_sync: new Date(Date.now() - 1800000).toISOString(), logo: '👤' },
  { id: 'int-sap', name: 'SAP SuccessFactors', type: 'hris', category: 'HRIS', status: 'available', last_sync: null, logo: '🔷' },
  { id: 'int-adp', name: 'ADP', type: 'payroll', category: 'Payroll', status: 'connected', last_sync: new Date(Date.now() - 86400000).toISOString(), logo: '💵' },
  { id: 'int-xero', name: 'Xero', type: 'payroll', category: 'Payroll', status: 'connected', last_sync: new Date(Date.now() - 7200000).toISOString(), logo: '📊' },
  { id: 'int-quickbooks', name: 'QuickBooks', type: 'payroll', category: 'Payroll', status: 'connected', last_sync: new Date(Date.now() - 14400000).toISOString(), logo: '📗' },
  { id: 'int-slack', name: 'Slack', type: 'communication', category: 'Communication', status: 'connected', last_sync: new Date(Date.now() - 300000).toISOString(), logo: '💬' },
  { id: 'int-teams', name: 'Microsoft Teams', type: 'communication', category: 'Communication', status: 'connected', last_sync: new Date(Date.now() - 600000).toISOString(), logo: '🟣' },
  { id: 'int-gcal', name: 'Google Calendar', type: 'calendar', category: 'Calendar', status: 'connected', last_sync: new Date(Date.now() - 120000).toISOString(), logo: '📅' },
  { id: 'int-outlook', name: 'Outlook Calendar', type: 'calendar', category: 'Calendar', status: 'connected', last_sync: new Date(Date.now() - 240000).toISOString(), logo: '📆' },
  { id: 'int-square', name: 'Square POS', type: 'pos', category: 'Point of Sale', status: 'available', last_sync: null, logo: '⬜' },
  { id: 'int-lightspeed', name: 'Lightspeed', type: 'pos', category: 'Point of Sale', status: 'available', last_sync: null, logo: '⚡' },
  { id: 'int-toast', name: 'Toast', type: 'pos', category: 'Point of Sale', status: 'available', last_sync: null, logo: '🍞' },
  { id: 'int-resy', name: 'Resy', type: 'reservations', category: 'Reservations', status: 'connected', last_sync: new Date(Date.now() - 1800000).toISOString(), logo: '📋' },
];

// ============================================================
// SETTINGS DATA
// ============================================================
export const DEMO_USERS = [
  { id: 'user-1', email: 'admin@grandhotel.com', firstName: 'Robert', lastName: 'Chen', role: 'admin', status: 'active', lastLogin: new Date(Date.now() - 3600000).toISOString() },
  { id: 'user-2', email: 'manager@grandhotel.com', firstName: 'Sarah', lastName: 'Mitchell', role: 'manager', status: 'active', lastLogin: new Date(Date.now() - 7200000).toISOString() },
  { id: 'user-3', email: 'supervisor@grandhotel.com', firstName: 'James', lastName: 'Kimani', role: 'supervisor', status: 'active', lastLogin: new Date(Date.now() - 86400000).toISOString() },
  { id: 'user-4', email: 'hr@grandhotel.com', firstName: 'Emma', lastName: 'Thompson', role: 'hr', status: 'active', lastLogin: new Date(Date.now() - 172800000).toISOString() },
  { id: 'user-5', email: 'viewer@grandhotel.com', firstName: 'Ahmed', lastName: 'Rahman', role: 'viewer', status: 'invited', lastLogin: null },
];

export const DEMO_SESSIONS = [
  { id: 'sess-1', device: 'Chrome on MacOS', ip: '192.168.1.100', location: 'London, UK', lastActive: new Date().toISOString(), current: true },
  { id: 'sess-2', device: 'Safari on iPhone', ip: '192.168.1.101', location: 'London, UK', lastActive: new Date(Date.now() - 3600000).toISOString(), current: false },
  { id: 'sess-3', device: 'Firefox on Windows', ip: '10.0.0.50', location: 'Manchester, UK', lastActive: new Date(Date.now() - 86400000).toISOString(), current: false },
];

export const DEMO_WEBHOOKS = [
  { id: 'wh-1', name: 'Slack Notifications', url: 'https://hooks.slack.com/services/xxx', events: ['shift.created', 'employee.added'], status: 'active', lastTriggered: new Date(Date.now() - 1800000).toISOString(), successRate: 99 },
  { id: 'wh-2', name: 'HR System Sync', url: 'https://hr.grandhotel.com/webhook', events: ['employee.updated', 'employee.removed'], status: 'active', lastTriggered: new Date(Date.now() - 7200000).toISOString(), successRate: 97 },
];

export const DEMO_ORGANIZATION = {
  id: 'org-1',
  name: 'The Grand Hotel',
  industry: 'Hospitality',
  employees_count: DEMO_EMPLOYEES.length,
  locations_count: DEMO_LOCATIONS.length,
  timezone: 'Europe/London',
  currency: 'GBP',
};

export const DEMO_BRANDING = {
  primaryColor: '#6366f1',
  companyName: 'The Grand Hotel',
  logo: null,
  favicon: null,
};

export const DEMO_NAVIGATION = {
  employees: true, schedule: true, templates: true, timeTracking: true, timeOff: true,
  locations: true, skills: true, jobs: true, career: true, bulkImport: true,
  reports: true, integrations: true, activity: true,
};

export const DEMO_EMPLOYEE_VISIBILITY = {
  email: { managers: true, employees: false },
  phone: { managers: true, employees: false },
  address: { managers: true, employees: false },
  salary: { managers: false, employees: false },
  emergencyContact: { managers: true, employees: false },
  performanceScore: { managers: true, employees: true },
  skills: { managers: true, employees: true },
};

// ============================================================
// ACTIVITY
// ============================================================
export const DEMO_ACTIVITIES = [
  { id: 'act-1', type: 'employee_added', user: 'Robert Chen', target: 'Chen Wei', message: 'Added new employee', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'act-2', type: 'shift_created', user: 'Sarah Mitchell', target: null, message: 'Created 5 shifts for next week', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'act-3', type: 'time_off_approved', user: 'James Kimani', target: 'Maria Lopez', message: 'Approved time off request', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'act-4', type: 'skill_verified', user: 'Emma Thompson', target: 'Sophie Bernard', message: 'Verified WSET Level 3 Wine', timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: 'act-5', type: 'integration_connected', user: 'Robert Chen', target: 'BambooHR', message: 'Connected BambooHR integration', timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: 'act-6', type: 'schedule_published', user: 'Sarah Mitchell', target: 'Week 6', message: 'Published schedule for Week 6', timestamp: new Date(Date.now() - 18000000).toISOString() },
  { id: 'act-7', type: 'employee_promoted', user: 'Robert Chen', target: 'Sophie Bernard', message: 'Promoted to Senior Server', timestamp: new Date(Date.now() - 21600000).toISOString() },
  { id: 'act-8', type: 'shift_swap_approved', user: 'James Kimani', target: 'James Kimani <> Sarah Mitchell', message: 'Approved shift swap', timestamp: new Date(Date.now() - 25200000).toISOString() },
  { id: 'act-9', type: 'report_generated', user: 'Emma Thompson', target: 'Labour Cost Report', message: 'Generated monthly report', timestamp: new Date(Date.now() - 28800000).toISOString() },
  { id: 'act-10', type: 'location_added', user: 'Robert Chen', target: 'Pool Bar', message: 'Added new location', timestamp: new Date(Date.now() - 32400000).toISOString() },
];

// ============================================================
// CAREER
// ============================================================
export const DEMO_CAREER = {
  paths: [
    { id: 'path-1', title: 'Front of House Leadership', levels: [
      { role: 'Server', level: 1, skills: ['Food Safety L2', 'Table Service'] },
      { role: 'Senior Server', level: 2, skills: ['Wine Service', 'Upselling'] },
      { role: 'Supervisor', level: 3, skills: ['Team Leadership', 'Conflict Resolution'] },
      { role: 'Manager', level: 4, skills: ['P&L Management', 'Strategic Planning'] },
    ]},
    { id: 'path-2', title: 'Bar & Beverage', levels: [
      { role: 'Barback', level: 1, skills: ['Food Safety L2', 'Manual Handling'] },
      { role: 'Bartender', level: 2, skills: ['Cocktail Making', 'Personal License'] },
      { role: 'Head Bartender', level: 3, skills: ['Stock Management', 'Menu Development'] },
      { role: 'Bar Manager', level: 4, skills: ['Team Leadership', 'Supplier Relations'] },
    ]},
  ],
  insights: DEMO_EMPLOYEES.slice(0, 5).map(e => ({
    employeeId: e.id,
    employeeName: `${e.first_name} ${e.last_name}`,
    currentRole: e.role,
    nextRole: 'Supervisor',
    readiness: Math.floor(Math.random() * 30) + 70,
    gapCount: Math.floor(Math.random() * 3),
  })),
};

// ============================================================
// BULK IMPORT
// ============================================================
export const DEMO_IMPORT_TEMPLATES = [
  { id: 'tpl-1', name: 'Employees', description: 'Import employee records', fields: ['first_name', 'last_name', 'email', 'phone', 'role', 'department', 'start_date'] },
  { id: 'tpl-2', name: 'Shifts', description: 'Import shift schedules', fields: ['date', 'start_time', 'end_time', 'location', 'employee_email', 'role'] },
  { id: 'tpl-3', name: 'Skills', description: 'Import employee skills', fields: ['employee_email', 'skill_name', 'level', 'verified', 'expiry_date'] },
];

// ============================================================
// REPORTS
// ============================================================
export const DEMO_HOURS_REPORT = {
  summary: { totalScheduled: 1248, totalWorked: 1192, variance: -4.5, overtime: 48 },
  byEmployee: DEMO_EMPLOYEES.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`,
    scheduled: e.hours_target * 4,
    worked: e.hours_this_week * 4,
    overtime: Math.max(0, (e.hours_this_week * 4) - (e.hours_target * 4)),
  })),
};

export const DEMO_ATTENDANCE_REPORT = {
  summary: { totalShifts: 156, onTime: 142, late: 10, noShow: 4, punctualityRate: 91 },
  byEmployee: DEMO_EMPLOYEES.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`,
    shifts: 20, onTime: 18, late: 2, noShow: 0, punctualityRate: 90,
  })),
};

export const DEMO_LABOR_COST_REPORT = {
  summary: { totalCost: 18720, scheduledCost: 19500, variance: -4, averageRate: 12.25 },
  byLocation: DEMO_LOCATIONS.map(l => ({
    id: l.id, name: l.name, cost: Math.round(Math.random() * 3000 + 2000), hours: Math.round(Math.random() * 200 + 100),
  })),
  trend: [
    { week: 'Week 1', cost: 4200 },
    { week: 'Week 2', cost: 4680 },
    { week: 'Week 3', cost: 4520 },
    { week: 'Week 4', cost: 5320 },
  ],
};

// ============================================================
// SHIFT TEMPLATES
// ============================================================
export const DEMO_SHIFT_TEMPLATES = [
  { id: 'tpl-1', name: 'Weekday Standard', description: 'Mon-Fri typical coverage', shifts_count: 15, locations: ['Main Restaurant', 'Bar & Lounge'], created_at: '2025-12-01' },
  { id: 'tpl-2', name: 'Weekend Busy', description: 'Enhanced weekend staffing', shifts_count: 20, locations: ['Main Restaurant', 'Bar & Lounge', 'Events'], created_at: '2025-12-05' },
  { id: 'tpl-3', name: 'Event Night', description: 'Special event coverage', shifts_count: 25, locations: ['Events/Banqueting'], created_at: '2025-12-10' },
  { id: 'tpl-4', name: 'Holiday Season', description: 'Peak holiday period', shifts_count: 30, locations: ['All Locations'], created_at: '2025-12-15' },
  { id: 'tpl-5', name: 'Minimal Coverage', description: 'Reduced hours for quiet periods', shifts_count: 8, locations: ['Main Restaurant'], created_at: '2025-12-20' },
];

// ============================================================
// API KEYS
// ============================================================
export const DEMO_API_KEYS = [
  { id: 'key-1', name: 'Production API Key', prefix: 'uplift_live_7x9k...mP2q', created_at: '2025-10-15', last_used: new Date(Date.now() - 300000).toISOString(), scope: 'Full access' },
  { id: 'key-2', name: 'Development Key', prefix: 'uplift_test_3nR4...jL8w', created_at: '2025-12-01', last_used: new Date(Date.now() - 7200000).toISOString(), scope: 'Read only' },
  { id: 'key-3', name: 'Webhook Signing Key', prefix: 'uplift_whk_9aB2...cD4e', created_at: '2026-01-10', last_used: null, scope: 'Webhooks' },
];

// ============================================================
// CUSTOM INTEGRATIONS (API FACTORY)
// ============================================================
export const DEMO_CUSTOM_INTEGRATIONS = [
  { id: 'custom-1', name: 'Sync to Legacy HR System', endpoint: 'https://legacy.grandhotel.com/api/employees', method: 'POST', runs: 156, status: 'active', lastRun: new Date(Date.now() - 3600000).toISOString() },
  { id: 'custom-2', name: 'Export Timesheets to Finance', endpoint: 'https://finance.grandhotel.com/import/timesheets', method: 'GET', runs: 89, status: 'active', lastRun: new Date(Date.now() - 86400000).toISOString() },
  { id: 'custom-3', name: 'POS Transaction Sync', endpoint: 'webhook://pos-events', method: 'WEBHOOK', runs: 1204, status: 'active', lastRun: new Date(Date.now() - 600000).toISOString() },
];

// ============================================================
// NOTIFICATIONS
// ============================================================
export const DEMO_NOTIFICATIONS = [
  { id: 'notif-1', type: 'shift_swap', title: 'Shift swap request', message: 'James Kimani requested to swap shifts', read: false, created_at: new Date().toISOString() },
  { id: 'notif-2', type: 'time_off', title: 'Time off request', message: 'Maria Lopez submitted a time off request', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'notif-3', type: 'certification', title: 'Certification expiring', message: "Sophie Bernard's First Aid expires in 28 days", read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
];

// ============================================================
// TIME OFF
// ============================================================
export const DEMO_TIME_OFF_POLICIES = [
  { id: 'pol-1', name: 'Annual Leave', days_per_year: 28, carry_over_limit: 5 },
  { id: 'pol-2', name: 'Sick Leave', days_per_year: 10, carry_over_limit: 0 },
  { id: 'pol-3', name: 'Compassionate Leave', days_per_year: 5, carry_over_limit: 0 },
];

export const DEMO_TIME_OFF_REQUESTS = [
  { id: 'req-1', employee_id: 'emp-003', employee_name: 'Maria Lopez', type: 'Annual Leave', start_date: '2026-02-15', end_date: '2026-02-17', days: 3, status: 'pending', reason: 'Family vacation' },
  { id: 'req-2', employee_id: 'emp-006', employee_name: 'Emma Thompson', type: 'Annual Leave', start_date: '2026-03-01', end_date: '2026-03-05', days: 5, status: 'pending', reason: 'Holiday' },
  { id: 'req-3', employee_id: 'emp-007', employee_name: 'Oluwaseun Adebayo', type: 'Annual Leave', start_date: '2026-02-20', end_date: '2026-02-21', days: 2, status: 'pending', reason: 'Personal' },
];

export const DEMO_TIME_OFF_BALANCES = [
  { id: 'bal-1', policy_name: 'Annual Leave', entitlement: 28, used: 8, pending: 3, remaining: 17 },
  { id: 'bal-2', policy_name: 'Sick Leave', entitlement: 10, used: 2, pending: 0, remaining: 8 },
];

// ============================================================
// SHIFT SWAPS
// ============================================================
export const DEMO_SHIFT_SWAPS = [
  { id: 'swap-1', from_employee: 'James Kimani', to_employee: 'Sarah Mitchell', shift_date: '2026-02-05', status: 'pending', reason: 'Personal appointment' },
  { id: 'swap-2', from_employee: 'Maria Lopez', to_employee: 'Emma Thompson', shift_date: '2026-02-07', status: 'pending', reason: 'Family event' },
];

// ============================================================
// SCHEDULE PERIODS
// ============================================================
export const DEMO_SCHEDULE_PERIODS = [
  { id: 'period-1', name: 'Week 5 2026', start_date: '2026-01-27', end_date: '2026-02-02', status: 'published' },
  { id: 'period-2', name: 'Week 6 2026', start_date: '2026-02-03', end_date: '2026-02-09', status: 'draft' },
];

// ============================================================
// ROLES
// ============================================================
export const DEMO_ROLES = [
  { id: 'role-1', name: 'Server', department: 'Front of House' },
  { id: 'role-2', name: 'Senior Server', department: 'Front of House' },
  { id: 'role-3', name: 'Bartender', department: 'Front of House' },
  { id: 'role-4', name: 'Host', department: 'Front of House' },
  { id: 'role-5', name: 'Supervisor', department: 'Management' },
  { id: 'role-6', name: 'Manager', department: 'Management' },
];

// ============================================================
// DEMO USER (for login)
// ============================================================
export const DEMO_USER = {
  id: 'user-demo',
  email: 'demo@grandhotel.com',
  firstName: 'Demo',
  lastName: 'Admin',
  role: 'admin',
  permissions: ['manage_employees', 'manage_schedules', 'approve_time', 'view_reports', 'manage_settings', 'manage_integrations', 'manage_org'],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
export const getEmployeeById = (id) => DEMO_EMPLOYEES.find(e => e.id === id);
export const getLocationById = (id) => DEMO_LOCATIONS.find(l => l.id === id);
export const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
};

export default {
  DEMO_LOCATIONS,
  DEMO_DEPARTMENTS,
  DEMO_SKILLS,
  DEMO_EMPLOYEES,
  DEMO_OPPORTUNITIES,
  DEMO_TIME_ENTRIES,
  DEMO_DASHBOARD,
  DEMO_INTEGRATIONS,
  DEMO_USERS,
  DEMO_SESSIONS,
  DEMO_WEBHOOKS,
  DEMO_ORGANIZATION,
  DEMO_BRANDING,
  DEMO_NAVIGATION,
  DEMO_EMPLOYEE_VISIBILITY,
  DEMO_ACTIVITIES,
  DEMO_CAREER,
  DEMO_IMPORT_TEMPLATES,
  DEMO_HOURS_REPORT,
  DEMO_ATTENDANCE_REPORT,
  DEMO_LABOR_COST_REPORT,
  DEMO_SHIFT_TEMPLATES,
  DEMO_API_KEYS,
  DEMO_CUSTOM_INTEGRATIONS,
  DEMO_NOTIFICATIONS,
  DEMO_TIME_OFF_POLICIES,
  DEMO_TIME_OFF_REQUESTS,
  DEMO_TIME_OFF_BALANCES,
  DEMO_SHIFT_SWAPS,
  DEMO_SCHEDULE_PERIODS,
  DEMO_ROLES,
  DEMO_USER,
  generateDemoShifts,
  generateTimeEntries,
  getEmployeeById,
  getLocationById,
  getWeekStart,
};
