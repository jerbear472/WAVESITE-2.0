'use client';

export default function TestEnv() {
  const envVars = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
      `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET',
    API_URL: process.env.NEXT_PUBLIC_API_URL,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Environment Variables Check</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Environment</h2>
          
          <div className="space-y-3">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex">
                <span className="font-mono font-semibold w-48">{key}:</span>
                <span className={`font-mono ${value ? 'text-green-600' : 'text-red-600'}`}>
                  {value || 'NOT SET'}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> These values are loaded from your .env.local file.
              If any are missing, check that your .env.local file exists and contains the correct values.
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.location.href = '/register'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Register
          </button>
          <button
            onClick={() => window.location.href = '/test-signup-debug'}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Debug Tool
          </button>
        </div>
      </div>
    </div>
  );
}