import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { alertService } from '../services';
import type { Alert, AlertConfig, AlertType, AlertChannel, AlertNotification } from '../types';

// Query keys
export const alertKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
  detail: (id: string) => [...alertKeys.all, 'detail', id] as const,
  notifications: (unreadOnly?: boolean) => [...alertKeys.all, 'notifications', unreadOnly] as const,
  unreadCount: () => [...alertKeys.all, 'unread-count'] as const,
};

/**
 * Fetch all alerts for the current user
 */
export function useAlerts() {
  return useQuery({
    queryKey: alertKeys.lists(),
    queryFn: () => alertService.getAlerts(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch a single alert
 */
export function useAlert(alertId: string) {
  return useQuery({
    queryKey: alertKeys.detail(alertId),
    queryFn: () => alertService.getAlert(alertId),
    enabled: !!alertId,
  });
}

/**
 * Create a new alert
 */
export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      type,
      config,
      channels,
    }: {
      name: string;
      type: AlertType;
      config: AlertConfig;
      channels: AlertChannel[];
    }) => alertService.createAlert(name, type, config, channels),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

/**
 * Update an alert
 */
export function useUpdateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      alertId,
      updates,
    }: {
      alertId: string;
      updates: Partial<Pick<Alert, 'name' | 'config' | 'channels' | 'active'>>;
    }) => alertService.updateAlert(alertId, updates),
    onSuccess: (_, { alertId }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      queryClient.invalidateQueries({ queryKey: alertKeys.detail(alertId) });
    },
  });
}

/**
 * Delete an alert
 */
export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => alertService.deleteAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

/**
 * Toggle alert active state
 */
export function useToggleAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => alertService.toggleAlert(alertId),
    onSuccess: (_, alertId) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      queryClient.invalidateQueries({ queryKey: alertKeys.detail(alertId) });
    },
  });
}

/**
 * Fetch notifications
 */
export function useNotifications(unreadOnly: boolean = false, limit: number = 50) {
  return useQuery({
    queryKey: alertKeys.notifications(unreadOnly),
    queryFn: () => alertService.getNotifications(unreadOnly, limit),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: alertKeys.unreadCount(),
    queryFn: () => alertService.getUnreadCount(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => alertService.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: alertKeys.unreadCount() });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => alertService.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: alertKeys.unreadCount() });
    },
  });
}

/**
 * Subscribe to real-time notifications
 */
export function useNotificationSubscription(
  onNotification: (notification: AlertNotification) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = alertService.subscribeToNotifications((notification) => {
      onNotification(notification);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: alertKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: alertKeys.unreadCount() });
    });

    return unsubscribe;
  }, [onNotification, queryClient]);
}
