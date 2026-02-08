// ============================================================
// API DOCUMENTATION ROUTES
// Swagger/OpenAPI documentation endpoints
// ============================================================

import { Router } from 'express';

const router = Router();

// OpenAPI 3.0 specification
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Uplift API',
    version: '1.0.0',
    description: 'Workforce management API for scheduling, time tracking, and employee management',
    contact: {
      name: 'Uplift Support',
      email: 'support@uplift.app',
      url: 'https://uplift.app/support'
    },
    license: {
      name: 'Proprietary',
      url: 'https://uplift.app/terms'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'Production API'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Employees', description: 'Employee management' },
    { name: 'Shifts', description: 'Shift scheduling and management' },
    { name: 'Shift Swaps', description: 'Shift swap requests' },
    { name: 'Schedule', description: 'Schedule periods and publishing' },
    { name: 'Shift Templates', description: 'Shift template management' },
    { name: 'Forecasting', description: 'AI demand forecasting and recommendations' },
    { name: 'Time Tracking', description: 'Clock in/out and time entries' },
    { name: 'Time Off', description: 'Leave requests and balances' },
    { name: 'Locations', description: 'Location management' },
    { name: 'Departments', description: 'Department management' },
    { name: 'Roles', description: 'Role management' },
    { name: 'Skills', description: 'Skills management' },
    { name: 'Employee Skills', description: 'Employee skill assignments' },
    { name: 'Jobs', description: 'Internal job postings and applications' },
    { name: 'Users', description: 'User account management' },
    { name: 'Sessions', description: 'User session management' },
    { name: 'GDPR', description: 'Data export and deletion requests' },
    { name: 'Gamification', description: 'Points, badges, leaderboard, and rewards' },
    { name: 'Expenses', description: 'Expense claims and approvals' },
    { name: 'Payslips', description: 'Payslip and payroll management' },
    { name: 'Chat', description: 'Team messaging channels and messages' },
    { name: 'Integrations', description: 'API keys, webhooks, and OAuth integrations' },
    { name: 'Dashboard', description: 'Dashboard metrics and analytics' },
    { name: 'Reports', description: 'Reporting and analytics' },
    { name: 'Exports', description: 'Data exports (CSV, PDF)' },
    { name: 'Notifications', description: 'Push and in-app notifications' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message' },
          code: { type: 'string', description: 'Error code' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['worker', 'manager', 'admin', 'superadmin'] },
          status: { type: 'string', enum: ['active', 'inactive', 'invited'] },
          avatarUrl: { type: 'string' },
          emailVerified: { type: 'boolean' },
          mfaEnabled: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          employeeNumber: { type: 'string' },
          employmentType: { type: 'string', enum: ['full_time', 'part_time', 'casual', 'contractor'] },
          status: { type: 'string', enum: ['active', 'inactive', 'terminated'] },
          departmentId: { type: 'string', format: 'uuid' },
          primaryRoleId: { type: 'string', format: 'uuid' },
          primaryLocationId: { type: 'string', format: 'uuid' },
          managerId: { type: 'string', format: 'uuid' },
          hourlyRate: { type: 'number' },
          contractedHoursPerWeek: { type: 'number' },
          startDate: { type: 'string', format: 'date' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Shift: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          locationId: { type: 'string', format: 'uuid' },
          roleId: { type: 'string', format: 'uuid' },
          date: { type: 'string', format: 'date' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          breakMinutes: { type: 'integer' },
          isOpen: { type: 'boolean' },
          status: { type: 'string', enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] },
          notes: { type: 'string' },
          published: { type: 'boolean' },
          estimatedCost: { type: 'number' }
        }
      },
      TimeEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          shiftId: { type: 'string', format: 'uuid' },
          locationId: { type: 'string', format: 'uuid' },
          clockIn: { type: 'string', format: 'date-time' },
          clockOut: { type: 'string', format: 'date-time' },
          totalBreakMinutes: { type: 'integer' },
          totalHours: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] }
        }
      },
      Location: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          code: { type: 'string' },
          type: { type: 'string', enum: ['store', 'warehouse', 'office', 'remote'] },
          addressLine1: { type: 'string' },
          city: { type: 'string' },
          postcode: { type: 'string' },
          country: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          geofenceRadius: { type: 'number' },
          timezone: { type: 'string' },
          status: { type: 'string' }
        }
      },
      Department: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          code: { type: 'string' },
          parentId: { type: 'string', format: 'uuid' },
          managerId: { type: 'string', format: 'uuid' },
          color: { type: 'string' },
          employeeCount: { type: 'integer' }
        }
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          code: { type: 'string' },
          departmentId: { type: 'string', format: 'uuid' },
          defaultHourlyRate: { type: 'number' },
          color: { type: 'string' },
          employeeCount: { type: 'integer' }
        }
      },
      Skill: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          category: { type: 'string' },
          requiresVerification: { type: 'boolean' },
          expiresAfterDays: { type: 'integer' },
          employeeCount: { type: 'integer' }
        }
      },
      EmployeeSkill: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', format: 'uuid' },
          skillId: { type: 'string', format: 'uuid' },
          level: { type: 'integer' },
          verified: { type: 'boolean' },
          verifiedBy: { type: 'string', format: 'uuid' },
          verifiedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' }
        }
      },
      ShiftSwap: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fromShiftId: { type: 'string', format: 'uuid' },
          fromEmployeeId: { type: 'string', format: 'uuid' },
          toShiftId: { type: 'string', format: 'uuid' },
          toEmployeeId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['swap', 'drop'] },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          reason: { type: 'string' }
        }
      },
      SchedulePeriod: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          locationId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['draft', 'published'] },
          publishedAt: { type: 'string', format: 'date-time' },
          publishedBy: { type: 'string', format: 'uuid' }
        }
      },
      ShiftTemplate: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          locationId: { type: 'string', format: 'uuid' },
          roleId: { type: 'string', format: 'uuid' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          breakMinutes: { type: 'integer' },
          daysOfWeek: { type: 'array', items: { type: 'integer' } },
          color: { type: 'string' }
        }
      },
      TimeOffPolicy: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          code: { type: 'string' },
          accrualType: { type: 'string' },
          accrualAmount: { type: 'number' },
          maxBalance: { type: 'number' },
          requiresApproval: { type: 'boolean' },
          isPaid: { type: 'boolean' }
        }
      },
      TimeOffRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          policyId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          totalDays: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
          reason: { type: 'string' }
        }
      },
      TimeOffBalance: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', format: 'uuid' },
          policyId: { type: 'string', format: 'uuid' },
          year: { type: 'integer' },
          entitlement: { type: 'number' },
          used: { type: 'number' },
          pending: { type: 'number' },
          carriedOver: { type: 'number' }
        }
      },
      JobPosting: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          roleId: { type: 'string', format: 'uuid' },
          departmentId: { type: 'string', format: 'uuid' },
          locationId: { type: 'string', format: 'uuid' },
          employmentType: { type: 'string' },
          hourlyRateMin: { type: 'number' },
          hourlyRateMax: { type: 'number' },
          requiredSkills: { type: 'array', items: { type: 'string', format: 'uuid' } },
          visibility: { type: 'string', enum: ['internal', 'external'] },
          status: { type: 'string', enum: ['draft', 'active', 'closed'] },
          closesAt: { type: 'string', format: 'date-time' }
        }
      },
      JobApplication: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          jobPostingId: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          coverLetter: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'interview', 'accepted', 'rejected'] },
          interviewScheduledAt: { type: 'string', format: 'date-time' }
        }
      },
      ExpenseCategory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          maxAmount: { type: 'number' },
          requiresReceipt: { type: 'boolean' },
          requiresApproval: { type: 'boolean' },
          glCode: { type: 'string' }
        }
      },
      ExpenseClaim: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          description: { type: 'string' },
          categoryId: { type: 'string', format: 'uuid' },
          amount: { type: 'number' },
          expenseDate: { type: 'string', format: 'date' },
          receiptUrl: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled'] },
          notes: { type: 'string' }
        }
      },
      Payslip: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          payPeriodStart: { type: 'string', format: 'date' },
          payPeriodEnd: { type: 'string', format: 'date' },
          payDate: { type: 'string', format: 'date' },
          grossPay: { type: 'number' },
          netPay: { type: 'number' },
          regularHours: { type: 'number' },
          overtimeHours: { type: 'number' },
          status: { type: 'string', enum: ['draft', 'pending', 'approved', 'sent', 'viewed'] }
        }
      },
      ChatChannel: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['group', 'direct'] },
          isPrivate: { type: 'boolean' },
          isArchived: { type: 'boolean' },
          unreadCount: { type: 'integer' }
        }
      },
      ChatMessage: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          channelId: { type: 'string', format: 'uuid' },
          senderId: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          messageType: { type: 'string', enum: ['text', 'image', 'file'] },
          replyToId: { type: 'string', format: 'uuid' },
          isEdited: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Webhook: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          lastTriggeredAt: { type: 'string', format: 'date-time' },
          successCount: { type: 'integer' },
          failureCount: { type: 'integer' }
        }
      },
      ApiKey: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          scopes: { type: 'array', items: { type: 'string' } },
          rateLimitTier: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          lastUsedAt: { type: 'string', format: 'date-time' }
        }
      },
      Reward: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          pointsCost: { type: 'integer' },
          quantityAvailable: { type: 'integer' }
        }
      },
      AffiliateOffer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          provider: { type: 'string' },
          category: { type: 'string' },
          discountPercentage: { type: 'number' },
          affiliateLink: { type: 'string' },
          terms: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean' }
        }
      }
    },
    parameters: {
      limitParam: {
        name: 'limit',
        in: 'query',
        description: 'Maximum number of items to return',
        schema: { type: 'integer', default: 50, maximum: 100 }
      },
      offsetParam: {
        name: 'offset',
        in: 'query',
        description: 'Number of items to skip',
        schema: { type: 'integer', default: 0 }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ==================== AUTHENTICATION ====================
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with email and password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } }
          },
          401: { description: 'Invalid credentials' }
        }
      }
    },

    // ==================== EMPLOYEES ====================
    '/employees/me': {
      get: {
        tags: ['Employees'],
        summary: 'Get current user\'s employee record',
        responses: {
          200: { description: 'Employee record', content: { 'application/json': { schema: { type: 'object', properties: { employee: { $ref: '#/components/schemas/Employee' } } } } } },
          404: { description: 'User not found' }
        }
      }
    },
    '/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List employees',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', default: 'active' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/offsetParam' }
        ],
        responses: {
          200: { description: 'List of employees', content: { 'application/json': { schema: { type: 'object', properties: { employees: { type: 'array', items: { $ref: '#/components/schemas/Employee' } }, total: { type: 'integer' } } } } } }
        }
      },
      post: {
        tags: ['Employees'],
        summary: 'Create employee (admin/manager)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['firstName', 'lastName'], properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', format: 'email' }, phone: { type: 'string' }, employeeNumber: { type: 'string' }, employmentType: { type: 'string', enum: ['full_time', 'part_time', 'casual', 'contractor'] }, startDate: { type: 'string', format: 'date' }, departmentId: { type: 'string', format: 'uuid' }, primaryRoleId: { type: 'string', format: 'uuid' }, primaryLocationId: { type: 'string', format: 'uuid' }, managerId: { type: 'string', format: 'uuid' }, hourlyRate: { type: 'number' }, contractedHoursPerWeek: { type: 'number' } } } } }
        },
        responses: {
          201: { description: 'Employee created' },
          400: { description: 'Invalid input' }
        }
      }
    },
    '/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get single employee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Employee details with skills' },
          404: { description: 'Employee not found' }
        }
      },
      patch: {
        tags: ['Employees'],
        summary: 'Update employee (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, departmentId: { type: 'string', format: 'uuid' }, primaryRoleId: { type: 'string', format: 'uuid' }, primaryLocationId: { type: 'string', format: 'uuid' }, managerId: { type: 'string', format: 'uuid' }, hourlyRate: { type: 'number' }, status: { type: 'string' } } } } } },
        responses: {
          200: { description: 'Employee updated' },
          404: { description: 'Employee not found' }
        }
      },
      delete: {
        tags: ['Employees'],
        summary: 'Deactivate employee (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Employee deactivated' } }
      }
    },
    '/employees/{employeeId}/skills': {
      get: {
        tags: ['Employee Skills'],
        summary: 'Get employee skills',
        parameters: [{ name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'List of employee skills' } }
      },
      post: {
        tags: ['Employee Skills'],
        summary: 'Add skill to employee (admin/manager)',
        parameters: [{ name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['skillId'], properties: { skillId: { type: 'string', format: 'uuid' }, level: { type: 'integer' }, verified: { type: 'boolean' } } } } } },
        responses: { 201: { description: 'Skill added' } }
      }
    },
    '/employees/{empId}/skills/{skillId}': {
      put: {
        tags: ['Employee Skills'],
        summary: 'Update employee skill (admin/manager)',
        parameters: [
          { name: 'empId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'skillId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { level: { type: 'integer' }, verified: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Skill updated' }, 404: { description: 'Not found' } }
      },
      delete: {
        tags: ['Employee Skills'],
        summary: 'Remove skill from employee (admin/manager)',
        parameters: [
          { name: 'empId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'skillId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: { 200: { description: 'Skill removed' }, 404: { description: 'Not found' } }
      }
    },
    '/employees/{employeeId}/skills/{skillId}/verify': {
      post: {
        tags: ['Employee Skills'],
        summary: 'Verify employee skill (admin/manager)',
        parameters: [
          { name: 'employeeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'skillId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: { 200: { description: 'Skill verified' } }
      }
    },
    '/employees/{id}/career-paths': {
      get: {
        tags: ['Jobs'],
        summary: 'Get potential career paths for employee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Career paths and skills gaps' } }
      }
    },

    // ==================== LOCATIONS ====================
    '/locations': {
      get: {
        tags: ['Locations'],
        summary: 'List locations',
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', default: 'active' } }],
        responses: { 200: { description: 'List of locations', content: { 'application/json': { schema: { type: 'object', properties: { locations: { type: 'array', items: { $ref: '#/components/schemas/Location' } } } } } } } }
      },
      post: {
        tags: ['Locations'],
        summary: 'Create location (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, code: { type: 'string' }, type: { type: 'string', enum: ['store', 'warehouse', 'office', 'remote'] }, addressLine1: { type: 'string' }, city: { type: 'string' }, postcode: { type: 'string' }, country: { type: 'string' }, latitude: { type: 'number' }, longitude: { type: 'number' }, geofenceRadius: { type: 'number' }, timezone: { type: 'string' } } } } } },
        responses: { 201: { description: 'Location created' } }
      }
    },
    '/locations/{id}': {
      get: {
        tags: ['Locations'],
        summary: 'Get single location',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Location details' }, 404: { description: 'Not found' } }
      },
      patch: {
        tags: ['Locations'],
        summary: 'Update location (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' }, type: { type: 'string' }, status: { type: 'string' } } } } } },
        responses: { 200: { description: 'Location updated' } }
      }
    },

    // ==================== DEPARTMENTS ====================
    '/departments': {
      get: {
        tags: ['Departments'],
        summary: 'List departments',
        responses: { 200: { description: 'List of departments' } }
      },
      post: {
        tags: ['Departments'],
        summary: 'Create department (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, code: { type: 'string' }, parentId: { type: 'string', format: 'uuid' }, managerId: { type: 'string', format: 'uuid' }, color: { type: 'string' } } } } } },
        responses: { 201: { description: 'Department created' } }
      }
    },
    '/departments/{id}': {
      patch: {
        tags: ['Departments'],
        summary: 'Update department (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' }, parentId: { type: 'string', format: 'uuid' }, managerId: { type: 'string', format: 'uuid' }, color: { type: 'string' } } } } } },
        responses: { 200: { description: 'Department updated' } }
      }
    },

    // ==================== ROLES ====================
    '/roles': {
      get: {
        tags: ['Roles'],
        summary: 'List roles',
        responses: { 200: { description: 'List of roles' } }
      },
      post: {
        tags: ['Roles'],
        summary: 'Create role (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, code: { type: 'string' }, departmentId: { type: 'string', format: 'uuid' }, defaultHourlyRate: { type: 'number' }, color: { type: 'string' } } } } } },
        responses: { 201: { description: 'Role created' } }
      }
    },

    // ==================== SKILLS ====================
    '/skills': {
      get: {
        tags: ['Skills'],
        summary: 'List skills',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'List of skills with categories' } }
      },
      post: {
        tags: ['Skills'],
        summary: 'Create skill (admin/manager)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, category: { type: 'string' }, requiresVerification: { type: 'boolean' }, expiresAfterDays: { type: 'integer' } } } } } },
        responses: { 201: { description: 'Skill created' } }
      }
    },
    '/skills/{id}': {
      put: {
        tags: ['Skills'],
        summary: 'Update skill (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, category: { type: 'string' }, requiresVerification: { type: 'boolean' }, expiresAfterDays: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Skill updated' }, 404: { description: 'Not found' } }
      },
      delete: {
        tags: ['Skills'],
        summary: 'Delete skill (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Skill deleted' }, 404: { description: 'Not found' } }
      }
    },
    '/skills/{id}/employees': {
      get: {
        tags: ['Skills'],
        summary: 'Get employees with a specific skill',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'List of employees with this skill' } }
      }
    },

    // ==================== SHIFTS ====================
    '/shifts': {
      get: {
        tags: ['Shifts'],
        summary: 'List shifts for date range',
        parameters: [
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'employeeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'includeOpen', in: 'query', schema: { type: 'string', default: 'true' } }
        ],
        responses: { 200: { description: 'List of shifts', content: { 'application/json': { schema: { type: 'object', properties: { shifts: { type: 'array', items: { $ref: '#/components/schemas/Shift' } } } } } } } }
      },
      post: {
        tags: ['Shifts'],
        summary: 'Create shift (admin/manager)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['date', 'startTime', 'endTime'], properties: { date: { type: 'string', format: 'date' }, startTime: { type: 'string', format: 'date-time' }, endTime: { type: 'string', format: 'date-time' }, breakMinutes: { type: 'integer' }, locationId: { type: 'string', format: 'uuid' }, roleId: { type: 'string', format: 'uuid' }, employeeId: { type: 'string', format: 'uuid' }, isOpen: { type: 'boolean' }, notes: { type: 'string' }, color: { type: 'string' } } } } } },
        responses: { 201: { description: 'Shift created' }, 400: { description: 'Invalid input' }, 409: { description: 'Conflicting shift' } }
      }
    },
    '/shifts/bulk': {
      post: {
        tags: ['Shifts'],
        summary: 'Bulk create shifts (admin/manager)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['shifts'], properties: { shifts: { type: 'array', items: { type: 'object', properties: { date: { type: 'string', format: 'date' }, startTime: { type: 'string', format: 'date-time' }, endTime: { type: 'string', format: 'date-time' }, locationId: { type: 'string', format: 'uuid' }, roleId: { type: 'string', format: 'uuid' }, employeeId: { type: 'string', format: 'uuid' } } } } } } } } },
        responses: { 201: { description: 'Shifts created with any errors' } }
      }
    },
    '/shifts/open': {
      get: {
        tags: ['Shifts'],
        summary: 'Get open shifts available to current employee',
        responses: { 200: { description: 'List of open shifts' } }
      }
    },
    '/shifts/{id}': {
      get: {
        tags: ['Shifts'],
        summary: 'Get single shift',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Shift details' }, 404: { description: 'Not found' } }
      },
      patch: {
        tags: ['Shifts'],
        summary: 'Update shift (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { date: { type: 'string', format: 'date' }, startTime: { type: 'string', format: 'date-time' }, endTime: { type: 'string', format: 'date-time' }, employeeId: { type: 'string', format: 'uuid' }, status: { type: 'string' }, notes: { type: 'string' } } } } } },
        responses: { 200: { description: 'Shift updated' }, 404: { description: 'Not found' } }
      },
      delete: {
        tags: ['Shifts'],
        summary: 'Delete shift (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Shift deleted' } }
      }
    },
    '/shifts/{id}/apply': {
      post: {
        tags: ['Shifts'],
        summary: 'Apply for an open shift',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Application submitted' }, 400: { description: 'Shift not open or already applied' } }
      }
    },
    '/shifts/{id}/assign': {
      post: {
        tags: ['Shifts'],
        summary: 'Assign open shift to employee (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['employeeId'], properties: { employeeId: { type: 'string', format: 'uuid' } } } } } },
        responses: { 200: { description: 'Shift assigned' }, 404: { description: 'Not found or not open' } }
      }
    },

    // ==================== SHIFT SWAPS ====================
    '/shifts/swaps': {
      get: {
        tags: ['Shift Swaps'],
        summary: 'List shift swap requests',
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', default: 'pending' } }],
        responses: { 200: { description: 'List of swap requests' } }
      },
      post: {
        tags: ['Shift Swaps'],
        summary: 'Create shift swap request',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fromShiftId'], properties: { fromShiftId: { type: 'string', format: 'uuid' }, toShiftId: { type: 'string', format: 'uuid' }, toEmployeeId: { type: 'string', format: 'uuid' }, type: { type: 'string', enum: ['swap', 'drop'] }, reason: { type: 'string' } } } } } },
        responses: { 201: { description: 'Swap request created' } }
      }
    },
    '/shifts/swaps/{id}/{action}': {
      post: {
        tags: ['Shift Swaps'],
        summary: 'Approve or reject swap request (admin/manager)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'action', in: 'path', required: true, schema: { type: 'string', enum: ['approve', 'reject'] } }
        ],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { notes: { type: 'string' } } } } } },
        responses: { 200: { description: 'Swap request processed' }, 404: { description: 'Not found' } }
      }
    },

    // ==================== SCHEDULE PERIODS ====================
    '/schedule/periods': {
      get: {
        tags: ['Schedule'],
        summary: 'List schedule periods',
        parameters: [
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'List of schedule periods' } }
      },
      post: {
        tags: ['Schedule'],
        summary: 'Create schedule period (admin/manager)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['startDate', 'endDate'], properties: { startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' }, locationId: { type: 'string', format: 'uuid' } } } } } },
        responses: { 201: { description: 'Period created' } }
      }
    },
    '/schedule/periods/{id}/publish': {
      post: {
        tags: ['Schedule'],
        summary: 'Publish schedule period (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Schedule published and employees notified' }, 404: { description: 'Not found' } }
      }
    },

    // ==================== SHIFT TEMPLATES ====================
    '/shift-templates': {
      get: {
        tags: ['Shift Templates'],
        summary: 'List shift templates',
        parameters: [{ name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'List of templates' } }
      },
      post: {
        tags: ['Shift Templates'],
        summary: 'Create shift template (admin/manager)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'startTime', 'endTime'], properties: { name: { type: 'string' }, locationId: { type: 'string', format: 'uuid' }, roleId: { type: 'string', format: 'uuid' }, startTime: { type: 'string' }, endTime: { type: 'string' }, breakMinutes: { type: 'integer' }, daysOfWeek: { type: 'array', items: { type: 'integer' } }, color: { type: 'string' } } } } } },
        responses: { 201: { description: 'Template created' } }
      }
    },
    '/shift-templates/{id}/generate': {
      post: {
        tags: ['Shift Templates'],
        summary: 'Generate shifts from template (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['startDate', 'endDate'], properties: { startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' }, employeeId: { type: 'string', format: 'uuid' } } } } } },
        responses: { 201: { description: 'Shifts generated' }, 404: { description: 'Template not found' } }
      }
    },

    // ==================== FORECASTING ====================
    '/forecast': {
      get: {
        tags: ['Forecasting'],
        summary: 'Get AI demand forecast (admin/manager)',
        parameters: [
          { name: 'weeks', in: 'query', schema: { type: 'integer', default: 2, maximum: 8 } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'granularity', in: 'query', schema: { type: 'string', enum: ['day', 'hour'], default: 'day' } }
        ],
        responses: { 200: { description: 'Forecast data with summary and alerts' } }
      }
    },
    '/forecast/recommendations': {
      get: {
        tags: ['Forecasting'],
        summary: 'Get scheduling recommendations (admin/manager)',
        responses: { 200: { description: 'Staffing recommendations sorted by severity' } }
      }
    },

    // ==================== TIME TRACKING ====================
    '/time/status': {
      get: {
        tags: ['Time Tracking'],
        summary: 'Get current clock-in status',
        responses: { 200: { description: 'Clock status and upcoming shift' } }
      }
    },
    '/time/clock-in': {
      post: {
        tags: ['Time Tracking'],
        summary: 'Clock in for a shift',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { shiftId: { type: 'string', format: 'uuid' }, locationId: { type: 'string', format: 'uuid' }, location: { type: 'object', properties: { latitude: { type: 'number' }, longitude: { type: 'number' } } }, photo: { type: 'string' } } } } } },
        responses: { 201: { description: 'Clocked in' }, 400: { description: 'Already clocked in or geofence error' } }
      }
    },
    '/time/clock-out': {
      post: {
        tags: ['Time Tracking'],
        summary: 'Clock out from current shift',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { location: { type: 'object', properties: { latitude: { type: 'number' }, longitude: { type: 'number' } } }, photo: { type: 'string' }, breakMinutes: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Clocked out' }, 400: { description: 'Not clocked in' } }
      }
    },
    '/time/break/{action}': {
      post: {
        tags: ['Time Tracking'],
        summary: 'Start or end break',
        parameters: [{ name: 'action', in: 'path', required: true, schema: { type: 'string', enum: ['start', 'end'] } }],
        responses: { 200: { description: 'Break action processed' }, 400: { description: 'Not clocked in' } }
      }
    },
    '/time/entries': {
      get: {
        tags: ['Time Tracking'],
        summary: 'List time entries',
        parameters: [
          { name: 'employeeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/offsetParam' }
        ],
        responses: { 200: { description: 'List of time entries' } }
      }
    },
    '/time/pending': {
      get: {
        tags: ['Time Tracking'],
        summary: 'Get pending time entry approvals (admin/manager)',
        parameters: [{ name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'List of pending entries' } }
      }
    },
    '/time/entries/{id}/{action}': {
      post: {
        tags: ['Time Tracking'],
        summary: 'Approve or reject time entry (admin/manager)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'action', in: 'path', required: true, schema: { type: 'string', enum: ['approve', 'reject'] } }
        ],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Entry processed' }, 404: { description: 'Not found' } }
      }
    },
    '/time/entries/bulk-approve': {
      post: {
        tags: ['Time Tracking'],
        summary: 'Bulk approve time entries (admin/manager)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['entryIds'], properties: { entryIds: { type: 'array', items: { type: 'string', format: 'uuid' } } } } } } },
        responses: { 200: { description: 'Entries approved' } }
      }
    },
    '/time/entries/{id}': {
      patch: {
        tags: ['Time Tracking'],
        summary: 'Adjust time entry (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { clockIn: { type: 'string', format: 'date-time' }, clockOut: { type: 'string', format: 'date-time' }, breakMinutes: { type: 'integer' }, reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Entry adjusted' }, 404: { description: 'Not found' } }
      }
    },

    // ==================== TIME OFF ====================
    '/time-off/policies': {
      get: {
        tags: ['Time Off'],
        summary: 'List time off policies',
        responses: { 200: { description: 'List of policies' } }
      },
      post: {
        tags: ['Time Off'],
        summary: 'Create time off policy (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, code: { type: 'string' }, accrualType: { type: 'string' }, accrualAmount: { type: 'number' }, maxBalance: { type: 'number' }, allowCarryover: { type: 'boolean' }, maxCarryover: { type: 'number' }, requiresApproval: { type: 'boolean' }, isPaid: { type: 'boolean' }, color: { type: 'string' } } } } } },
        responses: { 201: { description: 'Policy created' } }
      }
    },
    '/time-off/balances': {
      get: {
        tags: ['Time Off'],
        summary: 'Get time off balances',
        parameters: [{ name: 'employeeId', in: 'query', schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'List of balances by policy' } }
      }
    },
    '/time-off/requests': {
      get: {
        tags: ['Time Off'],
        summary: 'List time off requests',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'employeeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }
        ],
        responses: { 200: { description: 'List of requests' } }
      },
      post: {
        tags: ['Time Off'],
        summary: 'Submit time off request',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['policyId', 'startDate', 'endDate', 'totalDays'], properties: { policyId: { type: 'string', format: 'uuid' }, startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' }, totalDays: { type: 'number' }, reason: { type: 'string' } } } } } },
        responses: { 201: { description: 'Request submitted' }, 400: { description: 'Insufficient balance or overlap' } }
      }
    },
    '/time-off/requests/{id}/{action}': {
      post: {
        tags: ['Time Off'],
        summary: 'Approve or reject time off request (admin/manager)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'action', in: 'path', required: true, schema: { type: 'string', enum: ['approve', 'reject'] } }
        ],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { notes: { type: 'string' } } } } } },
        responses: { 200: { description: 'Request processed' }, 404: { description: 'Not found' } }
      }
    },
    '/time-off/requests/{id}/cancel': {
      post: {
        tags: ['Time Off'],
        summary: 'Cancel time off request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Request cancelled' }, 400: { description: 'Cannot cancel' } }
      }
    },

    // ==================== USERS ====================
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users in organization (admin)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: { 200: { description: 'Paginated list of users' } }
      }
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user details (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'User details' }, 404: { description: 'Not found' } }
      }
    },
    '/users/{id}/unlock': {
      post: {
        tags: ['Users'],
        summary: 'Unlock locked user account (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Account unlocked' }, 404: { description: 'Not found' } }
      }
    },
    '/users/{id}/deactivate': {
      post: {
        tags: ['Users'],
        summary: 'Deactivate user account (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Account deactivated' }, 400: { description: 'Cannot deactivate self' } }
      }
    },
    '/users/{id}/reactivate': {
      post: {
        tags: ['Users'],
        summary: 'Reactivate user account (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Account reactivated' }, 404: { description: 'Not found' } }
      }
    },
    '/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Change user role (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['role'], properties: { role: { type: 'string', enum: ['worker', 'manager', 'admin'] } } } } } },
        responses: { 200: { description: 'Role changed' }, 400: { description: 'Invalid role or self-change' } }
      }
    },
    '/users/{id}/force-password-reset': {
      post: {
        tags: ['Users'],
        summary: 'Force password reset on next login (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Password reset required' }, 404: { description: 'Not found' } }
      }
    },
    '/users/{id}/resend-invitation': {
      post: {
        tags: ['Users'],
        summary: 'Resend invitation email (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Invitation resent' }, 404: { description: 'Invited user not found' } }
      }
    },
    '/users/{id}/cancel-invitation': {
      post: {
        tags: ['Users'],
        summary: 'Cancel pending invitation (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Invitation cancelled' }, 404: { description: 'Not found' } }
      }
    },
    '/users/{id}/sessions': {
      get: {
        tags: ['Sessions'],
        summary: 'Get user active sessions',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'List of active sessions' }, 403: { description: 'Access denied' } }
      }
    },
    '/users/{id}/sessions/{sessionId}': {
      delete: {
        tags: ['Sessions'],
        summary: 'Revoke a specific session',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: { 200: { description: 'Session revoked' }, 404: { description: 'Not found' } }
      }
    },
    '/users/{id}/sessions/revoke-all': {
      post: {
        tags: ['Sessions'],
        summary: 'Revoke all sessions for user',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { exceptCurrent: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'All sessions revoked' } }
      }
    },
    '/users/{id}/activity': {
      get: {
        tags: ['Users'],
        summary: 'Get user activity log (admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: { 200: { description: 'Paginated activity log' } }
      }
    },
    '/users/me/sessions': {
      get: {
        tags: ['Sessions'],
        summary: 'Get current user sessions',
        responses: { 200: { description: 'List of own sessions' } }
      }
    },
    '/users/me/sessions/revoke-others': {
      post: {
        tags: ['Sessions'],
        summary: 'Sign out all other devices',
        responses: { 200: { description: 'Other sessions revoked' } }
      }
    },
    '/users/me/data-export': {
      get: {
        tags: ['GDPR'],
        summary: 'Download all personal data (GDPR export)',
        responses: { 200: { description: 'JSON file with all user data' } }
      }
    },
    '/users/me/request-deletion': {
      post: {
        tags: ['GDPR'],
        summary: 'Request account deletion (30-day grace period)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' }, reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Deletion requested' }, 401: { description: 'Invalid password' } }
      }
    },
    '/users/me/cancel-deletion': {
      post: {
        tags: ['GDPR'],
        summary: 'Cancel account deletion request',
        responses: { 200: { description: 'Deletion cancelled' } }
      }
    },

    // ==================== JOBS ====================
    '/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'List job postings',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } }
        ],
        responses: { 200: { description: 'List of job postings' } }
      },
      post: {
        tags: ['Jobs'],
        summary: 'Create job posting (admin/manager)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' }, roleId: { type: 'string', format: 'uuid' }, departmentId: { type: 'string', format: 'uuid' }, locationId: { type: 'string', format: 'uuid' }, employmentType: { type: 'string' }, hourlyRateMin: { type: 'number' }, hourlyRateMax: { type: 'number' }, requiredSkills: { type: 'array', items: { type: 'string', format: 'uuid' } }, visibility: { type: 'string', enum: ['internal', 'external'] }, closesAt: { type: 'string', format: 'date-time' } } } } } },
        responses: { 201: { description: 'Job posting created' } }
      }
    },
    '/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job posting details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Job details with required skills' }, 404: { description: 'Not found' } }
      },
      put: {
        tags: ['Jobs'],
        summary: 'Update job posting (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, status: { type: 'string' }, visibility: { type: 'string' } } } } } },
        responses: { 200: { description: 'Job updated' }, 404: { description: 'Not found' } }
      },
      delete: {
        tags: ['Jobs'],
        summary: 'Delete job posting (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Job deleted' }, 404: { description: 'Not found' } }
      }
    },
    '/jobs/{id}/applications': {
      get: {
        tags: ['Jobs'],
        summary: 'Get applications for a job (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'List of applications with applicant skills' } }
      }
    },
    '/jobs/{id}/apply': {
      post: {
        tags: ['Jobs'],
        summary: 'Apply for a job posting',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { coverLetter: { type: 'string' } } } } } },
        responses: { 201: { description: 'Application submitted' }, 400: { description: 'Already applied' } }
      }
    },
    '/jobs/{jobId}/applications/{appId}': {
      put: {
        tags: ['Jobs'],
        summary: 'Update application status (admin/manager)',
        parameters: [
          { name: 'jobId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'appId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, interviewScheduledAt: { type: 'string', format: 'date-time' } } } } } },
        responses: { 200: { description: 'Application updated' }, 404: { description: 'Not found' } }
      }
    },
    '/jobs/{id}/matches': {
      get: {
        tags: ['Jobs'],
        summary: 'Get employees matching job skills (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'List of matching employees with match percentage' } }
      }
    },

    // ==================== GAMIFICATION ====================
    '/gamification/stats': {
      get: {
        tags: ['Gamification'],
        summary: 'Get gamification stats for current user',
        responses: { 200: { description: 'User gamification stats' } }
      }
    },
    '/gamification/leaderboard': {
      get: {
        tags: ['Gamification'],
        summary: 'Get leaderboard',
        parameters: [{ name: 'period', in: 'query', schema: { type: 'string', default: 'all' } }],
        responses: { 200: { description: 'Leaderboard data' } }
      }
    },
    '/gamification/badges': {
      get: {
        tags: ['Gamification'],
        summary: 'Get all badges for current user',
        responses: { 200: { description: 'List of badges' } }
      }
    },
    '/gamification/points-history': {
      get: {
        tags: ['Gamification'],
        summary: 'Get points history',
        parameters: [
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/offsetParam' }
        ],
        responses: { 200: { description: 'Points history' } }
      }
    },
    '/gamification/rewards': {
      get: {
        tags: ['Gamification'],
        summary: 'Get reward catalog',
        responses: { 200: { description: 'Available rewards' } }
      },
      post: {
        tags: ['Gamification'],
        summary: 'Create a new reward (manager/admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'pointsCost'], properties: { name: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, pointsCost: { type: 'integer' }, quantityAvailable: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Reward created' } }
      }
    },
    '/gamification/rewards/{id}': {
      put: {
        tags: ['Gamification'],
        summary: 'Update a reward (manager/admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, pointsCost: { type: 'integer' }, quantityAvailable: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Reward updated' } }
      },
      delete: {
        tags: ['Gamification'],
        summary: 'Delete a reward (manager/admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Reward deleted' } }
      }
    },
    '/gamification/rewards/{id}/redeem': {
      post: {
        tags: ['Gamification'],
        summary: 'Redeem a reward',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Reward redeemed' } }
      }
    },
    '/gamification/redemptions': {
      get: {
        tags: ['Gamification'],
        summary: 'Get current user redemptions',
        responses: { 200: { description: 'List of redemptions' } }
      }
    },
    '/gamification/redemptions/pending': {
      get: {
        tags: ['Gamification'],
        summary: 'Get pending redemptions (manager/admin)',
        responses: { 200: { description: 'List of pending redemptions' } }
      }
    },
    '/gamification/redemptions/{id}/approve': {
      post: {
        tags: ['Gamification'],
        summary: 'Approve a redemption (manager/admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Redemption approved' } }
      }
    },
    '/gamification/redemptions/{id}/reject': {
      post: {
        tags: ['Gamification'],
        summary: 'Reject a redemption (manager/admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { notes: { type: 'string' } } } } } },
        responses: { 200: { description: 'Redemption rejected' } }
      }
    },
    '/gamification/offers': {
      get: {
        tags: ['Gamification'],
        summary: 'Get affiliate offers',
        responses: { 200: { description: 'List of affiliate offers' } }
      },
      post: {
        tags: ['Gamification'],
        summary: 'Create affiliate offer (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'provider'], properties: { title: { type: 'string' }, description: { type: 'string' }, provider: { type: 'string' }, category: { type: 'string' }, discount_percentage: { type: 'number' }, affiliate_link: { type: 'string' }, terms: { type: 'string' }, expires_at: { type: 'string', format: 'date-time' } } } } } },
        responses: { 200: { description: 'Offer created' } }
      }
    },
    '/gamification/offers/{id}': {
      put: {
        tags: ['Gamification'],
        summary: 'Update affiliate offer (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, provider: { type: 'string' }, category: { type: 'string' }, discount_percentage: { type: 'number' }, affiliate_link: { type: 'string' }, terms: { type: 'string' }, expires_at: { type: 'string', format: 'date-time' }, is_active: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Offer updated' }, 404: { description: 'Not found' } }
      },
      delete: {
        tags: ['Gamification'],
        summary: 'Delete affiliate offer (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Offer deactivated' }, 404: { description: 'Not found' } }
      }
    },

    // ==================== EXPENSES ====================
    '/expenses/categories': {
      get: {
        tags: ['Expenses'],
        summary: 'List expense categories',
        responses: { 200: { description: 'List of categories' } }
      },
      post: {
        tags: ['Expenses'],
        summary: 'Create expense category (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, maxAmount: { type: 'number' }, requiresReceipt: { type: 'boolean' }, requiresApproval: { type: 'boolean' }, glCode: { type: 'string' } } } } } },
        responses: { 201: { description: 'Category created' } }
      }
    },
    '/expenses/categories/{id}': {
      patch: {
        tags: ['Expenses'],
        summary: 'Update expense category (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, maxAmount: { type: 'number' }, isActive: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Category updated' }, 404: { description: 'Not found' } }
      }
    },
    '/expenses/my-expenses': {
      get: {
        tags: ['Expenses'],
        summary: 'Get current user expense claims',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/offsetParam' }
        ],
        responses: { 200: { description: 'List of expenses with totals' } }
      }
    },
    '/expenses/my-expenses/{id}': {
      get: {
        tags: ['Expenses'],
        summary: 'Get single expense claim',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Expense details' }, 404: { description: 'Not found' } }
      }
    },
    '/expenses/claims': {
      post: {
        tags: ['Expenses'],
        summary: 'Create expense claim',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['description', 'amount', 'expenseDate'], properties: { description: { type: 'string' }, categoryId: { type: 'string', format: 'uuid' }, amount: { type: 'number' }, expenseDate: { type: 'string', format: 'date' }, receiptUrl: { type: 'string' }, notes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } } } } } },
        responses: { 201: { description: 'Claim created' } }
      }
    },
    '/expenses/claims/{id}': {
      patch: {
        tags: ['Expenses'],
        summary: 'Update expense claim (draft/pending only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { description: { type: 'string' }, categoryId: { type: 'string', format: 'uuid' }, amount: { type: 'number' }, expenseDate: { type: 'string', format: 'date' }, receiptUrl: { type: 'string' } } } } } },
        responses: { 200: { description: 'Claim updated' }, 400: { description: 'Cannot edit in current status' } }
      }
    },
    '/expenses/claims/{id}/cancel': {
      post: {
        tags: ['Expenses'],
        summary: 'Cancel expense claim',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Claim cancelled' }, 404: { description: 'Not found or cannot cancel' } }
      }
    },
    '/expenses/claims/{id}/approve': {
      post: {
        tags: ['Expenses'],
        summary: 'Approve expense claim (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { notes: { type: 'string' } } } } } },
        responses: { 200: { description: 'Claim approved' }, 404: { description: 'Not found' } }
      }
    },
    '/expenses/claims/{id}/reject': {
      post: {
        tags: ['Expenses'],
        summary: 'Reject expense claim (admin/manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Claim rejected' }, 404: { description: 'Not found' } }
      }
    },
    '/expenses/claims/{id}/paid': {
      post: {
        tags: ['Expenses'],
        summary: 'Mark expense as paid (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { paymentReference: { type: 'string' }, paymentMethod: { type: 'string' } } } } } },
        responses: { 200: { description: 'Marked as paid' }, 404: { description: 'Not found or not approved' } }
      }
    },
    '/expenses/pending': {
      get: {
        tags: ['Expenses'],
        summary: 'Get pending expense approvals (admin/manager)',
        parameters: [
          { name: 'departmentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } }
        ],
        responses: { 200: { description: 'List of pending expenses with summary' } }
      }
    },
    '/expenses/bulk-pay': {
      post: {
        tags: ['Expenses'],
        summary: 'Bulk mark expenses as paid (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['claimIds'], properties: { claimIds: { type: 'array', items: { type: 'string', format: 'uuid' } }, paymentReference: { type: 'string' }, paymentMethod: { type: 'string' } } } } } },
        responses: { 200: { description: 'Bulk payment processed' } }
      }
    },
    '/expenses/report': {
      get: {
        tags: ['Expenses'],
        summary: 'Get expense report (admin/manager)',
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'groupBy', in: 'query', schema: { type: 'string', enum: ['category', 'employee', 'month'], default: 'category' } }
        ],
        responses: { 200: { description: 'Expense report data' } }
      }
    },

    // ==================== PAYSLIPS ====================
    '/payslips/my-payslips': {
      get: {
        tags: ['Payslips'],
        summary: 'Get current user payslips',
        parameters: [
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } }
        ],
        responses: { 200: { description: 'List of payslips with line items' } }
      }
    },
    '/payslips/my-payslips/{id}': {
      get: {
        tags: ['Payslips'],
        summary: 'Get single payslip with full details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Payslip with all line items' }, 404: { description: 'Not found' } }
      }
    },
    '/payslips/my-ytd': {
      get: {
        tags: ['Payslips'],
        summary: 'Get year-to-date summary',
        parameters: [{ name: 'taxYear', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'YTD summary' } }
      }
    },
    '/payslips/my-years': {
      get: {
        tags: ['Payslips'],
        summary: 'Get available years for filtering',
        responses: { 200: { description: 'List of years' } }
      }
    },
    '/payslips': {
      get: {
        tags: ['Payslips'],
        summary: 'List all payslips (admin/manager)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'employeeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/offsetParam' }
        ],
        responses: { 200: { description: 'Paginated list of payslips' } }
      },
      post: {
        tags: ['Payslips'],
        summary: 'Create payslip (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['employeeId', 'payPeriodStart', 'payPeriodEnd', 'payDate', 'grossPay', 'netPay'], properties: { employeeId: { type: 'string', format: 'uuid' }, payPeriodStart: { type: 'string', format: 'date' }, payPeriodEnd: { type: 'string', format: 'date' }, payDate: { type: 'string', format: 'date' }, grossPay: { type: 'number' }, netPay: { type: 'number' }, regularHours: { type: 'number' }, overtimeHours: { type: 'number' }, holidayHours: { type: 'number' }, items: { type: 'array', items: { type: 'object', properties: { itemType: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' }, amount: { type: 'number' }, quantity: { type: 'number' }, rate: { type: 'number' } } } }, notes: { type: 'string' } } } } } },
        responses: { 201: { description: 'Payslip created' } }
      }
    },
    '/payslips/{id}/status': {
      patch: {
        tags: ['Payslips'],
        summary: 'Update payslip status (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['draft', 'pending', 'approved', 'sent', 'viewed'] } } } } } },
        responses: { 200: { description: 'Status updated' }, 404: { description: 'Not found' } }
      }
    },
    '/payslips/send': {
      post: {
        tags: ['Payslips'],
        summary: 'Bulk send payslips to employees (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['payslipIds'], properties: { payslipIds: { type: 'array', items: { type: 'string', format: 'uuid' } } } } } } },
        responses: { 200: { description: 'Payslips sent' } }
      }
    },
    '/payslips/report': {
      get: {
        tags: ['Payslips'],
        summary: 'Get payroll summary report (admin/manager)',
        parameters: [
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string', format: 'uuid' } }
        ],
        responses: { 200: { description: 'Payroll summary with deduction breakdowns' } }
      }
    },
    '/payslips/update-ytd/{payslipId}': {
      post: {
        tags: ['Payslips'],
        summary: 'Update year-to-date totals for payslip (admin)',
        parameters: [{ name: 'payslipId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'YTD updated' }, 404: { description: 'Payslip not found' } }
      }
    },

    // ==================== CHAT ====================
    '/chat/channels': {
      get: {
        tags: ['Chat'],
        summary: 'Get user channels with unread counts',
        responses: { 200: { description: 'List of channels' } }
      },
      post: {
        tags: ['Chat'],
        summary: 'Create chat channel',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, type: { type: 'string', enum: ['group', 'direct'] }, memberIds: { type: 'array', items: { type: 'string', format: 'uuid' } }, locationId: { type: 'string', format: 'uuid' }, departmentId: { type: 'string', format: 'uuid' }, isPrivate: { type: 'boolean' } } } } } },
        responses: { 201: { description: 'Channel created' } }
      }
    },
    '/chat/channels/{id}': {
      get: {
        tags: ['Chat'],
        summary: 'Get channel details with members',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Channel with members' }, 403: { description: 'Not a member' } }
      },
      patch: {
        tags: ['Chat'],
        summary: 'Update channel (channel admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, isArchived: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Channel updated' }, 403: { description: 'Must be admin' } }
      }
    },
    '/chat/channels/{id}/members': {
      post: {
        tags: ['Chat'],
        summary: 'Add member to channel (channel admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['memberId'], properties: { memberId: { type: 'string', format: 'uuid' } } } } } },
        responses: { 200: { description: 'Member added' }, 403: { description: 'Must be admin' } }
      }
    },
    '/chat/channels/{id}/members/me': {
      delete: {
        tags: ['Chat'],
        summary: 'Leave channel',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Left channel' } }
      }
    },
    '/chat/channels/{channelId}/messages': {
      get: {
        tags: ['Chat'],
        summary: 'Get messages for channel',
        parameters: [
          { name: 'channelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'before', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: { 200: { description: 'List of messages with reactions' }, 403: { description: 'Not a member' } }
      },
      post: {
        tags: ['Chat'],
        summary: 'Send message to channel',
        parameters: [{ name: 'channelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' }, messageType: { type: 'string', enum: ['text', 'image', 'file'] }, replyToId: { type: 'string', format: 'uuid' }, attachments: { type: 'array', items: { type: 'object' } } } } } } },
        responses: { 201: { description: 'Message sent' }, 403: { description: 'Not a member' } }
      }
    },
    '/chat/messages/{messageId}': {
      patch: {
        tags: ['Chat'],
        summary: 'Edit message (own messages only)',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } } } } },
        responses: { 200: { description: 'Message edited' }, 403: { description: 'Not message owner' } }
      },
      delete: {
        tags: ['Chat'],
        summary: 'Delete message (own messages only)',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Message deleted' }, 403: { description: 'Not message owner' } }
      }
    },
    '/chat/messages/{messageId}/reactions': {
      post: {
        tags: ['Chat'],
        summary: 'Add reaction to message',
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['emoji'], properties: { emoji: { type: 'string' } } } } } },
        responses: { 200: { description: 'Reaction added' } }
      }
    },
    '/chat/messages/{messageId}/reactions/{emoji}': {
      delete: {
        tags: ['Chat'],
        summary: 'Remove reaction from message',
        parameters: [
          { name: 'messageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'emoji', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Reaction removed' } }
      }
    },
    '/chat/direct': {
      post: {
        tags: ['Chat'],
        summary: 'Start or get direct message channel',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['recipientId'], properties: { recipientId: { type: 'string', format: 'uuid' } } } } } },
        responses: { 200: { description: 'Existing DM channel' }, 201: { description: 'New DM channel created' } }
      }
    },

    // ==================== INTEGRATIONS ====================
    '/integrations/api-keys': {
      get: {
        tags: ['Integrations'],
        summary: 'List API keys (admin)',
        responses: { 200: { description: 'List of API keys' } }
      },
      post: {
        tags: ['Integrations'],
        summary: 'Create API key (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, scopes: { type: 'array', items: { type: 'string' } }, rateLimitTier: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time' }, ipWhitelist: { type: 'array', items: { type: 'string' } } } } } } },
        responses: { 201: { description: 'API key created (includes secret)' } }
      }
    },
    '/integrations/api-keys/scopes/available': {
      get: {
        tags: ['Integrations'],
        summary: 'Get available API key scopes',
        responses: { 200: { description: 'List of scopes' } }
      }
    },
    '/integrations/api-keys/{keyId}': {
      get: {
        tags: ['Integrations'],
        summary: 'Get API key details (admin)',
        parameters: [{ name: 'keyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'API key details' }, 404: { description: 'Not found' } }
      },
      patch: {
        tags: ['Integrations'],
        summary: 'Update API key (admin)',
        parameters: [{ name: 'keyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, scopes: { type: 'array', items: { type: 'string' } } } } } } },
        responses: { 200: { description: 'API key updated' }, 404: { description: 'Not found' } }
      },
      delete: {
        tags: ['Integrations'],
        summary: 'Revoke API key (admin)',
        parameters: [{ name: 'keyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'API key revoked' }, 404: { description: 'Not found' } }
      }
    },
    '/integrations/api-keys/{keyId}/regenerate': {
      post: {
        tags: ['Integrations'],
        summary: 'Regenerate API key secret (admin)',
        parameters: [{ name: 'keyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'New secret generated' }, 404: { description: 'Not found' } }
      }
    },
    '/integrations/api-keys/{keyId}/usage': {
      get: {
        tags: ['Integrations'],
        summary: 'Get API key usage stats (admin)',
        parameters: [{ name: 'keyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Usage statistics' }, 404: { description: 'Not found' } }
      }
    },
    '/integrations/api-docs': {
      get: {
        tags: ['Integrations'],
        summary: 'Get OpenAPI spec for organization',
        responses: { 200: { description: 'OpenAPI specification JSON' } }
      }
    },
    '/integrations/webhooks': {
      get: {
        tags: ['Integrations'],
        summary: 'List webhooks (admin)',
        responses: { 200: { description: 'List of webhooks' } }
      },
      post: {
        tags: ['Integrations'],
        summary: 'Create webhook (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url', 'events'], properties: { url: { type: 'string', format: 'uri' }, events: { type: 'array', items: { type: 'string' } }, secret: { type: 'string' } } } } } },
        responses: { 201: { description: 'Webhook created (includes secret)' } }
      }
    },
    '/integrations/webhooks/events/available': {
      get: {
        tags: ['Integrations'],
        summary: 'Get available webhook events',
        responses: { 200: { description: 'Map of event names to descriptions' } }
      }
    },
    '/integrations/webhooks/{id}': {
      patch: {
        tags: ['Integrations'],
        summary: 'Update webhook (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', format: 'uri' }, events: { type: 'array', items: { type: 'string' } }, is_active: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Webhook updated' }, 404: { description: 'Not found' } }
      },
      delete: {
        tags: ['Integrations'],
        summary: 'Delete webhook (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Webhook deleted' }, 404: { description: 'Not found' } }
      }
    },
    '/integrations/webhooks/{id}/test': {
      post: {
        tags: ['Integrations'],
        summary: 'Test webhook (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Test result with status' }, 404: { description: 'Not found' } }
      }
    },
    '/integrations/oauth': {
      get: {
        tags: ['Integrations'],
        summary: 'List connected OAuth integrations (admin)',
        responses: { 200: { description: 'List of integrations' } }
      }
    },
    '/integrations/oauth/{provider}/connect': {
      get: {
        tags: ['Integrations'],
        summary: 'Initiate OAuth flow for provider (admin)',
        parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['google', 'microsoft', 'slack', 'xero', 'quickbooks', 'adp'] } }],
        responses: { 200: { description: 'Authorization URL and state' }, 400: { description: 'Unsupported provider' } }
      }
    },
    '/integrations/oauth/{provider}/callback': {
      get: {
        tags: ['Integrations'],
        summary: 'OAuth callback (browser redirect)',
        security: [],
        parameters: [
          { name: 'provider', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'code', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 302: { description: 'Redirects to settings page' } }
      }
    },
    '/integrations/oauth/{provider}': {
      delete: {
        tags: ['Integrations'],
        summary: 'Disconnect OAuth integration (admin)',
        parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Integration disconnected' }, 404: { description: 'Not found' } }
      }
    },
    '/integrations/oauth/{provider}/sync': {
      post: {
        tags: ['Integrations'],
        summary: 'Trigger data sync for integration (admin)',
        parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sync started' } }
      }
    },

    // ==================== DASHBOARD ====================
    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard overview metrics',
        parameters: [{ name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Dashboard data (varies by user role: worker vs manager/admin)' } }
      }
    },

    // ==================== REPORTS ====================
    '/reports/hours': {
      get: {
        tags: ['Reports'],
        summary: 'Hours worked report (admin/manager)',
        parameters: [
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'groupBy', in: 'query', schema: { type: 'string', enum: ['employee', 'location', 'day'], default: 'employee' } }
        ],
        responses: { 200: { description: 'Hours report data with totals' } }
      }
    },
    '/reports/attendance': {
      get: {
        tags: ['Reports'],
        summary: 'Attendance report (admin/manager)',
        parameters: [
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } }
        ],
        responses: { 200: { description: 'Attendance data with late arrivals and missed shifts' } }
      }
    },
    '/reports/labor-cost': {
      get: {
        tags: ['Reports'],
        summary: 'Labor cost report (admin/manager)',
        parameters: [
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'groupBy', in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month'], default: 'week' } }
        ],
        responses: { 200: { description: 'Labor cost data with regular and overtime breakdowns' } }
      }
    },
    '/reports/coverage': {
      get: {
        tags: ['Reports'],
        summary: 'Schedule coverage report (admin/manager)',
        parameters: [
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } }
        ],
        responses: { 200: { description: 'Coverage data with fill rates' } }
      }
    },

    // ==================== EXPORTS ====================
    '/exports/timesheets': {
      get: {
        tags: ['Exports'],
        summary: 'Export timesheets as CSV or JSON (admin/manager)',
        parameters: [
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'json'], default: 'csv' } }
        ],
        responses: { 200: { description: 'CSV or JSON file' } }
      }
    },
    '/exports/employees': {
      get: {
        tags: ['Exports'],
        summary: 'Export employee list as CSV or JSON (admin/manager)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', default: 'active' } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'json'], default: 'csv' } }
        ],
        responses: { 200: { description: 'CSV or JSON file' } }
      }
    },
    '/exports/{reportType}/pdf': {
      get: {
        tags: ['Exports'],
        summary: 'Export report as PDF (admin/manager)',
        parameters: [
          { name: 'reportType', in: 'path', required: true, schema: { type: 'string', enum: ['timesheets', 'employees', 'schedule-efficiency'] } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }
        ],
        responses: { 200: { description: 'PDF document' } }
      }
    },

    // ==================== NOTIFICATIONS ====================
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List user notifications',
        parameters: [
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } }
        ],
        responses: {
          200: { description: 'List of notifications' }
        }
      }
    }
  }
};

// GET /api/docs - Serve Swagger UI
router.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Uplift API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { font-size: 2rem; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/docs/spec',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true
      });
    };
  </script>
</body>
</html>`;
  res.send(html);
});

// GET /api/docs/spec - Serve OpenAPI JSON spec
router.get('/spec', (req, res) => {
  res.json(openApiSpec);
});

// GET /api/docs/spec.yaml - Serve OpenAPI YAML spec (simplified)
router.get('/spec.yaml', (req, res) => {
  res.type('text/yaml');
  res.send(`# Uplift API OpenAPI Specification
# For full spec, use /api/docs/spec (JSON format)
openapi: "3.0.0"
info:
  title: Uplift API
  version: "1.0.0"
  description: Workforce management API
`);
});

export default router;
