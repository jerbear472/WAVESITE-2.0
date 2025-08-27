'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function TestRateLimit() {
  const { user } = useAuth();
  const [rateLimit, setRateLimit] = useState<any>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkRateLimit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Call check_rate_limit function
      const { data, error } = await supabase
        .rpc('check_rate_limit', { p_user_id: user.id });
      
      console.log('check_rate_limit response:', data, error);
      setRateLimit(data?.[0] || null);
      
      // Also get raw data
      const { data: raw, error: rawError } = await supabase
        .from('validation_rate_limits')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      console.log('Raw data:', raw, rawError);
      setRawData(raw);
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };
  
  const incrementCount = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('increment_validation_count', { p_user_id: user.id });
      
      console.log('Increment response:', data, error);
      
      // Refresh data
      await checkRateLimit();
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };
  
  const resetCounts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('validation_rate_limits')
        .update({
          validations_today: 0,
          validations_this_hour: 0,
          last_validation_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      console.log('Reset error:', error);
      
      // Refresh data
      await checkRateLimit();
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    if (user) {
      checkRateLimit();
    }
  }, [user]);
  
  if (!user) {
    return <div className="p-8">Please log in to test rate limits</div>;
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Rate Limit Testing</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Rate Limit Function Result:</h2>
          {rateLimit ? (
            <pre className="text-sm bg-gray-900 p-3 rounded overflow-auto">
              {JSON.stringify(rateLimit, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">No data</p>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Raw Database Data:</h2>
          {rawData ? (
            <pre className="text-sm bg-gray-900 p-3 rounded overflow-auto">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">No data</p>
          )}
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={checkRateLimit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            Refresh Data
          </button>
          
          <button
            onClick={incrementCount}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
          >
            Increment Count
          </button>
          
          <button
            onClick={resetCounts}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            Reset Counts
          </button>
        </div>
        
        <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded-lg">
          <p className="text-yellow-400 text-sm">
            Open the browser console to see detailed logs when clicking buttons.
          </p>
        </div>
      </div>
    </div>
  );
}