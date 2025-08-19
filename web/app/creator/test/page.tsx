'use client';

export default function CreatorTest() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          Creator Dashboard Test
        </h1>
        <p className="text-gray-400 mb-8">
          This is a test page to verify the system is working
        </p>
        <div className="bg-gray-900 rounded-xl p-6 max-w-md">
          <h2 className="text-xl font-bold mb-4">🔥 Hot Trend: AI Boyfriend</h2>
          <div className="text-left space-y-2">
            <p className="text-sm text-gray-400">Virality Score: 96%</p>
            <p className="text-sm text-gray-400">Time to Peak: 12 hours</p>
            <p className="text-sm text-gray-400">Potential Views: 5.8M</p>
          </div>
        </div>
        <div className="mt-8">
          <a 
            href="/creator/dashboard" 
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg font-bold hover:from-pink-600 hover:to-purple-600 transition-all"
          >
            Go to Full Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}