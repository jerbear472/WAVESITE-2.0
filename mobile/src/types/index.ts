// ============================================
// WAVESIGHT 2.0 - ENTERPRISE SIGNAL INFRASTRUCTURE
// ============================================

// Platform types
export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'twitter';

// Signal types - what kind of trend pattern
export type SignalType = 'audio' | 'visual' | 'hashtag' | 'format' | 'creator';

// Category for organizing signals
export type SignalCategory =
  | 'music'
  | 'fashion'
  | 'food'
  | 'fitness'
  | 'beauty'
  | 'tech'
  | 'entertainment'
  | 'lifestyle'
  | 'other';

// Confidence levels for forecasts
export type ConfidenceLevel = 'low' | 'medium' | 'high';

// Time periods for analytics
export type TimePeriod = '7d' | '14d' | '30d' | '90d' | 'all';

// Alert types
export type AlertType = 'threshold' | 'watchlist' | 'digest';

// Alert channels
export type AlertChannel = 'push' | 'email' | 'slack';

// ============================================
// CORE ENTITIES
// ============================================

export interface Signal {
  id: string;

  // Identification
  platform: Platform;
  signal_type: SignalType;
  category: SignalCategory;
  identifier: string; // sound ID, hashtag, visual pattern ID, etc.
  name: string; // Human readable name
  thumbnail_url: string | null;
  source_url: string | null;

  // Current Metrics
  current_volume: number; // Current usage count
  velocity: number; // Growth rate (% change)
  acceleration: number; // Change in velocity
  momentum_score: number; // 0-100 composite score

  // Forecast
  forecast_mainstream_days: number | null; // Days until mainstream
  forecast_confidence: ConfidenceLevel;
  forecast_peak_volume: number | null;

  // Historical Context
  category_baseline_multiple: number; // e.g., 2.3x = 230% of baseline
  days_since_detection: number;

  // Timestamps
  detected_at: string;
  last_updated: string;

  // Outcome tracking (for accuracy measurement)
  outcome?: SignalOutcome;
}

export interface SignalOutcome {
  reached_mainstream: boolean;
  days_to_mainstream: number | null;
  peak_volume_achieved: number;
  forecast_accuracy_percentage: number; // How accurate was the prediction
  measured_at: string;
}

// ============================================
// FORECAST ACCURACY
// ============================================

export interface ForecastAccuracy {
  period: TimePeriod;
  total_predictions: number;
  accurate_predictions: number;
  accuracy_percentage: number;
  mean_absolute_error_days: number; // Average days off in prediction

  // Breakdowns
  by_category: Record<SignalCategory, CategoryAccuracy>;
  by_platform: Record<Platform, number>;
  by_confidence_level: Record<ConfidenceLevel, number>;
  by_time_horizon: Record<TimePeriod, number>;
}

export interface CategoryAccuracy {
  accuracy_percentage: number;
  total_predictions: number;
  accurate_predictions: number;
}

// ============================================
// ALERTS
// ============================================

export interface Alert {
  id: string;
  user_id: string;
  name: string;
  type: AlertType;
  config: AlertConfig;
  channels: AlertChannel[];
  active: boolean;
  created_at: string;
  last_triggered: string | null;
}

export interface AlertConfig {
  // Threshold alerts
  momentum_threshold?: number; // Trigger when signal exceeds this score
  velocity_threshold?: number;

  // Watchlist alerts
  signal_ids?: string[]; // Specific signals to watch
  categories?: SignalCategory[];
  platforms?: Platform[];

  // Digest settings
  frequency?: 'daily' | 'weekly';
  day_of_week?: number; // 0-6 for weekly
  hour_of_day?: number; // 0-23
}

export interface AlertNotification {
  id: string;
  alert_id: string;
  signal_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ============================================
// USER & AUTH
// ============================================

export interface User {
  id: string;
  email: string;
  organization_name: string | null;
  role: 'admin' | 'analyst' | 'viewer';
  created_at: string;

  // Subscription/tier info
  tier: 'starter' | 'professional' | 'enterprise';
  api_access: boolean;
}

export interface UserPreferences {
  user_id: string;
  default_platforms: Platform[];
  default_categories: SignalCategory[];
  notification_settings: {
    push_enabled: boolean;
    email_enabled: boolean;
    digest_frequency: 'daily' | 'weekly' | 'none';
  };
  display_settings: {
    compact_view: boolean;
    show_forecasts: boolean;
    default_time_period: TimePeriod;
  };
}

// ============================================
// HISTORICAL DATA
// ============================================

export interface HistoricalDataPoint {
  date: string;
  volume: number;
  velocity: number;
  momentum_score: number;
}

export interface SignalHistory {
  signal_id: string;
  data_points: HistoricalDataPoint[];
  first_detected: string;
  peak_date: string | null;
  peak_volume: number | null;
}

// ============================================
// DASHBOARD METRICS
// ============================================

export interface DashboardMetrics {
  active_signals_count: number;
  signals_detected_today: number;
  average_accuracy_7d: number;
  average_accuracy_30d: number;
  top_performing_category: SignalCategory;
  data_depth_months: number; // How many months of historical data
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface SignalFilters {
  platforms?: Platform[];
  categories?: SignalCategory[];
  signal_types?: SignalType[];
  min_momentum?: number;
  max_forecast_days?: number;
  confidence_levels?: ConfidenceLevel[];
  detected_after?: string;
  detected_before?: string;
}

export interface SignalSortOptions {
  field: 'momentum_score' | 'velocity' | 'detected_at' | 'forecast_mainstream_days';
  direction: 'asc' | 'desc';
}
