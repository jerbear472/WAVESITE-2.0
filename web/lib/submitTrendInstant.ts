/**
 * Instant Trend Submission
 * Returns immediately and processes in background
 */

import { submissionQueue } from './submissionQueue';
import { getSafeCategory } from './safeCategory';

export interface InstantSubmissionResult {
  success: boolean;
  submissionId?: string;
  message: string;
}

/**
 * Submit trend instantly - returns immediately
 * Processing happens in background with retry logic
 */
export async function submitTrendInstant(
  userId: string, 
  data: any
): Promise<InstantSubmissionResult> {
  try {
    // Validate minimum required fields
    if (!userId) {
      return {
        success: false,
        message: 'Please log in to submit trends'
      };
    }

    if (!data.title && !data.description && !data.url) {
      return {
        success: false,
        message: 'Please provide at least a title, description, or URL'
      };
    }

    // Prepare clean data with safe defaults
    const cleanData = {
      title: data.title || 'Untitled Trend',
      description: data.description || data.title || 'No description provided',
      category: getSafeCategory(data.category) || 'lifestyle',
      platform: data.platform || 'unknown',
      url: data.url || '',
      wave_score: data.wave_score || data.sentiment || 50,
      // Optional fields
      screenshot_url: data.screenshot_url,
      thumbnail_url: data.thumbnail_url,
      creator_handle: data.creator_handle,
      views_count: data.views_count || 0,
      likes_count: data.likes_count || 0,
      comments_count: data.comments_count || 0,
      hashtags: data.hashtags || [],
      // Intelligence fields
      trend_velocity: data.trendVelocity,
      trend_size: data.trendSize,
      ai_angle: data.aiAngle,
      sentiment: data.sentiment,
      audience_age: data.audienceAge,
      category_answers: data.categoryAnswers,
      velocity_metrics: data.velocityMetrics
    };

    // Add to queue - returns immediately
    const { id, status } = await submissionQueue.addSubmission(userId, cleanData);

    return {
      success: true,
      submissionId: id,
      message: 'Trend submitted! Processing in background...'
    };

  } catch (error: any) {
    console.error('Instant submission error:', error);
    return {
      success: false,
      message: error.message || 'Failed to queue submission'
    };
  }
}

/**
 * Check submission status
 */
export function checkSubmissionStatus(submissionId: string) {
  return submissionQueue.getStatus(submissionId);
}

/**
 * Retry a failed submission
 */
export function retrySubmission(submissionId: string) {
  submissionQueue.retrySubmission(submissionId);
}

/**
 * Get all queued submissions for a user
 */
export function getUserSubmissions(userId: string) {
  return submissionQueue.getAllSubmissions()
    .filter(s => s.userId === userId);
}