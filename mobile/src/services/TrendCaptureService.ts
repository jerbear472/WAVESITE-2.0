import { supabase } from '../config/supabase';

const API_BASE_URL = 'http://localhost:8000/api/v1';

interface PerformanceStats {
  trend_earnings: number;
  pending_payouts: number;
  viral_trends_spotted: number;
  validated_trends: number;
  quality_submissions: number;
  first_spotter_bonus_count: number;
  trend_accuracy_rate: number;
  streak_days: number;
  streak_multiplier: number;
  next_milestone?: {
    name: string;
    requirement: string;
    reward: string;
  };
}

interface EarningsBreakdown {
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  viral_trend_earnings: number;
  validated_trend_earnings: number;
  quality_submission_earnings: number;
  first_spotter_bonuses: number;
  streak_bonuses: number;
  achievement_bonuses: number;
  challenge_rewards: number;
  recent_payments: any[];
  next_payout_date: string;
  next_payout_amount: number;
}

class TrendCaptureService {
  private async getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async getPerformanceStats(): Promise<PerformanceStats> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/performance/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      throw error;
    }
  }

  async getEarningsBreakdown(timePeriod: 'week' | 'month' | 'all' = 'week'): Promise<EarningsBreakdown> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/performance/earnings/breakdown?time_period=${timePeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch earnings breakdown');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching earnings breakdown:', error);
      throw error;
    }
  }

  async getAchievements() {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/performance/achievements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  }

  async getWeeklyChallenges() {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/performance/challenges/weekly`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weekly challenges');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching weekly challenges:', error);
      throw error;
    }
  }

  async getLeaderboard(metric: string = 'viral_count', timePeriod: string = 'week') {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/performance/leaderboard?metric=${metric}&time_period=${timePeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  async getTrendRadar(category?: string, timeWindow: number = 24) {
    try {
      const token = await this.getAuthToken();
      const url = category 
        ? `${API_BASE_URL}/performance/radar?category=${category}&time_window=${timeWindow}`
        : `${API_BASE_URL}/performance/radar?time_window=${timeWindow}`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trend radar');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching trend radar:', error);
      throw error;
    }
  }

  async submitTrend(trendData: any) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/performance/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trendData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit trend');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting trend:', error);
      throw error;
    }
  }

  async getQualityFeedback(trendId: string) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/performance/feedback/${trendId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quality feedback');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching quality feedback:', error);
      throw error;
    }
  }
}

export default new TrendCaptureService();