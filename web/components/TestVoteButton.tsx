'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestVoteButton() {
  const { user } = useAuth();

  const testVote = async () => {
    console.log('Testing vote API...');
    
    if (!user) {
      console.error('No user logged in');
      return;
    }

    try {
      // First test getting vote data for a real trend
      // Get the current trend from localStorage if available
      const currentTrendId = window.localStorage?.getItem('debug_trend_id') || 'test-trend';
      console.log('Using trend ID for test:', currentTrendId);
      
      const getResponse = await fetch(`/api/vote-trend?trend_id=${currentTrendId}&user_id=${user.id}`);
      const getData = await getResponse.json();
      console.log('GET response:', getData);

      // Then test posting a vote
      const response = await fetch('/api/vote-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trend_id: currentTrendId,
          vote_type: 'fire',
          user_id: user.id
        })
      });

      const data = await response.json();
      console.log('POST response:', data);

      if (!response.ok) {
        console.error('Vote API error:', response.status, data);
      }
    } catch (error) {
      console.error('Vote test error:', error);
    }
  };

  if (!user) {
    return <div>Please log in to test voting</div>;
  }

  return (
    <div className="p-4 border border-red-500 bg-red-50 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Vote API Test</h3>
      <button
        onClick={testVote}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Test Vote API
      </button>
    </div>
  );
}