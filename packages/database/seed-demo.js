// ============================================================
// DEMO DATABASE SEED SCRIPT
// The Grand Metropolitan Hotel Group - Hospitality Demo
// 150 employees across 5 locations and multiple departments
// Usage: node database/seed-demo.js
// ============================================================

import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uplift'
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const hash = async (password) => bcrypt.hash(password, 12);
const uuid = () => randomUUID();

// Random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Random number in range
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ============================================================
// DEMO DATA CONFIGURATION
// ============================================================

const ORGANIZATION = {
  name: 'The Grand Metropolitan Hotel Group',
  slug: 'grand-metropolitan-demo',
  timezone: 'Europe/London',
  currency: 'GBP'
};

const LOCATIONS = [
  { 
    name: 'Grand Metropolitan Downtown', 
    address: '1 Mayfair Place, London W1K 6JP',
    type: 'flagship',
    openTime: '00:00',
    closeTime: '23:59',
    rooms: 350
  },
  { 
    name: 'Metropolitan Airport Hotel', 
    address: 'Terminal 5, Heathrow Airport, TW6 2GA',
    type: 'airport',
    openTime: '00:00',
    closeTime: '23:59',
    rooms: 200
  },
  { 
    name: 'Metro Conference Centre', 
    address: '100 Victoria Street, London SW1E 5JL',
    type: 'conference',
    openTime: '06:00',
    closeTime: '23:00',
    rooms: 50
  },
  { 
    name: 'Harbourside Resort & Spa', 
    address: 'Ocean Drive, Brighton BN2 1TW',
    type: 'resort',
    openTime: '00:00',
    closeTime: '23:59',
    rooms: 180
  },
  { 
    name: 'Metropolitan Express Birmingham', 
    address: '45 New Street, Birmingham B2 4EG',
    type: 'express',
    openTime: '00:00',
    closeTime: '23:59',
    rooms: 120
  }
];

const DEPARTMENTS = [
  'Front Office',
  'Housekeeping',
  'Food & Beverage',
  'Kitchen',
  'Maintenance & Engineering',
  'Spa & Wellness',
  'Events & Conference',
  'Security',
  'Management'
];

const SKILLS = [
  // Core Skills
  { name: 'Customer Service Excellence', category: 'Core', required: true, description: 'Delivering exceptional guest experiences' },
  { name: 'Cash Handling', category: 'Core', required: true, description: 'Processing payments and managing tills' },
  { name: 'PMS Opera', category: 'Core', required: true, description: 'Property Management System proficiency' },
  { name: 'Complaint Resolution', category: 'Core', required: false, description: 'Handling guest complaints professionally' },
  
  // Safety & Compliance
  { name: 'First Aid Certified', category: 'Safety', required: false, description: 'Emergency first aid qualification' },
  { name: 'Fire Safety Warden', category: 'Safety', required: false, description: 'Fire safety procedures and evacuation' },
  { name: 'Food Safety Level 2', category: 'Compliance', required: true, description: 'Food hygiene certification' },
  { name: 'Food Safety Level 3', category: 'Compliance', required: false, description: 'Advanced food safety supervision' },
  { name: 'Personal License Holder', category: 'Compliance', required: false, description: 'Alcohol service license' },
  { name: 'COSHH Trained', category: 'Safety', required: false, description: 'Control of substances hazardous to health' },
  
  // Front Office
  { name: 'Night Audit', category: 'Front Office', required: false, description: 'End of day financial reconciliation' },
  { name: 'Concierge Services', category: 'Front Office', required: false, description: 'Guest assistance and local knowledge' },
  { name: 'VIP Guest Handling', category: 'Front Office', required: false, description: 'Managing high-profile guest requirements' },
  { name: 'Multi-line Phone System', category: 'Front Office', required: false, description: 'Switchboard operation' },
  
  // Housekeeping
  { name: 'Deep Cleaning', category: 'Housekeeping', required: false, description: 'Intensive room cleaning procedures' },
  { name: 'Laundry Operations', category: 'Housekeeping', required: false, description: 'Commercial laundry equipment' },
  { name: 'Turndown Service', category: 'Housekeeping', required: false, description: 'Evening service preparation' },
  { name: 'Minibar Management', category: 'Housekeeping', required: false, description: 'Inventory and restocking' },
  
  // F&B
  { name: 'Barista', category: 'F&B', required: false, description: 'Coffee preparation and latte art' },
  { name: 'Sommelier Level 1', category: 'F&B', required: false, description: 'Wine service and knowledge' },
  { name: 'Cocktail Making', category: 'F&B', required: false, description: 'Mixology and bar service' },
  { name: 'Silver Service', category: 'F&B', required: false, description: 'Formal table service' },
  { name: 'Banquet Service', category: 'F&B', required: false, description: 'Large event service' },
  
  // Kitchen
  { name: 'Pastry', category: 'Kitchen', required: false, description: 'Desserts and baked goods' },
  { name: 'Garde Manger', category: 'Kitchen', required: false, description: 'Cold kitchen and preparation' },
  { name: 'Grill Station', category: 'Kitchen', required: false, description: 'Grilling and broiling' },
  { name: 'Menu Development', category: 'Kitchen', required: false, description: 'Creating and costing menus' },
  
  // Maintenance
  { name: 'HVAC Systems', category: 'Maintenance', required: false, description: 'Heating and cooling maintenance' },
  { name: 'Plumbing', category: 'Maintenance', required: false, description: 'Basic plumbing repairs' },
  { name: 'Electrical (PAT)', category: 'Maintenance', required: false, description: 'Portable appliance testing' },
  { name: 'Pool & Spa Maintenance', category: 'Maintenance', required: false, description: 'Water treatment and equipment' },
  
  // Spa
  { name: 'Swedish Massage', category: 'Spa', required: false, description: 'Classic massage therapy' },
  { name: 'Hot Stone Therapy', category: 'Spa', required: false, description: 'Heated stone massage' },
  { name: 'Facial Treatments', category: 'Spa', required: false, description: 'Skincare procedures' },
  { name: 'Fitness Instruction', category: 'Spa', required: false, description: 'Gym and class instruction' },
  
  // Events
  { name: 'AV Equipment', category: 'Events', required: false, description: 'Audio visual setup and operation' },
  { name: 'Event Coordination', category: 'Events', required: false, description: 'Managing event logistics' },
  { name: 'Wedding Planning', category: 'Events', required: false, description: 'Bridal services coordination' },
  
  // Languages
  { name: 'French (Fluent)', category: 'Languages', required: false, description: 'French language proficiency' },
  { name: 'Spanish (Fluent)', category: 'Languages', required: false, description: 'Spanish language proficiency' },
  { name: 'Mandarin (Fluent)', category: 'Languages', required: false, description: 'Mandarin language proficiency' },
  { name: 'Arabic (Fluent)', category: 'Languages', required: false, description: 'Arabic language proficiency' },
  { name: 'German (Fluent)', category: 'Languages', required: false, description: 'German language proficiency' },
  
  // Management
  { name: 'Team Leadership', category: 'Management', required: false, description: 'Supervising and motivating staff' },
  { name: 'Rota Planning', category: 'Management', required: false, description: 'Staff scheduling and optimization' },
  { name: 'Budget Management', category: 'Management', required: false, description: 'Department cost control' },
  { name: 'Performance Reviews', category: 'Management', required: false, description: 'Staff appraisals and development' },
  { name: 'Recruitment', category: 'Management', required: false, description: 'Hiring and onboarding' }
];

// Job titles by department with salary ranges
const JOB_ROLES = {
  'Front Office': [
    { title: 'Receptionist', hourlyRate: [11.50, 13.00], contractHours: [20, 40] },
    { title: 'Senior Receptionist', hourlyRate: [13.50, 15.00], contractHours: [35, 40] },
    { title: 'Night Auditor', hourlyRate: [14.00, 16.00], contractHours: [35, 40] },
    { title: 'Concierge', hourlyRate: [13.00, 15.50], contractHours: [30, 40] },
    { title: 'Guest Relations Manager', hourlyRate: [17.00, 20.00], contractHours: [40, 45] },
    { title: 'Front Office Supervisor', hourlyRate: [15.50, 18.00], contractHours: [40, 45] }
  ],
  'Housekeeping': [
    { title: 'Room Attendant', hourlyRate: [11.44, 12.50], contractHours: [16, 35] },
    { title: 'Senior Room Attendant', hourlyRate: [12.50, 14.00], contractHours: [30, 40] },
    { title: 'Public Area Cleaner', hourlyRate: [11.44, 12.50], contractHours: [20, 35] },
    { title: 'Laundry Attendant', hourlyRate: [11.44, 13.00], contractHours: [25, 40] },
    { title: 'Housekeeping Supervisor', hourlyRate: [14.50, 17.00], contractHours: [40, 45] },
    { title: 'Linen Porter', hourlyRate: [11.44, 12.50], contractHours: [20, 40] }
  ],
  'Food & Beverage': [
    { title: 'Waiter/Waitress', hourlyRate: [11.44, 13.00], contractHours: [16, 35] },
    { title: 'Senior Waiter', hourlyRate: [13.00, 15.00], contractHours: [30, 40] },
    { title: 'Bartender', hourlyRate: [12.00, 14.50], contractHours: [20, 40] },
    { title: 'Head Bartender', hourlyRate: [14.50, 17.00], contractHours: [35, 45] },
    { title: 'Barista', hourlyRate: [11.50, 13.50], contractHours: [16, 35] },
    { title: 'Room Service Attendant', hourlyRate: [11.50, 13.00], contractHours: [20, 35] },
    { title: 'Restaurant Supervisor', hourlyRate: [15.00, 18.00], contractHours: [40, 45] },
    { title: 'Banquet Server', hourlyRate: [12.00, 14.00], contractHours: [0, 30] }
  ],
  'Kitchen': [
    { title: 'Kitchen Porter', hourlyRate: [11.44, 12.50], contractHours: [20, 40] },
    { title: 'Commis Chef', hourlyRate: [12.50, 14.50], contractHours: [35, 45] },
    { title: 'Demi Chef de Partie', hourlyRate: [14.00, 16.00], contractHours: [40, 48] },
    { title: 'Chef de Partie', hourlyRate: [15.50, 18.00], contractHours: [40, 48] },
    { title: 'Sous Chef', hourlyRate: [18.00, 22.00], contractHours: [45, 50] },
    { title: 'Pastry Chef', hourlyRate: [15.00, 18.50], contractHours: [40, 45] },
    { title: 'Breakfast Chef', hourlyRate: [13.50, 16.00], contractHours: [35, 45] }
  ],
  'Maintenance & Engineering': [
    { title: 'Maintenance Technician', hourlyRate: [14.00, 17.00], contractHours: [40, 45] },
    { title: 'Senior Maintenance Tech', hourlyRate: [17.00, 20.00], contractHours: [40, 45] },
    { title: 'Groundskeeper', hourlyRate: [12.00, 14.00], contractHours: [35, 40] },
    { title: 'Pool Technician', hourlyRate: [13.50, 16.00], contractHours: [30, 40] },
    { title: 'Chief Engineer', hourlyRate: [22.00, 28.00], contractHours: [45, 50] }
  ],
  'Spa & Wellness': [
    { title: 'Spa Receptionist', hourlyRate: [11.50, 13.50], contractHours: [20, 35] },
    { title: 'Spa Therapist', hourlyRate: [13.00, 16.00], contractHours: [25, 40] },
    { title: 'Senior Spa Therapist', hourlyRate: [16.00, 19.00], contractHours: [35, 40] },
    { title: 'Fitness Instructor', hourlyRate: [14.00, 18.00], contractHours: [20, 35] },
    { title: 'Spa Supervisor', hourlyRate: [17.00, 20.00], contractHours: [40, 45] }
  ],
  'Events & Conference': [
    { title: 'Event Setup Crew', hourlyRate: [11.44, 13.00], contractHours: [0, 30] },
    { title: 'AV Technician', hourlyRate: [14.00, 17.00], contractHours: [35, 45] },
    { title: 'Events Coordinator', hourlyRate: [15.00, 18.00], contractHours: [40, 45] },
    { title: 'Conference Host', hourlyRate: [12.50, 15.00], contractHours: [25, 40] },
    { title: 'Senior Events Manager', hourlyRate: [20.00, 25.00], contractHours: [45, 50] }
  ],
  'Security': [
    { title: 'Security Officer', hourlyRate: [12.50, 14.50], contractHours: [35, 45] },
    { title: 'Night Security', hourlyRate: [13.50, 15.50], contractHours: [35, 45] },
    { title: 'CCTV Operator', hourlyRate: [12.00, 14.00], contractHours: [35, 45] },
    { title: 'Security Supervisor', hourlyRate: [16.00, 19.00], contractHours: [40, 48] }
  ],
  'Management': [
    { title: 'Duty Manager', hourlyRate: [18.00, 22.00], contractHours: [40, 48] },
    { title: 'Department Head', hourlyRate: [22.00, 28.00], contractHours: [45, 50] },
    { title: 'Assistant General Manager', hourlyRate: [28.00, 35.00], contractHours: [45, 55] },
    { title: 'General Manager', hourlyRate: [38.00, 50.00], contractHours: [50, 55] }
  ]
};

// First names (diverse UK workforce)
const FIRST_NAMES = [
  'James', 'Emma', 'Oliver', 'Sophie', 'Harry', 'Olivia', 'Jack', 'Emily', 'Charlie', 'Amelia',
  'George', 'Isla', 'Noah', 'Ava', 'William', 'Mia', 'Thomas', 'Grace', 'Oscar', 'Lily',
  'Muhammad', 'Fatima', 'Ali', 'Aisha', 'Ahmed', 'Zara', 'Hassan', 'Mariam', 'Omar', 'Yasmin',
  'Raj', 'Priya', 'Arjun', 'Meera', 'Vikram', 'Ananya', 'Sanjay', 'Deepika', 'Rohan', 'Kavita',
  'Piotr', 'Anna', 'Krzysztof', 'Magdalena', 'Tomasz', 'Agnieszka', 'Andrzej', 'Barbara', 'Marek', 'Ewa',
  'Ion', 'Maria', 'Andrei', 'Elena', 'Mihai', 'Cristina', 'Alexandru', 'Diana', 'Stefan', 'Ioana',
  'Jose', 'Carmen', 'Carlos', 'Isabel', 'Pedro', 'Lucia', 'Miguel', 'Rosa', 'Fernando', 'Ana',
  'Chen', 'Li', 'Wei', 'Xia', 'Jian', 'Mei', 'Hong', 'Yan', 'Ming', 'Lin',
  'Patrick', 'Siobhan', 'Sean', 'Aoife', 'Liam', 'Niamh', 'Cian', 'Ciara', 'Declan', 'Sinead',
  'David', 'Sarah', 'Michael', 'Rachel', 'Daniel', 'Rebecca', 'Andrew', 'Hannah', 'Matthew', 'Laura'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor',
  'Khan', 'Ali', 'Ahmed', 'Hussain', 'Rahman', 'Begum', 'Chowdhury', 'Islam', 'Hassan', 'Sheikh',
  'Patel', 'Singh', 'Kumar', 'Sharma', 'Gupta', 'Reddy', 'Nair', 'Rao', 'Verma', 'Kapoor',
  'Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski',
  'Popescu', 'Ionescu', 'Popa', 'Stan', 'Dumitru', 'Stoica', 'Gheorghe', 'Rusu', 'Munteanu', 'Matei',
  'Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Fernandez', 'Sanchez', 'Torres', 'Ramirez', 'Flores',
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Wu', 'Zhou', 'Xu',
  'Murphy', 'Kelly', 'Sullivan', 'Walsh', 'O\'Brien', 'Ryan', 'Connor', 'Quinn', 'Casey', 'Byrne',
  'Thompson', 'White', 'Harris', 'Martin', 'Jackson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young'
];

// Shift patterns for hospitality
const SHIFT_PATTERNS = {
  'Morning': { start: '06:00', end: '14:00' },
  'Day': { start: '09:00', end: '17:00' },
  'Afternoon': { start: '14:00', end: '22:00' },
  'Evening': { start: '16:00', end: '00:00' },
  'Night': { start: '22:00', end: '06:00' },
  'Split AM': { start: '07:00', end: '11:00' },
  'Split PM': { start: '17:00', end: '22:00' },
  'Breakfast': { start: '05:30', end: '10:30' },
  'Lunch': { start: '11:00', end: '15:00' },
  'Dinner': { start: '17:00', end: '23:00' }
};

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🏨 Starting The Grand Metropolitan Hotel Group Demo Seed...\n');

    // ----------------------------------------
    // 1. Create Demo Organization
    // ----------------------------------------
    console.log('📦 Creating organization...');
    
    const orgId = uuid();
    await client.query(`
      INSERT INTO organizations (id, name, slug, timezone, currency, features, settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (slug) DO UPDATE SET 
        name = EXCLUDED.name,
        features = EXCLUDED.features
      RETURNING id
    `, [
      orgId,
      ORGANIZATION.name,
      ORGANIZATION.slug,
      ORGANIZATION.timezone,
      ORGANIZATION.currency,
      JSON.stringify({
        scheduling: true,
        timeTracking: true,
        skills: true,
        careers: true,
        gamification: true,
        aiScheduling: true,
        expenses: true,
        rewards: true,
        feed: true,
        mfa: true
      }),
      JSON.stringify({
        demo_mode: true,
        industry: 'hospitality',
        company_size: '150+'
      })
    ]);

    // ----------------------------------------
    // 2. Create Locations
    // ----------------------------------------
    console.log('📍 Creating 5 hotel locations...');
    
    const locationIds = {};
    for (const loc of LOCATIONS) {
      const locId = uuid();
      locationIds[loc.name] = locId;
      await client.query(`
        INSERT INTO locations (id, organization_id, name, address, open_time, close_time, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
        ON CONFLICT DO NOTHING
      `, [locId, orgId, loc.name, loc.address, loc.openTime, loc.closeTime, JSON.stringify({ type: loc.type, rooms: loc.rooms })]);
    }

    // ----------------------------------------
    // 3. Create Departments
    // ----------------------------------------
    console.log('🏢 Creating departments...');
    
    const deptIds = {};
    for (const name of DEPARTMENTS) {
      const deptId = uuid();
      deptIds[name] = deptId;
      await client.query(`
        INSERT INTO departments (id, organization_id, name)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [deptId, orgId, name]);
    }

    // ----------------------------------------
    // 4. Create Skills
    // ----------------------------------------
    console.log('🎯 Creating 48 skills...');
    
    const skillIds = {};
    for (const skill of SKILLS) {
      const skillId = uuid();
      skillIds[skill.name] = skillId;
      await client.query(`
        INSERT INTO skills (id, organization_id, name, category, is_required, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [skillId, orgId, skill.name, skill.category, skill.required, skill.description]);
    }

    // ----------------------------------------
    // 5. Create Demo Users (Admin, Manager, Worker)
    // ----------------------------------------
    console.log('👤 Creating demo login accounts...');
    
    const demoUsers = [];
    
    // Demo Admin
    const adminUserId = uuid();
    const adminEmployeeId = uuid();
    const adminPassword = await hash('demo123');
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, status, email_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [adminUserId, 'demo-admin@uplift.hr', adminPassword, 'Victoria', 'Ashworth', 'admin', orgId, 'active']);

    await client.query(`
      INSERT INTO employees (id, user_id, organization_id, first_name, last_name, email, status, job_title, department_id, location_id, contract_hours, hourly_rate, hire_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
    `, [adminEmployeeId, adminUserId, orgId, 'Victoria', 'Ashworth', 'demo-admin@uplift.hr', 'active', 'General Manager', deptIds['Management'], Object.values(locationIds)[0], 50, 45.00, '2019-03-15']);
    
    demoUsers.push({ id: adminEmployeeId, role: 'admin', dept: 'Management', location: LOCATIONS[0].name });

    // Demo Manager
    const managerUserId = uuid();
    const managerEmployeeId = uuid();
    const managerPassword = await hash('demo123');
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, status, email_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [managerUserId, 'demo-manager@uplift.hr', managerPassword, 'James', 'Morrison', 'manager', orgId, 'active']);

    await client.query(`
      INSERT INTO employees (id, user_id, organization_id, first_name, last_name, email, status, job_title, department_id, location_id, contract_hours, hourly_rate, hire_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
    `, [managerEmployeeId, managerUserId, orgId, 'James', 'Morrison', 'demo-manager@uplift.hr', 'active', 'Front Office Supervisor', deptIds['Front Office'], Object.values(locationIds)[0], 45, 18.00, '2021-06-01']);
    
    demoUsers.push({ id: managerEmployeeId, role: 'manager', dept: 'Front Office', location: LOCATIONS[0].name });

    // Demo Worker
    const workerUserId = uuid();
    const workerEmployeeId = uuid();
    const workerPassword = await hash('demo123');
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, status, email_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [workerUserId, 'demo-worker@uplift.hr', workerPassword, 'Priya', 'Sharma', 'worker', orgId, 'active']);

    await client.query(`
      INSERT INTO employees (id, user_id, organization_id, first_name, last_name, email, status, job_title, department_id, location_id, contract_hours, hourly_rate, hire_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
    `, [workerEmployeeId, workerUserId, orgId, 'Priya', 'Sharma', 'demo-worker@uplift.hr', 'active', 'Receptionist', deptIds['Front Office'], Object.values(locationIds)[0], 35, 12.50, '2023-09-10']);
    
    demoUsers.push({ id: workerEmployeeId, role: 'worker', dept: 'Front Office', location: LOCATIONS[0].name });

    // ----------------------------------------
    // 6. Create 147 Additional Employees (150 total)
    // ----------------------------------------
    console.log('👥 Creating 147 additional employees...');
    
    const allEmployeeIds = [adminEmployeeId, managerEmployeeId, workerEmployeeId];
    const employeeDetails = [...demoUsers];
    
    // Distribution: More staff at flagship, fewer at express
    const locationDistribution = {
      'Grand Metropolitan Downtown': 55,
      'Metropolitan Airport Hotel': 35,
      'Metro Conference Centre': 20,
      'Harbourside Resort & Spa': 25,
      'Metropolitan Express Birmingham': 12
    };
    
    // Department weights per location type
    const deptWeights = {
      'flagship': { 'Front Office': 8, 'Housekeeping': 15, 'Food & Beverage': 12, 'Kitchen': 8, 'Maintenance & Engineering': 4, 'Spa & Wellness': 3, 'Events & Conference': 3, 'Security': 3, 'Management': 4 },
      'airport': { 'Front Office': 8, 'Housekeeping': 10, 'Food & Beverage': 8, 'Kitchen': 5, 'Maintenance & Engineering': 2, 'Spa & Wellness': 0, 'Events & Conference': 1, 'Security': 3, 'Management': 3 },
      'conference': { 'Front Office': 3, 'Housekeeping': 4, 'Food & Beverage': 5, 'Kitchen': 3, 'Maintenance & Engineering': 2, 'Spa & Wellness': 0, 'Events & Conference': 4, 'Security': 1, 'Management': 2 },
      'resort': { 'Front Office': 5, 'Housekeeping': 8, 'Food & Beverage': 6, 'Kitchen': 4, 'Maintenance & Engineering': 2, 'Spa & Wellness': 4, 'Events & Conference': 1, 'Security': 2, 'Management': 3 },
      'express': { 'Front Office': 4, 'Housekeeping': 4, 'Food & Beverage': 2, 'Kitchen': 1, 'Maintenance & Engineering': 1, 'Spa & Wellness': 0, 'Events & Conference': 0, 'Security': 1, 'Management': 1 }
    };
    
    let employeeCount = 3; // Already created 3
    
    for (const loc of LOCATIONS) {
      const targetCount = locationDistribution[loc.name];
      const weights = deptWeights[loc.type];
      const locId = locationIds[loc.name];
      
      for (const [deptName, count] of Object.entries(weights)) {
        if (count === 0) continue;
        
        const deptId = deptIds[deptName];
        const roles = JOB_ROLES[deptName];
        
        for (let i = 0; i < count && employeeCount < 150; i++) {
          const firstName = randomItem(FIRST_NAMES);
          const lastName = randomItem(LAST_NAMES);
          const role = randomItem(roles);
          const hourlyRate = (Math.random() * (role.hourlyRate[1] - role.hourlyRate[0]) + role.hourlyRate[0]).toFixed(2);
          const contractHours = randomInt(role.contractHours[0], role.contractHours[1]);
          const hireDate = randomDate(new Date('2018-01-01'), new Date('2025-12-01')).toISOString().split('T')[0];
          
          const empId = uuid();
          const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/'/g, '')}${randomInt(1, 999)}@grandmetropolitan.com`;
          
          // Determine user role based on job title
          let userRole = 'worker';
          if (role.title.includes('Manager') || role.title.includes('Supervisor') || role.title.includes('Head') || role.title.includes('Chief')) {
            userRole = 'manager';
          }
          
          // Create user account
          const userId = uuid();
          const password = await hash('demo123');
          
          await client.query(`
            INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, status, email_verified_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
            ON CONFLICT (email) DO NOTHING
          `, [userId, email, password, firstName, lastName, userRole, orgId]);
          
          await client.query(`
            INSERT INTO employees (id, user_id, organization_id, first_name, last_name, email, status, job_title, department_id, location_id, contract_hours, hourly_rate, hire_date, phone)
            VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT DO NOTHING
          `, [empId, userId, orgId, firstName, lastName, email, role.title, deptId, locId, contractHours, hourlyRate, hireDate, `+44 7${randomInt(100, 999)} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`]);
          
          allEmployeeIds.push(empId);
          employeeDetails.push({ id: empId, role: userRole, dept: deptName, location: loc.name, title: role.title, contractHours });
          employeeCount++;
        }
      }
    }
    
    console.log(`   Created ${employeeCount} employees total`);

    // ----------------------------------------
    // 7. Assign Skills to Employees
    // ----------------------------------------
    console.log('🎯 Assigning skills to employees...');
    
    const skillNames = Object.keys(skillIds);
    
    for (const emp of employeeDetails) {
      // Everyone gets core skills
      const empSkills = ['Customer Service Excellence', 'Cash Handling'];
      
      // Department-specific skills
      if (emp.dept === 'Front Office') {
        empSkills.push('PMS Opera');
        if (Math.random() > 0.5) empSkills.push('Night Audit');
        if (Math.random() > 0.6) empSkills.push('Concierge Services');
        if (Math.random() > 0.7) empSkills.push('VIP Guest Handling');
      }
      if (emp.dept === 'Housekeeping') {
        empSkills.push('COSHH Trained');
        if (Math.random() > 0.5) empSkills.push('Deep Cleaning');
        if (Math.random() > 0.6) empSkills.push('Turndown Service');
      }
      if (emp.dept === 'Food & Beverage') {
        empSkills.push('Food Safety Level 2');
        if (Math.random() > 0.4) empSkills.push('Barista');
        if (Math.random() > 0.5) empSkills.push('Cocktail Making');
        if (Math.random() > 0.7) empSkills.push('Silver Service');
        if (Math.random() > 0.8) empSkills.push('Sommelier Level 1');
      }
      if (emp.dept === 'Kitchen') {
        empSkills.push('Food Safety Level 2');
        if (Math.random() > 0.5) empSkills.push('Food Safety Level 3');
        if (Math.random() > 0.6) empSkills.push('Grill Station');
        if (Math.random() > 0.7) empSkills.push('Pastry');
      }
      if (emp.dept === 'Spa & Wellness') {
        if (Math.random() > 0.3) empSkills.push('Swedish Massage');
        if (Math.random() > 0.5) empSkills.push('Facial Treatments');
        if (Math.random() > 0.6) empSkills.push('Hot Stone Therapy');
      }
      if (emp.dept === 'Events & Conference') {
        empSkills.push('AV Equipment');
        if (Math.random() > 0.4) empSkills.push('Event Coordination');
        if (Math.random() > 0.7) empSkills.push('Wedding Planning');
      }
      if (emp.dept === 'Maintenance & Engineering') {
        if (Math.random() > 0.4) empSkills.push('HVAC Systems');
        if (Math.random() > 0.5) empSkills.push('Plumbing');
        if (Math.random() > 0.6) empSkills.push('Electrical (PAT)');
      }
      
      // Management skills for supervisors/managers
      if (emp.role === 'manager' || emp.role === 'admin') {
        empSkills.push('Team Leadership');
        if (Math.random() > 0.4) empSkills.push('Rota Planning');
        if (Math.random() > 0.5) empSkills.push('Performance Reviews');
        if (Math.random() > 0.6) empSkills.push('Budget Management');
      }
      
      // Random safety skills
      if (Math.random() > 0.7) empSkills.push('First Aid Certified');
      if (Math.random() > 0.85) empSkills.push('Fire Safety Warden');
      
      // Random language skills
      if (Math.random() > 0.85) empSkills.push(randomItem(['French (Fluent)', 'Spanish (Fluent)', 'Mandarin (Fluent)', 'German (Fluent)', 'Arabic (Fluent)']));
      
      // Add skills to employee
      for (const skillName of [...new Set(empSkills)]) {
        if (skillIds[skillName]) {
          const proficiency = randomInt(60, 100);
          await client.query(`
            INSERT INTO employee_skills (id, employee_id, skill_id, proficiency, verified, verified_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
          `, [uuid(), emp.id, skillIds[skillName], proficiency, proficiency > 80, proficiency > 80 ? new Date() : null]);
        }
      }
    }

    // ----------------------------------------
    // 8. Create Shifts (Past week + Current + 4 Future = 5+ weeks for month view)
    // ----------------------------------------
    console.log('📅 Creating shifts for 6 weeks (full month view)...');
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 - 7); // Start from LAST Monday (1 week ago)
    
    let shiftCount = 0;
    
    for (let weekOffset = 0; weekOffset < 6; weekOffset++) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const shiftDate = new Date(startOfWeek);
        shiftDate.setDate(startOfWeek.getDate() + (weekOffset * 7) + dayOffset);
        const dateStr = shiftDate.toISOString().split('T')[0];
        const isWeekend = dayOffset >= 5;
        
        for (const emp of employeeDetails) {
          // Skip some employees randomly (holidays, days off)
          if (Math.random() < 0.25) continue;
          
          // Workers with 0 contract hours are casual - schedule less frequently
          if (emp.contractHours === 0 && Math.random() < 0.7) continue;
          
          // Choose appropriate shift pattern based on department
          let shiftPattern;
          if (emp.dept === 'Kitchen') {
            shiftPattern = randomItem(['Breakfast', 'Lunch', 'Dinner', 'Morning', 'Evening']);
          } else if (emp.dept === 'Security') {
            shiftPattern = randomItem(['Day', 'Night', 'Evening']);
          } else if (emp.dept === 'Housekeeping') {
            shiftPattern = randomItem(['Morning', 'Day']);
          } else if (emp.dept === 'Events & Conference' && !isWeekend) {
            shiftPattern = randomItem(['Day', 'Afternoon']);
          } else {
            shiftPattern = randomItem(['Morning', 'Day', 'Afternoon', 'Evening']);
          }
          
          const shift = SHIFT_PATTERNS[shiftPattern];
          const locId = locationIds[emp.location];
          
          // Determine status based on date
          let status = 'scheduled';
          if (shiftDate < today) {
            status = Math.random() > 0.05 ? 'completed' : 'no_show';
          }
          
          await client.query(`
            INSERT INTO shifts (id, organization_id, location_id, employee_id, date, start_time, end_time, status, break_minutes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT DO NOTHING
          `, [uuid(), orgId, locId, emp.id, dateStr, shift.start, shift.end, status, randomItem([0, 30, 30, 45, 60])]);
          
          shiftCount++;
        }
        
        // Add some open shifts
        for (const loc of LOCATIONS) {
          if (Math.random() > 0.6) {
            const openShift = randomItem(Object.values(SHIFT_PATTERNS));
            await client.query(`
              INSERT INTO shifts (id, organization_id, location_id, date, start_time, end_time, status, is_open, notes)
              VALUES ($1, $2, $3, $4, $5, $6, 'open', true, $7)
              ON CONFLICT DO NOTHING
            `, [uuid(), orgId, locationIds[loc.name], dateStr, openShift.start, openShift.end, 'Urgent cover needed']);
            shiftCount++;
          }
        }
      }
    }
    
    console.log(`   Created ${shiftCount} shifts`);

    // ----------------------------------------
    // 9. Create Time-Off Requests
    // ----------------------------------------
    console.log('🏖️ Creating time-off requests...');
    
    const timeOffTypes = ['holiday', 'sick', 'personal', 'training', 'unpaid'];
    let timeOffCount = 0;
    
    for (const emp of employeeDetails) {
      // Each employee has 0-3 time-off requests
      const numRequests = randomInt(0, 3);
      
      for (let i = 0; i < numRequests; i++) {
        const startDate = randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
        const duration = randomInt(1, 14);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration);
        
        const status = randomItem(['pending', 'approved', 'approved', 'approved', 'rejected']);
        
        await client.query(`
          INSERT INTO time_off_requests (id, organization_id, employee_id, type, start_date, end_date, status, notes, reviewed_by, reviewed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT DO NOTHING
        `, [
          uuid(), 
          orgId, 
          emp.id, 
          randomItem(timeOffTypes), 
          startDate.toISOString().split('T')[0], 
          endDate.toISOString().split('T')[0], 
          status,
          status === 'rejected' ? 'Unable to approve due to staffing requirements' : null,
          status !== 'pending' ? managerEmployeeId : null,
          status !== 'pending' ? new Date() : null
        ]);
        timeOffCount++;
      }
    }
    
    console.log(`   Created ${timeOffCount} time-off requests`);

    // ----------------------------------------
    // 10. Create Activity Feed
    // ----------------------------------------
    console.log('📰 Creating activity feed...');
    
    const activities = [
      { type: 'announcement', title: 'Christmas Rota Now Published', content: 'The festive season schedule is now live. Please check your shifts and submit any swap requests by Friday.', priority: 'high' },
      { type: 'announcement', title: 'New Spa Menu Launch', content: 'We\'re excited to introduce our new winter spa treatments. Training sessions available this week.', priority: 'normal' },
      { type: 'announcement', title: 'Health & Safety Refresher', content: 'Mandatory H&S refresher training to be completed by all staff before month end.', priority: 'high' },
      { type: 'achievement', title: 'Employee of the Month', content: 'Congratulations to Priya from Front Office for outstanding guest feedback scores!', priority: 'normal' },
      { type: 'update', title: 'Uniform Policy Update', content: 'New branded uniforms will be distributed next week. Please collect from HR.', priority: 'low' },
      { type: 'event', title: 'Staff Christmas Party', content: 'Join us on December 20th at 7pm in the Grand Ballroom. Plus ones welcome!', priority: 'normal' },
      { type: 'announcement', title: 'Conference Season Begins', content: 'We have 15 major conferences booked for Q1. Additional banquet staff needed - overtime available.', priority: 'high' },
      { type: 'achievement', title: 'TripAdvisor Excellence Award', content: 'Grand Metropolitan Downtown has received the 2025 Travelers\' Choice Award!', priority: 'normal' },
      { type: 'update', title: 'New PMS System Training', content: 'Opera Cloud upgrade scheduled for February. Training sessions booking now.', priority: 'normal' },
      { type: 'announcement', title: 'Wellness Programme Launch', content: 'Free gym access and discounted spa treatments for all team members starting January.', priority: 'normal' }
    ];
    
    for (const activity of activities) {
      const createdAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
      await client.query(`
        INSERT INTO activity_feed (id, organization_id, type, title, content, priority, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, activity.type, activity.title, activity.content, activity.priority, adminEmployeeId, createdAt]);
    }

    // ----------------------------------------
    // 11. Create Job Postings
    // ----------------------------------------
    console.log('💼 Creating internal job postings...');
    
    const jobPostings = [
      { title: 'Front Office Supervisor', dept: 'Front Office', location: 'Metropolitan Airport Hotel', type: 'full_time', salaryMin: 28000, salaryMax: 32000, description: 'Lead our airport reception team. 24/7 operation, shift work required. Previous supervisory experience essential.' },
      { title: 'Senior Spa Therapist', dept: 'Spa & Wellness', location: 'Harbourside Resort & Spa', type: 'full_time', salaryMin: 26000, salaryMax: 30000, description: 'Join our award-winning spa team. VTCT Level 3 or equivalent required.' },
      { title: 'Events Coordinator', dept: 'Events & Conference', location: 'Metro Conference Centre', type: 'full_time', salaryMin: 25000, salaryMax: 28000, description: 'Coordinate weddings and corporate events. Weekend work required.' },
      { title: 'Sous Chef', dept: 'Kitchen', location: 'Grand Metropolitan Downtown', type: 'full_time', salaryMin: 35000, salaryMax: 42000, description: 'Support our Head Chef in our 2 AA Rosette restaurant. Michelin experience preferred.' },
      { title: 'Night Auditor', dept: 'Front Office', location: 'Metropolitan Express Birmingham', type: 'full_time', salaryMin: 24000, salaryMax: 27000, description: 'Oversee night operations and daily reconciliation. PMS experience required.' },
      { title: 'Banquet Server', dept: 'Food & Beverage', location: 'Grand Metropolitan Downtown', type: 'part_time', salaryMin: 22000, salaryMax: 24000, description: 'Casual position for our busy banqueting team. Silver service experience preferred.' }
    ];
    
    for (const job of jobPostings) {
      await client.query(`
        INSERT INTO job_postings (id, organization_id, title, description, department_id, location_id, employment_type, salary_min, salary_max, is_internal, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 'open', $10)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, job.title, job.description, deptIds[job.dept], locationIds[job.location], job.type, job.salaryMin, job.salaryMax, randomDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), new Date())]);
    }

    // ----------------------------------------
    // 12. Create Billing Plan & Subscription
    // ----------------------------------------
    console.log('💳 Creating billing setup...');
    
    const planId = uuid();
    await client.query(`
      INSERT INTO plans (id, slug, name, core_price_per_seat, flex_price_per_seat, min_seats, max_seats, is_active, is_public, sort_order)
      VALUES ($1, 'enterprise', 'Enterprise', 6.00, 10.00, 100, null, true, true, 1)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `, [planId]);
    
    await client.query(`
      INSERT INTO subscriptions (id, organization_id, plan_id, status, core_seats, flex_seats, trial_ends_at)
      VALUES ($1, $2, $3, 'trialing', 150, 25, NOW() + INTERVAL '30 days')
      ON CONFLICT DO NOTHING
    `, [uuid(), orgId, planId]);

    // ----------------------------------------
    // 13. Create Shift Templates
    // ----------------------------------------
    console.log('📋 Creating shift templates...');
    
    const templates = [
      { name: 'Morning Reception', dept: 'Front Office', start: '07:00', end: '15:00', breakMins: 45 },
      { name: 'Evening Reception', dept: 'Front Office', start: '15:00', end: '23:00', breakMins: 45 },
      { name: 'Night Audit', dept: 'Front Office', start: '23:00', end: '07:00', breakMins: 45 },
      { name: 'Housekeeping AM', dept: 'Housekeeping', start: '08:00', end: '16:00', breakMins: 30 },
      { name: 'Breakfast Service', dept: 'Food & Beverage', start: '06:00', end: '11:00', breakMins: 0 },
      { name: 'Lunch Service', dept: 'Food & Beverage', start: '11:00', end: '15:30', breakMins: 0 },
      { name: 'Dinner Service', dept: 'Food & Beverage', start: '17:00', end: '23:30', breakMins: 30 },
      { name: 'Kitchen Prep', dept: 'Kitchen', start: '06:00', end: '14:00', breakMins: 30 },
      { name: 'Kitchen Service', dept: 'Kitchen', start: '14:00', end: '23:00', breakMins: 45 },
      { name: 'Spa Therapist Day', dept: 'Spa & Wellness', start: '09:00', end: '18:00', breakMins: 60 },
      { name: 'Events Setup', dept: 'Events & Conference', start: '07:00', end: '15:00', breakMins: 30 },
      { name: 'Security Day', dept: 'Security', start: '07:00', end: '19:00', breakMins: 60 },
      { name: 'Security Night', dept: 'Security', start: '19:00', end: '07:00', breakMins: 60 }
    ];
    
    for (const template of templates) {
      await client.query(`
        INSERT INTO shift_templates (id, organization_id, name, department_id, start_time, end_time, break_minutes, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT DO NOTHING
      `, [uuid(), orgId, template.name, deptIds[template.dept], template.start, template.end, template.breakMins]);
    }

    await client.query('COMMIT');

    console.log('\n✅ Demo seed completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏨 THE GRAND METROPOLITAN HOTEL GROUP - DEMO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Demo Accounts (all passwords: demo123):');
    console.log('');
    console.log('  👔 Admin:   demo-admin@uplift.hr');
    console.log('  👨‍💼 Manager: demo-manager@uplift.hr');  
    console.log('  👷 Worker:  demo-worker@uplift.hr');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Created: ${employeeCount} employees | ${shiftCount} shifts (6 weeks) | 5 locations`);
    console.log(`🎯 Skills: 48 | 📅 Time-off requests: ${timeOffCount} | 💼 Jobs: 6`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Demo seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
