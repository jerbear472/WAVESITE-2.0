import { supabase } from '@/lib/supabase';

interface TrendData {
  date: string;
  value: number;
}

interface PeakAnalysis {
  peakDate: string;
  peakValue: number;
  currentValue: number;
  hasPeaked: boolean;
  daysFromPeak: number;
  trendDirection: 'rising' | 'falling' | 'stable';
}

export class GoogleTrendsService {
  private static readonly SERPAPI_KEY = process.env.NEXT_PUBLIC_SERPAPI_KEY || '';
  private static readonly TRENDS_API_URL = 'https://serpapi.com/search.json';

  /**
   * Fetch Google Trends data for a keyword
   * Using SerpAPI as Google Trends doesn't have a public API
   */
  static async fetchTrendData(
    keyword: string, 
    timeRange: string = 'today 3-m',
    geo: string = 'US'
  ): Promise<TrendData[]> {
    try {
      // Method 1: Using SerpAPI (requires API key)
      if (this.SERPAPI_KEY) {
        const params = new URLSearchParams({
          engine: 'google_trends',
          q: keyword,
          data_type: 'TIMESERIES',
          tz: '420', // PST timezone
          geo: geo,
          api_key: this.SERPAPI_KEY
        });

        const response = await fetch(`${this.TRENDS_API_URL}?${params}`);
        const data = await response.json();

        if (data.interest_over_time?.timeline_data) {
          return data.interest_over_time.timeline_data.map((item: any) => ({
            date: item.date,
            value: item.values[0]?.extracted_value || 0
          }));
        }
      }

      // Method 2: Using unofficial Google Trends npm package (server-side only)
      // This would be implemented in an API route
      const response = await fetch('/api/google-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, timeRange, geo })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trends data');
      }

      const data = await response.json();
      return data.trendData || [];

    } catch (error) {
      console.error('Error fetching Google Trends data:', error);
      // Return mock data for development
      return this.getMockTrendData(keyword);
    }
  }

  /**
   * Analyze trend data to find peak
   */
  static analyzePeak(trendData: TrendData[]): PeakAnalysis {
    if (!trendData || trendData.length === 0) {
      throw new Error('No trend data available');
    }

    // Find the peak
    let peakValue = 0;
    let peakIndex = 0;
    let peakDate = '';

    trendData.forEach((point, index) => {
      if (point.value > peakValue) {
        peakValue = point.value;
        peakIndex = index;
        peakDate = point.date;
      }
    });

    const currentValue = trendData[trendData.length - 1].value;
    const recentAvg = trendData.slice(-7).reduce((sum, p) => sum + p.value, 0) / 7;
    const olderAvg = trendData.slice(-14, -7).reduce((sum, p) => sum + p.value, 0) / 7;

    // Determine if it has peaked
    const hasPeaked = peakIndex < trendData.length - 7 && // Peak was at least a week ago
                      currentValue < peakValue * 0.7; // Current is less than 70% of peak

    // Calculate days from peak
    const peakDateObj = new Date(peakDate);
    const currentDateObj = new Date();
    const daysFromPeak = Math.floor((currentDateObj.getTime() - peakDateObj.getTime()) / (1000 * 60 * 60 * 24));

    // Determine trend direction
    let trendDirection: 'rising' | 'falling' | 'stable';
    if (recentAvg > olderAvg * 1.1) {
      trendDirection = 'rising';
    } else if (recentAvg < olderAvg * 0.9) {
      trendDirection = 'falling';
    } else {
      trendDirection = 'stable';
    }

    return {
      peakDate,
      peakValue,
      currentValue,
      hasPeaked,
      daysFromPeak,
      trendDirection
    };
  }

  /**
   * Verify a user's peak prediction
   */
  static async verifyPeakPrediction(
    trendId: string,
    predictedPeakDate: string,
    keyword: string
  ): Promise<{
    isCorrect: boolean;
    actualPeakDate: string;
    accuracyDays: number;
    xpEarned: number;
  }> {
    try {
      // Fetch current Google Trends data
      const trendData = await this.fetchTrendData(keyword);
      const peakAnalysis = this.analyzePeak(trendData);

      // Check if trend has actually peaked
      if (!peakAnalysis.hasPeaked) {
        return {
          isCorrect: false,
          actualPeakDate: 'Not peaked yet',
          accuracyDays: -1,
          xpEarned: 0
        };
      }

      // Calculate accuracy
      const predictedDate = new Date(predictedPeakDate);
      const actualDate = new Date(peakAnalysis.peakDate);
      const daysDifference = Math.abs(
        Math.floor((predictedDate.getTime() - actualDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Calculate XP based on accuracy
      let xpEarned = 0;
      if (daysDifference === 0) {
        xpEarned = 1000; // Perfect prediction!
      } else if (daysDifference <= 3) {
        xpEarned = 500; // Within 3 days
      } else if (daysDifference <= 7) {
        xpEarned = 250; // Within a week
      } else if (daysDifference <= 14) {
        xpEarned = 100; // Within 2 weeks
      } else if (daysDifference <= 30) {
        xpEarned = 50; // Within a month
      }

      // Store verification result
      await this.storeVerificationResult(trendId, {
        predictedPeakDate,
        actualPeakDate: peakAnalysis.peakDate,
        accuracyDays: daysDifference,
        xpEarned,
        verifiedAt: new Date().toISOString(),
        trendData: trendData
      });

      return {
        isCorrect: daysDifference <= 7, // Consider correct if within a week
        actualPeakDate: peakAnalysis.peakDate,
        accuracyDays: daysDifference,
        xpEarned
      };

    } catch (error) {
      console.error('Error verifying peak prediction:', error);
      throw error;
    }
  }

  /**
   * Store verification result in database
   */
  static async storeVerificationResult(trendId: string, result: any) {
    try {
      const { error } = await supabase
        .from('peak_predictions_verified')
        .insert({
          trend_id: trendId,
          predicted_peak_date: result.predictedPeakDate,
          actual_peak_date: result.actualPeakDate,
          accuracy_days: result.accuracyDays,
          xp_earned: result.xpEarned,
          google_trends_data: result.trendData,
          verified_at: result.verifiedAt
        });

      if (error) throw error;

      // Update user's XP
      await this.updateUserXP(trendId, result.xpEarned);

    } catch (error) {
      console.error('Error storing verification result:', error);
    }
  }

  /**
   * Update user's XP for correct prediction
   */
  static async updateUserXP(trendId: string, xpEarned: number) {
    try {
      // Get the trend submission to find the user
      const { data: trend } = await supabase
        .from('trend_submissions')
        .select('spotter_id')
        .eq('id', trendId)
        .single();

      if (!trend) return;

      // Update user's total XP
      const { error } = await supabase
        .from('user_profiles')
        .update({
          total_xp: supabase.raw('total_xp + ?', [xpEarned]),
          predictions_verified: supabase.raw('predictions_verified + 1'),
          prediction_accuracy_xp: supabase.raw('prediction_accuracy_xp + ?', [xpEarned])
        })
        .eq('id', trend.spotter_id);

      if (error) throw error;

      // Log the XP gain
      await supabase
        .from('xp_transactions')
        .insert({
          user_id: trend.spotter_id,
          amount: xpEarned,
          type: 'peak_prediction',
          description: `Accurate peak prediction (${xpEarned} XP)`,
          trend_id: trendId
        });

    } catch (error) {
      console.error('Error updating user XP:', error);
    }
  }

  /**
   * Mock data for development/testing
   */
  static getMockTrendData(keyword: string): TrendData[] {
    const data: TrendData[] = [];
    const days = 90;
    const peakDay = Math.floor(days * 0.6); // Peak around 60% through
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      // Create a bell curve for the trend
      const distance = Math.abs(i - peakDay);
      const value = Math.max(
        0,
        Math.min(
          100,
          100 * Math.exp(-(distance * distance) / (2 * 15 * 15))
        )
      );
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value + Math.random() * 10 - 5) // Add some noise
      });
    }
    
    return data;
  }

  /**
   * Check all pending predictions for verification
   */
  static async checkPendingPredictions() {
    try {
      // Get all trends with peak predictions that haven't been verified
      const { data: predictions } = await supabase
        .from('trend_submissions')
        .select('id, peak_date, title, created_at')
        .not('peak_date', 'is', null)
        .is('peak_verified', false)
        .lte('peak_date', new Date().toISOString()) // Peak date has passed
        .limit(10);

      if (!predictions || predictions.length === 0) {
        return { checked: 0, verified: 0 };
      }

      let verified = 0;
      for (const prediction of predictions) {
        try {
          const result = await this.verifyPeakPrediction(
            prediction.id,
            prediction.peak_date,
            prediction.title
          );
          
          if (result.xpEarned > 0) {
            verified++;
          }

          // Mark as verified
          await supabase
            .from('trend_submissions')
            .update({ peak_verified: true })
            .eq('id', prediction.id);

        } catch (error) {
          console.error(`Error verifying prediction ${prediction.id}:`, error);
        }
      }

      return { checked: predictions.length, verified };

    } catch (error) {
      console.error('Error checking pending predictions:', error);
      return { checked: 0, verified: 0 };
    }
  }
}