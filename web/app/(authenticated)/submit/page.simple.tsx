'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SmartTrendSubmission from '@/components/SmartTrendSubmission';

// Simple category mapping - no complex logic
const CATEGORY_MAP: Record<string, string> = {
  'Fashion & Beauty': 'visual_style',
  'Food & Drink': 'behavior_pattern',
  'Humor & Memes': 'meme_format',
  'Lifestyle': 'behavior_pattern',
  'Politics & Social Issues': 'behavior_pattern',
  'Music & Dance': 'audio_music',
  'Sports & Fitness': 'behavior_pattern',
  'Tech & Gaming': 'creator_technique',
  'Art & Creativity': 'visual_style',
  'Education & Science': 'creator_technique'
};

export default function SimpleSubmitPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleTrendSubmit = async (trendData: any) => {
    console.log('Simple submit - received data:', trendData);
    
    if (!user?.id) {
      alert('Please log in to submit trends');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the first category and map it
      const displayCategory = trendData.categories?.[0] || 'Humor & Memes';
      const mappedCategory = CATEGORY_MAP[displayCategory] || 'meme_format';
      
      console.log('Mapping category:', displayCategory, '->', mappedCategory);

      // Build simple submission object
      const submission = {
        spotter_id: user.id,
        category: mappedCategory,
        description: trendData.explanation || trendData.trendName || 'Untitled Trend',
        evidence: {
          url: trendData.url || '',
          title: trendData.trendName || 'Untitled',
          platform: trendData.platform || 'other',
          categories: trendData.categories || [],
          moods: trendData.moods || [],
          ageRanges: trendData.ageRanges || [],
          region: trendData.region || '',
          spreadSpeed: trendData.spreadSpeed || 'emerging'
        },
        status: 'submitted',
        virality_prediction: 5,
        quality_score: 0.5,
        validation_count: 0
      };

      console.log('Submitting to database:', submission);

      // Simple insert - no retry logic, no timeout
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(submission)
        .select()
        .single();

      if (error) {
        console.error('Submit error:', error);
        alert(`Error: ${error.message}`);
        return;
      }

      console.log('Success! Trend submitted:', data);
      alert('Trend submitted successfully!');
      
      // Navigate to timeline to see submission
      router.push('/timeline');
      
    } catch (error: any) {
      console.error('Unexpected error:', error);
      alert(`Unexpected error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Submit New Trend</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Spot a trend? Submit it here and earn rewards when verified!
          </p>
          
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit New Trend'}
          </button>
        </div>

        {/* Verify Queue Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">How it works:</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Submit a trend you've spotted</li>
            <li>Other users verify your submission</li>
            <li>Approved trends earn you rewards</li>
            <li>Verified trends appear in the enterprise dashboard</li>
          </ol>
        </div>
      </div>

      {/* Trend Form Modal */}
      {showForm && (
        <SmartTrendSubmission
          onClose={() => setShowForm(false)}
          onSubmit={handleTrendSubmit}
        />
      )}
    </div>
  );
}