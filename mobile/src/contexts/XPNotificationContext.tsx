import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

interface XPNotification {
  id: string;
  amount: number;
  message: string;
  type: 'trend_submission' | 'validation' | 'streak' | 'achievement' | 'bonus';
}

interface XPNotificationContextType {
  showXPNotification: (amount: number, message: string, type?: XPNotification['type']) => void;
  notifications: XPNotification[];
}

const XPNotificationContext = createContext<XPNotificationContextType | undefined>(undefined);

export const useXPNotification = () => {
  const context = useContext(XPNotificationContext);
  if (!context) {
    throw new Error('useXPNotification must be used within XPNotificationProvider');
  }
  return context;
};

interface XPNotificationProviderProps {
  children: ReactNode;
}

export const XPNotificationProvider: React.FC<XPNotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<XPNotification[]>([]);

  const showXPNotification = useCallback((
    amount: number,
    message: string,
    type: XPNotification['type'] = 'bonus'
  ) => {
    const id = Date.now().toString();
    const notification: XPNotification = {
      id,
      amount,
      message,
      type,
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);

    // Dispatch custom event for other components to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('xp-earned', { 
        detail: { amount, message, type } 
      }));
    }
  }, []);

  const value = {
    showXPNotification,
    notifications,
  };

  return (
    <XPNotificationContext.Provider value={value}>
      {children}
    </XPNotificationContext.Provider>
  );
};

export default XPNotificationProvider;