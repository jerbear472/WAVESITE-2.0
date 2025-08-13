'use client';

import { useSession } from '@/contexts/SessionContext';

export default function TestSessionPage() {
  const { session, startSession, endSession, logTrendSubmission } = useSession();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Session Test Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold">Session Status</h2>
          <p>Active: {session.isActive ? 'Yes' : 'No'}</p>
          <p>Duration: {session.duration} seconds</p>
          <p>Trends Logged: {session.trendsLogged}</p>
          <p>Current Streak: {session.currentStreak}</p>
          <p>Multiplier: {session.streakMultiplier}x</p>
          <p>Time Remaining: {session.streakTimeRemaining} seconds</p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={startSession}
            className="px-4 py-2 bg-green-500 text-white rounded"
            disabled={session.isActive}
          >
            Start Session
          </button>
          
          <button
            onClick={endSession}
            className="px-4 py-2 bg-red-500 text-white rounded"
            disabled={!session.isActive}
          >
            End Session
          </button>
          
          <button
            onClick={logTrendSubmission}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Log Trend
          </button>
        </div>
      </div>
    </div>
  );
}