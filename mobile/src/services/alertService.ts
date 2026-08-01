import { supabase } from '../config/supabase';
import type {
  Alert,
  AlertConfig,
  AlertType,
  AlertChannel,
  AlertNotification,
} from '../types';

class AlertService {
  /**
   * Get all alerts for the current user
   */
  async getAlerts(): Promise<Alert[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getAlerts error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get a single alert by ID
   */
  async getAlert(alertId: string): Promise<Alert | null> {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (error) {
      console.error('getAlert error:', error);
      return null;
    }

    return data;
  }

  /**
   * Create a new alert
   */
  async createAlert(
    name: string,
    type: AlertType,
    config: AlertConfig,
    channels: AlertChannel[]
  ): Promise<Alert | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        name,
        type,
        config,
        channels,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('createAlert error:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update an existing alert
   */
  async updateAlert(
    alertId: string,
    updates: Partial<Pick<Alert, 'name' | 'config' | 'channels' | 'active'>>
  ): Promise<Alert | null> {
    const { data, error } = await supabase
      .from('alerts')
      .update(updates)
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('updateAlert error:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      console.error('deleteAlert error:', error);
      throw error;
    }
  }

  /**
   * Toggle alert active state
   */
  async toggleAlert(alertId: string): Promise<boolean> {
    const alert = await this.getAlert(alertId);
    if (!alert) throw new Error('Alert not found');

    const { data, error } = await supabase
      .from('alerts')
      .update({ active: !alert.active })
      .eq('id', alertId)
      .select('active')
      .single();

    if (error) {
      console.error('toggleAlert error:', error);
      throw error;
    }

    return data?.active || false;
  }

  /**
   * Get alert notifications
   */
  async getNotifications(
    unreadOnly: boolean = false,
    limit: number = 50
  ): Promise<AlertNotification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('alert_notifications')
      .select('*, alert:alerts!inner(user_id)')
      .eq('alerts.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getNotifications error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('alert_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('markNotificationRead error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .rpc('mark_all_notifications_read', { p_user_id: user.id });

    if (error) {
      console.error('markAllNotificationsRead error:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('alert_notifications')
      .select('*, alert:alerts!inner(user_id)', { count: 'exact', head: true })
      .eq('alerts.user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('getUnreadCount error:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    callback: (notification: AlertNotification) => void
  ): () => void {
    const subscription = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_notifications',
        },
        (payload) => {
          callback(payload.new as AlertNotification);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Create a threshold alert (shorthand)
   */
  async createThresholdAlert(
    name: string,
    momentumThreshold: number,
    channels: AlertChannel[] = ['push']
  ): Promise<Alert | null> {
    return this.createAlert(
      name,
      'threshold',
      { momentum_threshold: momentumThreshold },
      channels
    );
  }

  /**
   * Create a watchlist alert (shorthand)
   */
  async createWatchlistAlert(
    name: string,
    signalIds: string[],
    channels: AlertChannel[] = ['push']
  ): Promise<Alert | null> {
    return this.createAlert(
      name,
      'watchlist',
      { signal_ids: signalIds },
      channels
    );
  }

  /**
   * Create a digest alert (shorthand)
   */
  async createDigestAlert(
    name: string,
    frequency: 'daily' | 'weekly',
    hourOfDay: number = 9,
    channels: AlertChannel[] = ['email']
  ): Promise<Alert | null> {
    return this.createAlert(
      name,
      'digest',
      {
        frequency,
        hour_of_day: hourOfDay,
        day_of_week: frequency === 'weekly' ? 1 : undefined, // Monday for weekly
      },
      channels
    );
  }
}

export default new AlertService();
