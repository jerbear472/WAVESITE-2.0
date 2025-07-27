export default function StyleTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Style Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Card 1</h2>
            <p className="text-gray-600">If you can see this styled card with proper colors and layout, Tailwind CSS is working correctly.</p>
            <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              Test Button
            </button>
          </div>
          
          <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg shadow-lg p-6 text-white">
            <h2 className="text-2xl font-semibold mb-4">Card 2</h2>
            <p>This card has a gradient background.</p>
            <div className="mt-4 flex gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Tag 1</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Tag 2</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-gray-800 rounded text-white">
          <p className="font-mono text-sm">Tailwind classes test: bg-gray-800, text-white, rounded, p-4</p>
        </div>
      </div>
    </div>
  );
}