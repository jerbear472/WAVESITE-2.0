import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
          WaveSight
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Trend Intelligence Platform
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}