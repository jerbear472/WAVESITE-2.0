import notifee, { 
  AndroidImportance, 
  AndroidStyle,
  EventType,
  Notification,
  TimestampTrigger,
  RepeatFrequency,
  TriggerType
} from '@notifee/react-native';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { MMKV } from 'react-native-mmkv';
import { supabase } from '../config/supabase';

const storage = new MMKV();

interface LocalNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  android?: {
    channelId?: string;
    smallIcon?: string;
    color?: string;
    actions?: any[];
    style?: any;
  };
  ios?: {
    categoryId?: string;
    sound?: string;
    badge?: number;
  };
}

interface ScheduledNotification {
  id: string;
  notification: LocalNotification;
  trigger: TimestampTrigger;
}

export class NotificationManager {
  private static instance: NotificationManager;
  private notificationChannels = {
    trends: 'trends',
    validation: 'validation',
    earnings: 'earnings',
    streaks: 'streaks',
    social: 'social',
  };
  private fcmToken: string | null = null;

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Request permissions
      await this.requestPermissions();

      // Create notification channels (Android)
      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      }

      // Set up FCM
      await this.setupFCM();

      // Handle notification events
      this.setupNotificationHandlers();

      console.log('Notification manager initialized');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus >= 0;
    }
    return true;
  }

  private async createNotificationChannels(): Promise<void> {
    await notifee.createChannel({
      id: this.notificationChannels.trends,
      name: 'Trend Notifications',
      importance: AndroidImportance.HIGH,
      vibration: true,
      lights: true,
    });

    await notifee.createChannel({
      id: this.notificationChannels.validation,
      name: 'Validation Updates',
      importance: AndroidImportance.DEFAULT,
      vibration: true,
    });

    await notifee.createChannel({
      id: this.notificationChannels.earnings,
      name: 'Earnings Updates',
      importance: AndroidImportance.HIGH,
      vibration: true,
      lights: true,
    });

    await notifee.createChannel({
      id: this.notificationChannels.streaks,
      name: 'Streak Reminders',
      importance: AndroidImportance.HIGH,
      vibration: true,
    });

    await notifee.createChannel({
      id: this.notificationChannels.social,
      name: 'Social Updates',
      importance: AndroidImportance.DEFAULT,
    });
  }

  private async setupFCM(): Promise<void> {
    try {
      // Get FCM token
      const token = await messaging().getToken();
      this.fcmToken = token;
      
      // Save token to backend
      if (token) {
        await this.updateFCMToken(token);
      }

      // Listen for token updates
      messaging().onTokenRefresh(async (newToken) => {
        this.fcmToken = newToken;
        await this.updateFCMToken(newToken);
      });

      // Handle background messages
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('Background message:', remoteMessage);
        await this.handleRemoteNotification(remoteMessage);
      });

      // Handle foreground messages
      messaging().onMessage(async (remoteMessage) => {
        console.log('Foreground message:', remoteMessage);
        await this.handleRemoteNotification(remoteMessage);
      });
    } catch (error) {
      console.error('FCM setup error:', error);
    }
  }

  private async updateFCMToken(token: string): Promise<void> {
    try {
      const userId = storage.getString('user_id');
      if (userId) {
        await supabase
          .from('user_devices')
          .upsert({
            user_id: userId,
            fcm_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Failed to update FCM token:', error);
    }
  }

  private setupNotificationHandlers(): void {
    notifee.onForegroundEvent(({ type, detail }) => {
      switch (type) {
        case EventType.DISMISSED:
          console.log('Notification dismissed:', detail.notification);
          break;
        case EventType.PRESS:
          console.log('Notification pressed:', detail.notification);
          this.handleNotificationPress(detail.notification);
          break;
        case EventType.ACTION_PRESS:
          console.log('Action pressed:', detail.pressAction);
          this.handleActionPress(detail.notification, detail.pressAction);
          break;
      }
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        await this.handleNotificationPress(detail.notification);
      }
    });
  }

  private handleNotificationPress(notification: Notification | undefined): void {
    if (!notification?.data) return;

    const { type, ...data } = notification.data;

    switch (type) {
      case 'trend':
        // Navigate to trend details
        // NavigationService.navigate('TrendDetails', { trendId: data.trendId });
        break;
      case 'validation':
        // Navigate to validation screen
        // NavigationService.navigate('Validation');
        break;
      case 'earnings':
        // Navigate to earnings dashboard
        // NavigationService.navigate('Earnings');
        break;
    }
  }

  private handleActionPress(notification: Notification | undefined, action: any): void {
    if (!notification?.data || !action) return;

    console.log('Handling action:', action.id, 'for notification:', notification.id);
    
    // Handle specific actions
    switch (action.id) {
      case 'validate_now':
        // NavigationService.navigate('Validation');
        break;
      case 'view_trend':
        // NavigationService.navigate('TrendDetails', { trendId: notification.data.trendId });
        break;
    }
  }

  private async handleRemoteNotification(remoteMessage: any): Promise<void> {
    const { notification, data } = remoteMessage;

    if (notification) {
      await this.showLocalNotification({
        title: notification.title || 'WaveSight',
        body: notification.body || '',
        data,
      });
    }
  }

  // Public methods
  async showLocalNotification(notification: LocalNotification): Promise<string> {
    const notificationId = await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      data: notification.data,
      android: {
        channelId: notification.android?.channelId || this.notificationChannels.trends,
        smallIcon: notification.android?.smallIcon || 'ic_notification',
        color: notification.android?.color || '#007AFF',
        pressAction: {
          id: 'default',
        },
        ...notification.android,
      },
      ios: {
        ...notification.ios,
      },
    });

    return notificationId;
  }

  async showTrendNotification(trend: any): Promise<void> {
    await this.showLocalNotification({
      title: '🎯 New Trend Captured!',
      body: `"${trend.title}" has been added to your timeline`,
      data: {
        type: 'trend',
        trendId: trend.id,
      },
      android: {
        channelId: this.notificationChannels.trends,
        style: {
          type: AndroidStyle.BIGTEXT,
          text: trend.description || trend.title,
        },
        actions: [
          {
            title: 'View Trend',
            pressAction: { id: 'view_trend' },
          },
        ],
      },
    });
  }

  async showValidationReminder(pendingCount: number): Promise<void> {
    await this.showLocalNotification({
      title: '🔍 Trends Need Validation',
      body: `You have ${pendingCount} trends waiting for your validation`,
      data: {
        type: 'validation',
        pendingCount,
      },
      android: {
        channelId: this.notificationChannels.validation,
        actions: [
          {
            title: 'Validate Now',
            pressAction: { id: 'validate_now' },
          },
        ],
      },
    });
  }

  async showEarningsUpdate(earnings: number, period: string = 'today'): Promise<void> {
    await this.showLocalNotification({
      title: '💰 Earnings Update',
      body: `You earned $${earnings.toFixed(2)} ${period}!`,
      data: {
        type: 'earnings',
        amount: earnings,
        period,
      },
      android: {
        channelId: this.notificationChannels.earnings,
      },
    });
  }

  async showStreakReminder(currentStreak: number): Promise<void> {
    await this.showLocalNotification({
      title: '🔥 Keep Your Streak Alive!',
      body: `You're on a ${currentStreak} day streak. Don't break it!`,
      data: {
        type: 'streak',
        currentStreak,
      },
      android: {
        channelId: this.notificationChannels.streaks,
      },
    });
  }

  // Scheduled notifications
  async scheduleNotification(notification: LocalNotification, date: Date): Promise<string> {
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        android: {
          channelId: notification.android?.channelId || this.notificationChannels.trends,
          ...notification.android,
        },
        ios: notification.ios,
      },
      trigger
    );

    // Store scheduled notification
    const scheduled: ScheduledNotification = {
      id: notificationId,
      notification,
      trigger,
    };
    
    await this.saveScheduledNotification(scheduled);

    return notificationId;
  }

  async scheduleDailyStreakReminder(hour: number = 20, minute: number = 0): Promise<void> {
    // Cancel existing reminder
    await this.cancelNotification('daily_streak_reminder');

    // Schedule new reminder
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hour, minute, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    await this.scheduleNotification(
      {
        title: '🔥 Streak Reminder',
        body: 'Time to keep your streak alive!',
        data: { type: 'streak_reminder' },
      },
      reminderTime
    );
  }

  async scheduleWeeklyRecap(): Promise<void> {
    // Schedule for Sunday at 6 PM
    const now = new Date();
    const sunday = new Date();
    sunday.setDate(sunday.getDate() + (7 - sunday.getDay()));
    sunday.setHours(18, 0, 0, 0);

    await this.scheduleNotification(
      {
        title: '📊 Your Weekly Recap',
        body: 'Check out your trending discoveries this week!',
        data: { type: 'weekly_recap' },
      },
      sunday
    );
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await notifee.cancelNotification(notificationId);
    await this.removeScheduledNotification(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await notifee.cancelAllNotifications();
    storage.delete('scheduled_notifications');
  }

  // Rich notifications
  async showRichTrendNotification(trend: any, imageUrl?: string): Promise<void> {
    const notification: LocalNotification = {
      title: `🚀 ${trend.platform} Trend Alert`,
      body: trend.title,
      data: {
        type: 'trend',
        trendId: trend.id,
      },
      android: {
        channelId: this.notificationChannels.trends,
        style: {
          type: AndroidStyle.BIGPICTURE,
          picture: imageUrl,
          title: trend.title,
          summary: trend.description,
        },
        actions: [
          {
            title: '👍 Validate',
            pressAction: { id: 'validate' },
          },
          {
            title: '📊 View Stats',
            pressAction: { id: 'view_stats' },
          },
        ],
      },
    };

    await this.showLocalNotification(notification);
  }

  // Group notifications
  async showGroupedNotifications(notifications: LocalNotification[]): Promise<void> {
    const groupId = 'trend_group';
    
    // Display individual notifications
    for (const notification of notifications) {
      await notifee.displayNotification({
        ...notification,
        android: {
          ...notification.android,
          groupId,
        },
      });
    }

    // Display summary notification
    await notifee.displayNotification({
      title: 'WaveSight',
      body: `${notifications.length} new updates`,
      android: {
        channelId: this.notificationChannels.trends,
        groupId,
        groupSummary: true,
        groupAlertBehavior: 1,
      },
    });
  }

  // Badge management (iOS)
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(count);
    }
  }

  async incrementBadgeCount(): Promise<void> {
    if (Platform.OS === 'ios') {
      const current = await notifee.getBadgeCount();
      await notifee.setBadgeCount(current + 1);
    }
  }

  async clearBadgeCount(): Promise<void> {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(0);
    }
  }

  // Storage helpers
  private async saveScheduledNotification(scheduled: ScheduledNotification): Promise<void> {
    const existing = storage.getString('scheduled_notifications');
    const notifications = existing ? JSON.parse(existing) : [];
    notifications.push(scheduled);
    storage.set('scheduled_notifications', JSON.stringify(notifications));
  }

  private async removeScheduledNotification(notificationId: string): Promise<void> {
    const existing = storage.getString('scheduled_notifications');
    if (existing) {
      const notifications = JSON.parse(existing);
      const filtered = notifications.filter((n: ScheduledNotification) => n.id !== notificationId);
      storage.set('scheduled_notifications', JSON.stringify(filtered));
    }
  }

  async checkPendingNotifications(): Promise<void> {
    const notifications = await notifee.getTriggerNotifications();
    console.log('Pending notifications:', notifications.length);
  }
}

export default NotificationManager.getInstance();