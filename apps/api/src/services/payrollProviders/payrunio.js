// ============================================================
// PAYRUN.IO UK PAYROLL API INTEGRATION
// HMRC-recognised payroll and RTI submission service
// https://developer.payrun.io
// ============================================================

import crypto from 'crypto';

// API Configuration
const PAYRUN_TEST_URL = 'https://api.test.payrun.io';
const PAYRUN_PROD_URL = 'https://api.payrun.io';

/**
 * PayRun.io API Client
 * Handles UK payroll calculations, RTI submissions, and pension auto-enrolment
 */
class PayRunIOClient {
  constructor(options = {}) {
    this.consumerKey = options.consumerKey || process.env.PAYRUN_CONSUMER_KEY;
    this.consumerSecret = options.consumerSecret || process.env.PAYRUN_CONSUMER_SECRET;
    this.isProduction = options.isProduction || process.env.NODE_ENV === 'production';
    this.baseUrl = this.isProduction ? PAYRUN_PROD_URL : PAYRUN_TEST_URL;
    this.apiVersion = 'default';
  }

  // ============================================================
  // OAUTH 1.0 AUTHENTICATION
  // ============================================================

  /**
   * Generate OAuth 1.0 authorization header
   * PayRun.io uses one-legged OAuth 1.0 with HMAC-SHA1
   */
  generateOAuthHeader(method, url) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const oauthParams = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_version: '1.0'
    };

    // Create signature base string
    const sortedParams = Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
      .join('&');

    const signatureBase = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams)
    ].join('&');

    // Sign with consumer secret (one-legged OAuth, no token secret)
    const signingKey = `${encodeURIComponent(this.consumerSecret)}&`;
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBase)
      .digest('base64');

    oauthParams.oauth_signature = signature;

    // Build header string
    const headerParts = Object.keys(oauthParams)
      .sort()
      .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
      .join(',');

    return `OAuth ${headerParts}`;
  }

  /**
   * Make authenticated API request
   */
  async request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Api-Version': this.apiVersion,
      'Authorization': this.generateOAuthHeader(method, url)
    };

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new PayRunError(
        `PayRun.io API error: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // ============================================================
  // EMPLOYER MANAGEMENT
  // ============================================================

  /**
   * Create a new employer (PAYE scheme)
   */
  async createEmployer(employerData) {
    const payload = {
      Employer: {
        EffectiveDate: employerData.effectiveDate || new Date().toISOString().split('T')[0],
        Revision: '0',
        Name: employerData.name,
        Region: employerData.region || 'England',
        Territory: 'UnitedKingdom',
        RuleExclusions: 'None',
        ClaimEmploymentAllowance: employerData.claimEmploymentAllowance ? 'true' : 'false',
        ClaimSmallEmployerRelief: employerData.claimSmallEmployerRelief ? 'true' : 'false',
        ApprenticeshipLevyAllowance: employerData.apprenticeshipLevyAllowance || '0',
        HmrcSettings: {
          TaxOfficeNumber: employerData.hmrc.taxOfficeNumber,
          TaxOfficeReference: employerData.hmrc.taxOfficeReference,
          AccountingOfficeRef: employerData.hmrc.accountingOfficeRef,
          Sender: employerData.hmrc.sender || 'Employer',
          SenderId: employerData.hmrc.senderId,
          Password: employerData.hmrc.password,
          ContactFirstName: employerData.hmrc.contactFirstName,
          ContactLastName: employerData.hmrc.contactLastName,
          ContactEmail: employerData.hmrc.contactEmail,
          ContactTelephone: employerData.hmrc.contactTelephone
        },
        BankAccount: employerData.bankAccount ? {
          AccountName: employerData.bankAccount.accountName,
          AccountNumber: employerData.bankAccount.accountNumber,
          SortCode: employerData.bankAccount.sortCode
        } : undefined
      }
    };

    return this.request('POST', '/Employers', payload);
  }

  /**
   * Get employer by ID
   */
  async getEmployer(employerId) {
    return this.request('GET', `/Employer/${employerId}`);
  }

  /**
   * Update employer
   */
  async updateEmployer(employerId, employerData) {
    return this.request('PUT', `/Employer/${employerId}`, { Employer: employerData });
  }

  /**
   * List all employers
   */
  async listEmployers() {
    return this.request('GET', '/Employers');
  }

  // ============================================================
  // PAY SCHEDULE MANAGEMENT
  // ============================================================

  /**
   * Create pay schedule (weekly, fortnightly, monthly, etc.)
   */
  async createPaySchedule(employerId, scheduleData) {
    const payload = {
      PaySchedule: {
        Name: scheduleData.name,
        PayFrequency: scheduleData.payFrequency // Weekly, Fortnightly, FourWeekly, Monthly
      }
    };

    return this.request('POST', `/Employer/${employerId}/PaySchedules`, payload);
  }

  /**
   * Get pay schedule
   */
  async getPaySchedule(employerId, scheduleId) {
    return this.request('GET', `/Employer/${employerId}/PaySchedule/${scheduleId}`);
  }

  /**
   * List pay schedules for employer
   */
  async listPaySchedules(employerId) {
    return this.request('GET', `/Employer/${employerId}/PaySchedules`);
  }

  // ============================================================
  // EMPLOYEE MANAGEMENT
  // ============================================================

  /**
   * Create employee
   */
  async createEmployee(employerId, employeeData) {
    const payload = {
      Employee: {
        EffectiveDate: employeeData.effectiveDate || new Date().toISOString().split('T')[0],
        Revision: '0',
        Code: employeeData.code,
        Title: employeeData.title,
        FirstName: employeeData.firstName,
        MiddleName: employeeData.middleName,
        LastName: employeeData.lastName,
        Initials: employeeData.initials,
        DateOfBirth: employeeData.dateOfBirth,
        Gender: employeeData.gender, // Male, Female
        NiNumber: employeeData.niNumber,
        NicLiability: employeeData.nicLiability || 'IsFullyLiable',
        Region: employeeData.region || 'England', // England, Scotland, Wales
        Territory: 'UnitedKingdom',
        PaySchedule: {
          '@href': `/Employer/${employerId}/PaySchedule/${employeeData.payScheduleId}`
        },
        StartDate: employeeData.startDate,
        LeavingDate: employeeData.leavingDate,
        StarterDeclaration: employeeData.starterDeclaration || 'A', // A, B, C
        RuleExclusions: employeeData.ruleExclusions || 'None',
        WorkingWeek: employeeData.workingWeek || 'AllWeekDays',
        Address: employeeData.address ? {
          Address1: employeeData.address.line1,
          Address2: employeeData.address.line2,
          Address3: employeeData.address.city,
          Address4: employeeData.address.county,
          Postcode: employeeData.address.postcode,
          Country: employeeData.address.country || 'United Kingdom'
        } : undefined,
        HoursPerWeek: employeeData.hoursPerWeek?.toString() || '37.5',
        PassportNumber: employeeData.passportNumber,
        // Director NI settings
        IsAgencyWorker: employeeData.isAgencyWorker ? 'true' : 'false',
        Seconded: 'NotSet',
        EEACitizen: employeeData.eeaCitizen ? 'true' : 'false',
        // Tax code settings
        PaymentToANonIndividual: 'false',
        // Director settings
        DirectorsNiCalculationMethod: employeeData.isDirector
          ? (employeeData.directorsNiMethod || 'StandardAnnualisedEarningsMethod')
          : undefined,
        Directorship: employeeData.isDirector ? {
          StartDate: employeeData.directorshipStartDate || employeeData.startDate
        } : undefined
      }
    };

    return this.request('POST', `/Employer/${employerId}/Employees`, payload);
  }

  /**
   * Get employee
   */
  async getEmployee(employerId, employeeId) {
    return this.request('GET', `/Employer/${employerId}/Employee/${employeeId}`);
  }

  /**
   * Update employee
   */
  async updateEmployee(employerId, employeeId, employeeData) {
    return this.request('PUT', `/Employer/${employerId}/Employee/${employeeId}`, { Employee: employeeData });
  }

  /**
   * List employees for employer
   */
  async listEmployees(employerId) {
    return this.request('GET', `/Employer/${employerId}/Employees`);
  }

  // ============================================================
  // PAY INSTRUCTIONS
  // ============================================================

  /**
   * Add salary pay instruction
   */
  async addSalaryInstruction(employerId, employeeId, instructionData) {
    const payload = {
      SalaryPayInstruction: {
        StartDate: instructionData.startDate,
        EndDate: instructionData.endDate,
        AnnualSalary: instructionData.annualSalary?.toString(),
        ProRataMethod: instructionData.proRataMethod || 'NotSet',
        PaymentDate: instructionData.paymentDate
      }
    };

    return this.request('POST', `/Employer/${employerId}/Employee/${employeeId}/PayInstructions`, payload);
  }

  /**
   * Add hourly rate pay instruction
   */
  async addRateInstruction(employerId, employeeId, instructionData) {
    const payload = {
      RatePayInstruction: {
        StartDate: instructionData.startDate,
        EndDate: instructionData.endDate,
        Rate: instructionData.rate?.toString(),
        RateUoM: instructionData.rateUnitOfMeasure || 'Hour', // Hour, Day, Week, Month
        Units: instructionData.units?.toString(),
        Description: instructionData.description,
        PayCode: instructionData.payCode || 'BASIC'
      }
    };

    return this.request('POST', `/Employer/${employerId}/Employee/${employeeId}/PayInstructions`, payload);
  }

  /**
   * Add bonus/one-off payment instruction
   */
  async addBonusInstruction(employerId, employeeId, instructionData) {
    const payload = {
      PrimitivePayInstruction: {
        StartDate: instructionData.startDate,
        EndDate: instructionData.startDate, // One-off payment
        Value: instructionData.amount?.toString(),
        Description: instructionData.description || 'Bonus',
        PayCode: instructionData.payCode || 'BONUS'
      }
    };

    return this.request('POST', `/Employer/${employerId}/Employee/${employeeId}/PayInstructions`, payload);
  }

  /**
   * Add tax code instruction
   */
  async addTaxCodeInstruction(employerId, employeeId, instructionData) {
    const payload = {
      TaxPayInstruction: {
        StartDate: instructionData.startDate,
        TaxCode: instructionData.taxCode, // e.g., "1257L"
        TaxBasisCode: instructionData.taxBasisCode || 'Cumulative' // Cumulative, Week1Month1
      }
    };

    return this.request('POST', `/Employer/${employerId}/Employee/${employeeId}/PayInstructions`, payload);
  }

  /**
   * Add NI instruction with category
   */
  async addNiInstruction(employerId, employeeId, instructionData) {
    const payload = {
      NiPayInstruction: {
        StartDate: instructionData.startDate,
        NiCategory: instructionData.niCategory || 'A' // A, B, C, H, J, M, Z, etc.
      }
    };

    return this.request('POST', `/Employer/${employerId}/Employee/${employeeId}/PayInstructions`, payload);
  }

  /**
   * Add student loan instruction
   */
  async addStudentLoanInstruction(employerId, employeeId, instructionData) {
    const payload = {
      StudentLoanPayInstruction: {
        StartDate: instructionData.startDate,
        StudentLoanPlan: instructionData.plan // Plan1, Plan2, Plan4, Plan5, PostGrad
      }
    };

    return this.request('POST', `/Employer/${employerId}/Employee/${employeeId}/PayInstructions`, payload);
  }

  /**
   * Add pension instruction
   */
  async addPensionInstruction(employerId, employeeId, instructionData) {
    const payload = {
      PensionPayInstruction: {
        StartDate: instructionData.startDate,
        PensionId: instructionData.pensionId, // Reference to pension scheme
        EmployeeContribution: instructionData.employeeContribution?.toString(),
        EmployeeContributionPercent: instructionData.employeeContributionPercent?.toString(),
        EmployerContribution: instructionData.employerContribution?.toString(),
        EmployerContributionPercent: instructionData.employerContributionPercent?.toString(),
        SalarySacrifice: instructionData.salarySacrifice ? 'true' : 'false',
        TaxationMethod: instructionData.taxationMethod || 'ReliefAtSource' // NetPay, ReliefAtSource
      }
    };

    return this.request('POST', `/Employer/${employerId}/Employee/${employeeId}/PayInstructions`, payload);
  }

  /**
   * Get all pay instructions for employee
   */
  async getPayInstructions(employerId, employeeId) {
    return this.request('GET', `/Employer/${employerId}/Employee/${employeeId}/PayInstructions`);
  }

  /**
   * Delete pay instruction
   */
  async deletePayInstruction(employerId, employeeId, instructionId) {
    return this.request('DELETE', `/Employer/${employerId}/Employee/${employeeId}/PayInstruction/${instructionId}`);
  }

  // ============================================================
  // PAY RUN PROCESSING
  // ============================================================

  /**
   * Queue a pay run job
   * This triggers the payroll calculation for all employees on a schedule
   */
  async queuePayRunJob(employerId, scheduleId, options = {}) {
    const payload = {
      PayRunJobInstruction: {
        PaymentDate: options.paymentDate,
        StartDate: options.periodStart,
        EndDate: options.periodEnd,
        HoldingDate: options.holdingDate,
        IsSupplementary: options.isSupplementary ? 'true' : 'false'
      }
    };

    return this.request(
      'POST',
      `/Employer/${employerId}/PaySchedule/${scheduleId}/PayRuns/Jobs`,
      payload
    );
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    return this.request('GET', `/Job/${jobId}`);
  }

  /**
   * Wait for job completion with polling
   */
  async waitForJob(jobId, timeoutMs = 60000, pollIntervalMs = 2000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getJobStatus(jobId);

      if (job.JobInfo.JobStatus === 'Success') {
        return job;
      }

      if (job.JobInfo.JobStatus === 'Failed') {
        throw new PayRunError(`Pay run job failed: ${job.JobInfo.Errors?.join(', ') || 'Unknown error'}`);
      }

      // Still pending, wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new PayRunError('Pay run job timed out');
  }

  /**
   * Get pay run result
   */
  async getPayRun(employerId, scheduleId, payRunId) {
    return this.request('GET', `/Employer/${employerId}/PaySchedule/${scheduleId}/PayRun/${payRunId}`);
  }

  /**
   * Get pay run with all employee pay data
   */
  async getPayRunWithEmployees(employerId, scheduleId, payRunId) {
    const payRun = await this.getPayRun(employerId, scheduleId, payRunId);

    // Get all employee pay data for this run
    const employeePays = await this.request(
      'GET',
      `/Employer/${employerId}/PaySchedule/${scheduleId}/PayRun/${payRunId}/Employees`
    );

    return {
      payRun,
      employees: employeePays
    };
  }

  /**
   * Get employee pay lines for a pay run
   * This contains the detailed gross-to-net breakdown
   */
  async getEmployeePayLines(employerId, employeeId, payRunId) {
    return this.request(
      'GET',
      `/Employer/${employerId}/Employee/${employeeId}/PayRun/${payRunId}/PayLines`
    );
  }

  /**
   * Get pay run summary with all pay lines for all employees
   */
  async getPayRunSummary(employerId, scheduleId, payRunId) {
    const payRun = await this.getPayRun(employerId, scheduleId, payRunId);

    // Get detailed report
    const report = await this.request(
      'GET',
      `/Employer/${employerId}/PaySchedule/${scheduleId}/PayRun/${payRunId}/Report/PAYSLIP3`
    );

    return {
      payRun,
      payslips: report
    };
  }

  // ============================================================
  // RTI SUBMISSIONS
  // ============================================================

  /**
   * Queue FPS (Full Payment Submission) job
   */
  async queueFpsSubmission(employerId, payRunId, options = {}) {
    const payload = {
      RtiJobInstruction: {
        RtiType: 'FpsRtiJob',
        PayRuns: {
          PayRunLink: [{ '@href': payRunId }]
        },
        Generate: 'true',
        Transmit: options.transmit ? 'true' : 'false', // Only transmit in production
        HoldingDate: options.holdingDate,
        LateReason: options.lateReason // A, B, C, D, E, F, G, H
      }
    };

    return this.request('POST', `/Employer/${employerId}/RtiJobs`, payload);
  }

  /**
   * Queue EPS (Employer Payment Summary) job
   */
  async queueEpsSubmission(employerId, options = {}) {
    const payload = {
      RtiJobInstruction: {
        RtiType: 'EpsRtiJob',
        TaxMonth: options.taxMonth,
        TaxYear: options.taxYear,
        NoPaymentForPeriod: options.noPaymentForPeriod ? 'true' : 'false',
        PeriodOfInactivityFrom: options.inactivityFrom,
        PeriodOfInactivityTo: options.inactivityTo,
        Generate: 'true',
        Transmit: options.transmit ? 'true' : 'false'
      }
    };

    return this.request('POST', `/Employer/${employerId}/RtiJobs`, payload);
  }

  /**
   * Get RTI submission status
   */
  async getRtiSubmission(employerId, rtiId) {
    return this.request('GET', `/Employer/${employerId}/RtiTransaction/${rtiId}`);
  }

  /**
   * List RTI submissions
   */
  async listRtiSubmissions(employerId) {
    return this.request('GET', `/Employer/${employerId}/RtiTransactions`);
  }

  // ============================================================
  // REPORTS
  // ============================================================

  /**
   * Generate P60 report
   */
  async getP60Report(employerId, employeeId, taxYear) {
    return this.request(
      'GET',
      `/Employer/${employerId}/Employee/${employeeId}/Report/P60/${taxYear}`
    );
  }

  /**
   * Generate P45 report
   */
  async getP45Report(employerId, employeeId) {
    return this.request(
      'GET',
      `/Employer/${employerId}/Employee/${employeeId}/Report/P45`
    );
  }

  /**
   * Generate PDF payslip
   */
  async getPayslipPdf(employerId, employeeId, payRunId) {
    return this.request(
      'GET',
      `/Employer/${employerId}/Employee/${employeeId}/PayRun/${payRunId}/Report/PAYSLIP3/run.pdf`
    );
  }

  /**
   * Get gross-to-net report for a pay run
   */
  async getGrossToNetReport(employerId, scheduleId, payRunId) {
    return this.request(
      'GET',
      `/Employer/${employerId}/PaySchedule/${scheduleId}/PayRun/${payRunId}/Report/GROSSTONET/run`
    );
  }

  // ============================================================
  // PENSION / AUTO-ENROLMENT
  // ============================================================

  /**
   * Create pension scheme
   */
  async createPensionScheme(employerId, pensionData) {
    const payload = {
      Pension: {
        EffectiveDate: pensionData.effectiveDate,
        SchemeName: pensionData.schemeName,
        ProviderName: pensionData.providerName,
        ProviderEmployerRef: pensionData.providerEmployerRef,
        EmployeeContributionPercent: pensionData.employeeContributionPercent?.toString(),
        EmployerContributionPercent: pensionData.employerContributionPercent?.toString(),
        LowerThreshold: pensionData.lowerThreshold?.toString(),
        UpperThreshold: pensionData.upperThreshold?.toString(),
        TaxationMethod: pensionData.taxationMethod || 'ReliefAtSource',
        Group: pensionData.group || 'GroupOne',
        UseAEThresholds: pensionData.useAeThresholds ? 'true' : 'false',
        RoundingOption: pensionData.roundingOption || 'PennyUp'
      }
    };

    return this.request('POST', `/Employer/${employerId}/Pensions`, payload);
  }

  /**
   * Get auto-enrolment assessment for employee
   */
  async getAutoEnrolmentAssessment(employerId, employeeId) {
    return this.request(
      'GET',
      `/Employer/${employerId}/Employee/${employeeId}/AeAssessments`
    );
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Calculate payroll for a single employee (preview mode)
   * Doesn't create a pay run, just returns what the calculation would be
   */
  async previewEmployeePayroll(employerId, employeeId, paymentDate) {
    // Create a supplementary pay run instruction that we can query but not finalize
    // This is a workaround - PayRun.io doesn't have a true preview endpoint
    // In practice, you'd create the pay run and examine it before approval

    const employee = await this.getEmployee(employerId, employeeId);
    const instructions = await this.getPayInstructions(employerId, employeeId);

    return {
      employee,
      instructions,
      note: 'Full calculation requires creating a pay run. Use queuePayRunJob for actual calculation.'
    };
  }

  /**
   * Map PayRun.io pay lines to our internal payslip format
   */
  mapPayLinesToPayslip(payLines, employee, payRun) {
    const earnings = [];
    const deductions = [];
    let grossPay = 0;
    let netPay = 0;
    let tax = 0;
    let employeeNi = 0;
    let employerNi = 0;
    let pension = 0;
    let employerPension = 0;
    let studentLoan = 0;

    for (const line of payLines) {
      const amount = parseFloat(line.Value || 0);
      const payCode = line.PayCode || '';
      const description = line.Description || payCode;

      // Categorize based on pay code
      if (payCode.startsWith('BASIC') || payCode === 'SALARY') {
        earnings.push({ type: 'basic', description: 'Basic Pay', amount });
        grossPay += amount;
      } else if (payCode === 'OVERTIME' || payCode.includes('OT')) {
        earnings.push({ type: 'overtime', description, amount });
        grossPay += amount;
      } else if (payCode === 'BONUS') {
        earnings.push({ type: 'bonus', description, amount });
        grossPay += amount;
      } else if (payCode === 'TAX' || payCode === 'PAYE') {
        deductions.push({ type: 'tax', description: 'Income Tax (PAYE)', amount: Math.abs(amount) });
        tax = Math.abs(amount);
      } else if (payCode === 'NIEE' || payCode === 'NI') {
        deductions.push({ type: 'ni', description: 'National Insurance', amount: Math.abs(amount) });
        employeeNi = Math.abs(amount);
      } else if (payCode === 'NIER') {
        employerNi = Math.abs(amount);
      } else if (payCode === 'PENSIONEE') {
        deductions.push({ type: 'pension', description: 'Pension Contribution', amount: Math.abs(amount) });
        pension = Math.abs(amount);
      } else if (payCode === 'PENSIONER') {
        employerPension = Math.abs(amount);
      } else if (payCode.includes('STUDENT') || payCode.includes('SL')) {
        deductions.push({ type: 'studentLoan', description: 'Student Loan', amount: Math.abs(amount) });
        studentLoan = Math.abs(amount);
      } else if (amount > 0) {
        earnings.push({ type: 'other', description, amount });
        grossPay += amount;
      } else if (amount < 0) {
        deductions.push({ type: 'other', description, amount: Math.abs(amount) });
      }
    }

    netPay = grossPay - tax - employeeNi - pension - studentLoan;

    // Sum other deductions
    for (const d of deductions) {
      if (!['tax', 'ni', 'pension', 'studentLoan'].includes(d.type)) {
        netPay -= d.amount;
      }
    }

    return {
      employeeId: employee.Code,
      payPeriodStart: payRun.PeriodStart,
      payPeriodEnd: payRun.PeriodEnd,
      payDate: payRun.PaymentDate,
      taxCode: employee.TaxCode,
      niCategory: employee.NiCategory,
      grossPay,
      netPay,
      earnings,
      deductions,
      tax,
      employeeNi,
      employerNi,
      pension,
      employerPension,
      studentLoan,
      totalDeductions: tax + employeeNi + pension + studentLoan
    };
  }
}

/**
 * Custom error class for PayRun.io errors
 */
class PayRunError extends Error {
  constructor(message, statusCode = null, body = null) {
    super(message);
    this.name = 'PayRunError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

// Export singleton instance and class
export const payrunClient = new PayRunIOClient();
export { PayRunIOClient, PayRunError };
export default payrunClient;
