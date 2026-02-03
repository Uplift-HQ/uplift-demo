import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  DownloadIcon,
  DollarSignIcon,
  TrendingUpIcon,
  CalendarIcon,
} from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { showAlert } from '../utils/alert';

interface Payslip {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  grossPay: number;
  netPay: number;
  deductions: {
    tax: number;
    nationalInsurance: number;
    pension: number;
    studentLoan: number;
    other: number;
  };
  status: 'paid' | 'pending';
  hoursWorked: number;
  overtimeHours: number;
  bonuses: number;
}

interface YearToDateSummary {
  totalEarned: number;
  totalTax: number;
  totalDeductions: number;
  totalNetPay: number;
}

// Payslips data for 2026 and 2025
const demoPayslips: Payslip[] = [
  {
    id: '1',
    period: 'January 2026',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    payDate: '2026-01-31',
    grossPay: 2850.00,
    netPay: 2180.45,
    deductions: { tax: 342.00, nationalInsurance: 198.55, pension: 85.50, studentLoan: 43.50, other: 0 },
    status: 'pending',
    hoursWorked: 168,
    overtimeHours: 8,
    bonuses: 100,
  },
  {
    id: '2',
    period: 'December 2025',
    periodStart: '2025-12-01',
    periodEnd: '2025-12-31',
    payDate: '2025-12-31',
    grossPay: 3250.00,
    netPay: 2475.20,
    deductions: { tax: 420.00, nationalInsurance: 225.80, pension: 97.50, studentLoan: 31.50, other: 0 },
    status: 'paid',
    hoursWorked: 160,
    overtimeHours: 16,
    bonuses: 350,
  },
  {
    id: '3',
    period: 'November 2025',
    periodStart: '2025-11-01',
    periodEnd: '2025-11-30',
    payDate: '2025-11-30',
    grossPay: 2750.00,
    netPay: 2102.85,
    deductions: { tax: 330.00, nationalInsurance: 191.15, pension: 82.50, studentLoan: 43.50, other: 0 },
    status: 'paid',
    hoursWorked: 160,
    overtimeHours: 4,
    bonuses: 0,
  },
  {
    id: '4',
    period: 'October 2025',
    periodStart: '2025-10-01',
    periodEnd: '2025-10-31',
    payDate: '2025-10-31',
    grossPay: 2800.00,
    netPay: 2138.70,
    deductions: { tax: 336.00, nationalInsurance: 194.30, pension: 84.00, studentLoan: 47.00, other: 0 },
    status: 'paid',
    hoursWorked: 168,
    overtimeHours: 6,
    bonuses: 50,
  },
  {
    id: '5',
    period: 'September 2025',
    periodStart: '2025-09-01',
    periodEnd: '2025-09-30',
    payDate: '2025-09-30',
    grossPay: 2650.00,
    netPay: 2028.15,
    deductions: { tax: 318.00, nationalInsurance: 184.85, pension: 79.50, studentLoan: 39.50, other: 0 },
    status: 'paid',
    hoursWorked: 152,
    overtimeHours: 0,
    bonuses: 0,
  },
  {
    id: '6',
    period: 'August 2025',
    periodStart: '2025-08-01',
    periodEnd: '2025-08-31',
    payDate: '2025-08-31',
    grossPay: 2900.00,
    netPay: 2212.50,
    deductions: { tax: 348.00, nationalInsurance: 202.00, pension: 87.00, studentLoan: 50.50, other: 0 },
    status: 'paid',
    hoursWorked: 168,
    overtimeHours: 12,
    bonuses: 75,
  },
  {
    id: '7',
    period: 'July 2025',
    periodStart: '2025-07-01',
    periodEnd: '2025-07-31',
    payDate: '2025-07-31',
    grossPay: 2700.00,
    netPay: 2064.90,
    deductions: { tax: 324.00, nationalInsurance: 188.10, pension: 81.00, studentLoan: 42.00, other: 0 },
    status: 'paid',
    hoursWorked: 160,
    overtimeHours: 2,
    bonuses: 0,
  },
  {
    id: '8',
    period: 'June 2025',
    periodStart: '2025-06-01',
    periodEnd: '2025-06-30',
    payDate: '2025-06-30',
    grossPay: 2750.00,
    netPay: 2102.85,
    deductions: { tax: 330.00, nationalInsurance: 191.15, pension: 82.50, studentLoan: 43.50, other: 0 },
    status: 'paid',
    hoursWorked: 160,
    overtimeHours: 4,
    bonuses: 0,
  },
  {
    id: '9',
    period: 'May 2025',
    periodStart: '2025-05-01',
    periodEnd: '2025-05-31',
    payDate: '2025-05-31',
    grossPay: 2850.00,
    netPay: 2173.95,
    deductions: { tax: 342.00, nationalInsurance: 198.55, pension: 85.50, studentLoan: 50.00, other: 0 },
    status: 'paid',
    hoursWorked: 168,
    overtimeHours: 8,
    bonuses: 50,
  },
  {
    id: '10',
    period: 'April 2025',
    periodStart: '2025-04-01',
    periodEnd: '2025-04-30',
    payDate: '2025-04-30',
    grossPay: 2600.00,
    netPay: 1993.40,
    deductions: { tax: 312.00, nationalInsurance: 181.60, pension: 78.00, studentLoan: 35.00, other: 0 },
    status: 'paid',
    hoursWorked: 152,
    overtimeHours: 0,
    bonuses: 0,
  },
  {
    id: '11',
    period: 'March 2025',
    periodStart: '2025-03-01',
    periodEnd: '2025-03-31',
    payDate: '2025-03-31',
    grossPay: 2780.00,
    netPay: 2123.26,
    deductions: { tax: 333.60, nationalInsurance: 193.74, pension: 83.40, studentLoan: 46.00, other: 0 },
    status: 'paid',
    hoursWorked: 160,
    overtimeHours: 6,
    bonuses: 30,
  },
  {
    id: '12',
    period: 'February 2025',
    periodStart: '2025-02-01',
    periodEnd: '2025-02-28',
    payDate: '2025-02-28',
    grossPay: 2650.00,
    netPay: 2028.15,
    deductions: { tax: 318.00, nationalInsurance: 184.85, pension: 79.50, studentLoan: 39.50, other: 0 },
    status: 'paid',
    hoursWorked: 152,
    overtimeHours: 0,
    bonuses: 0,
  },
  {
    id: '13',
    period: 'January 2025',
    periodStart: '2025-01-01',
    periodEnd: '2025-01-31',
    payDate: '2025-01-31',
    grossPay: 2700.00,
    netPay: 2064.90,
    deductions: { tax: 324.00, nationalInsurance: 188.10, pension: 81.00, studentLoan: 42.00, other: 0 },
    status: 'paid',
    hoursWorked: 160,
    overtimeHours: 2,
    bonuses: 0,
  },
];

const availableYears = ['2026', '2025'];

export const PayslipsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState('2025');
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Filter payslips by selected year
  const filteredPayslips = useMemo(() => {
    return demoPayslips.filter((payslip) => payslip.period.includes(selectedYear));
  }, [selectedYear]);

  // Calculate year-to-date summary
  const ytdSummary: YearToDateSummary = useMemo(() => {
    const yearPayslips = filteredPayslips.filter((p) => p.status === 'paid');
    return {
      totalEarned: yearPayslips.reduce((sum, p) => sum + p.grossPay, 0),
      totalTax: yearPayslips.reduce((sum, p) => sum + p.deductions.tax, 0),
      totalDeductions: yearPayslips.reduce(
        (sum, p) =>
          sum +
          p.deductions.tax +
          p.deductions.nationalInsurance +
          p.deductions.pension +
          p.deductions.studentLoan +
          p.deductions.other,
        0
      ),
      totalNetPay: yearPayslips.reduce((sum, p) => sum + p.netPay, 0),
    };
  }, [filteredPayslips]);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDownloadPDF = (payslip: Payslip) => {
    showAlert(
      t('payslips.downloadPayslip') || 'Download Payslip',
      `${t('payslips.downloadConfirm') || 'Download payslip for'} ${payslip.period}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.yes') || 'Download',
          onPress: () => {
            showAlert(
              t('common.success'),
              `${payslip.period} ${t('payslips.downloadSuccess') || 'payslip downloaded successfully.'}`
            );
          },
        },
      ]
    );
  };

  const handleViewDetails = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setDetailModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    return status === 'paid' ? colors.success : colors.warning;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'paid') {
      return <CheckCircleIcon size={14} color={colors.success} />;
    }
    return <ClockIcon size={14} color={colors.warning} />;
  };

  const getTotalDeductions = (payslip: Payslip) => {
    const d = payslip.deductions;
    return d.tax + d.nationalInsurance + d.pension + d.studentLoan + d.other;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>{`← ${t('common.back')}`}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payslips.title') || 'Payslips'}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Year Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.yearSelector}
          onPress={() => setYearModalVisible(true)}
        >
          <CalendarIcon size={18} color={colors.momentum} />
          <Text style={styles.yearText}>{selectedYear}</Text>
          <View style={styles.chevronDown}>
            <ChevronRightIcon size={16} color={colors.slate500} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Year-to-Date Summary Card */}
        <View style={styles.ytdCard}>
          <View style={styles.ytdHeader}>
            <TrendingUpIcon size={20} color={colors.momentum} />
            <Text style={styles.ytdTitle}>
              {t('payslips.yearToDate') || 'Year-to-Date Summary'} ({selectedYear})
            </Text>
          </View>

          <View style={styles.ytdGrid}>
            <View style={styles.ytdItem}>
              <Text style={styles.ytdLabel}>{t('payslips.totalEarned') || 'Total Earned'}</Text>
              <Text style={[styles.ytdValue, { color: colors.slate900 }]}>
                {formatCurrency(ytdSummary.totalEarned)}
              </Text>
            </View>
            <View style={styles.ytdItem}>
              <Text style={styles.ytdLabel}>{t('payslips.totalTax') || 'Total Tax'}</Text>
              <Text style={[styles.ytdValue, { color: colors.error }]}>
                {formatCurrency(ytdSummary.totalTax)}
              </Text>
            </View>
            <View style={styles.ytdItem}>
              <Text style={styles.ytdLabel}>{t('payslips.totalDeductions') || 'Total Deductions'}</Text>
              <Text style={[styles.ytdValue, { color: colors.warning }]}>
                {formatCurrency(ytdSummary.totalDeductions)}
              </Text>
            </View>
            <View style={styles.ytdItem}>
              <Text style={styles.ytdLabel}>{t('payslips.netPay') || 'Net Pay'}</Text>
              <Text style={[styles.ytdValue, { color: colors.success }]}>
                {formatCurrency(ytdSummary.totalNetPay)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payslips List */}
        <Text style={styles.sectionTitle}>{t('payslips.monthlyPayslips') || 'Monthly Payslips'}</Text>

        {filteredPayslips.length === 0 ? (
          <View style={styles.emptyState}>
            <FileTextIcon size={48} color={colors.slate300} />
            <Text style={styles.emptyText}>
              {t('payslips.noPayslips') || 'No payslips available for this year'}
            </Text>
          </View>
        ) : (
          filteredPayslips.map((payslip) => (
            <TouchableOpacity
              key={payslip.id}
              style={styles.payslipCard}
              onPress={() => handleViewDetails(payslip)}
              activeOpacity={0.7}
            >
              <View style={styles.payslipHeader}>
                <View style={styles.payslipPeriod}>
                  <FileTextIcon size={20} color={colors.momentum} />
                  <Text style={styles.periodText}>{payslip.period}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(payslip.status) + '20' },
                  ]}
                >
                  {getStatusIcon(payslip.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(payslip.status) }]}>
                    {payslip.status === 'paid'
                      ? t('payslips.paid') || 'Paid'
                      : t('payslips.pending') || 'Pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.payslipBody}>
                <View style={styles.payslipRow}>
                  <Text style={styles.payslipLabel}>{t('payslips.grossPay') || 'Gross Pay'}</Text>
                  <Text style={styles.payslipValue}>{formatCurrency(payslip.grossPay)}</Text>
                </View>
                <View style={styles.payslipRow}>
                  <Text style={styles.payslipLabel}>{t('payslips.deductions') || 'Deductions'}</Text>
                  <Text style={[styles.payslipValue, { color: colors.error }]}>
                    -{formatCurrency(getTotalDeductions(payslip))}
                  </Text>
                </View>
                <View style={[styles.payslipRow, styles.netPayRow]}>
                  <Text style={styles.netPayLabel}>{t('payslips.netPay') || 'Net Pay'}</Text>
                  <Text style={styles.netPayValue}>{formatCurrency(payslip.netPay)}</Text>
                </View>
              </View>

              <View style={styles.payslipFooter}>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDownloadPDF(payslip);
                  }}
                >
                  <DownloadIcon size={16} color={colors.momentum} />
                  <Text style={styles.downloadText}>{t('payslips.downloadPDF') || 'Download PDF'}</Text>
                </TouchableOpacity>
                <View style={styles.viewDetails}>
                  <Text style={styles.viewDetailsText}>{t('common.details')}</Text>
                  <ChevronRightIcon size={16} color={colors.slate400} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Year Selection Modal */}
      <Modal
        visible={yearModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setYearModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('payslips.selectYear') || 'Select Year'}</Text>
            {availableYears.map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.yearOption, selectedYear === year && styles.yearOptionActive]}
                onPress={() => {
                  setSelectedYear(year);
                  setYearModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.yearOptionText,
                    selectedYear === year && styles.yearOptionTextActive,
                  ]}
                >
                  {year}
                </Text>
                {selectedYear === year && (
                  <CheckCircleIcon size={20} color={colors.momentum} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payslip Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            {selectedPayslip && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{selectedPayslip.period}</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.closeButton}>{t('common.close')}</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Status */}
                  <View style={styles.detailSection}>
                    <View
                      style={[
                        styles.statusBadgeLarge,
                        { backgroundColor: getStatusColor(selectedPayslip.status) + '15' },
                      ]}
                    >
                      {getStatusIcon(selectedPayslip.status)}
                      <Text
                        style={[
                          styles.statusTextLarge,
                          { color: getStatusColor(selectedPayslip.status) },
                        ]}
                      >
                        {selectedPayslip.status === 'paid'
                          ? t('payslips.paid') || 'Paid'
                          : t('payslips.pending') || 'Pending'}
                      </Text>
                    </View>
                    <Text style={styles.payDateText}>
                      {t('payslips.payDate') || 'Pay Date'}:{' '}
                      {new Date(selectedPayslip.payDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  {/* Earnings */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      {t('payslips.earnings') || 'Earnings'}
                    </Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t('payslips.hoursWorked') || 'Hours Worked'}
                      </Text>
                      <Text style={styles.detailValue}>{selectedPayslip.hoursWorked}h</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t('payslips.overtimeHours') || 'Overtime Hours'}
                      </Text>
                      <Text style={styles.detailValue}>{selectedPayslip.overtimeHours}h</Text>
                    </View>
                    {selectedPayslip.bonuses > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('payslips.bonuses') || 'Bonuses'}</Text>
                        <Text style={[styles.detailValue, { color: colors.success }]}>
                          +{formatCurrency(selectedPayslip.bonuses)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>{t('payslips.grossPay') || 'Gross Pay'}</Text>
                      <Text style={styles.totalValue}>
                        {formatCurrency(selectedPayslip.grossPay)}
                      </Text>
                    </View>
                  </View>

                  {/* Deductions */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      {t('payslips.deductions') || 'Deductions'}
                    </Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('payslips.incomeTax') || 'Income Tax'}</Text>
                      <Text style={[styles.detailValue, { color: colors.error }]}>
                        -{formatCurrency(selectedPayslip.deductions.tax)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t('payslips.nationalInsurance') || 'National Insurance'}
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.error }]}>
                        -{formatCurrency(selectedPayslip.deductions.nationalInsurance)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('payslips.pension') || 'Pension'}</Text>
                      <Text style={[styles.detailValue, { color: colors.error }]}>
                        -{formatCurrency(selectedPayslip.deductions.pension)}
                      </Text>
                    </View>
                    {selectedPayslip.deductions.studentLoan > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          {t('payslips.studentLoan') || 'Student Loan'}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.error }]}>
                          -{formatCurrency(selectedPayslip.deductions.studentLoan)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>
                        {t('payslips.totalDeductions') || 'Total Deductions'}
                      </Text>
                      <Text style={[styles.totalValue, { color: colors.error }]}>
                        -{formatCurrency(getTotalDeductions(selectedPayslip))}
                      </Text>
                    </View>
                  </View>

                  {/* Net Pay */}
                  <View style={styles.netPaySection}>
                    <Text style={styles.netPaySectionLabel}>
                      {t('payslips.netPay') || 'Net Pay'}
                    </Text>
                    <Text style={styles.netPaySectionValue}>
                      {formatCurrency(selectedPayslip.netPay)}
                    </Text>
                  </View>

                  {/* Download Button */}
                  <TouchableOpacity
                    style={styles.downloadButtonLarge}
                    onPress={() => {
                      handleDownloadPDF(selectedPayslip);
                      setDetailModalVisible(false);
                    }}
                  >
                    <DownloadIcon size={20} color={colors.white} />
                    <Text style={styles.downloadButtonLargeText}>
                      {t('payslips.downloadPDF') || 'Download PDF'}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ height: 40 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.slate900,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.momentumLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  yearText: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  chevronDown: {
    transform: [{ rotate: '90deg' }],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  ytdCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
    marginBottom: spacing.lg,
  },
  ytdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ytdTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  ytdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  ytdItem: {
    width: '47%',
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  ytdLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginBottom: spacing.xs,
  },
  ytdValue: {
    ...typography.body,
    fontWeight: '800',
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.slate700,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.slate500,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  payslipCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  payslipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  payslipPeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  periodText: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  payslipBody: {
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: spacing.md,
  },
  payslipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  payslipLabel: {
    ...typography.caption,
    color: colors.slate500,
  },
  payslipValue: {
    ...typography.body,
    color: colors.slate900,
    fontWeight: '600',
  },
  netPayRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    marginBottom: 0,
  },
  netPayLabel: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  netPayValue: {
    ...typography.body,
    color: colors.success,
    fontWeight: '800',
  },
  payslipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  downloadText: {
    ...typography.caption,
    color: colors.momentum,
    fontWeight: '700',
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewDetailsText: {
    ...typography.caption,
    color: colors.slate400,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  yearOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  yearOptionActive: {
    backgroundColor: colors.momentumLight,
  },
  yearOptionText: {
    ...typography.body,
    color: colors.slate700,
  },
  yearOptionTextActive: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  // Detail Modal styles
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  detailTitle: {
    ...typography.h2,
    color: colors.slate900,
  },
  closeButton: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  statusTextLarge: {
    ...typography.bodyBold,
  },
  payDateText: {
    ...typography.caption,
    color: colors.slate500,
  },
  detailSectionTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    ...typography.body,
    color: colors.slate600,
  },
  detailValue: {
    ...typography.body,
    color: colors.slate900,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  totalValue: {
    ...typography.h3,
    color: colors.slate900,
    fontWeight: '800',
  },
  netPaySection: {
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  netPaySectionLabel: {
    ...typography.caption,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  netPaySectionValue: {
    ...typography.h1,
    color: colors.success,
    fontWeight: '900',
  },
  downloadButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  downloadButtonLargeText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});

export default PayslipsScreen;
