// ============================================================
// UPLIFT PORTAL - CENTRALIZED DEMO DATA
// Realistic hospitality industry data for C-suite demos
// ============================================================

// ============================================================
// LOCATIONS (5 Grand Hotel Locations)
// ============================================================
export const DEMO_LOCATIONS = [
  { id: 'loc-main', name: 'The Grand Hotel - Main Restaurant', code: 'GH-MAIN', capacity: 40, type: 'restaurant' },
  { id: 'loc-bar', name: 'The Grand Hotel - Bar & Lounge', code: 'GH-BAR', capacity: 15, type: 'bar' },
  { id: 'loc-events', name: 'The Grand Hotel - Events/Banqueting', code: 'GH-EVENTS', capacity: 25, type: 'events' },
  { id: 'loc-room', name: 'The Grand Hotel - Room Service', code: 'GH-ROOM', capacity: 12, type: 'room_service' },
  { id: 'loc-pool', name: 'The Grand Hotel - Pool Bar', code: 'GH-POOL', capacity: 8, type: 'seasonal', seasonal: true },
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
// SKILLS & CERTIFICATIONS
// ============================================================
export const SKILL_CATEGORIES = {
  certifications: {
    name: 'Certifications',
    skills: [
      { id: 'cert-food2', name: 'Food Safety Level 2', mandatory: true, expiryMonths: 36 },
      { id: 'cert-food3', name: 'Food Safety Level 3', mandatory: false, expiryMonths: 36 },
      { id: 'cert-license', name: 'Personal License Holder', mandatory: false, expiryMonths: 0 },
      { id: 'cert-firstaid', name: 'First Aid at Work', mandatory: false, expiryMonths: 36 },
      { id: 'cert-fire', name: 'Fire Marshal', mandatory: false, expiryMonths: 12 },
      { id: 'cert-manual', name: 'Manual Handling', mandatory: false, expiryMonths: 24 },
      { id: 'cert-allergen', name: 'Allergen Awareness', mandatory: true, expiryMonths: 24 },
      { id: 'cert-wset3', name: 'WSET Level 3 Wine', mandatory: false, expiryMonths: 0 },
    ]
  },
  operational: {
    name: 'Operational Skills',
    skills: [
      { id: 'op-table', name: 'Table Service', maxLevel: 5 },
      { id: 'op-wine', name: 'Wine Service / Sommelier', maxLevel: 5 },
      { id: 'op-cocktail', name: 'Cocktail Making', maxLevel: 5 },
      { id: 'op-barista', name: 'Barista', maxLevel: 5 },
      { id: 'op-till', name: 'Till/POS Operation', maxLevel: 5 },
      { id: 'op-reservations', name: 'Reservation Management', maxLevel: 5 },
      { id: 'op-events', name: 'Events Setup', maxLevel: 5 },
      { id: 'op-roomservice', name: 'Room Service Etiquette', maxLevel: 5 },
      { id: 'op-upselling', name: 'Upselling', maxLevel: 5 },
    ]
  },
  languages: {
    name: 'Languages',
    levels: ['Basic', 'Conversational', 'Fluent', 'Native'],
    skills: [
      { id: 'lang-en', name: 'English' },
      { id: 'lang-fr', name: 'French' },
      { id: 'lang-es', name: 'Spanish' },
      { id: 'lang-de', name: 'German' },
      { id: 'lang-it', name: 'Italian' },
      { id: 'lang-zh', name: 'Mandarin' },
      { id: 'lang-ar', name: 'Arabic' },
      { id: 'lang-pl', name: 'Polish' },
      { id: 'lang-pt', name: 'Portuguese' },
      { id: 'lang-sw', name: 'Swahili' },
      { id: 'lang-ur', name: 'Urdu' },
      { id: 'lang-yo', name: 'Yoruba' },
    ]
  },
  soft: {
    name: 'Soft Skills',
    skills: [
      { id: 'soft-customer', name: 'Customer Handling', maxLevel: 5 },
      { id: 'soft-conflict', name: 'Conflict Resolution', maxLevel: 5 },
      { id: 'soft-leadership', name: 'Team Leadership', maxLevel: 5 },
      { id: 'soft-training', name: 'Training/Mentoring', maxLevel: 5 },
    ]
  }
};

// ============================================================
// 8 CORE DEMO EMPLOYEES (Realistic Hospitality Profiles)
// ============================================================
export const DEMO_EMPLOYEES = [
  {
    id: 'emp-001',
    first_name: 'Sarah',
    last_name: 'Mitchell',
    email: 'sarah.mitchell@grandhotel.com',
    phone: '+44 7700 900001',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    role: 'Senior Server',
    department: 'Front of House',
    department_id: 'dept-foh',
    location: 'The Grand Hotel - Main Restaurant',
    location_id: 'loc-main',
    start_date: '2022-03-15',
    status: 'active',
    contract_type: 'Full-time',
    hours_target: 35,
    hours_this_week: 32,
    hourly_rate: 12.50,
    momentum_score: 94,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-06-15', expires: '2027-06-15' },
      { skill_id: 'cert-food3', name: 'Food Safety Level 3', status: 'in_progress', progress: 75 },
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'valid', obtained: '2025-01-10', expires: '2028-01-10' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'valid', obtained: '2025-03-20', expires: '2027-03-20' },
    ],
    operational_skills: [
      { skill_id: 'op-table', name: 'Table Service', level: 5 },
      { skill_id: 'op-wine', name: 'Wine Service', level: 4 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 5 },
      { skill_id: 'op-upselling', name: 'Upselling', level: 4 },
    ],
    languages: [
      { skill_id: 'lang-en', name: 'English', level: 'Native' },
      { skill_id: 'lang-fr', name: 'French', level: 'Conversational' },
    ],
    soft_skills: [
      { skill_id: 'soft-customer', name: 'Customer Handling', level: 5 },
      { skill_id: 'soft-leadership', name: 'Team Leadership', level: 4 },
    ],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
  },
  {
    id: 'emp-002',
    first_name: 'James',
    last_name: 'Kimani',
    email: 'james.kimani@grandhotel.com',
    phone: '+44 7700 900002',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    role: 'Bartender',
    department: 'Front of House',
    department_id: 'dept-foh',
    location: 'The Grand Hotel - Bar & Lounge',
    location_id: 'loc-bar',
    start_date: '2023-06-01',
    status: 'active',
    contract_type: 'Full-time',
    hours_target: 40,
    hours_this_week: 38,
    hourly_rate: 13.00,
    momentum_score: 89,
    certifications: [
      { skill_id: 'cert-license', name: 'Personal License Holder', status: 'valid', obtained: '2024-07-20', expires: null },
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-06-15', expires: '2027-06-15' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'expiring_soon', obtained: '2024-08-10', expires: '2026-04-10' },
    ],
    operational_skills: [
      { skill_id: 'op-cocktail', name: 'Cocktail Making', level: 5 },
      { skill_id: 'op-barista', name: 'Barista', level: 4 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 5 },
      { skill_id: 'op-upselling', name: 'Upselling', level: 4 },
    ],
    languages: [
      { skill_id: 'lang-en', name: 'English', level: 'Native' },
      { skill_id: 'lang-sw', name: 'Swahili', level: 'Native' },
    ],
    soft_skills: [
      { skill_id: 'soft-customer', name: 'Customer Handling', level: 5 },
      { skill_id: 'soft-conflict', name: 'Conflict Resolution', level: 4 },
    ],
    availability: { mon: false, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true },
  },
  {
    id: 'emp-003',
    first_name: 'Maria',
    last_name: 'Lopez',
    email: 'maria.lopez@grandhotel.com',
    phone: '+44 7700 900003',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    role: 'Server',
    department: 'Events',
    department_id: 'dept-events',
    location: 'The Grand Hotel - Events/Banqueting',
    location_id: 'loc-events',
    start_date: '2023-09-10',
    status: 'active',
    contract_type: 'Part-time',
    hours_target: 30,
    hours_this_week: 28,
    hourly_rate: 11.50,
    momentum_score: 86,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-09-25', expires: '2027-09-25' },
      { skill_id: 'cert-manual', name: 'Manual Handling', status: 'valid', obtained: '2024-10-05', expires: '2026-10-05' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'expiring_soon', obtained: '2024-02-15', expires: '2026-02-15' },
    ],
    operational_skills: [
      { skill_id: 'op-table', name: 'Table Service', level: 4 },
      { skill_id: 'op-events', name: 'Events Setup', level: 4 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 3 },
    ],
    languages: [
      { skill_id: 'lang-en', name: 'English', level: 'Fluent' },
      { skill_id: 'lang-es', name: 'Spanish', level: 'Native' },
      { skill_id: 'lang-pt', name: 'Portuguese', level: 'Conversational' },
    ],
    soft_skills: [
      { skill_id: 'soft-customer', name: 'Customer Handling', level: 4 },
    ],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: false, sat: true, sun: true },
  },
  {
    id: 'emp-004',
    first_name: 'Ahmed',
    last_name: 'Rahman',
    email: 'ahmed.rahman@grandhotel.com',
    phone: '+44 7700 900004',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    role: 'Senior Server',
    department: 'Front of House',
    department_id: 'dept-foh',
    location: 'The Grand Hotel - Room Service',
    location_id: 'loc-room',
    start_date: '2021-11-20',
    status: 'active',
    contract_type: 'Full-time',
    hours_target: 35,
    hours_this_week: 35,
    hourly_rate: 12.50,
    momentum_score: 91,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'expiring_soon', obtained: '2023-05-10', expires: '2026-05-10' },
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'valid', obtained: '2024-03-15', expires: '2027-03-15' },
      { skill_id: 'cert-fire', name: 'Fire Marshal', status: 'expiring_soon', obtained: '2025-06-01', expires: '2026-06-01' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'valid', obtained: '2025-01-20', expires: '2027-01-20' },
    ],
    operational_skills: [
      { skill_id: 'op-table', name: 'Table Service', level: 5 },
      { skill_id: 'op-roomservice', name: 'Room Service Etiquette', level: 5 },
      { skill_id: 'op-reservations', name: 'Reservation Management', level: 4 },
    ],
    languages: [
      { skill_id: 'lang-en', name: 'English', level: 'Fluent' },
      { skill_id: 'lang-ar', name: 'Arabic', level: 'Native' },
      { skill_id: 'lang-ur', name: 'Urdu', level: 'Conversational' },
    ],
    soft_skills: [
      { skill_id: 'soft-customer', name: 'Customer Handling', level: 5 },
      { skill_id: 'soft-conflict', name: 'Conflict Resolution', level: 4 },
    ],
    availability: { mon: true, tue: true, wed: false, thu: true, fri: true, sat: true, sun: false },
  },
  {
    id: 'emp-005',
    first_name: 'Chen',
    last_name: 'Wei',
    email: 'chen.wei@grandhotel.com',
    phone: '+44 7700 900005',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    role: 'Server (New)',
    department: 'Front of House',
    department_id: 'dept-foh',
    location: 'The Grand Hotel - Main Restaurant',
    location_id: 'loc-main',
    start_date: '2024-12-02',
    status: 'active',
    contract_type: 'Full-time',
    hours_target: 25,
    hours_this_week: 20,
    hourly_rate: 11.00,
    momentum_score: 72,
    probation: { status: true, end_date: '2025-03-02', review_date: '2025-02-15' },
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'pending_exam', scheduled: '2026-02-01' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'in_progress', progress: 60 },
    ],
    operational_skills: [
      { skill_id: 'op-table', name: 'Table Service', level: 2 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 2 },
    ],
    languages: [
      { skill_id: 'lang-en', name: 'English', level: 'Conversational' },
      { skill_id: 'lang-zh', name: 'Mandarin', level: 'Native' },
    ],
    soft_skills: [
      { skill_id: 'soft-customer', name: 'Customer Handling', level: 2 },
    ],
    availability: { mon: true, tue: true, wed: true, thu: false, fri: false, sat: true, sun: true },
    restrictions: ['Cannot view team schedules', 'Cannot see internal job postings'],
  },
  {
    id: 'emp-006',
    first_name: 'Emma',
    last_name: 'Thompson',
    email: 'emma.thompson@grandhotel.com',
    phone: '+44 7700 900006',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    role: 'Host',
    department: 'Front of House',
    department_id: 'dept-foh',
    location: 'The Grand Hotel - Main Restaurant',
    location_id: 'loc-main',
    start_date: '2022-08-14',
    status: 'active',
    contract_type: 'Part-time',
    hours_target: 32,
    hours_this_week: 30,
    hourly_rate: 12.00,
    momentum_score: 88,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'expiring_soon', obtained: '2023-09-01', expires: '2026-03-01' },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'valid', obtained: '2025-04-10', expires: '2027-04-10' },
    ],
    operational_skills: [
      { skill_id: 'op-reservations', name: 'Reservation Management', level: 5 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 4 },
    ],
    languages: [
      { skill_id: 'lang-en', name: 'English', level: 'Native' },
      { skill_id: 'lang-de', name: 'German', level: 'Basic' },
    ],
    soft_skills: [
      { skill_id: 'soft-customer', name: 'Customer Handling', level: 5 },
      { skill_id: 'soft-conflict', name: 'Conflict Resolution', level: 4 },
    ],
    availability: { mon: true, tue: false, wed: true, thu: true, fri: true, sat: true, sun: false },
  },
  {
    id: 'emp-007',
    first_name: 'Oluwaseun',
    last_name: 'Adebayo',
    email: 'seun.adebayo@grandhotel.com',
    phone: '+44 7700 900007',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    role: 'Barback / Trainee Bartender',
    department: 'Front of House',
    department_id: 'dept-foh',
    location: 'The Grand Hotel - Bar & Lounge',
    location_id: 'loc-bar',
    start_date: '2024-04-22',
    status: 'active',
    contract_type: 'Full-time',
    hours_target: 38,
    hours_this_week: 36,
    hourly_rate: 11.50,
    momentum_score: 84,
    certifications: [
      { skill_id: 'cert-food2', name: 'Food Safety Level 2', status: 'valid', obtained: '2024-05-10', expires: '2027-05-10' },
      { skill_id: 'cert-manual', name: 'Manual Handling', status: 'valid', obtained: '2024-05-15', expires: '2026-05-15' },
      { skill_id: 'cert-license', name: 'Personal License Holder', status: 'in_progress', progress: 40 },
    ],
    operational_skills: [
      { skill_id: 'op-cocktail', name: 'Cocktail Making', level: 3 },
      { skill_id: 'op-barista', name: 'Barista', level: 4 },
      { skill_id: 'op-till', name: 'Till/POS Operation', level: 4 },
    ],
    languages: [
      { skill_id: 'lang-en', name: 'English', level: 'Fluent' },
      { skill_id: 'lang-yo', name: 'Yoruba', level: 'Native' },
    ],
    soft_skills: [
      { skill_id: 'soft-customer', name: 'Customer Handling', level: 3 },
    ],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  },
  {
    id: 'emp-008',
    first_name: 'Sophie',
    last_name: 'Bernard',
    email: 'sophie.bernard@grandhotel.com',
    phone: '+44 7700 900008',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    role: 'Sommelier / Senior Server',
    department: 'Front of House',
    department_id: 'dept-foh',
    location: 'The Grand Hotel - Main Restaurant',
    location_id: 'loc-main',
    start_date: '2020-09-01',
    status: 'active',
    contract_type: 'Full-time',
    hours_target: 40,
    hours_this_week: 38,
    hourly_rate: 15.00,
    momentum_score: 96,
    certifications: [
      { skill_id: 'cert-food3', name: 'Food Safety Level 3', status: 'valid', obtained: '2024-03-20', expires: '2027-03-20' },
      { skill_id: 'cert-wset3', name: 'WSET Level 3 Wine', status: 'valid', obtained: '2023-11-15', expires: null },
      { skill_id: 'cert-firstaid', name: 'First Aid at Work', status: 'expiring_soon', obtained: '2024-06-01', expires: '2026-06-01' },
      { skill_id: 'cert-license', name: 'Personal License Holder', status: 'valid', obtained: '2022-01-10', expires: null },
      { skill_id: 'cert-allergen', name: 'Allergen Awareness', status: 'expiring_soon', obtained: '2024-02-28', expires: '2026-02-28' },
    ],
    operational_skills: [
      { skill_id: 'op-wine', name: 'Wine Service / Sommelier', level: 5 },
      { skill_id: 'op-table', name: 'Table Service', level: 5 },
      { skill_id: 'op-upselling', name: 'Upselling', level: 5 },
    ],
    languages: [
      { skill_id: 'lang-en', name: 'English', level: 'Fluent' },
      { skill_id: 'lang-fr', name: 'French', level: 'Native' },
      { skill_id: 'lang-it', name: 'Italian', level: 'Conversational' },
    ],
    soft_skills: [
      { skill_id: 'soft-customer', name: 'Customer Handling', level: 5 },
      { skill_id: 'soft-training', name: 'Training/Mentoring', level: 4 },
      { skill_id: 'soft-leadership', name: 'Team Leadership', level: 4 },
    ],
    availability: { mon: false, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  },
];

// ============================================================
// CAREER OPPORTUNITIES (8+ realistic postings)
// ============================================================
export const DEMO_OPPORTUNITIES = [
  {
    id: 'opp-001',
    title: 'Front of House Supervisor',
    location: 'The Grand Hotel - Main Restaurant',
    location_id: 'loc-main',
    department: 'Front of House',
    salary_min: 28000,
    salary_max: 32000,
    salary_display: '£28,000 - £32,000',
    type: 'Promotion',
    employment_type: 'Full-time',
    deadline: '2026-02-15',
    posted: '2026-01-10',
    status: 'open',
    description: 'Lead our main restaurant team, ensuring exceptional service standards and team development.',
    requirements: [
      '2+ years FOH experience',
      'Food Safety Level 3',
      'Team leadership experience',
      'Excellent customer handling',
    ],
    nice_to_have: ['Wine knowledge', 'Multiple languages'],
    matched_employees: [
      { id: 'emp-001', name: 'Sarah Mitchell', match: 92, gaps: [] },
      { id: 'emp-008', name: 'Sophie Bernard', match: 95, gaps: [] },
    ],
    applications: 3,
  },
  {
    id: 'opp-002',
    title: 'Events Coordinator',
    location: 'The Grand Hotel - Events/Banqueting',
    location_id: 'loc-events',
    department: 'Events',
    salary_min: 26000,
    salary_max: 30000,
    salary_display: '£26,000 - £30,000',
    type: 'Lateral Move',
    employment_type: 'Full-time',
    deadline: '2025-02-28',
    posted: '2025-01-15',
    status: 'open',
    description: 'Coordinate events from planning through execution, working with clients and internal teams.',
    requirements: [
      'Events experience',
      'AV equipment knowledge',
      'Strong customer handling',
      'Organizational skills',
    ],
    nice_to_have: ['Multiple languages', 'Budget management'],
    matched_employees: [
      { id: 'emp-003', name: 'Maria Lopez', match: 88, gaps: ['AV equipment training'] },
      { id: 'emp-004', name: 'Ahmed Rahman', match: 79, gaps: ['Events experience', 'AV equipment'] },
    ],
    applications: 5,
  },
  {
    id: 'opp-003',
    title: 'Assistant Restaurant Manager',
    location: 'The Grand Hotel - Main Restaurant',
    location_id: 'loc-main',
    department: 'Management',
    salary_min: 32000,
    salary_max: 38000,
    salary_display: '£32,000 - £38,000',
    type: 'Promotion',
    employment_type: 'Full-time',
    deadline: '2025-03-10',
    posted: '2025-01-20',
    status: 'open',
    description: 'Support the Restaurant Manager in daily operations, staff management, and guest satisfaction.',
    requirements: [
      'Supervisor experience',
      'P&L awareness',
      'Conflict resolution skills',
      'Food Safety Level 3',
    ],
    nice_to_have: ['First Aid certification', 'Fire Marshal'],
    matched_employees: [
      { id: 'emp-001', name: 'Sarah Mitchell', match: 95, gaps: ['Food Safety L3 - in progress'] },
      { id: 'emp-008', name: 'Sophie Bernard', match: 89, gaps: ['P&L training needed'] },
    ],
    applications: 2,
  },
  {
    id: 'opp-004',
    title: 'Bar Team Lead',
    location: 'The Grand Hotel - Bar & Lounge',
    location_id: 'loc-bar',
    department: 'Front of House',
    salary_min: 25000,
    salary_max: 28000,
    salary_display: '£25,000 - £28,000',
    type: 'Promotion',
    employment_type: 'Full-time',
    deadline: '2025-02-20',
    posted: '2025-01-12',
    status: 'open',
    description: 'Lead the bar team, manage stock, create cocktail menus, and ensure excellent service.',
    requirements: [
      'Personal License Holder',
      'Cocktail expertise (Level 4+)',
      'Stock management experience',
      'Team coordination',
    ],
    nice_to_have: ['WSET qualification', 'Barista skills'],
    matched_employees: [
      { id: 'emp-002', name: 'James Kimani', match: 91, gaps: [] },
      { id: 'emp-007', name: 'Oluwaseun Adebayo', match: 72, gaps: ['Personal License - in progress', 'Team coordination experience'] },
    ],
    applications: 4,
  },
  {
    id: 'opp-005',
    title: 'Training Coordinator',
    location: 'All Locations',
    location_id: null,
    department: 'Management',
    salary_min: 30000,
    salary_max: 34000,
    salary_display: '£30,000 - £34,000',
    type: 'New Role',
    employment_type: 'Full-time',
    deadline: '2025-03-30',
    posted: '2025-01-18',
    status: 'open',
    description: 'Develop and deliver training programs across all hotel F&B outlets.',
    requirements: [
      'Training/mentoring experience',
      'Multiple certifications',
      'Presentation skills',
      'Cross-functional knowledge',
    ],
    nice_to_have: ['L&D qualification', 'E-learning development'],
    matched_employees: [
      { id: 'emp-008', name: 'Sophie Bernard', match: 89, gaps: ['L&D qualification'] },
      { id: 'emp-004', name: 'Ahmed Rahman', match: 84, gaps: ['Formal training experience'] },
    ],
    applications: 1,
  },
  {
    id: 'opp-006',
    title: 'Pool Bar Supervisor (Seasonal)',
    location: 'The Grand Hotel - Pool Bar',
    location_id: 'loc-pool',
    department: 'Front of House',
    salary_min: 14,
    salary_max: 14,
    salary_display: '£14.00/hr',
    type: 'Seasonal Promotion',
    employment_type: 'Seasonal (Apr-Sep)',
    deadline: '2025-04-01',
    posted: '2025-01-22',
    status: 'open',
    description: 'Manage the seasonal pool bar operation during peak summer months.',
    requirements: [
      'Outdoor service experience',
      'First Aid certification',
      'Personal License',
      'Customer handling excellence',
    ],
    nice_to_have: ['Pool safety training', 'Multiple languages for international guests'],
    matched_employees: [
      { id: 'emp-003', name: 'Maria Lopez', match: 85, gaps: ['First Aid - needed', 'Personal License - needed'] },
      { id: 'emp-002', name: 'James Kimani', match: 78, gaps: ['First Aid - needed'] },
    ],
    applications: 2,
  },
  {
    id: 'opp-007',
    title: 'Night Manager',
    location: 'Hotel-Wide',
    location_id: null,
    department: 'Management',
    salary_min: 35000,
    salary_max: 40000,
    salary_display: '£35,000 - £40,000',
    type: 'Promotion',
    employment_type: 'Full-time',
    deadline: '2025-02-25',
    posted: '2025-01-08',
    status: 'open',
    description: 'Oversee all hotel F&B operations during night shifts, handling emergencies and guest issues.',
    requirements: [
      'Supervisory experience',
      'Emergency procedures knowledge',
      'Problem solving skills',
      'First Aid & Fire Marshal',
    ],
    nice_to_have: ['Hotel-wide operational knowledge', 'Security awareness'],
    matched_employees: [], // No current matches - shows development opportunity
    applications: 0,
  },
  {
    id: 'opp-008',
    title: 'Guest Relations Specialist',
    location: 'Front Desk Cross-Training',
    location_id: 'loc-main',
    department: 'Front of House',
    salary_min: 24000,
    salary_max: 27000,
    salary_display: '£24,000 - £27,000',
    type: 'Lateral Move',
    employment_type: 'Full-time',
    deadline: '2025-03-15',
    posted: '2025-01-19',
    status: 'open',
    description: 'Handle VIP guest relations, special requests, and complaint resolution across F&B outlets.',
    requirements: [
      'Customer service excellence',
      'Languages (2+)',
      'Problem resolution skills',
      'Calm under pressure',
    ],
    nice_to_have: ['VIP service experience', 'Concierge knowledge'],
    matched_employees: [
      { id: 'emp-004', name: 'Ahmed Rahman', match: 94, gaps: [] },
      { id: 'emp-003', name: 'Maria Lopez', match: 82, gaps: ['VIP service training'] },
      { id: 'emp-006', name: 'Emma Thompson', match: 78, gaps: ['Additional language needed'] },
    ],
    applications: 6,
  },
];

// ============================================================
// TIME TRACKING DATA (30 days for all 8 employees)
// ============================================================
export const generateTimeEntries = () => {
  const entries = [];
  const today = new Date();

  DEMO_EMPLOYEES.forEach(emp => {
    // Generate 30 days of time entries
    for (let day = 0; day < 30; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      const dayOfWeek = date.getDay();
      const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];

      // Skip days employee isn't available
      if (!emp.availability[dayName]) continue;

      // Some randomness - skip ~15% of available days (days off, sick, etc)
      if (Math.random() < 0.15) continue;

      const shiftPatterns = [
        { start: '06:00', end: '14:00', breakStart: '10:00', breakEnd: '10:30' },
        { start: '09:00', end: '17:00', breakStart: '12:30', breakEnd: '13:00' },
        { start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:00' },
        { start: '14:00', end: '22:00', breakStart: '18:00', breakEnd: '18:30' },
        { start: '16:00', end: '00:00', breakStart: '20:00', breakEnd: '20:30' },
      ];

      const pattern = shiftPatterns[Math.floor(Math.random() * shiftPatterns.length)];
      const dateStr = date.toISOString().split('T')[0];

      // Random variations
      const lateMinutes = Math.random() < 0.1 ? Math.floor(Math.random() * 15) + 1 : 0; // 10% late
      const earlyLeave = Math.random() < 0.05 ? Math.floor(Math.random() * 30) + 10 : 0; // 5% early leave
      const overtime = Math.random() < 0.15 ? Math.floor(Math.random() * 60) + 15 : 0; // 15% overtime

      const clockIn = new Date(`${dateStr}T${pattern.start}:00`);
      clockIn.setMinutes(clockIn.getMinutes() + lateMinutes);

      const clockOut = new Date(`${dateStr}T${pattern.end}:00`);
      if (earlyLeave) {
        clockOut.setMinutes(clockOut.getMinutes() - earlyLeave);
      } else if (overtime) {
        clockOut.setMinutes(clockOut.getMinutes() + overtime);
      }

      const scheduledHours = 8;
      const actualHours = ((clockOut - clockIn) / 3600000) - 0.5; // minus 30min break

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
        clock_in: clockIn.toISOString(),
        clock_out: clockOut.toISOString(),
        break_start: `${dateStr}T${pattern.breakStart}:00`,
        break_end: `${dateStr}T${pattern.breakEnd}:00`,
        break_duration: 30,
        scheduled_hours: scheduledHours,
        actual_hours: Math.round(actualHours * 100) / 100,
        overtime_hours: overtime > 0 ? Math.round((overtime / 60) * 100) / 100 : 0,
        status: lateMinutes > 5 ? 'late_arrival' : earlyLeave > 0 ? 'early_departure' : 'completed',
        late_minutes: lateMinutes,
        early_minutes: earlyLeave,
        notes: earlyLeave > 0 ? 'Manager approved early departure' : lateMinutes > 10 ? 'Traffic delay - notified supervisor' : '',
        approved: day > 7, // Last 7 days pending approval
        approved_by: day > 7 ? 'Manager' : null,
      });
    }
  });

  return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const DEMO_TIME_ENTRIES = generateTimeEntries();

// ============================================================
// SHIFTS DATA (Current week schedule)
// ============================================================
export const generateDemoShifts = (weekStart) => {
  const shifts = [];
  const shiftPatterns = [
    { name: 'Morning', start: '06:00', end: '14:00' },
    { name: 'Day', start: '09:00', end: '17:00' },
    { name: 'Afternoon', start: '10:00', end: '18:00' },
    { name: 'Evening', start: '14:00', end: '22:00' },
    { name: 'Night', start: '16:00', end: '00:00' },
  ];

  DEMO_LOCATIONS.forEach(loc => {
    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];

      // Staffing requirements per location
      const staffNeeded = loc.seasonal && (dayOfWeek === 0 || dayOfWeek === 6) ? 4 :
                          loc.capacity > 30 ? 6 : loc.capacity > 15 ? 4 : 3;

      // Assign available employees
      const availableEmployees = DEMO_EMPLOYEES.filter(e =>
        e.availability[dayName] &&
        (e.location_id === loc.id || Math.random() < 0.3) // 30% chance of cross-location
      );

      const assignedCount = Math.min(staffNeeded, availableEmployees.length);

      for (let i = 0; i < assignedCount; i++) {
        const emp = availableEmployees[i];
        const pattern = shiftPatterns[i % shiftPatterns.length];

        shifts.push({
          id: `shift-${loc.id}-${dateStr}-${i}`,
          date: dateStr,
          day_of_week: dayName,
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

      // Add some open shifts
      if (assignedCount < staffNeeded) {
        const openCount = staffNeeded - assignedCount;
        for (let j = 0; j < openCount; j++) {
          const pattern = shiftPatterns[(assignedCount + j) % shiftPatterns.length];
          shifts.push({
            id: `open-${loc.id}-${dateStr}-${j}`,
            date: dateStr,
            day_of_week: dayName,
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
            cost: 12.00 * 8,
          });
        }
      }
    }
  });

  return shifts;
};

// ============================================================
// DASHBOARD METRICS
// ============================================================
export const DEMO_DASHBOARD = {
  metrics: {
    totalEmployees: DEMO_EMPLOYEES.length,
    activeToday: 6,
    onShiftNow: 4,
    onBreak: 1,
    clockedIn: 2,
    runningLate: 0,
    openShifts: 5,
    pendingApprovals: 12,
    certificationsExpiring: 3,
    trainingOverdue: 2,
  },
  realtimeStaff: [
    { id: 'emp-001', name: 'Sarah Mitchell', status: 'on_shift', location: 'Main Restaurant', since: '09:00', photo: DEMO_EMPLOYEES[0].photo },
    { id: 'emp-002', name: 'James Kimani', status: 'on_break', location: 'Bar & Lounge', since: '12:30', photo: DEMO_EMPLOYEES[1].photo },
    { id: 'emp-004', name: 'Ahmed Rahman', status: 'on_shift', location: 'Room Service', since: '06:00', photo: DEMO_EMPLOYEES[3].photo },
    { id: 'emp-006', name: 'Emma Thompson', status: 'clocked_in', location: 'Main Restaurant', since: '09:55', photo: DEMO_EMPLOYEES[5].photo },
    { id: 'emp-008', name: 'Sophie Bernard', status: 'on_shift', location: 'Main Restaurant', since: '10:00', photo: DEMO_EMPLOYEES[7].photo },
  ],
  complianceAlerts: [
    {
      id: 'alert-1',
      type: 'expiring',
      severity: 'warning',
      title: 'Certifications expiring within 30 days',
      count: 3,
      employees: [
        { id: 'emp-003', name: 'Maria Lopez', skill: 'Allergen Awareness', expires: '2025-02-15', daysLeft: 23 },
        { id: 'emp-006', name: 'Emma Thompson', skill: 'Food Safety Level 2', expires: '2025-09-01', daysLeft: 220 },
      ],
    },
    {
      id: 'alert-2',
      type: 'training',
      severity: 'error',
      title: 'Training overdue',
      count: 2,
      employees: [
        { id: 'emp-005', name: 'Chen Wei', skill: 'Food Safety Level 2', status: 'Pending exam', scheduled: '2025-02-01' },
      ],
    },
  ],
  recentActivity: [
    { id: 'act-1', type: 'clock_in', user: 'Emma T.', action: 'clocked in', location: 'Main Restaurant', time: '5 min ago' },
    { id: 'act-2', type: 'shift_swap', user: 'James K.', action: 'requested shift swap with Sarah M.', time: '12 min ago' },
    { id: 'act-3', type: 'recognition', user: 'Manager', action: 'recognized Sophie B.', message: 'Excellent wine service!', time: '1 hr ago' },
    { id: 'act-4', type: 'training', user: 'Chen W.', action: 'completed Allergen Awareness module 3', time: '2 hrs ago' },
    { id: 'act-5', type: 'time_off', user: 'Maria L.', action: 'submitted time off request', time: '3 hrs ago' },
  ],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
export const getEmployeeById = (id) => DEMO_EMPLOYEES.find(e => e.id === id);
export const getLocationById = (id) => DEMO_LOCATIONS.find(l => l.id === id);
export const getOpportunityById = (id) => DEMO_OPPORTUNITIES.find(o => o.id === id);

export const getEmployeeSkillGaps = (employeeId, opportunityId) => {
  const emp = getEmployeeById(employeeId);
  const opp = getOpportunityById(opportunityId);
  if (!emp || !opp) return [];

  const gaps = [];
  opp.requirements.forEach(req => {
    const hasSkill = emp.certifications.some(c => c.name.toLowerCase().includes(req.toLowerCase()) && c.status === 'valid') ||
                     emp.operational_skills.some(s => s.name.toLowerCase().includes(req.toLowerCase()) && s.level >= 4);
    if (!hasSkill) {
      gaps.push(req);
    }
  });
  return gaps;
};

export const calculateMatchScore = (employeeId, opportunityId) => {
  const opp = getOpportunityById(opportunityId);
  if (!opp) return 0;

  const matched = opp.matched_employees.find(m => m.id === employeeId);
  return matched ? matched.match : 0;
};

export default {
  DEMO_LOCATIONS,
  DEMO_DEPARTMENTS,
  DEMO_EMPLOYEES,
  DEMO_OPPORTUNITIES,
  DEMO_TIME_ENTRIES,
  DEMO_DASHBOARD,
  SKILL_CATEGORIES,
  generateDemoShifts,
  generateTimeEntries,
  getEmployeeById,
  getLocationById,
  getOpportunityById,
  getEmployeeSkillGaps,
  calculateMatchScore,
};
