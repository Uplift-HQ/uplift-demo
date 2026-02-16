// ============================================================
// ZOD VALIDATION SCHEMAS
// Comprehensive input validation for all critical endpoints
// ============================================================

import { z } from 'zod';

// -------------------- COMMON SCHEMAS --------------------

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)')
  .optional()
  .nullable();

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => !isNaN(Date.parse(date)), 'Invalid date');

export const dateTimeSchema = z.string()
  .refine((dt) => !isNaN(Date.parse(dt)), 'Invalid datetime format');

export const currencySchema = z.enum(['GBP', 'USD', 'EUR', 'AUD', 'CAD', 'NZD', 'CHF']);

export const positiveAmountSchema = z.number()
  .positive('Amount must be positive')
  .max(9999999.99, 'Amount exceeds maximum');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// -------------------- AUTH SCHEMAS --------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
  rememberMe: z.boolean().optional(),
  mfaCode: z.string().length(6).regex(/^\d{6}$/, 'MFA code must be 6 digits').optional(),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name too long')
    .trim(),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long')
    .trim(),
  organizationName: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(200, 'Organization name too long')
    .trim(),
  phone: phoneSchema,
  acceptTerms: z.boolean().refine(v => v === true, 'You must accept the terms'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const mfaSetupSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'MFA code must be 6 digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// -------------------- EMPLOYEE SCHEMAS --------------------

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum(['employee', 'manager', 'admin']).default('employee'),
  departmentId: uuidSchema.optional().nullable(),
  locationId: uuidSchema.optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  employeeNumber: z.string().max(50).optional().nullable(),
  hireDate: dateSchema.optional().nullable(),
  salary: positiveAmountSchema.optional().nullable(),
  hourlyRate: positiveAmountSchema.optional().nullable(),
  contractType: z.enum(['full_time', 'part_time', 'contractor', 'intern']).default('full_time'),
  workPattern: z.string().max(100).optional().nullable(),
  skills: z.array(z.string().max(100)).max(50).optional(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactPhone: phoneSchema,
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

// -------------------- TIME ENTRY SCHEMAS --------------------

export const clockInSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  locationId: uuidSchema.optional().nullable(),
  shiftId: uuidSchema.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  photo: z.string().max(2000).optional().nullable(), // Base64 or URL
});

export const clockOutSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  photo: z.string().max(2000).optional().nullable(),
});

export const createTimeEntrySchema = z.object({
  employeeId: uuidSchema,
  date: dateSchema,
  clockIn: dateTimeSchema,
  clockOut: dateTimeSchema.optional().nullable(),
  breakMinutes: z.number().int().min(0).max(480).default(0),
  locationId: uuidSchema.optional().nullable(),
  shiftId: uuidSchema.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  type: z.enum(['regular', 'overtime', 'holiday', 'sick', 'pto']).default('regular'),
}).refine((data) => {
  if (data.clockOut) {
    return new Date(data.clockOut) > new Date(data.clockIn);
  }
  return true;
}, {
  message: 'Clock out must be after clock in',
  path: ['clockOut'],
});

export const updateTimeEntrySchema = createTimeEntrySchema.partial();

// -------------------- SHIFT SCHEMAS --------------------

export const createShiftSchema = z.object({
  employeeId: uuidSchema,
  date: dateSchema,
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:MM format'),
  breakMinutes: z.number().int().min(0).max(480).default(30),
  locationId: uuidSchema.optional().nullable(),
  departmentId: uuidSchema.optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  requiredSkills: z.array(z.string().max(100)).max(20).optional(),
  notes: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format').optional().nullable(),
  isTemplate: z.boolean().default(false),
  repeatPattern: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).default('none'),
  repeatUntil: dateSchema.optional().nullable(),
});

export const updateShiftSchema = createShiftSchema.partial();

export const bulkShiftSchema = z.object({
  shifts: z.array(createShiftSchema).min(1).max(100),
});

export const shiftSwapRequestSchema = z.object({
  targetEmployeeId: uuidSchema,
  reason: z.string().max(500).optional().nullable(),
});

// -------------------- EXPENSE SCHEMAS --------------------

export const createExpenseSchema = z.object({
  category: z.enum([
    'travel', 'meals', 'accommodation', 'supplies', 'equipment',
    'transport', 'parking', 'fuel', 'entertainment', 'training',
    'software', 'subscriptions', 'communication', 'other'
  ]),
  amount: positiveAmountSchema,
  currency: currencySchema.default('GBP'),
  date: dateSchema,
  merchant: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  receiptUrl: z.string().url().max(2000).optional().nullable(),
  projectId: uuidSchema.optional().nullable(),
  clientId: uuidSchema.optional().nullable(),
  vatAmount: z.number().min(0).max(9999999.99).optional().nullable(),
  paymentMethod: z.enum(['card', 'cash', 'corporate_card', 'bank_transfer', 'personal']).default('personal'),
  isBillable: z.boolean().default(false),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().max(500).optional().nullable(),
});

// -------------------- CORPORATE CARD SCHEMAS --------------------

export const createCorporateCardSchema = z.object({
  employeeId: uuidSchema,
  cardNumber: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
  cardholderName: z.string().min(1).max(100).trim(),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2024).max(2040),
  cardType: z.enum(['visa', 'mastercard', 'amex']),
  monthlyLimit: positiveAmountSchema.optional().nullable(),
  singleTransactionLimit: positiveAmountSchema.optional().nullable(),
  allowedCategories: z.array(z.string().max(50)).max(20).optional(),
  isActive: z.boolean().default(true),
});

export const updateCorporateCardSchema = createCorporateCardSchema
  .omit({ cardNumber: true })
  .partial();

// -------------------- PAYROLL SCHEMAS --------------------

export const generatePayrollSchema = z.object({
  periodStart: dateSchema,
  periodEnd: dateSchema,
  employeeIds: z.array(uuidSchema).optional(), // If empty, all employees
  includeOvertime: z.boolean().default(true),
  includeBonus: z.boolean().default(true),
  includeDeductions: z.boolean().default(true),
}).refine((data) => {
  return new Date(data.periodEnd) > new Date(data.periodStart);
}, {
  message: 'Period end must be after period start',
  path: ['periodEnd'],
});

export const payrollAdjustmentSchema = z.object({
  type: z.enum(['bonus', 'deduction', 'reimbursement', 'correction']),
  amount: z.number().refine(v => v !== 0, 'Amount cannot be zero'),
  description: z.string().min(1).max(500).trim(),
  payrollRunId: uuidSchema.optional().nullable(),
});

// -------------------- LEAVE/PTO SCHEMAS --------------------

export const leaveRequestSchema = z.object({
  type: z.enum(['annual', 'sick', 'personal', 'parental', 'bereavement', 'unpaid', 'other']),
  startDate: dateSchema,
  endDate: dateSchema,
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(['morning', 'afternoon']).optional().nullable(),
  reason: z.string().max(1000).optional().nullable(),
  attachmentUrl: z.string().url().max(2000).optional().nullable(),
}).refine((data) => {
  return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const leaveApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().max(500).optional().nullable(),
});

// -------------------- RECOGNITION/KUDOS SCHEMAS --------------------

export const recognitionSchema = z.object({
  recipientId: uuidSchema,
  type: z.enum(['kudos', 'shoutout', 'thank_you', 'great_job', 'above_and_beyond']),
  message: z.string().min(1).max(500).trim(),
  value: z.enum(['teamwork', 'innovation', 'customer_focus', 'reliability', 'leadership', 'other']).optional(),
  isPublic: z.boolean().default(true),
  pointsAwarded: z.number().int().min(1).max(1000).default(10),
});

// -------------------- ORGANIZATION SCHEMAS --------------------

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  legalName: z.string().max(200).trim().optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  address: z.object({
    line1: z.string().max(200).optional().nullable(),
    line2: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(20).optional().nullable(),
    country: z.string().length(2).optional().nullable(), // ISO country code
  }).optional(),
  phone: phoneSchema,
  website: z.string().url().max(500).optional().nullable(),
  timezone: z.string().max(100).optional(),
  currency: currencySchema.optional(),
  locale: z.string().max(10).optional(),
  fiscalYearStart: z.number().int().min(1).max(12).optional(),
  workweekStart: z.enum(['sunday', 'monday', 'saturday']).optional(),
  logoUrl: z.string().url().max(2000).optional().nullable(),
});

// -------------------- LOCATION SCHEMAS --------------------

export const createLocationSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  address: z.object({
    line1: z.string().max(200),
    line2: z.string().max(200).optional().nullable(),
    city: z.string().max(100),
    state: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(20),
    country: z.string().length(2), // ISO country code
  }),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  geofenceRadius: z.number().int().min(10).max(5000).default(100), // meters
  timezone: z.string().max(100).optional(),
  phone: phoneSchema,
  isActive: z.boolean().default(true),
  capacity: z.number().int().positive().optional().nullable(),
});

export const updateLocationSchema = createLocationSchema.partial();

// -------------------- DEPARTMENT SCHEMAS --------------------

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional().nullable(),
  managerId: uuidSchema.optional().nullable(),
  parentDepartmentId: uuidSchema.optional().nullable(),
  costCenter: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// -------------------- SEARCH SCHEMAS --------------------

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200).trim(),
  type: z.enum(['employees', 'shifts', 'expenses', 'all']).default('all'),
  ...paginationSchema.shape,
});

// -------------------- WEBHOOK SCHEMAS --------------------

export const webhookConfigSchema = z.object({
  url: z.string().url().max(2000),
  events: z.array(z.enum([
    'employee.created', 'employee.updated', 'employee.deleted',
    'shift.created', 'shift.updated', 'shift.deleted',
    'time_entry.clock_in', 'time_entry.clock_out',
    'expense.submitted', 'expense.approved', 'expense.rejected',
    'leave.requested', 'leave.approved', 'leave.rejected',
    'payroll.generated', 'payroll.approved',
  ])).min(1).max(20),
  secret: z.string().min(16).max(100).optional(),
  isActive: z.boolean().default(true),
  headers: z.record(z.string().max(100), z.string().max(500)).optional(),
});

// -------------------- BULK OPERATION SCHEMAS --------------------

export const bulkUpdateSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
  updates: z.record(z.string(), z.any()),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
});

// -------------------- EXPORT DEFAULT --------------------

export default {
  // Common
  uuidSchema,
  emailSchema,
  passwordSchema,
  dateSchema,
  dateTimeSchema,
  currencySchema,
  positiveAmountSchema,
  paginationSchema,

  // Auth
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  mfaSetupSchema,
  refreshTokenSchema,

  // Employee
  createEmployeeSchema,
  updateEmployeeSchema,

  // Time Entry
  clockInSchema,
  clockOutSchema,
  createTimeEntrySchema,
  updateTimeEntrySchema,

  // Shift
  createShiftSchema,
  updateShiftSchema,
  bulkShiftSchema,
  shiftSwapRequestSchema,

  // Expense
  createExpenseSchema,
  updateExpenseSchema,
  expenseApprovalSchema,

  // Corporate Card
  createCorporateCardSchema,
  updateCorporateCardSchema,

  // Payroll
  generatePayrollSchema,
  payrollAdjustmentSchema,

  // Leave
  leaveRequestSchema,
  leaveApprovalSchema,

  // Recognition
  recognitionSchema,

  // Organization
  updateOrganizationSchema,

  // Location
  createLocationSchema,
  updateLocationSchema,

  // Department
  createDepartmentSchema,
  updateDepartmentSchema,

  // Search
  searchQuerySchema,

  // Webhook
  webhookConfigSchema,

  // Bulk
  bulkUpdateSchema,
  bulkDeleteSchema,
};
