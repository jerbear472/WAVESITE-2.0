'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Star, Target, Flame, Clock } from 'lucide-react';

interface XPNotification {
  id: string;
  amount: number;
  reason: string;
  type: 'submission' | 'validation' | 'prediction' | 'streak' | 'achievement' | 'bonus' | 'session';
  timestamp: number;
  title?: string;
  subtitle?: string;
}

interface XPNotificationContextType {
  showXPNotification: (amount: number, reason: string, type?: XPNotification['type'], title?: string, subtitle?: string) => void;
}

const XPNotificationContext = createContext<XPNotificationContextType | undefined>(undefined);

export const useXPNotification = () => {
  const context = useContext(XPNotificationContext);
  if (!context) {
    throw new Error('useXPNotification must be used within an XPNotificationProvider');
  }
  return context;
};

export const XPNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<XPNotification[]>([]);

  const showXPNotification = useCallback((amount: number, reason: string, type: XPNotification['type'] = 'submission', title?: string, subtitle?: string) => {
    const id = `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: XPNotification = {
      id,
      amount,
      reason,
      type,
      timestamp: Date.now(),
      title,
      subtitle
    };

    setNotifications(prev => [...prev, notification]);

    // Dispatch custom event for real-time dashboard updates
    window.dispatchEvent(new CustomEvent('xp-earned', { detail: { amount, type, reason } }));

    // Auto-remove notification after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const getNotificationIcon = (type: XPNotification['type']) => {
    switch (type) {
      case 'submission': return <Zap className="w-5 h-5 text-blue-400" />;
      case 'validation': return <Target className="w-5 h-5 text-purple-400" />;
      case 'prediction': return <Star className="w-5 h-5 text-yellow-400" />;
      case 'achievement': return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'streak': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'bonus': return <Star className="w-5 h-5 text-green-400" />;
      case 'session': return <Clock className="w-5 h-5 text-cyan-400" />;
      default: return <Zap className="w-5 h-5 text-blue-400" />;
    }
  };

  const getNotificationColors = (type: XPNotification['type']) => {
    switch (type) {
      case 'submission': return 'from-blue-500 to-indigo-500 border-blue-200';
      case 'validation': return 'from-purple-500 to-violet-500 border-purple-200';
      case 'prediction': return 'from-yellow-500 to-amber-500 border-yellow-200';
      case 'achievement': return 'from-amber-500 to-orange-500 border-amber-200';
      case 'streak': return 'from-orange-500 to-red-500 border-orange-200';
      case 'bonus': return 'from-green-500 to-emerald-500 border-green-200';
      case 'session': return 'from-cyan-500 to-teal-500 border-cyan-200';
      default: return 'from-blue-500 to-indigo-500 border-blue-200';
    }
  };

  return (
    <XPNotificationContext.Provider value={{ showXPNotification }}>
      {children}
      
      {/* XP Notification Container - Bottom Left */}
      <div className="fixed bottom-6 left-6 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.8 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className={`
                bg-gradient-to-r ${getNotificationColors(notification.type)}
                text-white rounded-xl shadow-2xl border p-4 min-w-[280px] max-w-[320px]
                backdrop-blur-sm pointer-events-auto
              `}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <p className="text-xs text-white/90 font-semibold mb-1">
                      {notification.title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold">
                      +{notification.amount} XP
                    </span>
                    <div className="flex-1 h-px bg-white/30"></div>
                  </div>
                  <p className="text-sm text-white/90">
                    {notification.reason}
                  </p>
                  {notification.subtitle && (
                    <p className="text-xs text-white/70 mt-1">
                      {notification.subtitle}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Progress bar showing time remaining */}
              <motion.div 
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4, ease: "linear" }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </XPNotificationContext.Provider>
  );
};