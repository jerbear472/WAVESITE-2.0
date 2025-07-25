import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnhancedCaptureScreen } from '../screens/EnhancedCaptureScreen';
import { ScrollSessionScreen } from '../screens/ScrollSessionScreen';
import { TrendRadar } from '../screens/TrendRadar';
import { ValidationScreenEnhanced } from '../screens/ValidationScreenEnhanced';
import { EarningsDashboard } from '../screens/EarningsDashboard';
import { ProfileScreen } from '../screens/ProfileScreen';
import { completeTheme } from '../styles/theme.complete';

type TabType = 'capture' | 'scroll' | 'trends' | 'validate' | 'earnings' | 'profile';

interface TabConfig {
  icon: string;
  label: string;
  gradient: string[];
}

const tabs: Record<TabType, TabConfig> = {
  capture: {
    icon: 'share-variant',
    label: 'Capture',
    gradient: completeTheme.gradients.primary,
  },
  scroll: {
    icon: 'timer-outline',
    label: 'Scroll',
    gradient: completeTheme.gradients.accent,
  },
  trends: {
    icon: 'radar',
    label: 'Trends',
    gradient: completeTheme.gradients.secondary,
  },
  validate: {
    icon: 'check-decagram',
    label: 'Validate',
    gradient: completeTheme.gradients.success,
  },
  earnings: {
    icon: 'cash-multiple',
    label: 'Earnings',
    gradient: completeTheme.gradients.warning,
  },
  profile: {
    icon: 'account',
    label: 'Profile',
    gradient: completeTheme.gradients.primary,
  },
};

const MainNavigatorComplete: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('capture');
  const insets = useSafeAreaInsets();

  const renderScreen = () => {
    switch (activeTab) {
      case 'capture':
        return <EnhancedCaptureScreen />;
      case 'scroll':
        return <ScrollSessionScreen />;
      case 'trends':
        return <TrendRadar />;
      case 'validate':
        return <ValidationScreenEnhanced />;
      case 'earnings':
        return <EarningsDashboard />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <EnhancedCaptureScreen />;
    }
  };

  const renderTabItem = (tabKey: TabType) => {
    const tab = tabs[tabKey];
    const isActive = activeTab === tabKey;

    return (
      <TouchableOpacity
        key={tabKey}
        style={styles.navItem}
        onPress={() => setActiveTab(tabKey)}
        activeOpacity={0.7}
      >
        <View style={styles.iconWrapper}>
          {isActive ? (
            <LinearGradient
              colors={tab.gradient}
              style={styles.activeIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name={tab.icon} size={completeTheme.components.tabBar.iconSize} color="#fff" />
            </LinearGradient>
          ) : (
            <View style={styles.iconContainer}>
              <Icon 
                name={tab.icon} 
                size={completeTheme.components.tabBar.iconSize} 
                color={completeTheme.colors.textTertiary} 
              />
            </View>
          )}
        </View>
        <Text style={[
          styles.navLabel,
          isActive && styles.activeNavLabel
        ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
      
      {/* Bottom Navigation */}
      <View style={[styles.bottomNavWrapper, { paddingBottom: insets.bottom }]}>
        <LinearGradient
          colors={['rgba(0, 8, 20, 0.95)', 'rgba(0, 29, 61, 0.98)']}
          style={styles.bottomNav}
        >
          <View style={styles.navContent}>
            {(Object.keys(tabs) as TabType[]).map(renderTabItem)}
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: completeTheme.colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNav: {
    paddingTop: completeTheme.spacing.md,
    paddingBottom: completeTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: completeTheme.colors.glassBorder,
    ...completeTheme.shadows.lg,
  },
  navContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: completeTheme.spacing.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: completeTheme.spacing.xs,
  },
  iconWrapper: {
    marginBottom: completeTheme.spacing.xs,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: completeTheme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: completeTheme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...completeTheme.shadows.primary,
  },
  navLabel: {
    fontSize: completeTheme.components.tabBar.labelSize,
    color: completeTheme.colors.textTertiary,
    fontWeight: completeTheme.typography.fontWeight.medium,
  },
  activeNavLabel: {
    color: completeTheme.colors.primary,
    fontWeight: completeTheme.typography.fontWeight.bold,
  },
});

export default MainNavigatorComplete;