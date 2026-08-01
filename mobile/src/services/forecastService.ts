import { supabase } from '../config/supabase';
import type {
  ForecastAccuracy,
  TimePeriod,
  SignalCategory,
  Platform,
  ConfidenceLevel,
  SignalHistory,
  HistoricalDataPoint,
  DashboardMetrics,
} from '../types';

class ForecastService {
  /**
   * Get overall forecast accuracy for a time period
   */
  async getAccuracy(period: TimePeriod = '30d'): Promise<ForecastAccuracy | null> {
    const { data, error } = await supabase
      .rpc('get_forecast_accuracy', { p_period: period });

    if (error) {
      console.error('getAccuracy error:', error);
      return null;
    }

    return data;
  }

  /**
   * Get accuracy breakdown by category
   */
  async getAccuracyByCategory(period: TimePeriod = '30d'): Promise<Record<SignalCategory, number>> {
    const { data, error } = await supabase
      .rpc('get_accuracy_by_category', { p_period: period });

    if (error) {
      console.error('getAccuracyByCategory error:', error);
      return {} as Record<SignalCategory, number>;
    }

    return data || {};
  }

  /**
   * Get accuracy breakdown by platform
   */
  async getAccuracyByPlatform(period: TimePeriod = '30d'): Promise<Record<Platform, number>> {
    const { data, error } = await supabase
      .rpc('get_accuracy_by_platform', { p_period: period });

    if (error) {
      console.error('getAccuracyByPlatform error:', error);
      return {} as Record<Platform, number>;
    }

    return data || {};
  }

  /**
   * Get accuracy over time (for charting)
   */
  async getAccuracyHistory(
    startDate: string,
    endDate: string,
    granularity: 'day' | 'week' | 'month' = 'week'
  ): Promise<{ date: string; accuracy: number; predictions: number }[]> {
    const { data, error } = await supabase
      .rpc('get_accuracy_history', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_granularity: granularity,
      });

    if (error) {
      console.error('getAccuracyHistory error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get signal historical data points
   */
  async getSignalHistory(signalId: string): Promise<SignalHistory | null> {
    const { data, error } = await supabase
      .from('signal_history')
      .select('*')
      .eq('signal_id', signalId)
      .order('date', { ascending: true });

    if (error) {
      console.error('getSignalHistory error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Find peak
    const peakPoint = data.reduce((max, point) =>
      point.volume > max.volume ? point : max, data[0]
    );

    return {
      signal_id: signalId,
      data_points: data as HistoricalDataPoint[],
      first_detected: data[0].date,
      peak_date: peakPoint.date,
      peak_volume: peakPoint.volume,
    };
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics | null> {
    const { data, error } = await supabase
      .rpc('get_dashboard_metrics');

    if (error) {
      console.error('getDashboardMetrics error:', error);
      return null;
    }

    return data;
  }

  /**
   * Get data depth (how many months of historical data)
   */
  async getDataDepth(): Promise<number> {
    const { data, error } = await supabase
      .from('signals')
      .select('detected_at')
      .order('detected_at', { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 0;
    }

    const firstDate = new Date(data[0].detected_at);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - firstDate.getFullYear()) * 12 +
      (now.getMonth() - firstDate.getMonth());

    return monthsDiff;
  }

  /**
   * Get signals that have completed their forecast period (for accuracy validation)
   */
  async getCompletedForecasts(limit: number = 50): Promise<{
    signal_id: string;
    predicted_days: number;
    actual_days: number | null;
    accuracy: number;
    hit: boolean;
  }[]> {
    const { data, error } = await supabase
      .rpc('get_completed_forecasts', { p_limit: limit });

    if (error) {
      console.error('getCompletedForecasts error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get mean absolute error for predictions
   */
  async getMeanAbsoluteError(period: TimePeriod = '30d'): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_mean_absolute_error', { p_period: period });

    if (error) {
      console.error('getMeanAbsoluteError error:', error);
      return 0;
    }

    return data || 0;
  }

  /**
   * Get hit rate (% of signals that reached mainstream as predicted)
   */
  async getHitRate(
    period: TimePeriod = '30d',
    tolerance: number = 7 // Days tolerance for "hit"
  ): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_hit_rate', {
        p_period: period,
        p_tolerance: tolerance,
      });

    if (error) {
      console.error('getHitRate error:', error);
      return 0;
    }

    return data || 0;
  }

  /**
   * Get accuracy by confidence level
   */
  async getAccuracyByConfidence(
    period: TimePeriod = '30d'
  ): Promise<Record<ConfidenceLevel, { accuracy: number; count: number }>> {
    const { data, error } = await supabase
      .rpc('get_accuracy_by_confidence', { p_period: period });

    if (error) {
      console.error('getAccuracyByConfidence error:', error);
      return {} as Record<ConfidenceLevel, { accuracy: number; count: number }>;
    }

    return data || {};
  }

  /**
   * Compare signal performance to category baseline
   */
  async getBaselineComparison(signalId: string): Promise<{
    signal_velocity: number;
    category_baseline: number;
    multiple: number;
    percentile: number;
  } | null> {
    const { data, error } = await supabase
      .rpc('get_baseline_comparison', { p_signal_id: signalId });

    if (error) {
      console.error('getBaselineComparison error:', error);
      return null;
    }

    return data;
  }
}

export default new ForecastService();
