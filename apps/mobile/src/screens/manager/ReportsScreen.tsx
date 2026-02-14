import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { BarChartIcon, DownloadIcon, TrendingUpIcon, TargetIcon, XIcon, UsersIcon, ClockIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { api } from '../../services/api';

// Report data - using translation keys for titles/descriptions
const getReports = (t: any) => [
  {
    id: 'team-performance',
    title: t('screens.reports.team_performance'),
    description: t('screens.reports.team_performance_desc'),
    icon: 'bar',
    color: colors.momentum,
    updatedAt: '2 hours ago',
    data: {
      summary: 'Team momentum increased 12% this week',
      metrics: [
        { label: 'Average Score', value: '87/100' },
        { label: 'Tasks Completed', value: '156' },
        { label: 'On-Time Rate', value: '94%' },
        { label: 'Top Performer', value: 'Sarah M.' },
      ]
    }
  },
  {
    id: 'retention',
    title: t('screens.reports.retention_analysis'),
    description: t('screens.reports.retention_analysis_desc'),
    icon: 'trending',
    color: colors.success,
    updatedAt: '1 day ago',
    data: {
      summary: '89% retention rate - above industry average',
      metrics: [
        { label: 'At-Risk Employees', value: '3' },
        { label: '90-Day Retention', value: '92%' },
        { label: 'Avg Tenure', value: '2.3 years' },
        { label: 'Turnover Cost Saved', value: '£45,000' },
      ]
    }
  },
  {
    id: 'skills-gap',
    title: t('screens.reports.skills_gap'),
    description: t('screens.reports.skills_gap_desc'),
    icon: 'target',
    color: colors.info,
    updatedAt: '3 days ago',
    data: {
      summary: '4 critical skills gaps identified',
      metrics: [
        { label: 'Skills Tracked', value: '24' },
        { label: 'Certifications Due', value: '7' },
        { label: 'Training Hours', value: '156' },
        { label: 'Coverage Rate', value: '78%' },
      ]
    }
  },
  {
    id: 'schedule-efficiency',
    title: t('screens.reports.schedule_efficiency'),
    description: t('screens.reports.schedule_efficiency_desc'),
    icon: 'bar',
    color: colors.warning,
    updatedAt: 'today',
    data: {
      summary: 'Schedule efficiency at 91% - 3% improvement possible',
      metrics: [
        { label: 'Shifts Filled', value: '98%' },
        { label: 'Overtime Hours', value: '24' },
        { label: 'Swap Requests', value: '12' },
        { label: 'Predicted Gaps', value: '2' },
      ]
    }
  },
];

export const ReportsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const REPORTS = getReports(t);
  const [selectedReport, setSelectedReport] = useState<typeof REPORTS[0] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleViewReport = (report: typeof REPORTS[0]) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const reportTypeMap: Record<string, string> = {
      'team-performance': 'timesheets',
      'retention': 'employees',
      'skills-gap': 'employees',
      'schedule-efficiency': 'schedule-efficiency',
    };
    const reportType = reportTypeMap[selectedReport?.id || ''] || 'timesheets';
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const url = api.getExportUrl(reportType, format, { startDate: thirtyDaysAgo, endDate: today });
    Linking.openURL(url).catch(() => {
      showAlert(t('screens.reports.export_error'), t('screens.reports.export_error_message'));
    });
    setModalVisible(false);
  };

  const getIcon = (iconType: string, color: string) => {
    switch (iconType) {
      case 'trending': return <TrendingUpIcon size={24} color={color} />;
      case 'target': return <TargetIcon size={24} color={color} />;
      default: return <BarChartIcon size={24} color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('screens.reports.title')}</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => showAlert(t('screens.reports.export_all_reports'), t('screens.reports.choose_format'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('screens.reports.pdf'), onPress: () => {
              const today = new Date().toISOString().split('T')[0];
              const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
              Linking.openURL(api.getExportUrl('timesheets', 'pdf', { startDate: thirtyDaysAgo, endDate: today }));
            }},
            { text: t('screens.reports.csv'), onPress: () => {
              const today = new Date().toISOString().split('T')[0];
              const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
              Linking.openURL(api.getExportUrl('timesheets', 'csv', { startDate: thirtyDaysAgo, endDate: today }));
            }},
          ])}
        >
          <DownloadIcon size={20} color={colors.momentum} />
          <Text style={styles.exportText}>{t('screens.reports.export_all')}</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleViewReport(REPORTS[0])}
          >
            <TrendingUpIcon size={24} color={colors.success} />
            <Text style={styles.statValue}>+12%</Text>
            <Text style={styles.statLabel}>{t('screens.reports.productivity')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleViewReport(REPORTS[1])}
          >
            <TargetIcon size={24} color={colors.info} />
            <Text style={styles.statValue}>89%</Text>
            <Text style={styles.statLabel}>{t('screens.reports.retention')}</Text>
          </TouchableOpacity>
        </View>

        {/* Report Cards */}
        {REPORTS.map((report) => (
          <TouchableOpacity 
            key={report.id}
            style={styles.reportCard}
            onPress={() => handleViewReport(report)}
          >
            <View style={styles.reportHeader}>
              {getIcon(report.icon, report.color)}
              <Text style={styles.reportTitle}>{report.title}</Text>
            </View>
            <Text style={styles.reportDesc}>{report.description}</Text>
            <View style={styles.reportMeta}>
              <Text style={styles.reportDate}>{t('screens.reports.updated', { time: report.updatedAt })}</Text>
              <Text style={styles.viewReportText}>{t('screens.reports.view_report')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Report Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedReport?.title}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <XIcon size={24} color={colors.slate600} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{selectedReport?.data.summary}</Text>
            </View>

            {/* Metrics Grid */}
            <Text style={styles.sectionTitle}>{t('screens.reports.key_metrics')}</Text>
            <View style={styles.metricsGrid}>
              {selectedReport?.data.metrics.map((metric, index) => (
                <View key={index} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>

            {/* Chart Placeholder */}
            <Text style={styles.sectionTitle}>{t('screens.reports.trend_30_days')}</Text>
            <View style={styles.chartPlaceholder}>
              <BarChartIcon size={48} color={colors.slate300} />
              <Text style={styles.chartText}>{t('screens.reports.chart_hint')}</Text>
            </View>

            {/* Export Options */}
            <Text style={styles.sectionTitle}>{t('screens.reports.export_report')}</Text>
            <View style={styles.exportOptions}>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => handleExport('pdf')}
              >
                <DownloadIcon size={20} color={colors.momentum} />
                <Text style={styles.exportOptionText}>{t('screens.reports.download_pdf')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => handleExport('csv')}
              >
                <DownloadIcon size={20} color={colors.success} />
                <Text style={styles.exportOptionText}>{t('screens.reports.download_excel')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, gap: spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 20, color: colors.slate700 },
  title: { ...typography.h2, color: colors.slate900, flex: 1 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 2, borderColor: colors.momentum },
  exportText: { ...typography.bodyBold, color: colors.momentum },
  content: { flex: 1, padding: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', ...shadows.md },
  statValue: { ...typography.h1, color: colors.slate900, marginTop: spacing.sm, fontWeight: '700' },
  statLabel: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs },
  reportCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.md },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  reportTitle: { ...typography.h3, color: colors.slate900 },
  reportDesc: { ...typography.body, color: colors.slate600, marginBottom: spacing.md },
  reportMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.slate200 },
  reportDate: { ...typography.caption, color: colors.slate500 },
  viewReportText: { ...typography.bodyBold, color: colors.momentum },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  modalTitle: { ...typography.h2, color: colors.slate900 },
  modalContent: { flex: 1, padding: spacing.lg },
  summaryCard: { backgroundColor: colors.momentum + '15', borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.xl },
  summaryText: { ...typography.body, color: colors.slate800, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { ...typography.h3, color: colors.slate900, marginBottom: spacing.md, marginTop: spacing.md },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricCard: { width: '47%', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center' },
  metricValue: { ...typography.h2, color: colors.momentum, fontWeight: '700' },
  metricLabel: { ...typography.caption, color: colors.slate600, marginTop: spacing.xs, textAlign: 'center' },
  chartPlaceholder: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', height: 150 },
  chartText: { ...typography.caption, color: colors.slate500, marginTop: spacing.md },
  exportOptions: { flexDirection: 'row', gap: spacing.md },
  exportOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg },
  exportOptionText: { ...typography.bodyBold, color: colors.slate700 },
});
