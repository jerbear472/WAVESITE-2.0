import { NextRequest, NextResponse } from 'next/server';
import { GoogleTrendsService } from '@/services/GoogleTrendsService';
import { supabase } from '@/lib/supabase';

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
// Recommended: Run daily at midnight UTC

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting prediction verification job...');
    
    // Get all unverified predictions where the peak date has passed
    const today = new Date().toISOString().split('T')[0];
    
    const { data: predictions, error } = await supabase
      .from('trend_submissions')
      .select('*')
      .not('peak_date', 'is', null)
      .eq('peak_verified', false)
      .lte('peak_date', today)
      .limit(20); // Process 20 at a time to avoid timeout

    if (error) {
      throw error;
    }

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No predictions to verify',
        processed: 0
      });
    }

    const results = {
      processed: 0,
      verified: 0,
      perfect: 0,
      errors: [] as string[]
    };

    // Process each prediction
    for (const prediction of predictions) {
      try {
        // Use the first keyword or title for Google Trends lookup
        const keyword = prediction.trend_keywords?.[0] || 
                        prediction.title || 
                        'trending';

        // Fetch Google Trends data
        const trendData = await GoogleTrendsService.fetchTrendData(
          keyword,
          'today 3-m', // Last 3 months
          'US'
        );

        // Analyze the peak
        const peakAnalysis = GoogleTrendsService.analyzePeak(trendData);

        if (!peakAnalysis.hasPeaked) {
          // Trend hasn't peaked yet, skip for now
          console.log(`Trend ${prediction.id} hasn't peaked yet`);
          continue;
        }

        // Calculate accuracy
        const predictedDate = new Date(prediction.peak_date);
        const actualDate = new Date(peakAnalysis.peakDate);
        const daysDifference = Math.abs(
          Math.floor((predictedDate.getTime() - actualDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        // Calculate XP based on accuracy
        let xpEarned = 0;
        if (daysDifference === 0) {
          xpEarned = 1000; // Perfect prediction!
          results.perfect++;
        } else if (daysDifference <= 3) {
          xpEarned = 500; // Within 3 days
        } else if (daysDifference <= 7) {
          xpEarned = 250; // Within a week
        } else if (daysDifference <= 14) {
          xpEarned = 100; // Within 2 weeks
        } else if (daysDifference <= 30) {
          xpEarned = 50; // Within a month
        } else {
          xpEarned = 10; // Participation trophy
        }

        // Store verification result
        const { error: verifyError } = await supabase
          .from('peak_predictions_verified')
          .insert({
            trend_id: prediction.id,
            predicted_peak_date: prediction.peak_date,
            actual_peak_date: peakAnalysis.peakDate,
            accuracy_days: daysDifference,
            xp_earned: xpEarned,
            google_trends_data: {
              keyword,
              trendData: trendData.slice(-30), // Last 30 days
              peakValue: peakAnalysis.peakValue,
              currentValue: peakAnalysis.currentValue
            }
          });

        if (verifyError) {
          console.error('Error storing verification:', verifyError);
          results.errors.push(`Failed to store verification for ${prediction.id}`);
          continue;
        }

        // Update user's XP
        const { error: xpError } = await supabase.rpc('award_xp', {
          p_user_id: prediction.spotter_id,
          p_amount: xpEarned,
          p_type: 'peak_prediction',
          p_description: `Peak prediction: ${daysDifference} days off (${xpEarned} XP)`,
          p_trend_id: prediction.id
        });

        if (xpError) {
          console.error('Error awarding XP:', xpError);
          results.errors.push(`Failed to award XP for ${prediction.id}`);
        }

        // Mark prediction as verified
        const { error: updateError } = await supabase
          .from('trend_submissions')
          .update({ 
            peak_verified: true,
            xp_awarded: (prediction.xp_awarded || 0) + xpEarned
          })
          .eq('id', prediction.id);

        if (updateError) {
          console.error('Error updating prediction:', updateError);
          results.errors.push(`Failed to update ${prediction.id}`);
        }

        // Update user stats for perfect predictions
        if (daysDifference === 0) {
          const { data: userData } = await supabase
            .from('user_profiles')
            .select('perfect_predictions')
            .eq('id', prediction.spotter_id)
            .single();

          await supabase
            .from('user_profiles')
            .update({
              perfect_predictions: (userData?.perfect_predictions || 0) + 1
            })
            .eq('id', prediction.spotter_id);
        }

        results.verified++;
        console.log(`Verified prediction ${prediction.id}: ${daysDifference} days off, ${xpEarned} XP`);

      } catch (error) {
        console.error(`Error processing prediction ${prediction.id}:`, error);
        results.errors.push(`Error processing ${prediction.id}: ${error}`);
      }

      results.processed++;
    }

    // Log results
    console.log('Verification job completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Predictions verified',
      ...results
    });

  } catch (error: any) {
    console.error('Verification job error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify predictions',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}