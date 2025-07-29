import { createClient } from '@/utils/supabase/client';

// Fallback submission service - minimal dependencies, maximum reliability
export class FallbackSubmission {
  static async submit(trendData: any, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    console.log('🚨 Using fallback submission method');
    
    try {
      const supabase = createClient();
      
      // Minimal data preparation - no external calls
      const insertData = {
        spotter_id: userId,
        category: 'meme_format', // Default category
        description: trendData.trendName || trendData.explanation || 'Untitled Trend',
        platform: trendData.platform || 'other',
        evidence: {
          url: trendData.url || '',
          title: trendData.trendName || 'Untitled Trend',
          fallback_submission: true,
          timestamp: new Date().toISOString()
        },
        status: 'submitted',
        quality_score: 0.5,
        validation_count: 0,
        created_at: new Date().toISOString(),
        post_url: trendData.url || ''
      };

      // Direct database insert - no retries, no timeouts
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Fallback submission error:', error);
        return { 
          success: false, 
          error: `Database error: ${error.message}` 
        };
      }

      console.log('✅ Fallback submission successful:', data.id);
      return { success: true, data };

    } catch (error: any) {
      console.error('Fallback submission failed:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error in fallback submission' 
      };
    }
  }
}