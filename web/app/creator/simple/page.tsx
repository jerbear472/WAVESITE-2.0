'use client';

export default function SimpleCreatorDashboard() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        WaveSight Creator Dashboard
      </h1>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-pink-400">🔥 Hot Trend: AI Boyfriend</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">96%</div>
              <div className="text-sm text-gray-400">Virality Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">12h</div>
              <div className="text-sm text-gray-400">Time to Peak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">5.8M</div>
              <div className="text-sm text-gray-400">Potential Views</div>
            </div>
          </div>
          <p className="text-gray-300 mb-4">
            People creating content about their AI companion experiences
          </p>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-2">Content Ideas:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Rating AI boyfriends vs real dating</li>
              <li>• My AI companion understands me better</li>
              <li>• POV: Your AI boyfriend vs your ex</li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-orange-400">📈 Silent Walk Trend</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">92%</div>
              <div className="text-sm text-gray-400">Virality Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">18h</div>
              <div className="text-sm text-gray-400">Time to Peak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">2.5M</div>
              <div className="text-sm text-gray-400">Potential Views</div>
            </div>
          </div>
          <p className="text-gray-300 mb-4">
            People filming aesthetic silent walking videos with dramatic music
          </p>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-2">Content Ideas:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Film yourself on a silent walk in scenic location</li>
              <li>• Create a "POV: you finally understand silent walking"</li>
              <li>• Before and after your mental health with silent walks</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Ready to 10X Your Growth?</h2>
            <p className="mb-4">Get access to all trend insights for $49/month</p>
            <button className="bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
              Start Free Trial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}