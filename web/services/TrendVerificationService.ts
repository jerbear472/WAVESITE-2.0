import { supabase } from '@/lib/supabase';

interface GoogleTrendsData {
  keyword: string;
  timelineData: Array<{
    time: string;
    value: number;
  }>;
  peakValue: number;
  peakDate: string;
  currentValue: number;
}

interface VerificationResult {
  verified: boolean;
  method: 'google_trends' | 'community';
  isCorrect: boolean;
  confidence: number;
  peakDate?: string;
  data?: any;
}

export class TrendVerificationService {
  /**
   * Main verification pipeline - tries Google Trends first, falls back to community
   */
  static async verifyPrediction(predictionId: string): Promise<VerificationResult | null> {
    try {
      // Get prediction details
      const { data: prediction, error } = await supabase
        .from('trend_predictions')
        .select('*')
        .eq('id', predictionId)
        .single();

      if (error || !prediction) {
        console.error('Failed to fetch prediction:', error);
        return null;
      }

      // Check if prediction period has expired
      if (new Date(prediction.predicted_peak_date) > new Date()) {
        console.log('Prediction period not yet expired');
        return null;
      }

      // Try Google Trends verification first
      const googleResult = await this.verifyWithGoogleTrends(prediction);
      
      if (googleResult && googleResult.confidence > 70) {
        // High confidence Google Trends result - use it
        await this.updatePredictionStatus(
          predictionId,
          googleResult.isCorrect ? 'auto_verified_correct' : 'auto_verified_incorrect',
          'google_trends',
          googleResult
        );
        
        if (googleResult.isCorrect) {
          await this.awardXP(prediction.user_id, 50, 'Correct trend peak prediction');
        }
        
        return googleResult;
      }

      // Low confidence or no Google data - send to community queue
      console.log('Sending to community verification queue');
      return null; // Community verification handled separately
      
    } catch (error) {
      console.error('Verification error:', error);
      return null;
    }
  }

  /**
   * Attempt to verify using Google Trends data
   */
  static async verifyWithGoogleTrends(prediction: any): Promise<VerificationResult | null> {
    try {
      // In production, this would call the Google Trends API
      // For now, we'll simulate the check
      const trendData = await this.fetchGoogleTrendsData(
        prediction.trend_name,
        prediction.trend_keywords
      );

      if (!trendData || trendData.timelineData.length < 7) {
        // Not enough data
        return null;
      }

      // Analyze the trend curve to detect peak
      const peakInfo = this.detectPeak(trendData);
      
      if (!peakInfo.hasPeaked) {
        // Trend hasn't peaked yet
        return {
          verified: true,
          method: 'google_trends',
          isCorrect: false,
          confidence: peakInfo.confidence,
          data: trendData
        };
      }

      // Check if peak occurred within predicted timeframe
      const peakDate = new Date(peakInfo.peakDate);
      const predictionDate = new Date(prediction.prediction_made_at);
      const predictedPeakDate = new Date(prediction.predicted_peak_date);

      // Allow some margin of error (±20% of timeframe)
      const timeframeDays = Math.ceil((predictedPeakDate.getTime() - predictionDate.getTime()) / (1000 * 60 * 60 * 24));
      const marginDays = Math.ceil(timeframeDays * 0.2);
      
      const earliestAcceptable = new Date(predictedPeakDate);
      earliestAcceptable.setDate(earliestAcceptable.getDate() - marginDays);
      
      const latestAcceptable = new Date(predictedPeakDate);
      latestAcceptable.setDate(latestAcceptable.getDate() + marginDays);

      const isCorrect = peakDate >= earliestAcceptable && peakDate <= latestAcceptable;

      return {
        verified: true,
        method: 'google_trends',
        isCorrect,
        confidence: peakInfo.confidence,
        peakDate: peakInfo.peakDate,
        data: {
          ...trendData,
          peakInfo
        }
      };

    } catch (error) {
      console.error('Google Trends verification error:', error);
      return null;
    }
  }

  /**
   * Simulate fetching Google Trends data
   * In production, this would use the actual Google Trends API
   */
  private static async fetchGoogleTrendsData(
    trendName: string, 
    keywords: string[]
  ): Promise<GoogleTrendsData | null> {
    // This is a simulation - replace with actual API call
    // For now, return null to trigger community verification
    console.log(`Would fetch Google Trends for: ${trendName}`, keywords);
    
    // Simulate some trends having data
    if (Math.random() > 0.7) {
      // Generate mock data for testing
      const days = 30;
      const timelineData = [];
      let peakValue = 0;
      let peakDate = '';
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        const value = Math.floor(Math.random() * 100);
        
        timelineData.push({
          time: date.toISOString(),
          value
        });
        
        if (value > peakValue) {
          peakValue = value;
          peakDate = date.toISOString();
        }
      }
      
      return {
        keyword: trendName,
        timelineData,
        peakValue,
        peakDate,
        currentValue: timelineData[timelineData.length - 1].value
      };
    }
    
    return null;
  }

  /**
   * Detect if and when a trend peaked based on timeline data
   */
  private static detectPeak(trendData: GoogleTrendsData): {
    hasPeaked: boolean;
    peakDate: string;
    confidence: number;
    dropPercentage: number;
  } {
    const { timelineData, peakValue, peakDate, currentValue } = trendData;
    
    // Calculate drop from peak
    const dropPercentage = ((peakValue - currentValue) / peakValue) * 100;
    
    // Peak detected if current value is 30% or more below peak
    const hasPeaked = dropPercentage >= 30;
    
    // Calculate confidence based on data quality
    let confidence = 50;
    
    // More data points = higher confidence
    if (timelineData.length >= 30) confidence += 20;
    else if (timelineData.length >= 14) confidence += 10;
    
    // Clear drop = higher confidence
    if (dropPercentage >= 50) confidence += 20;
    else if (dropPercentage >= 30) confidence += 10;
    
    // Sustained drop = higher confidence
    const recentData = timelineData.slice(-7);
    const allBelowPeak = recentData.every(d => d.value < peakValue * 0.8);
    if (allBelowPeak) confidence += 10;
    
    return {
      hasPeaked,
      peakDate,
      confidence: Math.min(100, confidence),
      dropPercentage
    };
  }

  /**
   * Update prediction status in database
   */
  private static async updatePredictionStatus(
    predictionId: string,
    status: string,
    method: string,
    verificationData: any
  ) {
    const { error } = await supabase
      .from('trend_predictions')
      .update({
        verification_status: status,
        verification_method: method,
        verified_at: new Date().toISOString(),
        google_trends_data: method === 'google_trends' ? verificationData.data : null,
        peak_detected_date: verificationData.peakDate || null,
        confidence_score: verificationData.confidence || null
      })
      .eq('id', predictionId);

    if (error) {
      console.error('Failed to update prediction status:', error);
    }
  }

  /**
   * Award XP for correct prediction
   */
  private static async awardXP(userId: string, amount: number, reason: string) {
    // Add to XP ledger
    const { error } = await supabase
      .from('xp_ledger')
      .insert({
        user_id: userId,
        amount,
        xp_amount: amount,
        reason,
        status: 'approved'
      });

    if (error) {
      console.error('Failed to award XP:', error);
    }

    // Update user reliability stats
    await this.updateUserReliability(userId, true);
  }

  /**
   * Update user reliability score
   */
  private static async updateUserReliability(userId: string, wasCorrect: boolean) {
    // Upsert user reliability record
    const { data: existing } = await supabase
      .from('user_reliability')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      const newTotal = existing.total_predictions + 1;
      const newCorrect = existing.correct_predictions + (wasCorrect ? 1 : 0);
      const newAccuracy = (newCorrect / newTotal) * 100;
      const newStreak = wasCorrect ? existing.current_correct_streak + 1 : 0;

      await supabase
        .from('user_reliability')
        .update({
          total_predictions: newTotal,
          correct_predictions: newCorrect,
          prediction_accuracy: newAccuracy,
          current_correct_streak: newStreak,
          best_correct_streak: Math.max(newStreak, existing.best_correct_streak),
          last_prediction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_reliability')
        .insert({
          user_id: userId,
          total_predictions: 1,
          correct_predictions: wasCorrect ? 1 : 0,
          prediction_accuracy: wasCorrect ? 100 : 0,
          current_correct_streak: wasCorrect ? 1 : 0,
          best_correct_streak: wasCorrect ? 1 : 0,
          last_prediction_at: new Date().toISOString()
        });
    }
  }

  /**
   * Process expired predictions (run periodically)
   */
  static async processExpiredPredictions() {
    try {
      // Get all expired predictions that haven't been verified
      const { data: expiredPredictions, error } = await supabase
        .from('trend_predictions')
        .select('*')
        .eq('verification_status', 'pending')
        .lt('predicted_peak_date', new Date().toISOString())
        .limit(10); // Process in batches

      if (error || !expiredPredictions) {
        console.error('Failed to fetch expired predictions:', error);
        return;
      }

      console.log(`Processing ${expiredPredictions.length} expired predictions`);

      for (const prediction of expiredPredictions) {
        await this.verifyPrediction(prediction.id);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('Error processing expired predictions:', error);
    }
  }
}