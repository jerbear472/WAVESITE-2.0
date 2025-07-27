export default function CSSTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">CSS Test Page</h1>
        
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">Tailwind Working!</h2>
            <p className="text-gray-700">If you can see this styled properly, Tailwind CSS is loading correctly.</p>
          </div>
          
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
              Primary Button
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition">
              Secondary Button
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-100 p-4 rounded">Red Box</div>
            <div className="bg-green-100 p-4 rounded">Green Box</div>
            <div className="bg-blue-100 p-4 rounded">Blue Box</div>
          </div>
        </div>
      </div>
    </div>
  );
}