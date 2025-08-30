import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface XPNotification {
  id: string;
  amount: number;
  message: string;
  type: 'validation' | 'submission' | 'prediction' | 'bonus' | 'streak' | 'achievement';
}

interface XPNotificationContextType {
  showXPNotification: (amount: number, message: string, type?: XPNotification['type']) => void;
}

const XPNotificationContext = createContext<XPNotificationContextType | undefined>(undefined);

export const useXPNotification = () => {
  const context = useContext(XPNotificationContext);
  if (!context) {
    throw new Error('useXPNotification must be used within XPNotificationProvider');
  }
  return context;
};

const getNotificationStyle = (type: XPNotification['type']) => {
  switch (type) {
    case 'validation':
      return {
        gradientColors: ['#3B82F6', '#8B5CF6'] as const,
        icon: 'check-circle',
        iconColor: '#FFFFFF',
      };
    case 'submission':
      return {
        gradientColors: ['#10B981', '#34D399'] as const,
        icon: 'trending-up',
        iconColor: '#FFFFFF',
      };
    case 'prediction':
      return {
        gradientColors: ['#8B5CF6', '#EC4899'] as const,
        icon: 'target',
        iconColor: '#FFFFFF',
      };
    case 'bonus':
      return {
        gradientColors: ['#F59E0B', '#EF4444'] as const,
        icon: 'star',
        iconColor: '#FFFFFF',
      };
    case 'streak':
      return {
        gradientColors: ['#EF4444', '#F97316'] as const,
        icon: 'fire',
        iconColor: '#FFFFFF',
      };
    case 'achievement':
      return {
        gradientColors: ['#FFD700', '#FFA500'] as const,
        icon: 'trophy',
        iconColor: '#FFFFFF',
      };
    default:
      return {
        gradientColors: ['#6366F1', '#8B5CF6'] as const,
        icon: 'lightning-bolt',
        iconColor: '#FFFFFF',
      };
  }
};

const XPNotificationItem: React.FC<{
  notification: XPNotification;
  onRemove: () => void;
}> = ({ notification, onRemove }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto remove after 3 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onRemove();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const style = getNotificationStyle(notification.type);

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={style.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientContainer}
      >
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Icon name={style.icon} size={24} color={style.iconColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.amountText}>+{notification.amount} XP</Text>
            <Text style={styles.messageText}>{notification.message}</Text>
          </View>
        </View>
        
        {/* Shimmer effect */}
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [
                {
                  translateX: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
                  }),
                },
              ],
            },
          ]}
        />
      </LinearGradient>
    </Animated.View>
  );
};

export const XPNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<XPNotification[]>([]);

  const showXPNotification = useCallback(
    (amount: number, message: string, type: XPNotification['type'] = 'bonus') => {
      const id = `${Date.now()}-${Math.random()}`;
      const notification: XPNotification = {
        id,
        amount,
        message,
        type,
      };

      setNotifications((prev) => [...prev, notification]);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <XPNotificationContext.Provider value={{ showXPNotification }}>
      {children}
      <View style={styles.notificationOverlay} pointerEvents="box-none">
        {notifications.map((notification) => (
          <XPNotificationItem
            key={notification.id}
            notification={notification}
            onRemove={() => removeNotification(notification.id)}
          />
        ))}
      </View>
    </XPNotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  notificationOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  notificationContainer: {
    width: SCREEN_WIDTH * 0.9,
    marginBottom: 10,
  },
  gradientContainer: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    overflow: 'hidden',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
});