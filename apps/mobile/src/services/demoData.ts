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
  teamSize: 8,
  shiftsToday: 6,
  pendingApprovals: 5,
  openShifts: 3,
  teamPerformance: {
    avgAttendance: 96,
    avgMomentum: 87,
    avgSatisfaction: 4.7,
    tasksCompleted: 156,
    hoursScheduled: 280,
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
