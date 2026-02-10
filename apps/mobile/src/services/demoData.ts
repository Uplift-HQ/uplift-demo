// ============================================================
// UPLIFT DEMO DATA
// Fallback data for screens when API is unavailable
// ============================================================

// Helper to get dates
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const addDays = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

// Dashboard Data
export const DEMO_DASHBOARD = {
  upcomingShifts: 5,
  hoursThisWeek: 32,
  pendingTasks: 5,
  openOpportunities: 4,
  nextShift: {
    id: 'shift-1',
    date: addDays(0),
    startTime: '09:00',
    endTime: '17:00',
    locationId: 'loc-main',
    locationName: 'The Grand Hotel - Main Restaurant',
    roleName: 'Senior Server',
    status: 'scheduled' as const,
    isOpen: false,
    teamMembers: ['Sophie B.', 'Emma T.'],
  },
  recentActivity: [
    { type: 'shift_completed', message: 'Completed 8hr shift at Main Restaurant', time: '2 hours ago' },
    { type: 'badge_earned', message: 'Earned "Service Star" badge', time: '1 day ago' },
    { type: 'skill_verified', message: 'Food Safety L2 certification verified', time: '2 days ago' },
    { type: 'recognition', message: 'Sophie B. recognized you for teamwork!', time: '3 days ago' },
  ],
  stats: {
    level: 12,
    xp: 2450,
    nextLevelXp: 3000,
    streak: 7,
    rank: 3,
    totalHoursMonth: 124,
    averageShiftLength: 7.5,
    onTimePercentage: 98,
  },
  certificationAlerts: [
    { name: 'Allergen Awareness', daysLeft: 45, status: 'expiring_soon' },
  ],
};

// Shifts Data (matching portal locations)
export const DEMO_SHIFTS = {
  shifts: [
    {
      id: 'shift-1',
      date: addDays(0),
      startTime: '09:00',
      endTime: '17:00',
      locationId: 'loc-main',
      locationName: 'The Grand Hotel - Main Restaurant',
      roleName: 'Senior Server',
      status: 'scheduled' as const,
      isOpen: false,
      teamMembers: ['Sophie B.', 'Emma T.'],
    },
    {
      id: 'shift-2',
      date: addDays(1),
      startTime: '14:00',
      endTime: '22:00',
      locationId: 'loc-bar',
      locationName: 'The Grand Hotel - Bar & Lounge',
      roleName: 'Bartender',
      status: 'scheduled' as const,
      isOpen: false,
      teamMembers: ['James K.', 'Seun A.'],
    },
    {
      id: 'shift-3',
      date: addDays(2),
      startTime: '10:00',
      endTime: '18:00',
      locationId: 'loc-main',
      locationName: 'The Grand Hotel - Main Restaurant',
      roleName: 'Server',
      status: 'scheduled' as const,
      isOpen: false,
      teamMembers: ['Sarah M.', 'Chen W.'],
    },
    {
      id: 'shift-4',
      date: addDays(3),
      startTime: '06:00',
      endTime: '14:00',
      locationId: 'loc-room',
      locationName: 'The Grand Hotel - Room Service',
      roleName: 'Room Service',
      status: 'scheduled' as const,
      isOpen: false,
      teamMembers: ['Ahmed R.'],
    },
    {
      id: 'shift-5',
      date: addDays(4),
      startTime: '16:00',
      endTime: '00:00',
      locationId: 'loc-events',
      locationName: 'The Grand Hotel - Events/Banqueting',
      roleName: 'Events Server',
      status: 'scheduled' as const,
      isOpen: false,
      teamMembers: ['Maria L.', 'Sarah M.'],
    },
  ],
};

export const DEMO_OPEN_SHIFTS = {
  shifts: [
    {
      id: 'open-shift-1',
      date: addDays(2),
      startTime: '18:00',
      endTime: '02:00',
      locationId: 'loc-bar',
      locationName: 'The Grand Hotel - Bar & Lounge',
      roleName: 'Bartender',
      status: 'scheduled' as const,
      isOpen: true,
      requiredSkills: ['Personal License', 'Cocktail Making'],
      premium: '£2/hr bonus',
    },
    {
      id: 'open-shift-2',
      date: addDays(3),
      startTime: '11:00',
      endTime: '15:00',
      locationId: 'loc-main',
      locationName: 'The Grand Hotel - Main Restaurant',
      roleName: 'Server',
      status: 'scheduled' as const,
      isOpen: true,
      requiredSkills: ['Food Safety L2', 'Table Service'],
    },
    {
      id: 'open-shift-3',
      date: addDays(5),
      startTime: '17:00',
      endTime: '23:00',
      locationId: 'loc-events',
      locationName: 'The Grand Hotel - Events/Banqueting',
      roleName: 'Events Server',
      status: 'scheduled' as const,
      isOpen: true,
      requiredSkills: ['Food Safety L2', 'Events Setup'],
      premium: '£3/hr bonus - Wedding',
    },
  ],
};

// Tasks Data
export const DEMO_TASKS = {
  tasks: [
    {
      id: 'task-1',
      title: 'Complete Room Inspection',
      description: 'Inspect rooms 401-410 for cleanliness and amenities',
      priority: 'high',
      status: 'pending',
      dueTime: '11:00',
      xpReward: 50,
      location: 'Floor 4',
    },
    {
      id: 'task-2',
      title: 'Guest Welcome',
      description: 'Prepare welcome packages for VIP arrivals',
      priority: 'medium',
      status: 'pending',
      dueTime: '14:00',
      xpReward: 30,
      location: 'Front Desk',
    },
    {
      id: 'task-3',
      title: 'Inventory Check',
      description: 'Count minibar items in storage',
      priority: 'low',
      status: 'in_progress',
      dueTime: '16:00',
      xpReward: 25,
      location: 'Storage Room B',
    },
    {
      id: 'task-4',
      title: 'Safety Walkthrough',
      description: 'Complete fire exit inspection checklist',
      priority: 'high',
      status: 'pending',
      dueTime: '12:00',
      xpReward: 40,
      location: 'All Floors',
    },
    {
      id: 'task-5',
      title: 'Training Module',
      description: 'Complete online customer service training',
      priority: 'medium',
      status: 'pending',
      dueTime: '17:00',
      xpReward: 100,
      location: 'Online',
    },
  ],
};

// Skills Data (hospitality certifications matching portal)
export const DEMO_SKILLS = {
  skills: [
    // Certifications
    { id: 'cert-food2', name: 'Food Safety Level 2', category: 'Certification', level: 2, verified: true, mandatory: true, expiresAt: addDays(365) },
    { id: 'cert-food3', name: 'Food Safety Level 3', category: 'Certification', level: 3, verified: false, progress: 75 },
    { id: 'cert-allergen', name: 'Allergen Awareness', category: 'Certification', level: 2, verified: true, mandatory: true, expiresAt: addDays(45) },
    { id: 'cert-firstaid', name: 'First Aid at Work', category: 'Certification', level: 1, verified: true, expiresAt: addDays(180) },
    { id: 'cert-license', name: 'Personal License Holder', category: 'Certification', level: 1, verified: false },
    // Operational Skills
    { id: 'op-table', name: 'Table Service', category: 'Operations', level: 5, verified: true },
    { id: 'op-wine', name: 'Wine Service', category: 'Operations', level: 4, verified: true },
    { id: 'op-till', name: 'Till/POS Operation', category: 'Operations', level: 5, verified: true },
    { id: 'op-upselling', name: 'Upselling', category: 'Operations', level: 4, verified: true },
    // Soft Skills
    { id: 'soft-customer', name: 'Customer Handling', category: 'Soft Skills', level: 5, verified: true },
    { id: 'soft-leadership', name: 'Team Leadership', category: 'Soft Skills', level: 4, verified: true },
    // Languages
    { id: 'lang-en', name: 'English', category: 'Language', level: 4, verified: true, languageLevel: 'Native' },
    { id: 'lang-fr', name: 'French', category: 'Language', level: 2, verified: true, languageLevel: 'Conversational' },
  ],
  // Certifications expiring soon (for alerts)
  expiringCertifications: [
    { skillName: 'Allergen Awareness', daysLeft: 45, employeeName: 'You' },
    { skillName: 'Food Safety L2', daysLeft: 90, employeeName: 'James K.' },
  ],
};

// Jobs Data (matching portal career opportunities)
export const DEMO_JOBS = {
  jobs: [
    {
      id: 'opp-001',
      title: 'Front of House Supervisor',
      description: 'Lead our main restaurant team, ensuring exceptional service standards and team development.',
      departmentName: 'Front of House',
      locationName: 'The Grand Hotel - Main Restaurant',
      employmentType: 'full_time' as const,
      salary: '£28,000 - £32,000',
      type: 'Promotion',
      requiredSkills: ['Food Safety L3', 'Team Leadership', '2+ years FOH experience'],
      status: 'open' as const,
      matchScore: 92,
      deadline: addDays(23),
    },
    {
      id: 'opp-003',
      title: 'Assistant Restaurant Manager',
      description: 'Support the Restaurant Manager in daily operations, staff management, and guest satisfaction.',
      departmentName: 'Management',
      locationName: 'The Grand Hotel - Main Restaurant',
      employmentType: 'full_time' as const,
      salary: '£32,000 - £38,000',
      type: 'Promotion',
      requiredSkills: ['Supervisor experience', 'P&L awareness', 'Food Safety L3'],
      status: 'open' as const,
      matchScore: 95,
      deadline: addDays(45),
    },
    {
      id: 'opp-004',
      title: 'Bar Team Lead',
      description: 'Lead the bar team, manage stock, create cocktail menus, and ensure excellent service.',
      departmentName: 'Front of House',
      locationName: 'The Grand Hotel - Bar & Lounge',
      employmentType: 'full_time' as const,
      salary: '£25,000 - £28,000',
      type: 'Promotion',
      requiredSkills: ['Personal License', 'Cocktail Making', 'Stock Management'],
      status: 'open' as const,
      matchScore: 78,
      deadline: addDays(28),
    },
    {
      id: 'opp-002',
      title: 'Events Coordinator',
      description: 'Coordinate events from planning through execution, working with clients and internal teams.',
      departmentName: 'Events',
      locationName: 'The Grand Hotel - Events/Banqueting',
      employmentType: 'full_time' as const,
      salary: '£26,000 - £30,000',
      type: 'Lateral Move',
      requiredSkills: ['Events experience', 'AV equipment knowledge', 'Customer handling'],
      status: 'open' as const,
      matchScore: 85,
      deadline: addDays(36),
    },
  ],
};

// Leaderboard Data
export const DEMO_LEADERBOARD = {
  entries: [
    { rank: 1, name: 'Emma Thompson', points: 3250, avatar: null, level: 15 },
    { rank: 2, name: 'David Park', points: 3100, avatar: null, level: 14 },
    { rank: 3, name: 'Sarah Johnson', points: 2450, avatar: null, level: 12, isCurrentUser: true },
    { rank: 4, name: 'Michael Brown', points: 2200, avatar: null, level: 11 },
    { rank: 5, name: 'Lisa Chen', points: 2050, avatar: null, level: 10 },
    { rank: 6, name: 'James Wilson', points: 1900, avatar: null, level: 10 },
    { rank: 7, name: 'Anna Smith', points: 1750, avatar: null, level: 9 },
    { rank: 8, name: 'Robert Taylor', points: 1600, avatar: null, level: 9 },
    { rank: 9, name: 'Sophie Martin', points: 1450, avatar: null, level: 8 },
    { rank: 10, name: 'Chris Evans', points: 1300, avatar: null, level: 8 },
  ],
};

// Badges Data
export const DEMO_BADGES = {
  badges: [
    { id: 'badge-1', name: 'Early Bird', description: 'Clock in on time for 30 consecutive shifts', icon: 'clock', earned: true, earnedAt: addDays(-30) },
    { id: 'badge-2', name: 'Team Player', description: 'Help 10 colleagues with shift swaps', icon: 'users', earned: true, earnedAt: addDays(-15) },
    { id: 'badge-3', name: 'Skill Master', description: 'Verify 5 skills', icon: 'award', earned: true, earnedAt: addDays(-7) },
    { id: 'badge-4', name: 'Task Champion', description: 'Complete 100 tasks', icon: 'check', earned: false, progress: 78 },
    { id: 'badge-5', name: 'Streak Legend', description: 'Maintain a 30-day streak', icon: 'zap', earned: false, progress: 7 },
    { id: 'badge-6', name: 'Five Star', description: 'Receive 5 five-star reviews', icon: 'star', earned: true, earnedAt: addDays(-45) },
  ],
};

// Notifications Data
export const DEMO_NOTIFICATIONS = {
  notifications: [
    { id: 'notif-1', type: 'shift', title: 'Shift Reminder', message: 'Your shift starts in 1 hour', read: false, createdAt: new Date().toISOString() },
    { id: 'notif-2', type: 'badge', title: 'Badge Earned!', message: 'You earned the "Team Player" badge', read: false, createdAt: addDays(-1) },
    { id: 'notif-3', type: 'task', title: 'New Task Assigned', message: 'Room inspection task added to your list', read: true, createdAt: addDays(-2) },
    { id: 'notif-4', type: 'approval', title: 'Time Off Approved', message: 'Your holiday request has been approved', read: true, createdAt: addDays(-3) },
  ],
  unreadCount: 2,
};

// Rewards Data
export const DEMO_REWARDS = {
  rewards: [
    { id: 'reward-1', name: 'Coffee Voucher', description: 'Free coffee at hotel cafe', pointsCost: 100, category: 'Food & Drink', available: true },
    { id: 'reward-2', name: 'Extra Break', description: '15 minute extra break', pointsCost: 200, category: 'Time', available: true },
    { id: 'reward-3', name: 'Parking Pass', description: 'Free parking for a week', pointsCost: 500, category: 'Benefits', available: true },
    { id: 'reward-4', name: 'Spa Voucher', description: '50% off spa treatment', pointsCost: 1000, category: 'Wellness', available: true },
    { id: 'reward-5', name: 'Hotel Stay', description: 'Free night stay at any property', pointsCost: 5000, category: 'Travel', available: false },
  ],
  userPoints: 2450,
};

// Feed Data
export const DEMO_FEED = {
  posts: [
    {
      id: 'post-1',
      author: { name: 'Hotel Management', avatar: null, role: 'Admin' },
      content: 'Congratulations to the Front Desk team for achieving 98% satisfaction this month! Keep up the great work!',
      likes: 24,
      comments: 5,
      createdAt: addDays(-1),
      liked: false,
    },
    {
      id: 'post-2',
      author: { name: 'Emma Thompson', avatar: null, role: 'Concierge' },
      content: 'Just helped a guest plan the perfect Edinburgh itinerary. Love making a difference!',
      likes: 18,
      comments: 3,
      createdAt: addDays(-2),
      liked: true,
    },
    {
      id: 'post-3',
      author: { name: 'Training Team', avatar: null, role: 'HR' },
      content: 'New customer service training module available! Complete it to earn 100 XP.',
      likes: 12,
      comments: 2,
      createdAt: addDays(-3),
      liked: false,
    },
  ],
};

// Manager Dashboard Data
export const DEMO_MANAGER_DASHBOARD = {
  teamSize: 12,
  shiftsToday: 8,
  pendingApprovals: 5,
  openShifts: 4,
  companyName: 'Grand Metro Hotels',
  // Top-level values for direct access
  avgMomentum: 82,
  shiftsFilled: 94,
  retention: 96,
  hoursThisWeek: 486,
  taskCompletion: 87,
  // Nested for backwards compatibility
  teamPerformance: {
    avgAttendance: 96,
    avgMomentum: 82,
    avgSatisfaction: 4.7,
    shiftsFilled: 94,
    retention: 96,
    taskCompletion: 87,
    hoursThisWeek: 486,
  },
  alerts: [
    { type: 'warning', message: '2 shifts need coverage for Saturday', severity: 'high' },
    { type: 'warning', message: 'Maria L. Allergen certification expiring in 45 days', severity: 'medium' },
    { type: 'info', message: '3 time-off requests pending approval' },
    { type: 'success', message: 'Sophie B. promoted to Senior Server' },
  ],
  topPerformers: [
    { id: 'emp-008', name: 'Sophie Bernard', score: 96, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
    { id: 'emp-001', name: 'Sarah Mitchell', score: 94, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { id: 'emp-004', name: 'Ahmed Rahman', score: 91, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
  ],
  skillGaps: [
    { skill: 'Food Safety L3', needed: 2, have: 1, location: 'Main Restaurant' },
    { skill: 'Personal License', needed: 2, have: 1, location: 'Bar & Lounge' },
  ],
};

// Locations (matching portal)
export const DEMO_LOCATIONS = [
  { id: 'loc-main', name: 'The Grand Hotel - Main Restaurant', code: 'GH-MAIN', capacity: 40, type: 'restaurant' },
  { id: 'loc-bar', name: 'The Grand Hotel - Bar & Lounge', code: 'GH-BAR', capacity: 15, type: 'bar' },
  { id: 'loc-events', name: 'The Grand Hotel - Events/Banqueting', code: 'GH-EVENTS', capacity: 25, type: 'events' },
  { id: 'loc-room', name: 'The Grand Hotel - Room Service', code: 'GH-ROOM', capacity: 12, type: 'room_service' },
  { id: 'loc-pool', name: 'The Grand Hotel - Pool Bar', code: 'GH-POOL', capacity: 8, type: 'seasonal', seasonal: true },
];

// Team Data (8 employees matching portal)
export const DEMO_TEAM = {
  members: [
    {
      id: 'emp-001',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: 'Senior Server',
      department: 'Front of House',
      location: 'Main Restaurant',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      momentumScore: 94,
      hoursThisWeek: 32,
      certifications: ['Food Safety L2', 'First Aid', 'Allergen Awareness'],
    },
    {
      id: 'emp-002',
      firstName: 'James',
      lastName: 'Kimani',
      role: 'Bartender',
      department: 'Front of House',
      location: 'Bar & Lounge',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      momentumScore: 89,
      hoursThisWeek: 38,
      certifications: ['Personal License', 'Food Safety L2'],
    },
    {
      id: 'emp-003',
      firstName: 'Maria',
      lastName: 'Lopez',
      role: 'Server',
      department: 'Events',
      location: 'Events/Banqueting',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      momentumScore: 86,
      hoursThisWeek: 28,
      certifications: ['Food Safety L2', 'Manual Handling'],
    },
    {
      id: 'emp-004',
      firstName: 'Ahmed',
      lastName: 'Rahman',
      role: 'Senior Server',
      department: 'Front of House',
      location: 'Room Service',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      momentumScore: 91,
      hoursThisWeek: 35,
      certifications: ['Food Safety L2', 'First Aid', 'Fire Marshal'],
    },
    {
      id: 'emp-005',
      firstName: 'Chen',
      lastName: 'Wei',
      role: 'Server (New)',
      department: 'Front of House',
      location: 'Main Restaurant',
      status: 'probation',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      momentumScore: 72,
      hoursThisWeek: 20,
      certifications: [],
      probation: true,
    },
    {
      id: 'emp-006',
      firstName: 'Emma',
      lastName: 'Thompson',
      role: 'Host',
      department: 'Front of House',
      location: 'Main Restaurant',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      momentumScore: 88,
      hoursThisWeek: 30,
      certifications: ['Food Safety L2', 'Allergen Awareness'],
    },
    {
      id: 'emp-007',
      firstName: 'Oluwaseun',
      lastName: 'Adebayo',
      role: 'Barback / Trainee',
      department: 'Front of House',
      location: 'Bar & Lounge',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
      momentumScore: 84,
      hoursThisWeek: 36,
      certifications: ['Food Safety L2', 'Manual Handling'],
    },
    {
      id: 'emp-008',
      firstName: 'Sophie',
      lastName: 'Bernard',
      role: 'Sommelier / Senior Server',
      department: 'Front of House',
      location: 'Main Restaurant',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
      momentumScore: 96,
      hoursThisWeek: 38,
      certifications: ['Food Safety L3', 'WSET L3 Wine', 'First Aid', 'Personal License'],
    },
    {
      id: 'emp-009',
      firstName: 'David',
      lastName: 'Collins',
      role: 'Server',
      department: 'Front of House',
      location: 'Main Restaurant',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face',
      momentumScore: 79,
      hoursThisWeek: 32,
      certifications: ['Food Safety L2', 'Allergen Awareness'],
    },
    {
      id: 'emp-010',
      firstName: 'Priya',
      lastName: 'Sharma',
      role: 'Host',
      department: 'Front of House',
      location: 'Events/Banqueting',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
      momentumScore: 88,
      hoursThisWeek: 36,
      certifications: ['Food Safety L2', 'First Aid'],
    },
    {
      id: 'emp-011',
      firstName: 'Marcus',
      lastName: 'Taylor',
      role: 'Bartender',
      department: 'Front of House',
      location: 'Bar & Lounge',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop&crop=face',
      momentumScore: 85,
      hoursThisWeek: 40,
      certifications: ['Personal License', 'Food Safety L2', 'Cocktail Making'],
    },
    {
      id: 'emp-012',
      firstName: 'Lucy',
      lastName: 'O\'Brien',
      role: 'Room Service',
      department: 'Room Service',
      location: 'Room Service',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&h=150&fit=crop&crop=face',
      momentumScore: 82,
      hoursThisWeek: 34,
      certifications: ['Food Safety L2', 'Manual Handling'],
    },
  ],
};

// Approvals Data (for managers)
export const DEMO_APPROVALS = {
  items: [
    { id: 'app-1', type: 'Time Off', employee: 'Sarah Johnson', dates: `${addDays(7)} - ${addDays(14)}`, reason: 'Annual Leave', status: 'pending' },
    { id: 'app-2', type: 'Shift Swap', employee: 'David Park', details: 'Swap with Emma Thompson on ' + addDays(3), status: 'pending' },
    { id: 'app-3', type: 'Expense', employee: 'Michael Brown', amount: '45.00', description: 'Uniform cleaning', status: 'pending' },
    { id: 'app-4', type: 'Time Off', employee: 'Lisa Chen', dates: `${addDays(21)} - ${addDays(22)}`, reason: 'Personal', status: 'pending' },
    { id: 'app-5', type: 'Expense', employee: 'Emma Thompson', amount: '120.00', description: 'Training course materials', status: 'pending' },
  ],
};

// Reports Data (for managers)
export const DEMO_REPORTS = {
  summary: {
    period: 'This Month',
    totalHours: 3240,
    laborCost: 48600,
    overtime: 120,
    attendance: 96.5,
    turnover: 2.1,
  },
  departments: [
    { name: 'Front Office', hours: 1200, staff: 8, utilization: 94 },
    { name: 'Housekeeping', hours: 1400, staff: 10, utilization: 88 },
    { name: 'F&B', hours: 640, staff: 6, utilization: 91 },
  ],
};

// ============================================================
// ADDITIONAL DEMO DATA FOR COMPLETE FEATURE COVERAGE
// ============================================================

// Expenses Data
export const DEMO_EXPENSES = {
  expenses: [
    { id: 'exp-1', description: 'Uniform dry cleaning', amount: 45.00, currency: 'GBP', status: 'approved', submittedAt: addDays(-5), category: 'Uniform' },
    { id: 'exp-2', description: 'Training course materials', amount: 120.00, currency: 'GBP', status: 'pending', submittedAt: addDays(-2), category: 'Training' },
    { id: 'exp-3', description: 'Travel to off-site event', amount: 32.50, currency: 'GBP', status: 'approved', submittedAt: addDays(-10), category: 'Travel' },
    { id: 'exp-4', description: 'Team lunch contribution', amount: 25.00, currency: 'GBP', status: 'pending', submittedAt: addDays(-1), category: 'Meals' },
  ],
  totalPending: 145.00,
  totalApproved: 77.50,
};

// Payslips Data
export const DEMO_PAYSLIPS = {
  payslips: [
    { id: 'pay-1', period: 'January 2026', grossPay: 2450.00, netPay: 1994.30, tax: 290.50, ni: 116.20, pension: 49.00, hoursWorked: 160, paidAt: '2026-01-31' },
    { id: 'pay-2', period: 'December 2025', grossPay: 2680.00, netPay: 2156.42, tax: 336.08, ni: 138.50, pension: 49.00, hoursWorked: 172, paidAt: '2025-12-31' },
    { id: 'pay-3', period: 'November 2025', grossPay: 2320.00, netPay: 1892.10, tax: 264.20, ni: 114.70, pension: 49.00, hoursWorked: 152, paidAt: '2025-11-30' },
    { id: 'pay-4', period: 'October 2025', grossPay: 2500.00, netPay: 2034.00, tax: 300.50, ni: 116.50, pension: 49.00, hoursWorked: 164, paidAt: '2025-10-31' },
  ],
  ytdEarnings: 28450.00,
  ytdTax: 3420.00,
  taxCode: '1257L',
  niCategory: 'A',
};

// Compliance/Certifications Data
export const DEMO_COMPLIANCE = {
  certifications: [
    { id: 'cert-1', name: 'Food Safety Level 2', issuer: 'Highfield Qualifications', status: 'valid', issuedAt: '2025-03-15', expiresAt: addDays(365), mandatory: true },
    { id: 'cert-2', name: 'Allergen Awareness', issuer: 'CIEH', status: 'expiring_soon', issuedAt: '2024-02-20', expiresAt: addDays(45), mandatory: true },
    { id: 'cert-3', name: 'First Aid at Work', issuer: 'St John Ambulance', status: 'valid', issuedAt: '2025-06-10', expiresAt: addDays(545), mandatory: false },
    { id: 'cert-4', name: 'Fire Marshal Training', issuer: 'British Safety Council', status: 'valid', issuedAt: '2025-01-05', expiresAt: addDays(730), mandatory: false },
    { id: 'cert-5', name: 'Personal License Holder', issuer: 'Local Authority', status: 'pending', issuedAt: null, expiresAt: null, mandatory: false },
  ],
  totalValid: 3,
  totalExpiring: 1,
  totalPending: 1,
};

// Documents Data
export const DEMO_DOCUMENTS = {
  documents: [
    { id: 'doc-1', name: 'Employment Contract', type: 'contract', uploadedAt: '2024-03-01', category: 'Employment' },
    { id: 'doc-2', name: 'Staff Handbook 2025', type: 'pdf', uploadedAt: '2025-01-15', category: 'Policies' },
    { id: 'doc-3', name: 'Health & Safety Policy', type: 'pdf', uploadedAt: '2025-01-15', category: 'Policies' },
    { id: 'doc-4', name: 'Food Safety Certificate', type: 'certificate', uploadedAt: '2025-03-15', category: 'Certifications' },
    { id: 'doc-5', name: 'Payslip - Jan 2026', type: 'payslip', uploadedAt: '2026-01-31', category: 'Payroll' },
    { id: 'doc-6', name: 'P60 Tax Summary 2024/25', type: 'tax', uploadedAt: '2025-05-01', category: 'Tax' },
  ],
  totalDocuments: 6,
};

// Learning Data
export const DEMO_LEARNING = {
  courses: [
    { id: 'course-1', name: 'Customer Service Excellence', status: 'completed', progress: 100, duration: '2 hours', xpReward: 100, completedAt: addDays(-14) },
    { id: 'course-2', name: 'Food Safety Level 3', status: 'in_progress', progress: 75, duration: '4 hours', xpReward: 200, nextModule: 'HACCP Principles' },
    { id: 'course-3', name: 'Wine & Beverage Service', status: 'not_started', progress: 0, duration: '3 hours', xpReward: 150 },
    { id: 'course-4', name: 'Team Leadership Fundamentals', status: 'not_started', progress: 0, duration: '2.5 hours', xpReward: 120 },
    { id: 'course-5', name: 'Upselling Techniques', status: 'completed', progress: 100, duration: '1 hour', xpReward: 50, completedAt: addDays(-30) },
  ],
  totalCompleted: 2,
  totalXpEarned: 150,
  requiredCourses: 1,
  recommendedCourses: 2,
};

// Performance Data
export const DEMO_PERFORMANCE = {
  currentReview: {
    period: 'Q4 2025',
    status: 'completed',
    overallRating: 4.2,
    managerName: 'James Wilson',
    completedAt: addDays(-15),
  },
  metrics: [
    { name: 'Attendance', score: 98, target: 95, trend: 'up' },
    { name: 'Task Completion', score: 94, target: 90, trend: 'up' },
    { name: 'Customer Satisfaction', score: 4.8, target: 4.5, trend: 'stable' },
    { name: 'Upselling', score: 85, target: 80, trend: 'up' },
    { name: 'Teamwork', score: 92, target: 85, trend: 'stable' },
  ],
  reviews: [
    { period: 'Q4 2025', rating: 4.2, status: 'completed', date: addDays(-15) },
    { period: 'Q3 2025', rating: 4.0, status: 'completed', date: addDays(-105) },
    { period: 'Q2 2025', rating: 3.8, status: 'completed', date: addDays(-195) },
  ],
  goals: [
    { id: 'goal-1', title: 'Complete Food Safety L3', status: 'in_progress', progress: 75, dueDate: addDays(30) },
    { id: 'goal-2', title: 'Mentor 2 new team members', status: 'completed', progress: 100, completedAt: addDays(-10) },
    { id: 'goal-3', title: 'Achieve 95% customer satisfaction', status: 'in_progress', progress: 96, dueDate: addDays(60) },
  ],
};

// Surveys Data
export const DEMO_SURVEYS = {
  surveys: [
    { id: 'survey-1', title: 'Employee Engagement Q1 2026', status: 'pending', deadline: addDays(7), estimatedTime: '5 mins', xpReward: 50, anonymous: true },
    { id: 'survey-2', title: 'Training Feedback', status: 'pending', deadline: addDays(14), estimatedTime: '3 mins', xpReward: 25, anonymous: false },
    { id: 'survey-3', title: 'Workplace Safety Assessment', status: 'completed', completedAt: addDays(-5), xpReward: 30, anonymous: true },
    { id: 'survey-4', title: 'Manager Effectiveness', status: 'completed', completedAt: addDays(-20), xpReward: 40, anonymous: true },
  ],
  pendingCount: 2,
  completedCount: 2,
};

// Reward Catalog Data
export const DEMO_REWARD_CATALOG = {
  rewards: [
    { id: 'rc-1', name: 'Costa Coffee Voucher', description: 'Any hot drink free', pointsCost: 150, category: 'Food & Drink', brand: 'Costa', discount: 'FREE', available: true },
    { id: 'rc-2', name: 'Odeon Cinema Ticket', description: '2-for-1 standard screening', pointsCost: 400, category: 'Entertainment', brand: 'Odeon', discount: '50% OFF', available: true },
    { id: 'rc-3', name: 'Nando\'s Quarter Chicken', description: 'Any quarter chicken meal', pointsCost: 500, category: 'Food & Drink', brand: 'Nando\'s', discount: 'FREE', available: true },
    { id: 'rc-4', name: 'Spotify Premium Month', description: '1 month subscription', pointsCost: 800, category: 'Entertainment', brand: 'Spotify', discount: 'FREE', available: true },
    { id: 'rc-5', name: 'Pure Gym Day Pass', description: 'Full day gym access', pointsCost: 300, category: 'Wellness', brand: 'Pure Gym', discount: 'FREE', available: true },
    { id: 'rc-6', name: 'Amazon Gift Card £10', description: 'Spend on anything', pointsCost: 1000, category: 'Shopping', brand: 'Amazon', discount: '£10', available: true },
    { id: 'rc-7', name: 'Boots Points Boost', description: '500 Advantage Card points', pointsCost: 200, category: 'Shopping', brand: 'Boots', discount: '500 pts', available: true },
    { id: 'rc-8', name: 'Deliveroo £5 Off', description: '£5 off your next order', pointsCost: 400, category: 'Food & Drink', brand: 'Deliveroo', discount: '£5 OFF', available: true },
  ],
  categories: ['Food & Drink', 'Entertainment', 'Wellness', 'Shopping'],
  totalAvailable: 8,
};

// Affiliate Offers Data
export const DEMO_AFFILIATE_OFFERS = {
  offers: [
    { id: 'aff-1', brand: 'Starbucks', discount: '20% OFF', description: 'All hot drinks', category: 'Food & Drink', pointsCost: 0, featured: true },
    { id: 'aff-2', brand: 'Vue Cinema', discount: '2-for-1', description: 'Standard tickets', category: 'Entertainment', pointsCost: 0, featured: true },
    { id: 'aff-3', brand: 'Tesco', discount: '7% OFF', description: 'Grocery shopping', category: 'Shopping', pointsCost: 0, featured: false },
    { id: 'aff-4', brand: 'Pizza Express', discount: '25% OFF', description: 'Main courses', category: 'Food & Drink', pointsCost: 0, featured: false },
    { id: 'aff-5', brand: 'Fitness First', discount: '30% OFF', description: 'Monthly membership', category: 'Wellness', pointsCost: 0, featured: false },
  ],
  totalOffers: 5,
};

// AI Insights Data (for managers)
export const DEMO_AI_INSIGHTS = {
  insights: [
    { id: 'ai-1', type: 'staffing', title: 'Peak Demand Friday', description: 'AI predicts 35% higher traffic. Consider +2 staff for lunch service.', priority: 'high', actionable: true },
    { id: 'ai-2', type: 'retention', title: 'Flight Risk Alert', description: 'Chen Wei shows signs of disengagement. Schedule 1:1 check-in.', priority: 'medium', actionable: true },
    { id: 'ai-3', type: 'training', title: 'Skill Gap', description: '2 team members need Food Safety L3 for supervisor coverage.', priority: 'medium', actionable: true },
    { id: 'ai-4', type: 'performance', title: 'Top Performer', description: 'Sophie Bernard exceeds targets by 15%. Consider recognition.', priority: 'low', actionable: true },
    { id: 'ai-5', type: 'scheduling', title: 'Overtime Alert', description: 'James Kimani approaching 48hr weekly limit. Redistribute shifts.', priority: 'high', actionable: true },
  ],
  demandForecast: [
    { day: 'Mon', predicted: 65, actual: 62 },
    { day: 'Tue', predicted: 70, actual: 68 },
    { day: 'Wed', predicted: 75, actual: 78 },
    { day: 'Thu', predicted: 80, actual: null },
    { day: 'Fri', predicted: 95, actual: null },
    { day: 'Sat', predicted: 90, actual: null },
    { day: 'Sun', predicted: 70, actual: null },
  ],
  laborEfficiency: 94.2,
  scheduleOptimization: 87,
};

// Team Performance Data (for managers)
export const DEMO_TEAM_PERFORMANCE = {
  overview: {
    avgMomentumScore: 82,
    avgAttendance: 96,
    avgTaskCompletion: 87,
    avgCustomerRating: 4.6,
    totalHoursThisWeek: 486,
    laborCost: 7290,
  },
  performers: DEMO_TEAM.members.map(m => ({
    ...m,
    metrics: {
      attendance: 90 + Math.floor(Math.random() * 10),
      taskCompletion: 85 + Math.floor(Math.random() * 15),
      customerRating: (4 + Math.random()).toFixed(1),
      shiftsCompleted: 10 + Math.floor(Math.random() * 10),
    },
  })),
  trends: {
    momentum: [82, 84, 85, 86, 87, 87],
    attendance: [94, 95, 95, 96, 96, 96],
    efficiency: [88, 89, 90, 91, 92, 94],
  },
};

// Offboarding Data (for managers)
export const DEMO_OFFBOARDING = {
  activeOffboardings: [
    {
      id: 'off-1',
      employee: { name: 'Tom Parker', avatar: null, role: 'Server', department: 'Front of House' },
      lastDay: addDays(14),
      reason: 'Resignation - New opportunity',
      status: 'in_progress',
      checklistProgress: 60,
      tasks: [
        { name: 'Equipment return', completed: true },
        { name: 'Knowledge transfer', completed: true },
        { name: 'Exit interview', completed: false },
        { name: 'Final pay processed', completed: false },
        { name: 'Access revoked', completed: false },
      ],
    },
  ],
  recentOffboardings: [
    { name: 'Alice Green', role: 'Host', exitDate: addDays(-30), reason: 'Relocation' },
    { name: 'Mike Johnson', role: 'Bartender', exitDate: addDays(-60), reason: 'Career change' },
  ],
  turnoverRate: 8.5,
  avgTenure: 18, // months
};

// Job Postings Data (for managers)
export const DEMO_JOB_POSTINGS = {
  jobs: [
    { id: 'job-1', title: 'Server', location: 'Main Restaurant', type: 'Full-time', applications: 12, status: 'open', postedAt: addDays(-7), salary: '£11.50/hr' },
    { id: 'job-2', title: 'Bartender', location: 'Bar & Lounge', type: 'Part-time', applications: 8, status: 'open', postedAt: addDays(-14), salary: '£12.00/hr' },
    { id: 'job-3', title: 'Events Server', location: 'Events/Banqueting', type: 'Seasonal', applications: 5, status: 'open', postedAt: addDays(-3), salary: '£11.00/hr' },
    { id: 'job-4', title: 'Host', location: 'Main Restaurant', type: 'Full-time', applications: 15, status: 'closed', postedAt: addDays(-30), salary: '£11.00/hr', filled: true },
  ],
  totalApplications: 40,
  averageTimeToFill: 21, // days
};

// Expense Approvals Data (for managers)
export const DEMO_EXPENSE_APPROVALS = {
  pending: [
    { id: 'ea-1', employee: 'Sarah Mitchell', amount: 45.00, description: 'Uniform dry cleaning', category: 'Uniform', submittedAt: addDays(-2), receipts: 1 },
    { id: 'ea-2', employee: 'Emma Thompson', amount: 120.00, description: 'Training materials', category: 'Training', submittedAt: addDays(-1), receipts: 2 },
    { id: 'ea-3', employee: 'Ahmed Rahman', amount: 32.50, description: 'Travel to meeting', category: 'Travel', submittedAt: addDays(-3), receipts: 1 },
  ],
  approved: [
    { id: 'ea-4', employee: 'James Kimani', amount: 28.00, description: 'Supplies', category: 'Supplies', approvedAt: addDays(-5) },
    { id: 'ea-5', employee: 'Maria Lopez', amount: 55.00, description: 'Team lunch', category: 'Meals', approvedAt: addDays(-7) },
  ],
  totalPending: 197.50,
  totalApprovedThisMonth: 423.00,
};

// Skills Verification Data (for managers)
export const DEMO_SKILL_VERIFICATION = {
  pending: [
    { id: 'sv-1', employee: 'Chen Wei', skill: 'Food Safety Level 2', evidence: 'Certificate uploaded', submittedAt: addDays(-2), priority: 'high' },
    { id: 'sv-2', employee: 'Oluwaseun Adebayo', skill: 'Personal License', evidence: 'License photo', submittedAt: addDays(-5), priority: 'medium' },
    { id: 'sv-3', employee: 'Emma Thompson', skill: 'First Aid', evidence: 'Training completion', submittedAt: addDays(-1), priority: 'low' },
  ],
  recentlyVerified: [
    { employee: 'Sarah Mitchell', skill: 'Wine Service WSET L2', verifiedAt: addDays(-3), verifiedBy: 'James Wilson' },
    { employee: 'Sophie Bernard', skill: 'HACCP Training', verifiedAt: addDays(-7), verifiedBy: 'James Wilson' },
  ],
  totalPending: 3,
  totalVerifiedThisMonth: 8,
};
