import { supabase } from './supabase';

export interface DailyNotificationSchedule {
  userId: string;
  enabled: boolean;
  preferredTime?: string; // HH:MM format
  timezone?: string;
  lastNotificationDate?: string;
  streakDays: number;
}

export class NotificationService {
  private static instance: NotificationService;
  private notificationInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async scheduleDailyNotification(userId: string): Promise<void> {
    // Store user preference in database
    try {
      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          daily_trend_enabled: true,
          updated_at: new Date().toISOString()
        });

      // Set up local notification scheduling
      this.startNotificationScheduler(userId);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  private startNotificationScheduler(userId: string): void {
    // Clear any existing interval
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }

    // Check every hour if it's time to send notification
    this.notificationInterval = setInterval(() => {
      this.checkAndSendNotification(userId);
    }, 60 * 60 * 1000); // Every hour

    // Also check immediately
    this.checkAndSendNotification(userId);
  }

  private async checkAndSendNotification(userId: string): Promise<void> {
    const now = new Date();
    const hours = now.getHours();

    // Only send notifications between 10am and 6pm
    if (hours < 10 || hours > 18) return;

    // Check if we already sent a notification today
    const lastNotificationKey = `last_notification_${userId}_${now.toDateString()}`;
    if (localStorage.getItem(lastNotificationKey)) return;

    // Random chance to send notification (higher during peak hours)
    const peakHours = hours >= 12 && hours <= 15;
    const chance = peakHours ? 0.3 : 0.15;
    
    if (Math.random() > chance) return;

    // Check if user has already submitted today
    const hasSubmitted = await this.checkTodaySubmission(userId);
    if (hasSubmitted) return;

    // Send the notification
    this.sendBrowserNotification();
    localStorage.setItem(lastNotificationKey, 'true');
  }

  private async checkTodaySubmission(userId: string): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('trend_submissions')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .limit(1);

      return !!data && data.length > 0;
    } catch (error) {
      console.error('Error checking submission:', error);
      return false;
    }
  }

  private sendBrowserNotification(): void {
    if (Notification.permission !== 'granted') return;

    const notificationOptions: NotificationOptions & { actions?: any[] } = {
      body: 'Spot today\'s trend for 500 XP! Limited time bonus available now.',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'daily-trend',
      requireInteraction: true,
      actions: [
        { action: 'spot', title: 'Spot Trend' },
        { action: 'dismiss', title: 'Later' }
      ]
    };

    const notification = new Notification('🔥 Daily Trend Alert!', notificationOptions);

    notification.onclick = () => {
      window.focus();
      window.location.href = '/spot';
      notification.close();
    };

    // Auto close after 2 minutes
    setTimeout(() => notification.close(), 120000);
  }

  async getNotificationPreferences(userId: string): Promise<DailyNotificationSchedule | null> {
    try {
      const { data } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!data) return null;

      return {
        userId: data.user_id,
        enabled: data.daily_trend_enabled || false,
        preferredTime: data.preferred_time,
        timezone: data.timezone,
        lastNotificationDate: data.last_notification_date,
        streakDays: data.streak_days || 0
      };
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<DailyNotificationSchedule>
  ): Promise<void> {
    try {
      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          daily_trend_enabled: preferences.enabled,
          preferred_time: preferences.preferredTime,
          timezone: preferences.timezone,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }

  stopNotifications(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }
}

export const notificationService = NotificationService.getInstance();