/**
 * UAE Payroll Calculator
 * Handles End of Service Gratuity, Social Insurance (UAE nationals only), and WPS compliance
 * Tax Year: 2025
 */

export class AEPayrollCalculator {
  constructor(config) {
    this.config = config;
    this.validateConfig();
  }

  validateConfig() {
    if (!this.config || this.config.country !== 'AE') {
      throw new Error('Invalid UAE payroll configuration');
    }
  }

  /**
   * Calculate full payslip for an employee
   * @param {Object} employee - Employee profile with UAE-specific settings
   * @param {Object} payPeriod - Pay period details
   * @param {Object} ytdFigures - Year-to-date figures
   * @returns {Object} Standardized payslip object
   */
  calculate(employee, payPeriod, ytdFigures = {}) {
    const {
      basicPay,
      housingAllowance = 0,
      transportAllowance = 0,
      otherAllowances = 0,
      overtime = 0
    } = payPeriod;

    const totalGross = basicPay + housingAllowance + transportAllowance + otherAllowances + overtime;

    // Calculate social insurance (UAE nationals only)
    const socialInsurance = this.calculateSocialInsurance(employee, basicPay);

    // Calculate end of service gratuity provision
    const gratuityProvision = this.calculateGratuityProvision(employee, basicPay);

    // Calculate overtime pay
    const overtimePay = this.calculateOvertime(employee, payPeriod);

    // Calculate any deductions
    const deductions = this.calculateDeductions(employee, payPeriod, totalGross);

    // Build payslip
    return this.buildPayslip({
      employee,
      payPeriod,
      basicPay,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      overtimePay,
      socialInsurance,
      gratuityProvision,
      deductions,
      ytdFigures
    });
  }

  /**
   * Calculate social insurance (GPSSA for UAE nationals only)
   */
  calculateSocialInsurance(employee, basicPay) {
    // No social insurance for expats
    if (!employee.isUAENational) {
      return {
        employee: 0,
        employer: 0,
        government: 0,
        total: 0,
        applicable: false,
        reason: 'Expatriate employee - no mandatory social insurance'
      };
    }

    const config = this.config.socialInsurance.uaeNationals.gpssa;

    // Apply contribution ceiling
    const contributionBasis = Math.max(
      config.contributionBasis.min,
      Math.min(basicPay, config.contributionBasis.max)
    );

    const employeeContribution = Math.round(
      contributionBasis * config.employee.rate * 100
    ) / 100;

    const employerContribution = Math.round(
      contributionBasis * config.employer.rate * 100
    ) / 100;

    const governmentContribution = Math.round(
      contributionBasis * config.government.rate * 100
    ) / 100;

    return {
      employee: employeeContribution,
      employer: employerContribution,
      government: governmentContribution,
      total: employeeContribution + employerContribution + governmentContribution,
      basis: contributionBasis,
      applicable: true,
      scheme: 'GPSSA'
    };
  }

  /**
   * Calculate monthly gratuity provision
   * This is an employer liability, not a deduction
   */
  calculateGratuityProvision(employee, basicPay) {
    if (!employee.startDate) {
      return {
        monthlyProvision: 0,
        accrued: 0,
        message: 'Start date required for gratuity calculation'
      };
    }

    const config = this.config.endOfServiceGratuity.calculation;
    const contractType = employee.contractType || 'unlimitedContract';
    const contractConfig = config[contractType];

    // Calculate years of service
    const startDate = new Date(employee.startDate);
    const now = new Date();
    const yearsOfService = (now - startDate) / (1000 * 60 * 60 * 24 * 365.25);

    // Determine daily rate based on years of service
    let daysPerYear;
    if (yearsOfService <= 5) {
      daysPerYear = contractConfig.first5Years?.daysPerYear || 21;
    } else {
      daysPerYear = contractConfig.after5Years?.daysPerYear || 30;
    }

    // Monthly provision = (basic salary / 30) * (days per year / 12)
    const dailyRate = basicPay / 30;
    const monthlyProvision = Math.round(dailyRate * (daysPerYear / 12) * 100) / 100;

    // Calculate total accrued gratuity
    let accruedGratuity = 0;
    if (yearsOfService <= 5) {
      accruedGratuity = dailyRate * 21 * yearsOfService;
    } else {
      const first5Years = dailyRate * 21 * 5;
      const remainingYears = dailyRate * 30 * (yearsOfService - 5);
      accruedGratuity = first5Years + remainingYears;
    }

    // Apply maximum cap (2 years' salary)
    const maxGratuity = basicPay * 24;
    accruedGratuity = Math.min(accruedGratuity, maxGratuity);

    return {
      monthlyProvision,
      accrued: Math.round(accruedGratuity * 100) / 100,
      yearsOfService: Math.round(yearsOfService * 100) / 100,
      daysPerYear,
      dailyRate,
      maxGratuity,
      contractType
    };
  }

  /**
   * Calculate overtime pay
   */
  calculateOvertime(employee, payPeriod) {
    if (!payPeriod.overtimeHours || payPeriod.overtimeHours === 0) {
      return {
        hours: 0,
        regularRate: 0,
        nightRate: 0,
        totalPay: 0
      };
    }

    const config = this.config.workingHours.overtime;
    const hourlyRate = payPeriod.basicPay / (30 * 8); // Monthly / (days * hours)

    const regularOTHours = payPeriod.overtimeHours.regular || 0;
    const nightOTHours = payPeriod.overtimeHours.night || 0;

    const regularOTPay = Math.round(
      regularOTHours * hourlyRate * config.rate * 100
    ) / 100;

    const nightOTPay = Math.round(
      nightOTHours * hourlyRate * config.nightRate * 100
    ) / 100;

    return {
      hours: {
        regular: regularOTHours,
        night: nightOTHours,
        total: regularOTHours + nightOTHours
      },
      rates: {
        regular: config.rate,
        night: config.nightRate
      },
      hourlyRate,
      regularPay: regularOTPay,
      nightPay: nightOTPay,
      totalPay: regularOTPay + nightOTPay
    };
  }

  /**
   * Calculate deductions
   */
  calculateDeductions(employee, payPeriod, totalGross) {
    const config = this.config.deductions;
    const deductions = {
      loanRepayment: 0,
      absences: 0,
      courtOrders: 0,
      other: 0,
      total: 0
    };

    // Loan repayment (max 10% of salary)
    if (employee.loanRepayment) {
      const maxDeduction = totalGross * config.allowedFromSalary.loanRepayment.maxPercent;
      deductions.loanRepayment = Math.min(employee.loanRepayment, maxDeduction);
    }

    // Unauthorized absences
    if (payPeriod.unauthorizedAbsences) {
      const dailyRate = totalGross / 30;
      deductions.absences = Math.round(dailyRate * payPeriod.unauthorizedAbsences * 100) / 100;
    }

    // Court orders / garnishments
    if (employee.courtOrderDeduction) {
      deductions.courtOrders = employee.courtOrderDeduction;
    }

    // Other deductions
    if (payPeriod.otherDeductions) {
      deductions.other = payPeriod.otherDeductions;
    }

    deductions.total = deductions.loanRepayment +
                       deductions.absences +
                       deductions.courtOrders +
                       deductions.other;

    // Ensure total deductions don't exceed 50%
    const maxTotalDeduction = totalGross * config.maxTotalDeduction.percent;
    if (deductions.total > maxTotalDeduction) {
      deductions.warning = `Deductions capped at 50% of salary`;
      deductions.total = maxTotalDeduction;
    }

    return deductions;
  }

  /**
   * Calculate leave entitlements
   */
  calculateLeaveBalance(employee) {
    if (!employee.startDate) {
      return null;
    }

    const config = this.config.leaveEntitlements;
    const startDate = new Date(employee.startDate);
    const now = new Date();
    const monthsOfService = (now - startDate) / (1000 * 60 * 60 * 24 * 30.44);

    let annualLeaveEntitlement;
    if (monthsOfService < 12) {
      // Prorated: 2 days per month after probation
      const monthsAfterProbation = Math.max(0, monthsOfService - (employee.probationMonths || 3));
      annualLeaveEntitlement = monthsAfterProbation * config.annual.afterProbation;
    } else {
      annualLeaveEntitlement = config.annual.after1Year;
    }

    return {
      annual: {
        entitlement: Math.floor(annualLeaveEntitlement),
        taken: employee.annualLeaveTaken || 0,
        remaining: Math.floor(annualLeaveEntitlement) - (employee.annualLeaveTaken || 0)
      },
      sick: {
        entitlement: config.sick.maxDays,
        taken: employee.sickLeaveTaken || 0,
        remaining: config.sick.maxDays - (employee.sickLeaveTaken || 0)
      }
    };
  }

  /**
   * Build standardized payslip object
   */
  buildPayslip(data) {
    const {
      employee,
      payPeriod,
      basicPay,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      overtimePay,
      socialInsurance,
      gratuityProvision,
      deductions,
      ytdFigures
    } = data;

    const totalGross = basicPay + housingAllowance + transportAllowance +
                       otherAllowances + (overtimePay?.totalPay || 0);

    const totalDeductions = socialInsurance.employee + deductions.total;
    const netPay = totalGross - totalDeductions;

    // Calculate YTD
    const ytd = {
      basicPay: (ytdFigures.basicPay || 0) + basicPay,
      totalGross: (ytdFigures.totalGross || 0) + totalGross,
      socialInsurance: (ytdFigures.socialInsurance || 0) + socialInsurance.employee,
      deductions: (ytdFigures.deductions || 0) + deductions.total,
      netPay: (ytdFigures.netPay || 0) + netPay,
      gratuityAccrued: gratuityProvision.accrued
    };

    return {
      country: 'AE',
      currency: this.config.currency,
      taxYear: this.config.taxYear,
      payPeriod: {
        frequency: 'monthly',
        periodNumber: payPeriod.periodNumber,
        startDate: payPeriod.startDate,
        endDate: payPeriod.endDate,
        payDate: payPeriod.payDate
      },
      employee: {
        id: employee.id,
        name: employee.name,
        emiratesId: employee.emiratesId ? `****${employee.emiratesId.slice(-4)}` : null,
        nationality: employee.nationality,
        isUAENational: employee.isUAENational
      },
      earnings: {
        basicPay,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        overtime: overtimePay?.totalPay || 0,
        totalGross
      },
      employeeDeductions: {
        socialInsurance: socialInsurance.applicable ? {
          amount: socialInsurance.employee,
          scheme: socialInsurance.scheme,
          basis: socialInsurance.basis
        } : {
          amount: 0,
          notApplicable: true,
          reason: socialInsurance.reason
        },
        loanRepayment: deductions.loanRepayment,
        absences: deductions.absences,
        courtOrders: deductions.courtOrders,
        other: deductions.other,
        total: Math.round(totalDeductions * 100) / 100
      },
      employerContributions: {
        socialInsurance: socialInsurance.applicable ? {
          amount: socialInsurance.employer,
          scheme: socialInsurance.scheme
        } : {
          amount: 0,
          notApplicable: true
        },
        gratuityProvision: {
          monthlyAmount: gratuityProvision.monthlyProvision,
          totalAccrued: gratuityProvision.accrued,
          yearsOfService: gratuityProvision.yearsOfService
        },
        total: Math.round(
          (socialInsurance.employer + gratuityProvision.monthlyProvision) * 100
        ) / 100
      },
      incomeTax: {
        amount: 0,
        rate: 0,
        description: 'No personal income tax in UAE'
      },
      totals: {
        grossPay: totalGross,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100
      },
      wps: {
        compliant: true,
        transferMethod: 'Bank Transfer',
        description: 'Wage Protection System compliant'
      },
      ytd,
      notes: [
        employee.isUAENational
          ? 'GPSSA social insurance contributions applied'
          : 'No social insurance - expatriate employee',
        `End of service gratuity accruing at ${gratuityProvision.daysPerYear} days per year`
      ]
    };
  }

  /**
   * Calculate final settlement (end of service)
   */
  calculateFinalSettlement(employee, terminationDetails) {
    const { basicPay, terminationDate, terminationType, noticePeriodServed } = terminationDetails;

    // Calculate gratuity
    const gratuity = this.calculateGratuityProvision(employee, basicPay);

    // Apply resignation reduction if applicable
    let gratuityPayable = gratuity.accrued;
    if (terminationType === 'resignation') {
      const config = this.config.endOfServiceGratuity.calculation.unlimitedContract.resignationReduction;

      if (gratuity.yearsOfService < 1) {
        gratuityPayable = 0;
      } else if (gratuity.yearsOfService < 3) {
        gratuityPayable = gratuity.accrued * config['1to3Years'];
      } else if (gratuity.yearsOfService < 5) {
        gratuityPayable = gratuity.accrued * config['3to5Years'];
      }
      // Over 5 years = full gratuity
    }

    // Calculate outstanding leave encashment
    const leaveBalance = this.calculateLeaveBalance(employee);
    const dailyRate = basicPay / 30;
    const leaveEncashment = (leaveBalance?.annual?.remaining || 0) * dailyRate;

    // Notice period compensation (if not served)
    let noticePeriodCompensation = 0;
    if (!noticePeriodServed) {
      const noticePeriodDays = employee.noticePeriodDays || 30;
      noticePeriodCompensation = (basicPay / 30) * noticePeriodDays;
    }

    return {
      gratuity: {
        accrued: gratuity.accrued,
        payable: Math.round(gratuityPayable * 100) / 100,
        yearsOfService: gratuity.yearsOfService,
        reductionApplied: terminationType === 'resignation' && gratuity.yearsOfService < 5
      },
      leaveEncashment: Math.round(leaveEncashment * 100) / 100,
      noticePeriodCompensation: Math.round(noticePeriodCompensation * 100) / 100,
      totalSettlement: Math.round(
        (gratuityPayable + leaveEncashment + noticePeriodCompensation) * 100
      ) / 100
    };
  }
}

export default AEPayrollCalculator;
