import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BellIcon, CalendarIcon, CheckSquareIcon, StarIcon, UsersIcon, BriefcaseIcon, AwardIcon, CheckCircleIcon } from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useNotifications } from '../hooks/useData';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';

type NotificationFilter = 'all' | 'shifts' | 'tasks' | 'recognition' | 'opportunities';

interface Notification {
  id: string;
  type: 'shift' | 'task' | 'recognition' | 'opportunity' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionable?: boolean;
}

export const NotificationsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { data: notificationsData, loading, refetch } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  // Transform API notifications to display format
  const notifications: Notification[] = (notificationsData?.notifications || []).map(n => {
    const createdAt = new Date(n.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let timeDisplay = '';
    if (diffMins < 60) timeDisplay = t('notifications.minAgo', { count: diffMins });
    else if (diffHours < 24) timeDisplay = t('notifications.hoursAgo', { count: diffHours });
    else if (diffDays === 1) timeDisplay = t('common.yesterday');
    else timeDisplay = t('notifications.daysAgo', { count: diffDays });
    
    return {
      id: n.id,
      type: (n.type as any) || 'system',
      title: n.title,
      message: n.message,
      time: timeDisplay,
      read: n.read,
      actionable: !!n.actionUrl,
    };
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'shift': return <CalendarIcon size={20} color={colors.info} />;
      case 'task': return <CheckSquareIcon size={20} color={colors.success} />;
      case 'recognition': return <StarIcon size={20} color={colors.warning} />;
      case 'opportunity': return <BriefcaseIcon size={20} color={colors.momentum} />;
      case 'system': return <AwardIcon size={20} color={colors.slate600} />;
      default: return <BellIcon size={20} color={colors.slate600} />;
    }
  };

  const getIconBgColor = (type: string) => {
    switch (type) {
      case 'shift': return colors.info + '20';
      case 'task': return colors.success + '20';
      case 'recognition': return colors.warning + '20';
      case 'opportunity': return colors.momentum + '20';
      default: return colors.slate200;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      refetch();
    } catch (error) {
      // Silently fail for read status
    }
  };

  const markAllAsRead = () => {
    showAlert(
      t('notifications.markAllRead'),
      t('notifications.markAllReadConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notifications.markAll'),
          onPress: async () => {
            try {
              await api.markAllNotificationsRead();
              refetch();
            } catch (error) {
              showAlert(t('common.error'), t('notifications.failedMarkRead'));
            }
          }
        }
      ]
    );
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.actionable) {
      switch (notification.type) {
        case 'shift':
          navigation.navigate('Schedule');
          break;
        case 'task':
          navigation.navigate('Tasks');
          break;
        case 'opportunity':
          navigation.navigate('Career');
          break;
      }
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => {
        if (filter === 'shifts') return n.type === 'shift';
        if (filter === 'tasks') return n.type === 'task';
        if (filter === 'recognition') return n.type === 'recognition';
        if (filter === 'opportunities') return n.type === 'opportunity';
        return true;
      });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('navigation.notifications')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>{t('notifications.markAllReadShort')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <BellIcon size={16} color={colors.momentum} />
          <Text style={styles.unreadText}>{t('notifications.unreadCount', { count: unreadCount })}</Text>
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {(['all', 'shifts', 'tasks', 'recognition', 'opportunities'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? t('common.all') : t(`notifications.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Notifications List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <BellIcon size={48} color={colors.slate400} />
            <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
            <Text style={styles.emptyText}>{t('notifications.allCaught')}</Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.notificationCardUnread
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={[styles.iconCircle, { backgroundColor: getIconBgColor(notification.type) }]}>
                {getIcon(notification.type)}
              </View>
              
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, !notification.read && styles.notificationTitleUnread]}>
                    {notification.title}
                  </Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>

              {notification.actionable && (
                <View style={styles.actionIndicator}>
                  <Text style={styles.actionText}>{t('common.view')}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Settings Link */}
      <TouchableOpacity
        style={styles.settingsLink}
        onPress={() => navigation.navigate('Profile', { scrollTo: 'notifications' })}
      >
        <Text style={styles.settingsText}>{t('notifications.notificationSettings')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, ...shadows.sm },
  backButton: { ...typography.bodyBold, color: colors.momentum },
  title: { ...typography.h2, color: colors.slate900 },
  markAllText: { ...typography.body, color: colors.momentum },
  
  unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.momentum + '15', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  unreadText: { ...typography.bodyBold, color: colors.momentum },
  
  filterScroll: { backgroundColor: colors.background, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate200, maxHeight: 52 },
  filterTab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.slate100, borderRadius: borderRadius.full, marginEnd: spacing.sm, height: 36, alignItems: 'center', justifyContent: 'center' },
  filterTabActive: { backgroundColor: colors.momentum },
  filterText: { ...typography.bodyBold, color: colors.slate700, fontSize: 14, textAlign: 'center' },
  filterTextActive: { color: colors.background },
  
  content: { flex: 1 },
  
  notificationCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.background, padding: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: borderRadius.lg, ...shadows.sm },
  notificationCardUnread: { backgroundColor: colors.momentum + '08', borderStartWidth: 4, borderStartColor: colors.momentum },
  
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  
  notificationContent: { flex: 1 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  notificationTitle: { ...typography.bodyBold, color: colors.slate900, flex: 1 },
  notificationTitleUnread: { color: colors.momentum },
  unreadDot: { width: 8, height: 8, backgroundColor: colors.momentum, borderRadius: 4 },
  notificationMessage: { ...typography.body, color: colors.slate700, lineHeight: 20, marginBottom: spacing.sm },
  notificationTime: { ...typography.caption, color: colors.slate500 },
  
  actionIndicator: { backgroundColor: colors.momentum + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  actionText: { ...typography.caption, color: colors.momentum, fontWeight: '700' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 3 },
  emptyTitle: { ...typography.h3, color: colors.slate700, marginTop: spacing.lg },
  emptyText: { ...typography.body, color: colors.slate500, marginTop: spacing.xs },
  
  settingsLink: { backgroundColor: colors.background, padding: spacing.lg, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.slate200 },
  settingsText: { ...typography.bodyBold, color: colors.momentum },
});
