import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';
import {
  useAlerts,
  useNotifications,
  useUnreadCount,
  useToggleAlert,
  useDeleteAlert,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks';
import { Header, Button } from '../components';
import type { Alert as AlertType, AlertNotification } from '../types';

const { colors, spacing, borderRadius, typography } = designSystem;

type TabType = 'alerts' | 'notifications';

export default function AlertsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('alerts');

  // Alerts data
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts, isRefetching: alertsRefetching } = useAlerts();
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();

  // Notifications data
  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications, isRefetching: notificationsRefetching } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleToggleAlert = useCallback((alertId: string) => {
    toggleAlert.mutate(alertId);
  }, [toggleAlert]);

  const handleDeleteAlert = useCallback((alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAlert.mutate(alertId),
        },
      ]
    );
  }, [deleteAlert]);

  const handleMarkNotificationRead = useCallback((notificationId: string) => {
    markRead.mutate(notificationId);
  }, [markRead]);

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  const getAlertTypeIcon = (type: AlertType['type']) => {
    switch (type) {
      case 'threshold':
        return 'speedometer';
      case 'watchlist':
        return 'eye';
      case 'digest':
        return 'email-outline';
      default:
        return 'bell';
    }
  };

  const renderAlert = ({ item }: { item: AlertType }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={[styles.alertIcon, { backgroundColor: item.active ? `${colors.primary}20` : colors.surfaceLight }]}>
          <Icon
            name={getAlertTypeIcon(item.type)}
            size={20}
            color={item.active ? colors.primary : colors.text.tertiary}
          />
        </View>
        <View style={styles.alertInfo}>
          <Text style={styles.alertName}>{item.name}</Text>
          <Text style={styles.alertType}>{item.type}</Text>
        </View>
        <Switch
          value={item.active}
          onValueChange={() => handleToggleAlert(item.id)}
          trackColor={{ false: colors.surfaceLight, true: `${colors.primary}50` }}
          thumbColor={item.active ? colors.primary : colors.text.tertiary}
        />
      </View>
      <View style={styles.alertChannels}>
        {item.channels.map((channel) => (
          <View key={channel} style={styles.channelBadge}>
            <Icon
              name={channel === 'push' ? 'bell' : channel === 'email' ? 'email' : 'slack'}
              size={12}
              color={colors.text.secondary}
            />
            <Text style={styles.channelText}>{channel}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteAlert(item.id)}
      >
        <Icon name="delete-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  const renderNotification = ({ item }: { item: AlertNotification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.notificationUnread]}
      onPress={() => !item.read && handleMarkNotificationRead(item.id)}
    >
      {!item.read && <View style={styles.unreadDot} />}
      <View style={styles.notificationContent}>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const renderAlertsEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bell-off-outline" size={48} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No alerts configured</Text>
      <Text style={styles.emptySubtext}>
        Create alerts to get notified when signals meet your criteria
      </Text>
      <Button
        title="Create Alert"
        icon="plus"
        onPress={() => {}}
        size="medium"
      />
    </View>
  );

  const renderNotificationsEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="inbox-outline" size={48} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No notifications</Text>
      <Text style={styles.emptySubtext}>
        Notifications from your alerts will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Alerts"
        subtitle="Stay informed"
        rightIcon="plus"
        rightAction={() => {}}
      />

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.tabActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>
            My Alerts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            Notifications
          </Text>
          {(unreadCount || 0) > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'alerts' ? (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          ListEmptyComponent={alertsLoading ? null : renderAlertsEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={alertsRefetching}
              onRefresh={refetchAlerts}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <>
          {(unreadCount || 0) > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotification}
            ListEmptyComponent={notificationsLoading ? null : renderNotificationsEmpty}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={notificationsRefetching}
                onRefresh={refetchNotifications}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    ...typography.micro,
    color: colors.text.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  alertType: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },
  alertChannels: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  channelText: {
    ...typography.micro,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  deleteButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationUnread: {
    backgroundColor: `${colors.primary}10`,
    borderColor: colors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  notificationTime: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  markAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  markAllText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
