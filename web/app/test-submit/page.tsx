'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestSubmit() {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [category, setCategory] = useState('Humor & Memes');
  
  const testSubmit = async () => {
    try {
      const response = await fetch('/api/test-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          category: category
        })
      });
      
      const data = await response.json();
      setResult(data);
      console.log('Test result:', data);
    } catch (error) {
      console.error('Test error:', error);
      setResult({ error: 'Failed to test' });
    }
  };
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Submission</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Category:</label>
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option>Fashion & Beauty</option>
          <option>Food & Drink</option>
          <option>Humor & Memes</option>
          <option>Lifestyle</option>
          <option>Politics & Social Issues</option>
          <option>Music & Dance</option>
          <option>Sports & Fitness</option>
          <option>Tech & Gaming</option>
          <option>Art & Creativity</option>
          <option>Education & Science</option>
        </select>
      </div>
      
      <button 
        onClick={testSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Submit
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