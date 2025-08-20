'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/contexts/SessionContext';
import { 
  Clock, 
  Flame, 
  X, 
  Minimize2, 
  Maximize2,
  Pause,
  Play,
  TrendingUp
} from 'lucide-react';

export default function FloatingSessionTimer() {
  const { session, startSession, endSession, isSessionActive } = useSession();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    // Check localStorage to persist hidden state
    if (typeof window !== 'undefined') {
      return localStorage.getItem('floatingTimerHidden') === 'true';
    }
    return false;
  });

  // Safety check for session
  if (!session) {
    return null;
  }

  // Always show the timer if we're on a page where sessions matter
  // (Don't hide it completely when session is inactive)

  // Handle hiding/showing
  const handleHide = () => {
    setIsHidden(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('floatingTimerHidden', 'true');
    }
  };

  const handleShow = () => {
    setIsHidden(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('floatingTimerHidden');
    }
  };

  // Show restore button if hidden
  if (isHidden) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={handleShow}
        className="fixed bottom-6 right-6 z-50 p-3 bg-gray-900/95 backdrop-blur-xl rounded-full border border-gray-700 shadow-2xl hover:bg-gray-800/95 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          {session.isActive && (
            <span className="font-mono text-sm font-bold text-white">
              {formatTime(session.duration)}
            </span>
          )}
        </div>
      </motion.button>
    );
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 100 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          width: isMinimized ? 'auto' : '320px'
        }}
        exit={{ opacity: 0, scale: 0.8, y: 100 }}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        whileDrag={{ scale: 1.05 }}
        className={`fixed bottom-6 right-6 z-50 ${
          isMinimized ? 'w-auto' : 'w-80'
        }`}
        style={{ touchAction: 'none' }}
      >
        <div className={`bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden ${
          isMinimized ? 'p-3' : 'p-4'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {session.isActive ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-green-400">LIVE SESSION</span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-gray-400">SESSION PAUSED</span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="w-3 h-3 text-gray-400" />
                ) : (
                  <Minimize2 className="w-3 h-3 text-gray-400" />
                )}
              </button>
              <button
                onClick={handleHide}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Timer Display */}
              {session.isActive && (
                <div className="flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="flex items-center gap-2 justify-center mb-1">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-2xl font-bold text-white font-mono">
                        {formatTime(session.duration)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Session Duration</p>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-purple-400" />
                    <span className="text-lg font-bold text-white">{session.trendsLogged}</span>
                  </div>
                  <p className="text-xs text-gray-400">Trends</p>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-lg font-bold text-white">{session.currentStreak}</span>
                  </div>
                  <p className="text-xs text-gray-400">Streak</p>
                </div>
              </div>

              {/* Streak Timer */}
              {session.currentStreak > 0 && session.streakTimeRemaining > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-orange-400">Streak expires in:</span>
                    <span className="text-xs font-bold text-orange-300">
                      {formatTime(session.streakTimeRemaining)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                      initial={{ width: '100%' }}
                      animate={{ 
                        width: `${(session.streakTimeRemaining / (5 * 60)) * 100}%` 
                      }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              )}

              {/* Multiplier Display */}
              {session.streakMultiplier > 1 && (
                <div className="text-center mb-3">
                  <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm font-semibold text-purple-400">
                    {session.streakMultiplier}x Multiplier Active
                  </span>
                </div>
              )}

              {/* Control Button */}
              <button
                onClick={session.isActive ? endSession : startSession}
                className={`w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  session.isActive
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30'
                }`}
              >
                {session.isActive ? (
                  <>
                    <Pause className="w-4 h-4" />
                    End Session
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Session
                  </>
                )}
              </button>
            </>
          )}

          {/* Minimized View */}
          {isMinimized && (
            <div className="flex items-center gap-3">
              {session.isActive && (
                <span className="font-mono font-bold text-white">
                  {formatTime(session.duration)}
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-purple-400" />
                  <span className="text-sm font-bold text-white">{session.trendsLogged}</span>
                </div>
                {session.currentStreak > 0 && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-sm font-bold text-white">{session.currentStreak}</span>
                  </div>
                )}
              </div>
              {/* Add control button in minimized view */}
              <button
                onClick={session.isActive ? endSession : startSession}
                className={`p-1.5 rounded-lg transition-colors ${
                  session.isActive
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                }`}
              >
                {session.isActive ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}