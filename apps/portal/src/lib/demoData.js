// ============================================================
// UPLIFT PORTAL - DEMO DATA
// Grand Metropolitan Hotel Group (9 properties across 8 countries)
// ============================================================

// ============================================================
// LOCATIONS (Grand Metropolitan Hotel Properties)
// ============================================================
export const DEMO_LOCATIONS = [
  { id: 'loc-london', name: 'London Mayfair', code: 'GMH-LDN', capacity: 45, type: 'flagship', status: 'active', employee_count: 35, address: '45 Park Lane, Mayfair, London W1K 1PN' },
  { id: 'loc-paris', name: 'Paris Champs-Élysées', code: 'GMH-PAR', capacity: 30, type: 'luxury', status: 'active', employee_count: 25, address: '25 Avenue des Champs-Élysées, 75008 Paris' },
  { id: 'loc-dubai', name: 'Dubai Marina', code: 'GMH-DXB', capacity: 25, type: 'resort', status: 'active', employee_count: 20, address: 'Marina Walk, Dubai Marina, Dubai' },
  { id: 'loc-newyork', name: 'New York Central Park', code: 'GMH-NYC', capacity: 22, type: 'luxury', status: 'active', employee_count: 18, address: '768 Fifth Avenue, New York, NY 10019' },
  { id: 'loc-tokyo', name: 'Tokyo Ginza', code: 'GMH-TYO', capacity: 18, type: 'boutique', status: 'active', employee_count: 15, address: '6-10-1 Ginza, Chuo-ku, Tokyo 104-0061' },
  { id: 'loc-barcelona', name: 'Barcelona Gothic Quarter', code: 'GMH-BCN', capacity: 15, type: 'boutique', status: 'active', employee_count: 12, address: 'Carrer de Ferran 42, 08002 Barcelona' },
  { id: 'loc-sydney', name: 'Sydney Harbour', code: 'GMH-SYD', capacity: 12, type: 'waterfront', status: 'active', employee_count: 10, address: '7 Hickson Road, The Rocks, Sydney NSW 2000' },
  { id: 'loc-rome', name: 'Rome Via Veneto', code: 'GMH-ROM', capacity: 10, type: 'boutique', status: 'active', employee_count: 8, address: 'Via Vittorio Veneto 155, 00187 Roma' },
  { id: 'loc-amsterdam', name: 'Amsterdam Canal District', code: 'GMH-AMS', capacity: 10, type: 'boutique', status: 'active', employee_count: 7, address: 'Herengracht 542, 1017 CG Amsterdam' },
];

// ============================================================
// DEPARTMENTS
// ============================================================
export const DEMO_DEPARTMENTS = [
  { id: 'dept-foh', name: 'Front of House', code: 'FOH', employee_count: 35 },
  { id: 'dept-kitchen', name: 'Kitchen', code: 'KIT', employee_count: 28 },
  { id: 'dept-housekeeping', name: 'Housekeeping', code: 'HK', employee_count: 25 },
  { id: 'dept-bar', name: 'Bar & Beverage', code: 'BAR', employee_count: 18 },
  { id: 'dept-eng', name: 'Engineering & Facilities', code: 'ENG', employee_count: 12 },
  { id: 'dept-hr', name: 'Human Resources', code: 'HR', employee_count: 8 },
  { id: 'dept-spa', name: 'Spa & Wellness', code: 'SPA', employee_count: 10 },
  { id: 'dept-fin', name: 'Finance & Administration', code: 'FIN', employee_count: 8 },
  { id: 'dept-events', name: 'Events & Conferences', code: 'EVT', employee_count: 6 },
];

// ============================================================
// SKILLS (Hospitality & Service focused)
// ============================================================
export const DEMO_SKILLS = [
  // Certifications
  { id: 'cert-foodsafety2', name: 'Food Safety Level 2', category: 'Certifications', employee_count: 85, verified_count: 82, mandatory: true },
  { id: 'cert-foodsafety3', name: 'Food Safety Level 3', category: 'Certifications', employee_count: 28, verified_count: 25, mandatory: false },
  { id: 'cert-allergen', name: 'Allergen Awareness', category: 'Certifications', employee_count: 95, verified_count: 90, mandatory: true },
  { id: 'cert-firstaid', name: 'First Aid at Work', category: 'Certifications', employee_count: 35, verified_count: 32, mandatory: true },
  { id: 'cert-fire', name: 'Fire Marshal', category: 'Certifications', employee_count: 22, verified_count: 20, mandatory: false },
  { id: 'cert-manual', name: 'Manual Handling', category: 'Certifications', employee_count: 120, verified_count: 115, mandatory: true },
  { id: 'cert-wset2', name: 'WSET Wine Level 2', category: 'Certifications', employee_count: 18, verified_count: 16, mandatory: false },
  { id: 'cert-wset3', name: 'WSET Wine Level 3', category: 'Certifications', employee_count: 8, verified_count: 7, mandatory: false },
  // Operational Skills
  { id: 'op-barista', name: 'Barista Skills', category: 'Operational Skills', employee_count: 45, verified_count: 42 },
  { id: 'op-mixology', name: 'Mixology', category: 'Operational Skills', employee_count: 22, verified_count: 20 },
  { id: 'op-silver', name: 'Silver Service', category: 'Operational Skills', employee_count: 55, verified_count: 50 },
  { id: 'op-opera', name: 'Opera PMS', category: 'Operational Skills', employee_count: 40, verified_count: 38 },
  { id: 'op-micros', name: 'Micros POS', category: 'Operational Skills', employee_count: 65, verified_count: 60 },
  { id: 'op-housekeeping', name: 'Housekeeping Standards', category: 'Operational Skills', employee_count: 28, verified_count: 25 },
  { id: 'op-revenue', name: 'Revenue Management', category: 'Operational Skills', employee_count: 12, verified_count: 10 },
  { id: 'op-spa', name: 'Spa Therapy NVQ', category: 'Operational Skills', employee_count: 10, verified_count: 9 },
  // Languages
  { id: 'lang-en', name: 'English', category: 'Languages', employee_count: 145, verified_count: 145 },
  { id: 'lang-fr', name: 'French', category: 'Languages', employee_count: 45, verified_count: 42 },
  { id: 'lang-es', name: 'Spanish', category: 'Languages', employee_count: 38, verified_count: 35 },
  { id: 'lang-ar', name: 'Arabic', category: 'Languages', employee_count: 25, verified_count: 22 },
  { id: 'lang-ja', name: 'Japanese', category: 'Languages', employee_count: 18, verified_count: 16 },
  { id: 'lang-it', name: 'Italian', category: 'Languages', employee_count: 15, verified_count: 14 },
  // Soft Skills
  { id: 'soft-leadership', name: 'Team Leadership', category: 'Soft Skills', employee_count: 35, verified_count: 32 },
  { id: 'soft-guest', name: 'Guest Relations Excellence', category: 'Soft Skills', employee_count: 110, verified_count: 105 },
  { id: 'soft-conflict', name: 'Conflict Resolution', category: 'Soft Skills', employee_count: 45, verified_count: 40 },
  { id: 'soft-upselling', name: 'Upselling Techniques', category: 'Soft Skills', employee_count: 55, verified_count: 50 },
];

// ============================================================
// 8 EMPLOYEES (Hospitality roles)
// ============================================================
export const DEMO_EMPLOYEES = [
  {
    id: 'emp-001', first_name: 'Oliver', last_name: 'Richardson', email: 'oliver.richardson@grandmetropolitan.com', phone: '+44 7700 900001',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    role: 'Front Desk Manager', department: 'Front of House', department_id: 'dept-foh',
    location: 'London Mayfair', location_id: 'loc-london',
    start_date: '2019-03-15', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 42, hourly_rate: 18.50, momentum_score: 94,
    certifications: [
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'valid', obtained: '2024-06-15', expires: '2027-06-15' },
      { skill_id: 'cert-fire', name: 'Fire Marshal', status: 'valid', obtained: '2025-01-10', expires: '2028-01-10' },
    ],
    operational_skills: [
      { skill_id: 'op-opera', name: 'Opera PMS', level: 5 },
      { skill_id: 'op-revenue', name: 'Revenue Management', level: 4 },
      { skill_id: 'op-guest', name: 'Guest Relations Excellence', level: 5 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Native' }, { skill_id: 'lang-fr', name: 'French', level: 'Fluent' }],
  },
  {
    id: 'emp-002', first_name: 'Sophie', last_name: 'Dubois', email: 'sophie.dubois@grandmetropolitan.com', phone: '+33 6 12 34 56 78',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    role: 'Head Chef', department: 'Kitchen', department_id: 'dept-kitchen',
    location: 'Paris Champs-Élysées', location_id: 'loc-paris',
    start_date: '2021-06-01', status: 'active', contract_type: 'Full-time',
    hours_target: 45, hours_this_week: 48, hourly_rate: 22.00, momentum_score: 89,
    certifications: [
      { skill_id: 'cert-foodsafety3', name: 'Food Safety Level 3', status: 'valid', obtained: '2024-07-20', expires: '2027-07-20' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'valid', obtained: '2024-06-15', expires: '2027-06-15' },
    ],
    operational_skills: [
      { skill_id: 'op-silver', name: 'Silver Service', level: 5 },
    ],
    languages: [{ skill_id: 'lang-fr', name: 'French', level: 'Native' }, { skill_id: 'lang-en', name: 'English', level: 'Fluent' }],
  },
  {
    id: 'emp-003', first_name: 'Ahmed', last_name: 'Al-Rashid', email: 'ahmed.alrashid@grandmetropolitan.com', phone: '+971 50 123 4567',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    role: 'Sommelier', department: 'Bar & Beverage', department_id: 'dept-bar',
    location: 'Dubai Marina', location_id: 'loc-dubai',
    start_date: '2022-09-10', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 40, hourly_rate: 16.50, momentum_score: 86,
    certifications: [
      { skill_id: 'cert-wset3', name: 'WSET Wine Level 3', status: 'valid', obtained: '2024-09-25', expires: null },
      { skill_id: 'cert-foodsafety2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-02-15', expires: '2027-02-15' },
    ],
    operational_skills: [
      { skill_id: 'op-mixology', name: 'Mixology', level: 5 },
      { skill_id: 'op-upselling', name: 'Upselling Techniques', level: 4 },
    ],
    languages: [{ skill_id: 'lang-ar', name: 'Arabic', level: 'Native' }, { skill_id: 'lang-en', name: 'English', level: 'Fluent' }],
  },
  {
    id: 'emp-004', first_name: 'Michael', last_name: 'Chen', email: 'michael.chen@grandmetropolitan.com', phone: '+1 212 555 0147',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    role: 'Night Manager', department: 'Front of House', department_id: 'dept-foh',
    location: 'New York Central Park', location_id: 'loc-newyork',
    start_date: '2020-11-20', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 44, hourly_rate: 20.00, momentum_score: 91,
    certifications: [
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'valid', obtained: '2023-05-10', expires: '2026-05-10' },
      { skill_id: 'cert-fire', name: 'Fire Marshal', status: 'valid', obtained: '2024-03-15', expires: '2027-03-15' },
    ],
    operational_skills: [
      { skill_id: 'op-opera', name: 'Opera PMS', level: 5 },
      { skill_id: 'op-conflict', name: 'Conflict Resolution', level: 4 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Native' }, { skill_id: 'lang-ja', name: 'Japanese', level: 'Conversational' }],
  },
  {
    id: 'emp-005', first_name: 'Yuki', last_name: 'Tanaka', email: 'yuki.tanaka@grandmetropolitan.com', phone: '+81 90 1234 5678',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    role: 'Receptionist', department: 'Front of House', department_id: 'dept-foh',
    location: 'Tokyo Ginza', location_id: 'loc-tokyo',
    start_date: '2024-12-02', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 38, hourly_rate: 14.00, momentum_score: 72,
    probation: { status: true, end_date: '2025-03-02' },
    certifications: [
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'pending_exam', scheduled: '2026-02-01' },
    ],
    operational_skills: [
      { skill_id: 'op-opera', name: 'Opera PMS', level: 2 },
      { skill_id: 'op-guest', name: 'Guest Relations Excellence', level: 3 },
    ],
    languages: [{ skill_id: 'lang-ja', name: 'Japanese', level: 'Native' }, { skill_id: 'lang-en', name: 'English', level: 'Fluent' }],
  },
  {
    id: 'emp-006', first_name: 'Isabella', last_name: 'Romano', email: 'isabella.romano@grandmetropolitan.com', phone: '+39 333 123 4567',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    role: 'Spa Manager', department: 'Spa & Wellness', department_id: 'dept-spa',
    location: 'Rome Via Veneto', location_id: 'loc-rome',
    start_date: '2021-08-14', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 40, hourly_rate: 17.00, momentum_score: 88,
    certifications: [
      { skill_id: 'cert-spa', name: 'Spa Therapy NVQ', status: 'valid', obtained: '2023-09-01', expires: null },
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'valid', obtained: '2025-04-10', expires: '2028-04-10' },
    ],
    operational_skills: [
      { skill_id: 'op-spa', name: 'Spa Therapy NVQ', level: 5 },
    ],
    languages: [{ skill_id: 'lang-it', name: 'Italian', level: 'Native' }, { skill_id: 'lang-en', name: 'English', level: 'Fluent' }],
  },
  {
    id: 'emp-007', first_name: 'Carlos', last_name: 'Martinez', email: 'carlos.martinez@grandmetropolitan.com', phone: '+34 612 345 678',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    role: 'Housekeeping Supervisor', department: 'Housekeeping', department_id: 'dept-housekeeping',
    location: 'Barcelona Gothic Quarter', location_id: 'loc-barcelona',
    start_date: '2023-04-22', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 42, hourly_rate: 14.50, momentum_score: 84,
    certifications: [
      { skill_id: 'cert-manual', name: 'Manual Handling', status: 'valid', obtained: '2024-05-10', expires: '2027-05-10' },
      { skill_id: 'cert-fire', name: 'Fire Marshal', status: 'valid', obtained: '2024-05-15', expires: '2027-05-15' },
    ],
    operational_skills: [
      { skill_id: 'op-housekeeping', name: 'Housekeeping Standards', level: 5 },
    ],
    languages: [{ skill_id: 'lang-es', name: 'Spanish', level: 'Native' }, { skill_id: 'lang-en', name: 'English', level: 'Fluent' }],
  },
  {
    id: 'emp-008', first_name: 'Emma', last_name: 'Williams', email: 'emma.williams@grandmetropolitan.com', phone: '+61 412 345 678',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    role: 'Events Coordinator', department: 'Events & Conferences', department_id: 'dept-events',
    location: 'Sydney Harbour', location_id: 'loc-sydney',
    start_date: '2020-09-01', status: 'active', contract_type: 'Full-time',
    hours_target: 40, hours_this_week: 38, hourly_rate: 18.00, momentum_score: 96,
    certifications: [
      { skill_id: 'cert-foodsafety2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-03-20', expires: '2027-03-20' },
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'valid', obtained: '2023-11-15', expires: '2026-11-15' },
    ],
    operational_skills: [
      { skill_id: 'op-micros', name: 'Micros POS', level: 4 },
      { skill_id: 'op-upselling', name: 'Upselling Techniques', level: 5 },
    ],
    languages: [{ skill_id: 'lang-en', name: 'English', level: 'Native' }, { skill_id: 'lang-fr', name: 'French', level: 'Conversational' }],
  },
];

// ============================================================
// CAREER OPPORTUNITIES
// ============================================================
export const DEMO_OPPORTUNITIES = [
  {
    id: 'opp-001', title: 'Duty Manager', location: 'London Mayfair', location_id: 'loc-london',
    department: 'Front of House', salary_min: 35000, salary_max: 42000, salary_display: '£35,000 - £42,000',
    type: 'Promotion', employment_type: 'Full-time', deadline: '2026-02-15', posted: '2026-01-10', status: 'open',
    description: 'Oversee daily hotel operations, ensuring exceptional guest experience and team performance.',
    requirements: ['3+ years hospitality experience', 'Opera PMS proficiency', 'Team leadership experience'],
    applications: 3,
  },
  {
    id: 'opp-002', title: 'Executive Chef', location: 'Paris Champs-Élysées', location_id: 'loc-paris',
    department: 'Kitchen', salary_min: 48000, salary_max: 58000, salary_display: '€48,000 - €58,000',
    type: 'Lateral Move', employment_type: 'Full-time', deadline: '2026-02-28', posted: '2026-01-15', status: 'open',
    description: 'Lead our Michelin-aspiring kitchen team and develop innovative seasonal menus.',
    requirements: ['Food Safety Level 3', '5+ years fine dining experience', 'Menu development portfolio'],
    applications: 5,
  },
  {
    id: 'opp-003', title: 'Head Bartender', location: 'Dubai Marina', location_id: 'loc-dubai',
    department: 'Bar & Beverage', salary_min: 32000, salary_max: 38000, salary_display: 'AED 120,000 - 140,000',
    type: 'Promotion', employment_type: 'Full-time', deadline: '2026-02-20', posted: '2026-01-12', status: 'open',
    description: 'Lead the bar team, create signature cocktails, and drive beverage revenue.',
    requirements: ['Mixology expertise', 'WSET Level 2 minimum', 'Team leadership'],
    applications: 4,
  },
  {
    id: 'opp-004', title: 'Revenue Manager', location: 'New York Central Park', location_id: 'loc-newyork',
    department: 'Finance & Administration', salary_min: 65000, salary_max: 80000, salary_display: '$65,000 - $80,000',
    type: 'Promotion', employment_type: 'Full-time', deadline: '2026-03-10', posted: '2026-01-20', status: 'open',
    description: 'Maximize room revenue through strategic pricing and inventory management.',
    requirements: ['Revenue management certification', '3+ years hotel revenue experience', 'Strong analytics skills'],
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
        { start: '06:00', end: '14:00' },
        { start: '14:00', end: '22:00' },
        { start: '08:00', end: '16:30' },
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
    { name: 'Early', start: '06:00', end: '14:00' },
    { name: 'Day', start: '08:00', end: '16:30' },
    { name: 'Late', start: '14:00', end: '22:00' },
  ];
  DEMO_LOCATIONS.forEach(loc => {
    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      const staffNeeded = loc.capacity > 100 ? 8 : loc.capacity > 30 ? 4 : 2;
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
          required_skills: ['Manual Handling'],
          hourly_rate: 13.00,
          cost: 104,
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
  realtime: { onShiftNow: 185, onBreak: 22, clockedIn: 180, runningLate: 3, openShifts: 12 },
  today: { shifts: { total: 220, filled: 208 } },
  activeEmployees: 451,
  openShifts: 12,
  pendingApprovals: { timesheets: 18, time_off: 8, swaps: 4 },
  lifecycleMetrics: { retentionRate: 93, newHires: 12, onboarding: 4, avgTenure: '3.8 years' },
  weekMetrics: { scheduled: 3420, worked: 3380, cost_scheduled: 51300, cost_actual: 50700 },
  weeklyChart: [
    { day: 'Mon', scheduled: 520, worked: 515 },
    { day: 'Tue', scheduled: 540, worked: 535 },
    { day: 'Wed', scheduled: 510, worked: 505 },
    { day: 'Thu', scheduled: 530, worked: 520 },
    { day: 'Fri', scheduled: 550, worked: 545 },
    { day: 'Sat', scheduled: 420, worked: 415 },
    { day: 'Sun', scheduled: 350, worked: 345 },
  ],
  complianceAlerts: [
    { id: 'alert-1', type: 'expiring', severity: 'warning', title: 'Certifications expiring within 30 days', employees: [
      { id: 'emp-003', name: 'Piotr Kowalski', skill: 'COSHH Awareness', expiresIn: '12 days' },
    ]},
  ],
  activityFeed: [
    { id: 'act-1', type: 'clock_in', user: 'James Wilson', action: 'clocked in', location: 'London Mayfair', time: '5 min ago' },
    { id: 'act-2', type: 'shift_swap', user: 'Mike Johnson', action: 'requested shift swap with Tom Davies', time: '12 min ago' },
    { id: 'act-3', type: 'recognition', user: 'Claire Bennett', action: 'received recognition', message: 'Excellent lab work!', time: '1 hr ago' },
  ],
  recentRecognitions: [
    { id: 'rec-1', emoji: '🏆', message: 'Zero defects this month!', from: 'James Wilson', to: 'Sarah Thompson', likes: 24 },
    { id: 'rec-2', emoji: '🔧', message: 'Fixed the injection moulder in record time', from: 'Manager', to: 'Hans Mueller', likes: 18 },
  ],
  metrics: {
    totalEmployees: 451,
    activeToday: 185, onShiftNow: 185, onBreak: 22, clockedIn: 180, runningLate: 3,
    openShifts: 12, pendingApprovals: 30, certificationsExpiring: 8, trainingOverdue: 3,
    avgMomentum: 78, shiftsFilled: 95, retention: 93, hoursThisWeek: 3420, taskCompletion: 91,
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
  { id: 'int-sap-erp', name: 'SAP ERP', type: 'erp', category: 'ERP', status: 'connected', last_sync: new Date(Date.now() - 1800000).toISOString(), logo: '🔷' },
  { id: 'int-oracle', name: 'Oracle NetSuite', type: 'erp', category: 'ERP', status: 'available', last_sync: null, logo: '🔴' },
];

// ============================================================
// SETTINGS DATA
// ============================================================
export const DEMO_USERS = [
  { id: 'user-1', email: 'admin@grandmetropolitan.com', firstName: 'Robert', lastName: 'Hughes', role: 'admin', status: 'active', lastLogin: new Date(Date.now() - 3600000).toISOString() },
  { id: 'user-2', email: 'manager@grandmetropolitan.com', firstName: 'James', lastName: 'Wilson', role: 'manager', status: 'active', lastLogin: new Date(Date.now() - 7200000).toISOString() },
  { id: 'user-3', email: 'supervisor@grandmetropolitan.com', firstName: 'Sarah', lastName: 'Thompson', role: 'supervisor', status: 'active', lastLogin: new Date(Date.now() - 86400000).toISOString() },
  { id: 'user-4', email: 'hr@grandmetropolitan.com', firstName: 'Emma', lastName: 'Roberts', role: 'hr', status: 'active', lastLogin: new Date(Date.now() - 172800000).toISOString() },
  { id: 'user-5', email: 'viewer@grandmetropolitan.com', firstName: 'Tom', lastName: 'Davies', role: 'viewer', status: 'invited', lastLogin: null },
];

export const DEMO_SESSIONS = [
  { id: 'sess-1', device: 'Chrome on MacOS', ip: '192.168.1.100', location: 'London, UK', lastActive: new Date().toISOString(), current: true },
  { id: 'sess-2', device: 'Safari on iPhone', ip: '192.168.1.101', location: 'London, UK', lastActive: new Date(Date.now() - 3600000).toISOString(), current: false },
  { id: 'sess-3', device: 'Firefox on Windows', ip: '10.0.0.50', location: 'Paris, FR', lastActive: new Date(Date.now() - 86400000).toISOString(), current: false },
];

export const DEMO_WEBHOOKS = [
  { id: 'wh-1', name: 'Slack Notifications', url: 'https://hooks.slack.com/services/xxx', events: ['shift.created', 'employee.added'], status: 'active', lastTriggered: new Date(Date.now() - 1800000).toISOString(), successRate: 99 },
  { id: 'wh-2', name: 'HR System Sync', url: 'https://hr.grandmetropolitan.com/webhook', events: ['employee.updated', 'employee.removed'], status: 'active', lastTriggered: new Date(Date.now() - 7200000).toISOString(), successRate: 97 },
];

export const DEMO_ORGANIZATION = {
  id: 'org-1',
  name: 'Grand Metropolitan Hotel Group',
  industry: 'Hospitality',
  employees_count: 150,
  locations_count: DEMO_LOCATIONS.length,
  timezone: 'Europe/London',
  currency: 'GBP',
};

export const DEMO_BRANDING = {
  primaryColor: '#1e3a5f',
  companyName: 'Grand Metropolitan',
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
  { id: 'act-1', type: 'employee_added', user: 'Robert Hughes', target: 'Tom Davies', message: 'Added new employee', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'act-2', type: 'shift_created', user: 'James Wilson', target: null, message: 'Created 12 shifts for next week', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'act-3', type: 'time_off_approved', user: 'Sarah Thompson', target: 'Piotr Kowalski', message: 'Approved time off request', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'act-4', type: 'skill_verified', user: 'Emma Roberts', target: 'Claire Bennett', message: 'Verified COSHH Awareness', timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: 'act-5', type: 'integration_connected', user: 'Robert Hughes', target: 'SAP ERP', message: 'Connected SAP ERP integration', timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: 'act-6', type: 'schedule_published', user: 'James Wilson', target: 'Week 6', message: 'Published schedule for Week 6', timestamp: new Date(Date.now() - 18000000).toISOString() },
  { id: 'act-7', type: 'employee_promoted', user: 'Robert Hughes', target: 'Sarah Thompson', message: 'Promoted to Front Desk Manager', timestamp: new Date(Date.now() - 21600000).toISOString() },
  { id: 'act-8', type: 'shift_swap_approved', user: 'James Wilson', target: 'Mike Johnson <> Tom Davies', message: 'Approved shift swap', timestamp: new Date(Date.now() - 25200000).toISOString() },
  { id: 'act-9', type: 'report_generated', user: 'Emma Roberts', target: 'Labour Cost Report', message: 'Generated monthly report', timestamp: new Date(Date.now() - 28800000).toISOString() },
  { id: 'act-10', type: 'location_added', user: 'Robert Hughes', target: 'Milan Office', message: 'Added new location', timestamp: new Date(Date.now() - 32400000).toISOString() },
];

// ============================================================
// CAREER
// ============================================================
export const DEMO_CAREER = {
  // My skills for the career page
  mySkills: [
    { id: 'sk-1', name: 'IOSH Managing Safely', category: 'Health & Safety', verified: true, level: 4, expires_at: '2026-08-15' },
    { id: 'sk-2', name: 'NEBOSH General Certificate', category: 'Health & Safety', verified: true, level: 3, expires_at: '2027-03-20' },
    { id: 'sk-3', name: 'Forklift Operation', category: 'Operations', verified: true, level: 4, expires_at: '2026-06-10' },
    { id: 'sk-4', name: 'First Aid at Work', category: 'Health & Safety', verified: true, level: 3, expires_at: '2026-04-05' },
    { id: 'sk-5', name: 'Manual Handling', category: 'Operations', verified: false, level: 2, expires_at: null },
    { id: 'sk-6', name: 'COSHH Awareness', category: 'Health & Safety', verified: false, level: 2, expires_at: null },
  ],
  // Career opportunities
  careerPaths: [
    { id: 'opp-1', title: 'Duty Manager', department_name: 'Front of House', location_name: 'London Mayfair', match_percentage: 85 },
    { id: 'opp-2', title: 'Restaurant Supervisor', department_name: 'Front of House', location_name: 'Paris Champs-Élysées', match_percentage: 72 },
    { id: 'opp-3', title: 'Events Coordinator', department_name: 'Events & Conferences', location_name: 'London Mayfair', match_percentage: 68 },
  ],
  // Skills gap to develop
  skillsGap: [
    { id: 'gap-1', name: 'Team Leadership', category: 'Management', reason: 'Required for Team Leader role' },
    { id: 'gap-2', name: 'Lean Manufacturing', category: 'Operations', reason: 'Required for Shift Supervisor role' },
  ],
  paths: [
    { id: 'path-1', title: 'Front of House Leadership', levels: [
      { role: 'Receptionist', level: 1, skills: ['Guest Relations', 'Opera PMS'] },
      { role: 'Senior Receptionist', level: 2, skills: ['Revenue Management', 'Team Leadership'] },
      { role: 'Front Desk Manager', level: 3, skills: ['Team Leadership', 'Conflict Resolution'] },
      { role: 'Duty Manager', level: 4, skills: ['Strategic Planning', 'Operations Management'] },
    ]},
    { id: 'path-2', title: 'F&B Career Path', levels: [
      { role: 'Server', level: 1, skills: ['Silver Service', 'Food Safety Level 2'] },
      { role: 'Head Waiter', level: 2, skills: ['Team Leadership', 'Wine Knowledge'] },
      { role: 'Restaurant Supervisor', level: 3, skills: ['Team Leadership', 'Inventory Management'] },
      { role: 'Restaurant Manager', level: 4, skills: ['Strategic Planning', 'P&L Management'] },
    ]},
  ],
  insights: DEMO_EMPLOYEES.slice(0, 5).map(e => ({
    employeeId: e.id,
    employeeName: `${e.first_name} ${e.last_name}`,
    currentRole: e.role,
    nextRole: 'Team Leader',
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
  summary: { totalScheduled: 13680, totalWorked: 13520, variance: -1.2, overtime: 340 },
  byEmployee: DEMO_EMPLOYEES.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`,
    scheduled: e.hours_target * 4,
    worked: e.hours_this_week * 4,
    overtime: Math.max(0, (e.hours_this_week * 4) - (e.hours_target * 4)),
  })),
};

export const DEMO_ATTENDANCE_REPORT = {
  summary: { totalShifts: 1720, onTime: 1650, late: 52, noShow: 18, punctualityRate: 96 },
  byEmployee: DEMO_EMPLOYEES.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`,
    shifts: 20, onTime: 19, late: 1, noShow: 0, punctualityRate: 95,
  })),
};

export const DEMO_LABOR_COST_REPORT = {
  summary: { totalCost: 205200, scheduledCost: 210000, variance: -2.3, averageRate: 15.00 },
  byLocation: DEMO_LOCATIONS.map(l => ({
    id: l.id, name: l.name, cost: Math.round(l.employee_count * 15 * 160), hours: l.employee_count * 160,
  })),
  trend: [
    { week: 'Week 1', cost: 48200 },
    { week: 'Week 2', cost: 51300 },
    { week: 'Week 3', cost: 50200 },
    { week: 'Week 4', cost: 55500 },
  ],
};

// ============================================================
// SHIFT TEMPLATES
// ============================================================
export const DEMO_SHIFT_TEMPLATES = [
  { id: 'tpl-1', name: 'Weekday Standard', description: 'Mon-Fri typical coverage', shifts_count: 45, locations: ['London Mayfair', 'Paris Champs-Élysées'], created_at: '2025-12-01' },
  { id: 'tpl-2', name: 'Weekend Peak', description: 'Enhanced weekend staffing', shifts_count: 30, locations: ['London Mayfair'], created_at: '2025-12-05' },
  { id: 'tpl-3', name: 'High Season', description: 'Peak season full coverage', shifts_count: 60, locations: ['London Mayfair', 'Dubai Marina', 'Tokyo Ginza'], created_at: '2025-12-10' },
  { id: 'tpl-4', name: 'Conference Event', description: 'Conference and events coverage', shifts_count: 25, locations: ['All Locations'], created_at: '2025-12-15' },
  { id: 'tpl-5', name: 'Minimal Coverage', description: 'Low season skeleton crew', shifts_count: 12, locations: ['London Mayfair'], created_at: '2025-12-20' },
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
  { id: 'custom-1', name: 'Sync to Opera PMS', endpoint: 'https://opera.grandmetropolitan.com/api/employees', method: 'POST', runs: 456, status: 'active', lastRun: new Date(Date.now() - 3600000).toISOString() },
  { id: 'custom-2', name: 'Export Timesheets to Finance', endpoint: 'https://finance.grandmetropolitan.com/import/timesheets', method: 'GET', runs: 189, status: 'active', lastRun: new Date(Date.now() - 86400000).toISOString() },
  { id: 'custom-3', name: 'Guest Feedback Sync', endpoint: 'webhook://guest-feedback', method: 'WEBHOOK', runs: 2504, status: 'active', lastRun: new Date(Date.now() - 600000).toISOString() },
];

// ============================================================
// NOTIFICATIONS
// ============================================================
export const DEMO_NOTIFICATIONS = [
  { id: 'notif-1', type: 'shift_swap', title: 'Shift swap request', message: 'Mike Johnson requested to swap shifts', read: false, created_at: new Date().toISOString() },
  { id: 'notif-2', type: 'time_off', title: 'Time off request', message: 'Piotr Kowalski submitted a time off request', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'notif-3', type: 'certification', title: 'Certification expiring', message: "Hans Mueller's First Aid expires in 28 days", read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
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
  { id: 'req-1', employee_id: 'emp-003', employee_name: 'Piotr Kowalski', type: 'Annual Leave', start_date: '2026-02-15', end_date: '2026-02-17', days: 3, status: 'pending', reason: 'Family visit in Poland' },
  { id: 'req-2', employee_id: 'emp-006', employee_name: 'Emma Roberts', type: 'Annual Leave', start_date: '2026-03-01', end_date: '2026-03-05', days: 5, status: 'pending', reason: 'Holiday' },
  { id: 'req-3', employee_id: 'emp-007', employee_name: 'Mike Johnson', type: 'Annual Leave', start_date: '2026-02-20', end_date: '2026-02-21', days: 2, status: 'pending', reason: 'Personal' },
];

export const DEMO_TIME_OFF_BALANCES = [
  { id: 'bal-1', policy_name: 'Annual Leave', entitlement: 28, used: 8, pending: 3, remaining: 17 },
  { id: 'bal-2', policy_name: 'Sick Leave', entitlement: 10, used: 2, pending: 0, remaining: 8 },
];

// ============================================================
// SHIFT SWAPS
// ============================================================
export const DEMO_SHIFT_SWAPS = [
  { id: 'swap-1', from_employee: 'Mike Johnson', to_employee: 'Tom Davies', shift_date: '2026-02-05', status: 'pending', reason: 'Personal appointment' },
  { id: 'swap-2', from_employee: 'Piotr Kowalski', to_employee: 'Hans Mueller', shift_date: '2026-02-07', status: 'pending', reason: 'Family event' },
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
  { id: 'role-1', name: 'Receptionist', department: 'Front of House' },
  { id: 'role-2', name: 'Front Desk Manager', department: 'Front of House' },
  { id: 'role-3', name: 'Server', department: 'Front of House' },
  { id: 'role-4', name: 'Bartender', department: 'Bar & Beverage' },
  { id: 'role-5', name: 'Head Chef', department: 'Kitchen' },
  { id: 'role-6', name: 'Sous Chef', department: 'Kitchen' },
  { id: 'role-7', name: 'Room Attendant', department: 'Housekeeping' },
  { id: 'role-8', name: 'Maintenance Engineer', department: 'Engineering & Facilities' },
  { id: 'role-9', name: 'Spa Therapist', department: 'Spa & Wellness' },
];

// ============================================================
// DEMO USER (for login)
// ============================================================
export const DEMO_USER = {
  id: 'user-demo',
  email: 'demo@grandmetropolitan.com',
  firstName: 'Demo',
  lastName: 'Admin',
  role: 'admin',
  permissions: ['manage_employees', 'manage_schedules', 'approve_time', 'view_reports', 'manage_settings', 'manage_integrations', 'manage_org'],
};

// ============================================================
// DEMO_MY_DATA - Personal view data for "My View" / Worker View
// Maria Santos (Front Desk Manager) - the logged-in demo user's personal data
// ============================================================
export const DEMO_MY_DATA = {
  employee: {
    id: 'emp-maria',
    name: 'Maria Santos',
    firstName: 'Maria',
    lastName: 'Santos',
    role: 'Front Desk Manager',
    department: 'Front of House',
    location: 'London Mayfair',
    startDate: '2021-03-15',
    employeeId: 'GMH-0042',
    email: 'maria.santos@grandmetropolitan.com',
    phone: '+44 7700 900042',
  },

  expenses: [
    { id: 'exp-1', date: '2026-02-28', description: 'Train to Paris (regional meeting)', amount: 147.50, category: 'Travel', status: 'approved', receipt: true },
    { id: 'exp-2', date: '2026-03-01', description: 'Client dinner - The Wolseley', amount: 82.80, category: 'Meals', status: 'approved', receipt: true },
    { id: 'exp-3', date: '2026-03-03', description: 'Taxi from Heathrow', amount: 65.00, category: 'Travel', status: 'pending', receipt: true },
  ],

  timeOff: {
    balance: { annual: 25, used: 7, remaining: 18, pending: 2 },
    requests: [
      { id: 'to-1', type: 'Annual Leave', start: '2026-03-24', end: '2026-03-28', days: 5, status: 'approved', submittedDate: '2026-02-15' },
      { id: 'to-2', type: 'Annual Leave', start: '2026-04-18', end: '2026-04-21', days: 2, status: 'pending', submittedDate: '2026-03-01' },
    ],
  },

  shifts: [
    { id: 'sh-1', date: '2026-03-05', start: '07:00', end: '15:30', location: 'London Mayfair', role: 'Front Desk Manager', status: 'confirmed' },
    { id: 'sh-2', date: '2026-03-06', start: '07:00', end: '15:30', location: 'London Mayfair', role: 'Front Desk Manager', status: 'confirmed' },
    { id: 'sh-3', date: '2026-03-07', start: '15:00', end: '23:30', location: 'London Mayfair', role: 'Front Desk Manager', status: 'confirmed' },
    { id: 'sh-4', date: '2026-03-10', start: '07:00', end: '15:30', location: 'London Mayfair', role: 'Front Desk Manager', status: 'confirmed' },
    { id: 'sh-5', date: '2026-03-11', start: '07:00', end: '15:30', location: 'London Mayfair', role: 'Front Desk Manager', status: 'confirmed' },
  ],

  documents: [
    { id: 'doc-1', name: 'Employment Contract', date: '2021-03-15', status: 'signed', category: 'Contract' },
    { id: 'doc-2', name: 'NDA', date: '2021-03-15', status: 'signed', category: 'Legal' },
    { id: 'doc-3', name: 'Pay Change Letter — April 2025', date: '2025-03-28', status: 'signed', category: 'Compensation' },
    { id: 'doc-4', name: 'Benefits Enrolment 2026', date: '2026-01-05', status: 'pending', category: 'Benefits' },
  ],

  performance: {
    currentScore: 4.2,
    lastReview: '2025-12-15',
    nextReview: '2026-06-15',
    goals: [
      { id: 'goal-1', title: 'Complete Revenue Management Certification', progress: 65, deadline: '2026-06-30', status: 'in_progress' },
      { id: 'goal-2', title: 'Improve guest satisfaction scores by 10%', progress: 40, deadline: '2026-09-30', status: 'in_progress' },
      { id: 'goal-3', title: 'Launch VIP guest recognition programme', progress: 90, deadline: '2026-03-31', status: 'in_progress' },
    ],
  },

  skills: [
    { id: 'sk-1', name: 'Opera PMS Advanced', category: 'Certifications', verified: true, expiry: null, level: 5 },
    { id: 'sk-2', name: 'First Aid at Work', category: 'Health & Safety', verified: true, expiry: '2027-01-15', level: 4 },
    { id: 'sk-3', name: 'GDPR Practitioner', category: 'Compliance', verified: true, expiry: '2026-11-30', level: 4 },
    { id: 'sk-4', name: 'Fire Marshal', category: 'Health & Safety', verified: true, expiry: '2026-08-20', level: 3 },
    { id: 'sk-5', name: 'Revenue Management', category: 'Certifications', verified: false, expiry: null, level: 0 },
    { id: 'sk-6', name: 'Guest Relations Excellence', category: 'Soft Skills', verified: true, expiry: null, level: 5 },
  ],

  training: [
    { id: 'tr-1', course: 'Revenue Management Certification', status: 'in_progress', progress: 65, deadline: '2026-06-30' },
    { id: 'tr-2', course: 'Fire Safety Awareness', status: 'completed', completedDate: '2025-11-10', progress: 100 },
    { id: 'tr-3', course: 'GDPR Refresher', status: 'completed', completedDate: '2026-01-22', progress: 100 },
    { id: 'tr-4', course: 'Luxury Service Excellence', status: 'not_started', deadline: '2026-06-30', progress: 0 },
  ],

  timeEntries: [
    { id: 'te-1', date: '2026-03-04', clockIn: '06:55', clockOut: '15:35', hours: 8.67, status: 'approved', location: 'London Mayfair' },
    { id: 'te-2', date: '2026-03-03', clockIn: '07:02', clockOut: '15:28', hours: 8.43, status: 'approved', location: 'London Mayfair' },
    { id: 'te-3', date: '2026-03-02', clockIn: '06:58', clockOut: '15:32', hours: 8.57, status: 'approved', location: 'London Mayfair' },
  ],

  payslips: [
    { id: 'ps-1', period: 'February 2026', periodLabel: 'February 2026', gross: 4166.67, tax: 687.50, ni: 374.17, pension: 208.33, net: 2896.67, date: '2026-02-28', status: 'paid' },
    { id: 'ps-2', period: 'January 2026', periodLabel: 'January 2026', gross: 4166.67, tax: 687.50, ni: 374.17, pension: 208.33, net: 2896.67, date: '2026-01-31', status: 'paid' },
    { id: 'ps-3', period: 'December 2025', periodLabel: 'December 2025', gross: 4166.67, tax: 687.50, ni: 374.17, pension: 208.33, net: 2896.67, date: '2025-12-31', status: 'paid' },
  ],

  notifications: [
    { id: 'notif-1', message: 'Your expense claim for £65.00 is pending approval', date: '2026-03-03', read: false, type: 'expense' },
    { id: 'notif-2', message: 'Time off approved: 24-28 March 2026', date: '2026-03-01', read: true, type: 'time_off' },
    { id: 'notif-3', message: 'New payslip available: February 2026', date: '2026-02-28', read: true, type: 'payslip' },
    { id: 'notif-4', message: 'Complete your CIPD Level 7 module by 30 June', date: '2026-02-25', read: true, type: 'training' },
  ],

  recognition: {
    received: [
      { id: 'rec-r1', from: 'James Wilson', category: 'teamPlayer', message: 'Thank you for helping onboard the new production team members!', date: '2026-02-28', likes: 12 },
      { id: 'rec-r2', from: 'Emma Roberts', category: 'aboveBeyond', message: 'Brilliant job organising the wellbeing week events', date: '2026-02-20', likes: 18 },
    ],
    given: [
      { id: 'rec-g1', to: 'Claire Bennett', category: 'innovation', message: 'Great initiative with the new lab safety protocols!', date: '2026-03-02', likes: 8 },
      { id: 'rec-g2', to: 'Tom Davies', category: 'greatWork', message: 'Excellent progress during your probation period', date: '2026-02-15', likes: 5 },
    ],
  },
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
  DEMO_MY_DATA,
  generateDemoShifts,
  generateTimeEntries,
  getEmployeeById,
  getLocationById,
  getWeekStart,
};
