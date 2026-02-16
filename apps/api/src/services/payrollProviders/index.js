// ============================================================
// PAYROLL PROVIDER FACTORY
// Routes payroll calculations to the appropriate provider
// based on country configuration
// ============================================================

import { payrunClient } from './payrunio.js';
import { ukNativeCalculator } from './ukNative.js';
import { onesourceClient } from './onesource.js';
import { fallbackCalculator } from './fallback.js';
import { deelClient } from './deel.js';
import { remoteClient } from './remote.js';
import { papayaClient } from './papaya.js';
import db from '../../lib/database.js';

/**
 * Provider types supported by the system
 */
export const PROVIDER_TYPES = {
  // UK-specific providers
  PAYRUN_IO: 'payrunio',      // PayRun.io for UK (primary, HMRC-certified)
  UK_NATIVE: 'native',         // Native UK calculation (fallback)

  // Enterprise multi-country
  ONESOURCE: 'onesource',      // Thomson Reuters ONESOURCE (enterprise payroll)

  // Global EOR (Employer of Record) providers
  DEEL: 'deel',                // Deel - global EOR & contractor payments
  REMOTE: 'remote',            // Remote.com - global employment platform
  PAPAYA: 'papaya',            // Papaya Global - workforce payments

  // Fallback
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

    case PROVIDER_TYPES.DEEL:
      return {
        type: PROVIDER_TYPES.DEEL,
        client: deelClient,
        config,
        calculate: async (input) => deelClient.calculate({ ...input, countryCode })
      };

    case PROVIDER_TYPES.REMOTE:
      return {
        type: PROVIDER_TYPES.REMOTE,
        client: remoteClient,
        config,
        calculate: async (input) => remoteClient.calculate({ ...input, countryCode })
      };

    case PROVIDER_TYPES.PAPAYA:
      return {
        type: PROVIDER_TYPES.PAPAYA,
        client: papayaClient,
        config,
        calculate: async (input) => papayaClient.calculate({ ...input, countryCode })
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
 * Priority: Native > PayRun.io (UK) > EOR providers > ONESOURCE > Fallback
 */
function getDefaultProvider(countryCode) {
  switch (countryCode) {
    case 'GB':
    case 'UK':
      // UK: Try PayRun.io first (HMRC-certified), fall back to native
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

    // European countries - prefer Deel or Remote for EOR
    case 'DE':
    case 'FR':
    case 'NL':
    case 'ES':
    case 'IT':
    case 'PT':
    case 'PL':
    case 'SE':
    case 'DK':
    case 'NO':
    case 'FI':
    case 'AT':
    case 'BE':
    case 'CH':
    case 'IE':
      return selectEORProvider(countryCode);

    // Americas - prefer Deel for EOR
    case 'US':
    case 'CA':
    case 'MX':
    case 'BR':
    case 'AR':
    case 'CL':
    case 'CO':
      return selectEORProvider(countryCode);

    // APAC - prefer Remote or Papaya
    case 'AU':
    case 'NZ':
    case 'SG':
    case 'JP':
    case 'KR':
    case 'CN':
    case 'IN':
    case 'PH':
    case 'ID':
    case 'TH':
    case 'VN':
      return selectEORProvider(countryCode);

    // Middle East - prefer Papaya or Deel
    case 'AE':
    case 'SA':
    case 'IL':
      return selectEORProvider(countryCode);

    // Africa - prefer Deel or Remote
    case 'ZA':
    case 'NG':
    case 'KE':
    case 'EG':
      return selectEORProvider(countryCode);

    default:
      return selectEORProvider(countryCode);
  }
}

/**
 * Select the best available EOR provider
 * Priority: Deel > Remote > Papaya > ONESOURCE > Fallback
 */
function selectEORProvider(countryCode) {
  // Try Deel first (most comprehensive coverage)
  if (process.env.DEEL_API_KEY) {
    return {
      type: PROVIDER_TYPES.DEEL,
      client: deelClient,
      calculate: async (input) => deelClient.calculate({ ...input, countryCode })
    };
  }

  // Try Remote.com
  if (process.env.REMOTE_API_KEY) {
    return {
      type: PROVIDER_TYPES.REMOTE,
      client: remoteClient,
      calculate: async (input) => remoteClient.calculate({ ...input, countryCode })
    };
  }

  // Try Papaya Global
  if (process.env.PAPAYA_CLIENT_ID && process.env.PAPAYA_CLIENT_SECRET) {
    return {
      type: PROVIDER_TYPES.PAPAYA,
      client: papayaClient,
      calculate: async (input) => papayaClient.calculate({ ...input, countryCode })
    };
  }

  // Try ONESOURCE (enterprise)
  if (process.env.ONESOURCE_API_KEY) {
    return {
      type: PROVIDER_TYPES.ONESOURCE,
      client: onesourceClient,
      calculate: async (input) => onesourceClient.calculate(input, { countryCode })
    };
  }

  // Fallback to local calculation
  return {
    type: PROVIDER_TYPES.FALLBACK,
    client: fallbackCalculator,
    calculate: async (input) => fallbackCalculator.calculate(input, countryCode)
  };
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

    case PROVIDER_TYPES.DEEL:
      return deelClient.checkConnection();

    case PROVIDER_TYPES.REMOTE:
      return remoteClient.checkConnection();

    case PROVIDER_TYPES.PAPAYA:
      return papayaClient.checkConnection();

    case PROVIDER_TYPES.UK_NATIVE:
      return { available: true }; // Always available

    case PROVIDER_TYPES.FALLBACK:
      return { available: true }; // Always available

    default:
      return { available: false, reason: 'Unknown provider type' };
  }
}

/**
 * Get all available providers and their status
 */
export async function getAllProviderStatus() {
  const providers = Object.values(PROVIDER_TYPES);
  const status = {};

  for (const provider of providers) {
    status[provider] = await checkProviderStatus(provider);
  }

  return status;
}

/**
 * Get supported countries and their providers
 * Includes EOR providers for global hiring
 */
export async function getSupportedCountries() {
  const eorProviders = [PROVIDER_TYPES.DEEL, PROVIDER_TYPES.REMOTE, PROVIDER_TYPES.PAPAYA];
  const enterpriseProviders = [PROVIDER_TYPES.ONESOURCE, PROVIDER_TYPES.FALLBACK];

  return [
    // United Kingdom - Native support
    {
      code: 'GB',
      name: 'United Kingdom',
      currency: 'GBP',
      taxYearStart: 'April',
      providers: [PROVIDER_TYPES.PAYRUN_IO, PROVIDER_TYPES.UK_NATIVE],
      primaryProvider: PROVIDER_TYPES.PAYRUN_IO,
      certified: true,
      eorAvailable: true,
      region: 'Europe'
    },

    // Europe - EOR providers available
    {
      code: 'DE',
      name: 'Germany',
      currency: 'EUR',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Europe'
    },
    {
      code: 'FR',
      name: 'France',
      currency: 'EUR',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Europe'
    },
    {
      code: 'NL',
      name: 'Netherlands',
      currency: 'EUR',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.REMOTE,
      certified: false,
      eorAvailable: true,
      region: 'Europe'
    },
    {
      code: 'ES',
      name: 'Spain',
      currency: 'EUR',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Europe'
    },
    {
      code: 'IT',
      name: 'Italy',
      currency: 'EUR',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Europe'
    },
    {
      code: 'PL',
      name: 'Poland',
      currency: 'PLN',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Europe'
    },
    {
      code: 'PT',
      name: 'Portugal',
      currency: 'EUR',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.REMOTE,
      certified: false,
      eorAvailable: true,
      region: 'Europe'
    },

    // Americas
    {
      code: 'US',
      name: 'United States',
      currency: 'USD',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Americas'
    },
    {
      code: 'CA',
      name: 'Canada',
      currency: 'CAD',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.REMOTE,
      certified: false,
      eorAvailable: true,
      region: 'Americas'
    },
    {
      code: 'MX',
      name: 'Mexico',
      currency: 'MXN',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Americas'
    },
    {
      code: 'BR',
      name: 'Brazil',
      currency: 'BRL',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Americas'
    },

    // APAC
    {
      code: 'AU',
      name: 'Australia',
      currency: 'AUD',
      taxYearStart: 'July',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.REMOTE,
      certified: false,
      eorAvailable: true,
      region: 'APAC'
    },
    {
      code: 'SG',
      name: 'Singapore',
      currency: 'SGD',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'APAC'
    },
    {
      code: 'JP',
      name: 'Japan',
      currency: 'JPY',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.PAPAYA,
      certified: false,
      eorAvailable: true,
      region: 'APAC'
    },
    {
      code: 'IN',
      name: 'India',
      currency: 'INR',
      taxYearStart: 'April',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'APAC'
    },
    {
      code: 'CN',
      name: 'China',
      currency: 'CNY',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.PAPAYA,
      certified: false,
      eorAvailable: true,
      region: 'APAC'
    },
    {
      code: 'PH',
      name: 'Philippines',
      currency: 'PHP',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'APAC'
    },

    // Middle East
    {
      code: 'AE',
      name: 'United Arab Emirates',
      currency: 'AED',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.PAPAYA,
      certified: false,
      eorAvailable: true,
      region: 'Middle East',
      taxFree: true
    },
    {
      code: 'SA',
      name: 'Saudi Arabia',
      currency: 'SAR',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.PAPAYA,
      certified: false,
      eorAvailable: true,
      region: 'Middle East',
      taxFree: true
    },
    {
      code: 'IL',
      name: 'Israel',
      currency: 'ILS',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Middle East'
    },

    // Africa
    {
      code: 'ZA',
      name: 'South Africa',
      currency: 'ZAR',
      taxYearStart: 'March',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Africa'
    },
    {
      code: 'NG',
      name: 'Nigeria',
      currency: 'NGN',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.DEEL,
      certified: false,
      eorAvailable: true,
      region: 'Africa'
    },
    {
      code: 'KE',
      name: 'Kenya',
      currency: 'KES',
      taxYearStart: 'January',
      providers: [...eorProviders, ...enterpriseProviders],
      primaryProvider: PROVIDER_TYPES.REMOTE,
      certified: false,
      eorAvailable: true,
      region: 'Africa'
    }
  ];
}

export default {
  getPayrollProvider,
  runBatchPayroll,
  checkProviderStatus,
  getAllProviderStatus,
  getSupportedCountries,
  PROVIDER_TYPES,
  // Individual provider clients for direct access
  clients: {
    payrun: payrunClient,
    ukNative: ukNativeCalculator,
    onesource: onesourceClient,
    deel: deelClient,
    remote: remoteClient,
    papaya: papayaClient,
    fallback: fallbackCalculator,
  }
};
