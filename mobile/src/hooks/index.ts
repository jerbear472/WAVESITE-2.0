// Signal hooks
export {
  useSignals,
  useSignal,
  useTopSignals,
  useTodaySignals,
  useUpcomingMainstream,
  useHighConfidenceSignals,
  useSignalSearch,
  usePrefetchSignal,
  signalKeys,
} from './useSignals';

// Forecast hooks
export {
  useAccuracy,
  useAccuracyByCategory,
  useAccuracyByPlatform,
  useAccuracyHistory,
  useSignalHistory,
  useDashboardMetrics,
  useDataDepth,
  useHitRate,
  useMeanAbsoluteError,
  forecastKeys,
} from './useForecast';

// Alert hooks
export {
  useAlerts,
  useAlert,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useToggleAlert,
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationSubscription,
  alertKeys,
} from './useAlerts';
