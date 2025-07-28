'use client';

import { getSafeCategory, getSafeStatus } from '@/lib/safeCategory';

export default function TestMapping() {
  const categories = [
    'Fashion & Beauty',
    'Food & Drink',
    'Humor & Memes',
    'Lifestyle',
    'Politics & Social Issues',
    'Music & Dance',
    'Sports & Fitness',
    'Tech & Gaming',
    'Art & Creativity',
    'Education & Science'
  ];
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Category Mapping Test</h1>
      
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Display Category</th>
            <th className="border p-2 text-left">Mapped To</th>
            <th className="border p-2 text-left">Valid?</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => {
            const mapped = getSafeCategory(cat);
            const valid = ['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'].includes(mapped);
            return (
              <tr key={cat}>
                <td className="border p-2">{cat}</td>
                <td className="border p-2">{mapped}</td>
                <td className="border p-2">
                  <span className={valid ? 'text-green-600' : 'text-red-600'}>
                    {valid ? '✓' : '✗'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <h2 className="text-xl font-bold mt-8 mb-4">Status Mapping Test</h2>
      <div className="space-y-2">
        <div>pending → {getSafeStatus('pending')}</div>
        <div>submitted → {getSafeStatus('submitted')}</div>
        <div>null → {getSafeStatus(null)}</div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded">
        <p className="font-bold">Test in Console:</p>
        <code className="block mt-2">
          getSafeCategory('Humor & Memes')<br/>
          getSafeStatus('pending')
        </code>
      </div>
    </div>
  );
}