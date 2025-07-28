'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function TestDirect() {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  
  const testDirect = async () => {
    if (!user) {
      setResult({ error: 'Not logged in' });
      return;
    }
    
    // Direct insert with minimal data
    const testData = {
      spotter_id: user.id,
      category: 'meme_format',
      description: 'Direct test - no form',
      evidence: {
        url: 'https://test.com',
        title: 'Direct Test',
        platform: 'other'
      },
      virality_prediction: 5,
      status: 'submitted',
      quality_score: 0.5,
      validation_count: 0
    };
    
    console.log('Direct test data:', testData);
    
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(testData);
        
      if (error) {
        console.error('Direct test error:', error);
        setResult({ error: error.message, details: error });
      } else {
        console.log('Direct test success:', data);
        setResult({ success: true, data });
      }
    } catch (err: any) {
      console.error('Direct test catch:', err);
      setResult({ error: err.message, type: 'catch' });
    }
  };
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Direct Database Test</h1>
      <p className="mb-4">This bypasses all forms and submits directly to database.</p>
      
      <button 
        onClick={testDirect}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Direct Submit
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}