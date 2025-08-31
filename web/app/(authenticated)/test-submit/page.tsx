'use client';

import QuickTrendSubmit from '@/components/QuickTrendSubmit';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function TestSubmitPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">Test Instant Submit</h1>
            <p className="text-gray-400 text-sm">Quick submission with retry logic</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="text-blue-400 font-semibold mb-2">
              ⚡ Instant Submission Enabled
            </h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Submits instantly and shows success</li>
              <li>• Processes in background with auto-retry</li>
              <li>• Saves to local queue if offline</li>
              <li>• No more hanging or timeouts!</li>
            </ul>
          </div>

          {/* Quick Submit Component */}
          <QuickTrendSubmit />

          {/* Debug Info */}
          <div className="bg-gray-800/50 rounded-xl p-4 text-xs font-mono text-gray-400">
            <div>Version: 2.0.0-instant</div>
            <div>Queue: localStorage enabled</div>
            <div>Retry: 3 attempts with exponential backoff</div>
            <div>Timeout: None (async processing)</div>
          </div>
        </div>
      </div>
    </div>
  );
}