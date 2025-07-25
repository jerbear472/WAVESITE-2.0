import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import HapticFeedback from 'react-native-haptic-feedback';

// Import screens
import CaptureTrendsScreen from '../screens/CaptureTrendsScreen';
import { TrendsScreen } from '../screens/TrendsScreen';
import MyTimelineScreen from '../screens/MyTimelineScreen';
import { ValidationScreen } from '../screens/ValidationScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Import enhanced features
import { useTheme } from '../contexts/ThemeContext';
import { usePerformance } from '../contexts/PerformanceContext';

const { width } = Dimensions.get('window');

type TabType = 'capture' | 'validate' | 'trends' | 'my-timeline' | 'profile';

interface TabConfig {
  key: TabType;
  label: string;
  icon: string;
  activeIcon: string;
  color: string;
}

const tabs: TabConfig[] = [
  { key: 'capture', label: 'Capture', icon: 'camera-outline', activeIcon: 'camera', color: '#007AFF' },
  { key: 'validate', label: 'Validate', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle', color: '#34C759' },
  { key: 'trends', label: 'Trends', icon: 'trending-up-outline', activeIcon: 'trending-up', color: '#5856D6' },
  { key: 'my-timeline', label: 'Timeline', icon: 'time-outline', activeIcon: 'time', color: '#FF9500' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', color: '#FF3B30' },
];

// Enhanced tab button component
const AnimatedTabButton: React.FC<{
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, isActive, onPress }) => {
  const scale = useSharedValue(isActive ? 1 : 0.9);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(isActive ? 1 : 0.7);
  const { theme } = useTheme();

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.1 : 1, {
      damping: 15,
      stiffness: 150,
    });
    translateY.value = withSpring(isActive ? -3 : 0, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withTiming(isActive ? 1 : 0.7, {
      duration: 200,
    });
  }, [isActive]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: interpolate(scale.value, [1, 1.1], [0.9, 1]) }],
  }));

  const handlePress = () => {
    HapticFeedback.trigger('impactLight');
    runOnJS(onPress)();
  };

  return (
    <Pressable
      style={styles.navItem}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.95);
      }}
      onPressOut={() => {
        scale.value = withSpring(isActive ? 1.1 : 1);
      }}
    >
      <Animated.View style={[styles.navIconContainer, animatedIconStyle]}>
        {isActive && (
          <View style={StyleSheet.absoluteFillObject}>
            <LinearGradient
              colors={[tab.color + '20', tab.color + '10']}
              style={styles.iconBackground}
            />
          </View>
        )}
        <Icon
          name={isActive ? tab.activeIcon : tab.icon}
          size={26}
          color={isActive ? tab.color : theme.colors.textSecondary}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.navLabel,
          animatedLabelStyle,
          { color: isActive ? tab.color : theme.colors.textSecondary }
        ]}
      >
        {tab.label}
      </Animated.Text>
      {isActive && (
        <View style={[styles.activeIndicator, { backgroundColor: tab.color }]} />
      )}
    </Pressable>
  );
};

// Screen transition wrapper
const ScreenTransition: React.FC<{ children: React.ReactNode; isActive: boolean }> = ({
  children,
  isActive,
}) => {
  const translateX = useSharedValue(isActive ? 0 : width);
  const opacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    translateX.value = withSpring(isActive ? 0 : width, {
      damping: 20,
      stiffness: 90,
    });
    opacity.value = withTiming(isActive ? 1 : 0, {
      duration: 300,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  if (!isActive) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

// Main Navigator Component
const MainNavigatorEnhanced: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('capture');
  const { theme } = useTheme();
  const performance = usePerformance();
  const tabIndicatorPosition = useSharedValue(0);

  useEffect(() => {
    performance.startTrace('nav_main_mount');
    return () => {
      performance.endTrace('nav_main_mount');
    };
  }, []);

  useEffect(() => {
    const tabIndex = tabs.findIndex(tab => tab.key === activeTab);
    tabIndicatorPosition.value = withSpring((width / tabs.length) * tabIndex, {
      damping: 20,
      stiffness: 90,
    });
  }, [activeTab]);

  const handleTabPress = (tab: TabType) => {
    performance.logMetric('navigation', `tab_switch_${tab}`, Date.now());
    setActiveTab(tab);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorPosition.value }],
  }));

  const renderScreen = () => {
    return (
      <View style={styles.screenContainer}>
        <ScreenTransition isActive={activeTab === 'capture'}>
          <CaptureTrendsScreen />
        </ScreenTransition>
        <ScreenTransition isActive={activeTab === 'validate'}>
          <ValidationScreen />
        </ScreenTransition>
        <ScreenTransition isActive={activeTab === 'trends'}>
          <TrendsScreen />
        </ScreenTransition>
        <ScreenTransition isActive={activeTab === 'my-timeline'}>
          <MyTimelineScreen onBack={() => setActiveTab('capture')} />
        </ScreenTransition>
        <ScreenTransition isActive={activeTab === 'profile'}>
          <ProfileScreen />
        </ScreenTransition>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderScreen()}
      
      {/* Enhanced Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface }]}>
        {/* Animated indicator */}
        <Animated.View style={[styles.tabIndicator, indicatorStyle]}>
          <LinearGradient
            colors={[theme.colors.primary + '40', theme.colors.primary + '00']}
            style={styles.indicatorGradient}
          />
        </Animated.View>

        {/* Tab buttons */}
        {tabs.map((tab) => (
          <AnimatedTabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => handleTabPress(tab.key)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    position: 'relative',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: width / 5,
    height: 3,
  },
  indicatorGradient: {
    flex: 1,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingTop: 8,
  },
  navIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    position: 'relative',
  },
  iconBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -12,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export default MainNavigatorEnhanced;