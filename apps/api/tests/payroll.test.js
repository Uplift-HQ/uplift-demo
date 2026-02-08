// ============================================================
// PAYROLL ENGINE TESTS
// Verify UK calculations match HMRC rates
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ukNativeCalculator } from '../src/services/payrollProviders/ukNative.js';

describe('UK Native Payroll Calculator', () => {
  describe('2025/26 Tax Year Calculations', () => {

    /**
     * Test Case 1: Standard employee £30,000/year
     * Expected (HMRC calculator):
     * - Monthly gross: £2,500
     * - Tax: ~£290
     * - NI: ~£140
     * - Net (before pension): ~£2,070
     */
    it('calculates correctly for £30,000 annual salary', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 30000,
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 0,
        employerPensionPercent: 0
      });

      // Gross should be £2,500 exactly
      expect(result.grossPay).toBe(2500);

      // Tax: £30,000 - £12,570 = £17,430 taxable @ 20% = £3,486/year = £290.50/month
      expect(result.tax).toBeGreaterThan(289);
      expect(result.tax).toBeLessThan(292);

      // NI: (£2,500 - £1,047.50) × 8% = £116.20/month
      // Note: £1,047.50 = £12,570 / 12 primary threshold
      expect(result.employeeNi).toBeGreaterThan(115);
      expect(result.employeeNi).toBeLessThan(118);

      // Net should be gross - tax - NI
      const expectedNet = result.grossPay - result.tax - result.employeeNi;
      expect(result.netPay).toBeCloseTo(expectedNet, 2);
    });

    /**
     * Test Case 2: Higher rate taxpayer £60,000/year
     */
    it('calculates correctly for £60,000 annual salary', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 60000,
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 0,
        employerPensionPercent: 0
      });

      // Gross should be £5,000
      expect(result.grossPay).toBe(5000);

      // Tax calculation:
      // - Personal allowance: £12,570
      // - Basic rate: (£50,270 - £12,570) = £37,700 × 20% = £7,540
      // - Higher rate: (£60,000 - £50,270) = £9,730 × 40% = £3,892
      // - Total annual: £11,432, monthly: ~£952.67
      expect(result.tax).toBeGreaterThan(950);
      expect(result.tax).toBeLessThan(955);

      // NI: Main rate + reduced rate
      // (£4,189.17 - £1,047.50) × 8% + (£5,000 - £4,189.17) × 2%
      // = £251.33 + £16.22 = £267.55
      expect(result.employeeNi).toBeGreaterThan(265);
      expect(result.employeeNi).toBeLessThan(270);
    });

    /**
     * Test Case 3: With 5% pension contribution
     */
    it('calculates pension contributions correctly', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 30000,
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 5,
        employerPensionPercent: 3
      });

      // Qualifying earnings: (£2,500 - £520) = £1,980 (monthly thresholds)
      // Employee: £1,980 × 5% = £99
      // Employer: £1,980 × 3% = £59.40
      expect(result.pension).toBeGreaterThan(98);
      expect(result.pension).toBeLessThan(101);
      expect(result.employerPension).toBeGreaterThan(58);
      expect(result.employerPension).toBeLessThan(61);
    });

    /**
     * Test Case 4: Student loan Plan 2
     */
    it('calculates student loan repayments correctly', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 35000,
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 0,
        studentLoanPlans: ['plan2']
      });

      // Plan 2 threshold: £27,295/year = £2,274.58/month
      // Repayment: (£2,916.67 - £2,274.58) × 9% = £57.79
      expect(result.studentLoan).toBeGreaterThan(56);
      expect(result.studentLoan).toBeLessThan(59);
    });

    /**
     * Test Case 5: Scottish taxpayer
     */
    it('calculates Scottish tax rates correctly', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 50000,
        taxCode: 'S1257L',
        niCategory: 'A',
        region: 'Scotland',
        payFrequency: 'monthly',
        pensionContributionPercent: 0
      });

      // Scottish bands are different - higher tax overall
      // Should be higher than England equivalent
      const englandResult = await ukNativeCalculator.calculate({
        annualSalary: 50000,
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 0
      });

      // Scotland has higher rates at this income level
      expect(result.tax).toBeGreaterThan(englandResult.tax);
    });

    /**
     * Test Case 6: Employer NI (2025/26 changes)
     */
    it('calculates employer NI with new 2025/26 rates', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 30000,
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 0
      });

      // Employer NI: (£2,500 - £416.67) × 15% = £312.50
      // Note: £416.67 = £5,000 / 12 (new secondary threshold)
      expect(result.employerNi).toBeGreaterThan(310);
      expect(result.employerNi).toBeLessThan(315);
    });

    /**
     * Test Case 7: Hourly worker with overtime
     */
    it('calculates hourly pay with overtime correctly', async () => {
      const result = await ukNativeCalculator.calculate({
        hourlyRate: 15,
        hoursWorked: 160, // 40 hours × 4 weeks
        overtimeHours: 20,
        overtimeMultiplier: 1.5,
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 0
      });

      // Regular: 160 × £15 = £2,400
      // Overtime: 20 × £15 × 1.5 = £450
      // Gross: £2,850
      expect(result.grossPay).toBe(2850);
    });

    /**
     * Test Case 8: NI Category C (over state pension age)
     */
    it('calculates NI Category C correctly (over pension age)', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 30000,
        taxCode: '1257L',
        niCategory: 'C',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 0
      });

      // Category C: 0% employee NI, 15% employer NI
      expect(result.employeeNi).toBe(0);
      expect(result.employerNi).toBeGreaterThan(310);
    });

    /**
     * Test Case 9: High earner with personal allowance tapering
     */
    it('applies personal allowance tapering over £100k', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 125000,
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'monthly',
        pensionContributionPercent: 0
      });

      // At £125,000, personal allowance is reduced to £140
      // (£125,000 - £100,000) / 2 = £12,500 reduction
      // £12,570 - £12,500 = £70 remaining (but tapers at £125,140)
      // Effective marginal rate is 60% in the £100k-£125k band

      // Tax should be significantly higher than proportional
      expect(result.tax).toBeGreaterThan(3500); // Very rough - needs precise calc
    });

    /**
     * Test Case 10: Weekly pay frequency
     */
    it('calculates weekly payroll correctly', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 26000, // £500/week
        taxCode: '1257L',
        niCategory: 'A',
        region: 'England',
        payFrequency: 'weekly',
        pensionContributionPercent: 0
      });

      // Gross: £26,000 / 52 = £500
      expect(result.grossPay).toBe(500);

      // Weekly thresholds
      expect(result.periodsPerYear).toBe(52);
    });
  });

  describe('YTD Calculations', () => {
    it('calculates year-to-date totals correctly', () => {
      const payslips = [
        { grossPay: 2500, tax: 290, employeeNi: 116, pension: 99, netPay: 1995 },
        { grossPay: 2500, tax: 290, employeeNi: 116, pension: 99, netPay: 1995 },
        { grossPay: 2500, tax: 290, employeeNi: 116, pension: 99, netPay: 1995 }
      ];

      const ytd = ukNativeCalculator.calculateYTD(payslips);

      expect(ytd.grossPayYTD).toBe(7500);
      expect(ytd.taxYTD).toBe(870);
      expect(ytd.niYTD).toBe(348);
      expect(ytd.pensionYTD).toBe(297);
      expect(ytd.netPayYTD).toBe(5985);
    });
  });

  describe('Provider Information', () => {
    it('returns correct provider metadata', async () => {
      const result = await ukNativeCalculator.calculate({
        annualSalary: 30000,
        payFrequency: 'monthly'
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('native');
      expect(result.certified).toBe(false);
      expect(result.warning).toContain('native engine');
    });
  });
});

describe('Fallback Calculator', () => {
  // Import fallback calculator
  // These tests verify the multi-country fallback calculations

  it('should have German tax calculation', async () => {
    const { fallbackCalculator } = await import('../src/services/payrollProviders/fallback.js');

    const result = await fallbackCalculator.calculate({
      grossPay: 5000,
      payFrequency: 'monthly'
    }, 'DE');

    expect(result.success).toBe(true);
    expect(result.provider).toBe('fallback');
    expect(result.certified).toBe(false);
    expect(result.countryCode).toBe('DE');
    expect(result.currency).toBe('EUR');
    expect(result.deductions.length).toBeGreaterThan(0);
  });

  it('should have US tax calculation', async () => {
    const { fallbackCalculator } = await import('../src/services/payrollProviders/fallback.js');

    const result = await fallbackCalculator.calculate({
      grossPay: 5000,
      payFrequency: 'monthly'
    }, 'US');

    expect(result.success).toBe(true);
    expect(result.currency).toBe('USD');
    expect(result.socialSecurity).toBeGreaterThan(0);
    expect(result.medicare).toBeGreaterThan(0);
  });

  it('should have UAE calculation with no income tax', async () => {
    const { fallbackCalculator } = await import('../src/services/payrollProviders/fallback.js');

    const result = await fallbackCalculator.calculate({
      grossPay: 25000, // AED
      payFrequency: 'monthly',
      isUAENational: false
    }, 'AE');

    expect(result.success).toBe(true);
    expect(result.tax).toBe(0);
    expect(result.netPay).toBe(result.grossPay); // No deductions for expats
  });
});
