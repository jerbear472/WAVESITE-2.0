import { supabase } from './supabase';
import { aiProcessingService } from './aiProcessingService';

/**
 * Background Jobs for AI Processing
 * Run these via cron jobs or a job queue system
 */

export class BackgroundJobs {
  private static instance: BackgroundJobs;

  private constructor() {}

  static getInstance(): BackgroundJobs {
    if (!BackgroundJobs.instance) {
      BackgroundJobs.instance = new BackgroundJobs();
    }
    return BackgroundJobs.instance;
  }

  /**
   * Log job execution
   */
  private async logJobRun(
    jobName: string,
    status: 'running' | 'completed' | 'failed',
    recordsProcessed: number = 0,
    errorMessage?: string,
    metadata?: any
  ): Promise<string> {
    const { data, error } = await supabase
      .from('ai_job_runs')
      .insert({
        job_name: jobName,
        status,
        records_processed: recordsProcessed,
        error_message: errorMessage,
        metadata,
        completed_at: status !== 'running' ? new Date().toISOString() : null
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error logging job run:', error);
      return '';
    }

    return data?.id || '';
  }

  /**
   * Update job run status
   */
  private async updateJobRun(
    jobRunId: string,
    status: 'completed' | 'failed',
    recordsProcessed: number,
    errorMessage?: string
  ): Promise<void> {
    await supabase
      .from('ai_job_runs')
      .update({
        status,
        records_processed: recordsProcessed,
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobRunId);
  }

  /**
   * JOB 1: Cluster Trends
   * Groups similar submissions into trend clusters
   * Runs every 5-15 minutes
   */
  async clusterTrends(): Promise<void> {
    const jobRunId = await this.logJobRun('cluster_trends', 'running');
    let processedCount = 0;

    try {
      // Fetch unclustered submissions
      const { data: newSubmissions, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('clustered', false)
        .not('vector', 'is', null)
        .limit(100);

      if (error) throw error;

      if (!newSubmissions || newSubmissions.length === 0) {
        await this.updateJobRun(jobRunId, 'completed', 0);
        return;
      }

      // Process each submission
      for (const submission of newSubmissions) {
        try {
          // Find similar existing trends
          const similarTrends = await aiProcessingService.findSimilarTrends(
            submission.vector,
            0.85, // 85% similarity threshold
            1
          );

          if (similarTrends.length > 0) {
            // Match found - update existing trend
            const matchedTrendId = similarTrends[0].id;
            
            // Update trend statistics
            await supabase
              .from('trends')
              .update({
                last_seen: submission.created_at,
                submission_count: supabase.raw('submission_count + 1'),
                updated_at: new Date().toISOString()
              })
              .eq('id', matchedTrendId);

            // Link submission to trend
            await supabase
              .from('submission_trend_map')
              .insert({
                submission_id: submission.id,
                trend_id: matchedTrendId,
                similarity_score: similarTrends[0].similarity
              });

            // Update submission
            await supabase
              .from('trend_submissions')
              .update({
                clustered: true,
                cluster_id: matchedTrendId
              })
              .eq('id', submission.id);

            // Refresh diversity metrics
            await this.refreshTrendMetrics(matchedTrendId);

          } else {
            // No match - create new trend
            const { data: newTrend, error: trendError } = await supabase
              .from('trends')
              .insert({
                representative_text: submission.description,
                representative_submission_id: submission.id,
                first_seen: submission.created_at,
                last_seen: submission.created_at,
                submission_count: 1,
                persona_diversity: 0,
                geo_spread: 0,
                vector: submission.vector,
                category: submission.classification?.category || submission.category,
                entities: submission.entities || {}
              })
              .select('id')
              .single();

            if (trendError) throw trendError;

            // Link submission to new trend
            await supabase
              .from('submission_trend_map')
              .insert({
                submission_id: submission.id,
                trend_id: newTrend.id,
                similarity_score: 1.0
              });

            // Update submission
            await supabase
              .from('trend_submissions')
              .update({
                clustered: true,
                cluster_id: newTrend.id
              })
              .eq('id', submission.id);
          }

          processedCount++;
        } catch (subError) {
          console.error('Error processing submission:', submission.id, subError);
        }
      }

      await this.updateJobRun(jobRunId, 'completed', processedCount);
    } catch (error) {
      console.error('Cluster trends job failed:', error);
      await this.updateJobRun(jobRunId, 'failed', processedCount, String(error));
    }
  }

  /**
   * JOB 2: Score Trends
   * Calculates virality scores for all trends
   * Runs hourly
   */
  async scoreTrends(): Promise<void> {
    const jobRunId = await this.logJobRun('score_trends', 'running');
    let processedCount = 0;

    try {
      // Fetch all active trends
      const { data: trends, error } = await supabase
        .from('trends')
        .select('*')
        .order('last_seen', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (!trends || trends.length === 0) {
        await this.updateJobRun(jobRunId, 'completed', 0);
        return;
      }

      // Calculate scores for each trend
      for (const trend of trends) {
        try {
          // Calculate time-based metrics
          const firstSeen = new Date(trend.first_seen);
          const lastSeen = new Date(trend.last_seen);
          const now = new Date();
          
          const daysActive = Math.max(1, (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));
          const hoursSinceFirst = Math.max(1, (now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60));
          
          // Calculate velocity (submissions per day)
          const velocity = trend.submission_count / daysActive;
          
          // Calculate virality index
          const viralityIndex = velocity * 
            (trend.persona_diversity || 1.0) * 
            (trend.geo_spread || 1.0);
          
          // Check if trend is niche (for early adoption bonus)
          const { data: isNiche } = await supabase.rpc('is_trend_niche', {
            trend_uuid: trend.id
          });
          
          const earlyAdoptionBonus = isNiche ? 1.5 : 1.0;
          
          // Calculate momentum score (recent activity weight)
          const recentHours = Math.min(24, (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60));
          const recencyFactor = Math.max(0.5, 1 - (recentHours / 168)); // Decay over a week
          const momentumScore = velocity * recencyFactor;
          
          // Calculate total score
          const totalScore = viralityIndex * earlyAdoptionBonus * recencyFactor;
          
          // Store the score
          await supabase
            .from('trend_scores')
            .insert({
              trend_id: trend.id,
              virality_index: viralityIndex,
              early_adoption_bonus: earlyAdoptionBonus,
              velocity,
              momentum_score: momentumScore,
              total_score: totalScore,
              scoring_metadata: {
                days_active: daysActive,
                hours_since_first: hoursSinceFirst,
                recency_factor: recencyFactor,
                is_niche: isNiche
              }
            });

          processedCount++;
        } catch (scoreError) {
          console.error('Error scoring trend:', trend.id, scoreError);
        }
      }

      await this.updateJobRun(jobRunId, 'completed', processedCount);
    } catch (error) {
      console.error('Score trends job failed:', error);
      await this.updateJobRun(jobRunId, 'failed', processedCount, String(error));
    }
  }

  /**
   * JOB 3: Predict Trends
   * Predicts days to mainstream for each trend
   * Runs daily
   */
  async predictTrends(): Promise<void> {
    const jobRunId = await this.logJobRun('predict_trends', 'running');
    let processedCount = 0;

    try {
      // Fetch trends with recent scores
      const { data: trends, error } = await supabase
        .from('trends')
        .select(`
          *,
          trend_scores (
            total_score,
            velocity,
            momentum_score,
            calculated_at
          )
        `)
        .order('last_seen', { ascending: false })
        .limit(200);

      if (error) throw error;

      if (!trends || trends.length === 0) {
        await this.updateJobRun(jobRunId, 'completed', 0);
        return;
      }

      for (const trend of trends) {
        try {
          // Get historical scores for trend analysis
          const scores = trend.trend_scores || [];
          
          if (scores.length === 0) continue;
          
          // Sort scores by time
          scores.sort((a: any, b: any) => 
            new Date(a.calculated_at).getTime() - new Date(b.calculated_at).getTime()
          );
          
          // Calculate trend metrics
          const latestScore = scores[scores.length - 1];
          const velocity = latestScore.velocity || 0;
          const momentum = latestScore.momentum_score || 0;
          
          // Simple prediction model (can be replaced with ML model)
          let daysToMainstream: number;
          let confidence: number;
          let lifecycleStage: string;
          
          if (velocity > 20 && momentum > 15) {
            daysToMainstream = Math.round(7 + Math.random() * 7); // 7-14 days
            confidence = 0.85;
            lifecycleStage = 'explosive';
          } else if (velocity > 10 && momentum > 8) {
            daysToMainstream = Math.round(14 + Math.random() * 14); // 14-28 days
            confidence = 0.75;
            lifecycleStage = 'growing';
          } else if (velocity > 5) {
            daysToMainstream = Math.round(30 + Math.random() * 30); // 30-60 days
            confidence = 0.65;
            lifecycleStage = 'trending';
          } else if (velocity > 2) {
            daysToMainstream = Math.round(60 + Math.random() * 30); // 60-90 days
            confidence = 0.55;
            lifecycleStage = 'emerging';
          } else {
            daysToMainstream = 120; // >120 days
            confidence = 0.45;
            lifecycleStage = 'dormant';
          }
          
          // Calculate slope for confidence adjustment
          if (scores.length >= 3) {
            const recentScores = scores.slice(-3);
            const slopes = [];
            for (let i = 1; i < recentScores.length; i++) {
              slopes.push(recentScores[i].total_score - recentScores[i-1].total_score);
            }
            const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
            
            // Adjust confidence based on consistency
            if (avgSlope > 0) {
              confidence = Math.min(0.95, confidence + 0.1);
            } else if (avgSlope < -0.5) {
              confidence = Math.max(0.3, confidence - 0.2);
              lifecycleStage = 'declining';
            }
          }
          
          // Calculate predicted dates
          const now = new Date();
          const peakDate = new Date(now.getTime() + (daysToMainstream * 24 * 60 * 60 * 1000));
          const declineDate = new Date(peakDate.getTime() + (60 * 24 * 60 * 60 * 1000)); // 60 days after peak
          
          // Calculate mainstream probability
          const mainstreamProbability = Math.min(0.95, 
            (velocity / 50) * 0.4 + 
            (momentum / 20) * 0.3 + 
            (trend.persona_diversity || 0) * 0.2 + 
            (trend.geo_spread || 0) * 0.1
          );
          
          // Store prediction
          await supabase
            .from('trend_predictions')
            .insert({
              trend_id: trend.id,
              days_to_mainstream: daysToMainstream,
              mainstream_probability: mainstreamProbability,
              peak_date: peakDate.toISOString(),
              decline_date: declineDate.toISOString(),
              lifecycle_stage: lifecycleStage,
              prediction_confidence: confidence,
              prediction_metadata: {
                velocity,
                momentum,
                score_count: scores.length,
                trend_direction: scores.length >= 2 ? 
                  (scores[scores.length - 1].total_score > scores[scores.length - 2].total_score ? 'up' : 'down') : 
                  'stable'
              }
            });

          processedCount++;
        } catch (predError) {
          console.error('Error predicting trend:', trend.id, predError);
        }
      }

      await this.updateJobRun(jobRunId, 'completed', processedCount);
    } catch (error) {
      console.error('Predict trends job failed:', error);
      await this.updateJobRun(jobRunId, 'failed', processedCount, String(error));
    }
  }

  /**
   * Helper: Refresh trend diversity metrics
   */
  private async refreshTrendMetrics(trendId: string): Promise<void> {
    try {
      // Calculate persona diversity
      const { data: personaDiversity } = await supabase.rpc('calculate_persona_diversity', {
        trend_uuid: trendId
      });

      // Calculate geo spread
      const { data: geoSpread } = await supabase.rpc('calculate_geo_spread', {
        trend_uuid: trendId
      });

      // Update trend with new metrics
      await supabase
        .from('trends')
        .update({
          persona_diversity: personaDiversity || 0,
          geo_spread: geoSpread || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', trendId);
    } catch (error) {
      console.error('Error refreshing trend metrics:', error);
    }
  }

  /**
   * Run all jobs (for testing or manual trigger)
   */
  async runAllJobs(): Promise<void> {
    console.log('Starting all background jobs...');
    
    // Run in sequence to avoid overwhelming the system
    await this.clusterTrends();
    await this.scoreTrends();
    await this.predictTrends();
    
    console.log('All background jobs completed');
  }
}

export const backgroundJobs = BackgroundJobs.getInstance();