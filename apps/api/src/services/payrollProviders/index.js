// ============================================================
// PAYROLL PROVIDER FACTORY
// Routes payroll calculations to the appropriate provider
// based on country configuration
// ============================================================

import { payrunClient } from './payrunio.js';
import { ukNativeCalculator } from './ukNative.js';
import { onesourceClient } from './onesource.js';
import { fallbackCalculator } from './fallback.js';
import db from '../../lib/database.js';

/**
 * Provider types supported by the system
 */
export const PROVIDER_TYPES = {
  PAYRUN_IO: 'payrunio',      // PayRun.io for UK (primary)
  UK_NATIVE: 'native',         // Native UK calculation (fallback)
  ONESOURCE: 'onesource',      // Thomson Reuters ONESOURCE (enterprise)
  FALLBACK: 'fallback'         // Basic calculation using tax tables
};

/**
 * Get the appropriate payroll provider for a country
 */
export async function getPayrollProvider(countryCode, organizationId = null) {
  // Check if there's a country-specific configuration
  const config = await getCountryConfig(countryCode, organizationId);

  if (!config) {
    // Default providers by country
    return getDefaultProvider(countryCode);
  }

  switch (config.provider) {
    case PROVIDER_TYPES.PAYRUN_IO:
      return {
        type: PROVIDER_TYPES.PAYRUN_IO,
        client: payrunClient,
        config,
        calculate: async (input) => calculateWithPayRunIO(input, config)
      };

    case PROVIDER_TYPES.UK_NATIVE:
      return {
        type: PROVIDER_TYPES.UK_NATIVE,
        client: ukNativeCalculator,
        config,
        calculate: async (input) => ukNativeCalculator.calculate(input)
      };

    case PROVIDER_TYPES.ONESOURCE:
      return {
        type: PROVIDER_TYPES.ONESOURCE,
        client: onesourceClient,
        config,
        calculate: async (input) => onesourceClient.calculate(input, config)
      };

    case PROVIDER_TYPES.FALLBACK:
    default:
      return {
        type: PROVIDER_TYPES.FALLBACK,
        client: fallbackCalculator,
        config,
        calculate: async (input) => fallbackCalculator.calculate(input, countryCode)
      };
  }
}

/**
 * Get default provider for a country (when no config exists)
 */
function getDefaultProvider(countryCode) {
  switch (countryCode) {
    case 'GB':
    case 'UK':
      // UK: Try PayRun.io first, fall back to native
      if (process.env.PAYRUN_CONSUMER_KEY) {
        return {
          type: PROVIDER_TYPES.PAYRUN_IO,
          client: payrunClient,
          calculate: async (input) => calculateWithPayRunIO(input, null)
        };
      }
      return {
        type: PROVIDER_TYPES.UK_NATIVE,
        client: ukNativeCalculator,
        calculate: async (input) => ukNativeCalculator.calculate(input)
      };

    case 'DE':
    case 'PL':
    case 'US':
    case 'CN':
    case 'AE':
      // Other countries: Try ONESOURCE if configured, else fallback
      if (process.env.ONESOURCE_API_KEY) {
        return {
          type: PROVIDER_TYPES.ONESOURCE,
          client: onesourceClient,
          calculate: async (input) => onesourceClient.calculate(input, { countryCode })
        };
      }
      return {
        type: PROVIDER_TYPES.FALLBACK,
        client: fallbackCalculator,
        calculate: async (input) => fallbackCalculator.calculate(input, countryCode)
      };

    default:
      return {
        type: PROVIDER_TYPES.FALLBACK,
        client: fallbackCalculator,
        calculate: async (input) => fallbackCalculator.calculate(input, countryCode)
      };
  }
}

/**
 * Get country-specific payroll configuration from database
 */
async function getCountryConfig(countryCode, organizationId) {
  try {
    const result = await db.query(`
      SELECT * FROM payroll_country_configs
      WHERE country_code = $1
        AND (organization_id = $2 OR organization_id IS NULL)
        AND status = 'active'
      ORDER BY organization_id NULLS LAST
      LIMIT 1
    `, [countryCode, organizationId]);

    return result.rows[0] || null;
  } catch (error) {
    // Table might not exist yet
    return null;
  }
}

/**
 * Calculate payroll using PayRun.io
 * This is a high-level wrapper that handles the full flow
 */
async function calculateWithPayRunIO(input, config) {
  const {
    employeeId,
    employerId,
    payScheduleId,
    payPeriodStart,
    payPeriodEnd,
    payDate
  } = input;

  // For PayRun.io, we need to:
  // 1. Ensure employee exists in PayRun.io (sync if needed)
  // 2. Add/update pay instructions for this period
  // 3. Queue a pay run job
  // 4. Wait for completion
  // 5. Get the results

  // This is a simplified version - in production you'd have
  // more robust sync logic between Uplift and PayRun.io

  try {
    // Queue pay run
    const jobResponse = await payrunClient.queuePayRunJob(
      employerId,
      payScheduleId,
      {
        paymentDate: payDate,
        periodStart: payPeriodStart,
        periodEnd: payPeriodEnd
      }
    );

    // Get job ID from response
    const jobId = jobResponse.JobId || extractJobId(jobResponse);

    // Wait for job completion
    await payrunClient.waitForJob(jobId);

    // Get pay run results
    const payRunId = await getLatestPayRunId(employerId, payScheduleId);
    const payLines = await payrunClient.getEmployeePayLines(employerId, employeeId, payRunId);

    // Map to our format
    const employee = await payrunClient.getEmployee(employerId, employeeId);
    const payRun = await payrunClient.getPayRun(employerId, payScheduleId, payRunId);

    return {
      success: true,
      provider: PROVIDER_TYPES.PAYRUN_IO,
      certified: true, // PayRun.io is HMRC-certified
      ...payrunClient.mapPayLinesToPayslip(payLines, employee, payRun)
    };
  } catch (error) {
    // Fall back to native calculation if PayRun.io fails
    console.error('PayRun.io calculation failed, falling back to native:', error.message);

    const nativeResult = await ukNativeCalculator.calculate(input);
    return {
      ...nativeResult,
      warning: 'Calculated using native engine (PayRun.io unavailable)',
      originalError: error.message
    };
  }
}

/**
 * Helper to extract job ID from PayRun.io response
 */
function extractJobId(response) {
  // Response typically includes a link like /Job/JOB001
  if (response.Link && response.Link['@href']) {
    const href = response.Link['@href'];
    const match = href.match(/\/Job\/([^/]+)/);
    return match ? match[1] : null;
  }
  return null;
}

/**
 * Get the latest pay run ID for a schedule
 */
async function getLatestPayRunId(employerId, payScheduleId) {
  const payRuns = await payrunClient.request(
    'GET',
    `/Employer/${employerId}/PaySchedule/${payScheduleId}/PayRuns`
  );

  if (payRuns.Links && payRuns.Links.length > 0) {
    // Get the last one (most recent)
    const lastLink = payRuns.Links[payRuns.Links.length - 1];
    const match = lastLink['@href'].match(/\/PayRun\/([^/]+)/);
    return match ? match[1] : null;
  }

  return null;
}

/**
 * Run payroll for multiple employees
 */
export async function runBatchPayroll(employees, options) {
  const results = {
    success: [],
    errors: [],
    summary: {
      totalGross: 0,
      totalNet: 0,
      totalTax: 0,
      totalNi: 0,
      totalEmployerNi: 0,
      employeesProcessed: 0,
      employeesFailed: 0
    }
  };

  // Group employees by country for efficient processing
  const byCountry = {};
  for (const emp of employees) {
    const country = emp.countryCode || 'GB';
    if (!byCountry[country]) {
      byCountry[country] = [];
    }
    byCountry[country].push(emp);
  }

  // Process each country group
  for (const [countryCode, countryEmployees] of Object.entries(byCountry)) {
    const provider = await getPayrollProvider(countryCode, options.organizationId);

    for (const employee of countryEmployees) {
      try {
        const input = {
          ...employee,
          ...options,
          countryCode
        };

        const result = await provider.calculate(input);

        results.success.push({
          employeeId: employee.id,
          ...result
        });

        results.summary.totalGross += result.grossPay || 0;
        results.summary.totalNet += result.netPay || 0;
        results.summary.totalTax += result.tax || 0;
        results.summary.totalNi += result.employeeNi || 0;
        results.summary.totalEmployerNi += result.employerNi || 0;
        results.summary.employeesProcessed++;

      } catch (error) {
        results.errors.push({
          employeeId: employee.id,
          error: error.message
        });
        results.summary.employeesFailed++;
      }
    }
  }

  return results;
}

/**
 * Check if a provider is available and configured
 */
export async function checkProviderStatus(providerType) {
  switch (providerType) {
    case PROVIDER_TYPES.PAYRUN_IO:
      if (!process.env.PAYRUN_CONSUMER_KEY) {
        return { available: false, reason: 'PAYRUN_CONSUMER_KEY not configured' };
      }
      try {
        // Try a simple API call
        await payrunClient.listEmployers();
        return { available: true };
      } catch (error) {
        return { available: false, reason: error.message };
      }

    case PROVIDER_TYPES.ONESOURCE:
      if (!process.env.ONESOURCE_API_KEY) {
        return { available: false, reason: 'ONESOURCE_API_KEY not configured' };
      }
      return onesourceClient.checkConnection();

    case PROVIDER_TYPES.UK_NATIVE:
      return { available: true }; // Always available

    case PROVIDER_TYPES.FALLBACK:
      return { available: true }; // Always available

    default:
      return { available: false, reason: 'Unknown provider type' };
  }
}

/**
 * Get supported countries and their providers
 */
export async function getSupportedCountries() {
  return [
    {
      code: 'GB',
      name: 'United Kingdom',
      currency: 'GBP',
      taxYearStart: 'April',
      providers: [PROVIDER_TYPES.PAYRUN_IO, PROVIDER_TYPES.UK_NATIVE],
      primaryProvider: PROVIDER_TYPES.PAYRUN_IO,
      certified: true
    },
    {
      code: 'DE',
      name: 'Germany',
      currency: 'EUR',
      taxYearStart: 'January',
      providers: [PROVIDER_TYPES.ONESOURCE, PROVIDER_TYPES.FALLBACK],
      primaryProvider: PROVIDER_TYPES.ONESOURCE,
      certified: false
    },
    {
      code: 'PL',
      name: 'Poland',
      currency: 'PLN',
      taxYearStart: 'January',
      providers: [PROVIDER_TYPES.ONESOURCE, PROVIDER_TYPES.FALLBACK],
      primaryProvider: PROVIDER_TYPES.ONESOURCE,
      certified: false
    },
    {
      code: 'US',
      name: 'United States',
      currency: 'USD',
      taxYearStart: 'January',
      providers: [PROVIDER_TYPES.ONESOURCE, PROVIDER_TYPES.FALLBACK],
      primaryProvider: PROVIDER_TYPES.ONESOURCE,
      certified: false
    },
    {
      code: 'CN',
      name: 'China',
      currency: 'CNY',
      taxYearStart: 'January',
      providers: [PROVIDER_TYPES.ONESOURCE, PROVIDER_TYPES.FALLBACK],
      primaryProvider: PROVIDER_TYPES.ONESOURCE,
      certified: false
    },
    {
      code: 'AE',
      name: 'United Arab Emirates',
      currency: 'AED',
      taxYearStart: 'January',
      providers: [PROVIDER_TYPES.ONESOURCE, PROVIDER_TYPES.FALLBACK],
      primaryProvider: PROVIDER_TYPES.ONESOURCE,
      certified: false
    }
  ];
}

export default {
  getPayrollProvider,
  runBatchPayroll,
  checkProviderStatus,
  getSupportedCountries,
  PROVIDER_TYPES
};
