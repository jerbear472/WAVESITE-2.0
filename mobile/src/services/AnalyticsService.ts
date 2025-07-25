import { MMKV } from 'react-native-mmkv';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

const storage = new MMKV();

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface UserProperties {
  userId: string;
  platform: string;
  appVersion: string;
  deviceModel: string;
  osVersion: string;
  firstSeen: number;
  lastSeen: number;
  sessionCount: number;
  totalEvents: number;
  customProperties?: Record<string, any>;
}

interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  eventCount: number;
  screens: string[];
  duration?: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private currentSession: Session | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private userProperties: UserProperties | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load stored user properties
      await this.loadUserProperties();

      // Start a new session
      this.startSession();

      // Set up batch processing
      this.startBatchProcessing();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  // Core tracking methods
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.isInitialized) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        ...this.getDefaultProperties(),
      },
      timestamp: Date.now(),
      sessionId: this.currentSession?.id || '',
      userId: this.userProperties?.userId,
    };

    this.eventQueue.push(event);
    
    if (this.currentSession) {
      this.currentSession.eventCount++;
    }

    // Log in development
    if (__DEV__) {
      console.log('[Analytics]', eventName, properties);
    }

    // Trigger batch send if queue is large
    if (this.eventQueue.length >= 20) {
      this.sendBatch();
    }
  }

  trackScreen(screenName: string, properties?: Record<string, any>): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });

    if (this.currentSession && !this.currentSession.screens.includes(screenName)) {
      this.currentSession.screens.push(screenName);
    }
  }

  trackTiming(category: string, variable: string, time: number): void {
    this.trackEvent('timing', {
      timing_category: category,
      timing_variable: variable,
      timing_value: time,
    });
  }

  trackError(error: Error, fatal: boolean = false): void {
    this.trackEvent('error', {
      error_message: error.message,
      error_stack: error.stack,
      error_fatal: fatal,
    });
  }

  // User management
  async setUserId(userId: string): Promise<void> {
    if (!this.userProperties) {
      this.userProperties = await this.createUserProperties();
    }

    this.userProperties.userId = userId;
    await this.saveUserProperties();
  }

  setUserProperty(key: string, value: any): void {
    if (!this.userProperties) return;

    if (!this.userProperties.customProperties) {
      this.userProperties.customProperties = {};
    }

    this.userProperties.customProperties[key] = value;
    this.saveUserProperties();
  }

  // Session management
  private startSession(): void {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      eventCount: 0,
      screens: [],
    };

    this.trackEvent('session_start');
  }

  endSession(): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

    this.trackEvent('session_end', {
      session_duration: this.currentSession.duration,
      event_count: this.currentSession.eventCount,
      screens_viewed: this.currentSession.screens.length,
    });

    // Update user properties
    if (this.userProperties) {
      this.userProperties.sessionCount++;
      this.userProperties.lastSeen = Date.now();
      this.saveUserProperties();
    }

    // Send any remaining events
    this.sendBatch();

    this.currentSession = null;
  }

  // Trend-specific analytics
  trackTrendCapture(trend: any): void {
    this.trackEvent('trend_captured', {
      platform: trend.platform,
      has_ai_insights: !!trend.aiInsights,
      viral_probability: trend.viralProbability,
      category: trend.category,
      capture_method: trend.captureMethod || 'manual',
    });
  }

  trackValidation(validation: any): void {
    this.trackEvent('trend_validated', {
      vote: validation.vote,
      time_to_validate: validation.timeToValidate,
      streak_count: validation.streakCount,
    });
  }

  trackEarnings(earnings: any): void {
    this.trackEvent('earnings_updated', {
      session_earnings: earnings.sessionEarnings,
      total_earnings: earnings.totalEarnings,
      session_duration: earnings.sessionDuration,
      trends_logged: earnings.trendsLogged,
    });
  }

  // Engagement metrics
  trackEngagement(action: string, target: string, value?: any): void {
    this.trackEvent('user_engagement', {
      action,
      target,
      value,
    });
  }

  // Funnel tracking
  trackFunnelStep(funnelName: string, step: number, stepName: string): void {
    this.trackEvent('funnel_step', {
      funnel_name: funnelName,
      step_number: step,
      step_name: stepName,
    });
  }

  // A/B testing
  trackExperiment(experimentName: string, variant: string): void {
    this.trackEvent('experiment_exposure', {
      experiment_name: experimentName,
      variant,
    });

    // Store experiment participation
    storage.set(`experiment_${experimentName}`, variant);
  }

  getExperimentVariant(experimentName: string): string | null {
    return storage.getString(`experiment_${experimentName}`) || null;
  }

  // Revenue tracking
  trackRevenue(amount: number, currency: string = 'USD', source: string): void {
    this.trackEvent('revenue', {
      revenue_amount: amount,
      revenue_currency: currency,
      revenue_source: source,
    });
  }

  // Performance tracking
  trackPerformance(metric: string, value: number, metadata?: Record<string, any>): void {
    this.trackEvent('performance_metric', {
      metric_name: metric,
      metric_value: value,
      ...metadata,
    });
  }

  // Private methods
  private async createUserProperties(): Promise<UserProperties> {
    const deviceId = await DeviceInfo.getUniqueId();
    
    return {
      userId: deviceId,
      platform: Platform.OS,
      appVersion: DeviceInfo.getVersion(),
      deviceModel: DeviceInfo.getModel(),
      osVersion: DeviceInfo.getSystemVersion(),
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      sessionCount: 1,
      totalEvents: 0,
    };
  }

  private async loadUserProperties(): Promise<void> {
    try {
      const stored = storage.getString('analytics_user_properties');
      if (stored) {
        this.userProperties = JSON.parse(stored);
      } else {
        this.userProperties = await this.createUserProperties();
        await this.saveUserProperties();
      }
    } catch (error) {
      console.error('Failed to load user properties:', error);
      this.userProperties = await this.createUserProperties();
    }
  }

  private async saveUserProperties(): Promise<void> {
    if (!this.userProperties) return;

    try {
      storage.set('analytics_user_properties', JSON.stringify(this.userProperties));
    } catch (error) {
      console.error('Failed to save user properties:', error);
    }
  }

  private getDefaultProperties(): Record<string, any> {
    return {
      platform: Platform.OS,
      app_version: DeviceInfo.getVersion(),
      device_model: DeviceInfo.getModel(),
      os_version: DeviceInfo.getSystemVersion(),
      screen_width: DeviceInfo.getDeviceWidth(),
      screen_height: DeviceInfo.getDeviceHeight(),
      is_tablet: DeviceInfo.isTablet(),
      timezone: new Date().getTimezoneOffset(),
    };
  }

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startBatchProcessing(): void {
    // Send events every 30 seconds
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.sendBatch();
      }
    }, 30000);
  }

  private async sendBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Update total events count
      if (this.userProperties) {
        this.userProperties.totalEvents += batch.length;
      }

      // Send to backend
      const { error } = await supabase
        .from('analytics_events')
        .insert(batch.map(event => ({
          event_name: event.name,
          event_properties: event.properties,
          timestamp: new Date(event.timestamp).toISOString(),
          session_id: event.sessionId,
          user_id: event.userId,
        })));

      if (error) {
        console.error('Failed to send analytics batch:', error);
        // Re-queue events on failure
        this.eventQueue.unshift(...batch);
      }
    } catch (error) {
      console.error('Failed to send analytics batch:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...batch);
    }
  }

  // Reports
  async generateReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .eq('user_id', this.userProperties?.userId);

      if (error) throw error;

      // Process data for report
      const report = {
        totalEvents: data.length,
        uniqueScreens: new Set(data.filter(e => e.event_name === 'screen_view').map(e => e.event_properties.screen_name)).size,
        totalSessions: new Set(data.map(e => e.session_id)).size,
        eventBreakdown: this.groupByEventName(data),
        screenFlow: this.analyzeScreenFlow(data),
      };

      return report;
    } catch (error) {
      console.error('Failed to generate report:', error);
      return null;
    }
  }

  private groupByEventName(events: any[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.event_name] = (acc[event.event_name] || 0) + 1;
      return acc;
    }, {});
  }

  private analyzeScreenFlow(events: any[]): any[] {
    const screenEvents = events
      .filter(e => e.event_name === 'screen_view')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const flows: any[] = [];
    for (let i = 0; i < screenEvents.length - 1; i++) {
      flows.push({
        from: screenEvents[i].event_properties.screen_name,
        to: screenEvents[i + 1].event_properties.screen_name,
      });
    }

    return flows;
  }

  // Cleanup
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.endSession();
  }
}

export default AnalyticsService.getInstance();