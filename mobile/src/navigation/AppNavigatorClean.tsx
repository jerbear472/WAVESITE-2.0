import React from 'react';
import { View, Text, Platform, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { TrendCaptureScreenPolished } from '../screens/TrendCaptureScreenPolished';
import { ValidationScreenClean } from '../screens/ValidationScreenClean';
import MyTimelineScreen from '../screens/MyTimelineScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EarningsDashboard } from '../screens/EarningsDashboard';
import { TrendsScreen } from '../screens/TrendsScreen';
// MyTimelineScreen is already imported above
import { AchievementsScreen } from '../screens/AchievementsScreen';

import { enhancedTheme } from '../styles/theme.enhanced';

export type AppTabParamList = {
  Predict: undefined;
  Capture: undefined;
  Home: undefined;
  Timeline: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  Earnings: undefined;
  MyTimeline: undefined;
  Achievements: undefined;
  Trends: undefined;
  Leaderboard: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

interface TabIconProps {
  name: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => {
  const opacity = useSharedValue(focused ? 1 : 0.6);

  React.useEffect(() => {
    opacity.value = withTiming(focused ? 1 : 0.6, { duration: 200 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const iconMap: { [key: string]: string } = {
    Predict: 'trending-up',
    Capture: 'camera',
    Home: 'chart-line',
    Timeline: 'history',
    Profile: 'account',
  };

  return (
    <Animated.View style={animatedStyle}>
      <Icon 
        name={iconMap[name]} 
        size={24} 
        color={focused ? enhancedTheme.colors.primary : enhancedTheme.colors.textTertiary} 
      />
    </Animated.View>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="Predict"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: enhancedTheme.colors.primary,
        tabBarInactiveTintColor: enhancedTheme.colors.textTertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen 
        name="Predict" 
        component={TrendsScreen}
        options={{ tabBarLabel: 'Predict' }}
      />
      <Tab.Screen 
        name="Capture" 
        component={TrendCaptureScreenPolished}
        options={{ tabBarLabel: 'Capture' }}
      />
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Stats' }}
      />
      <Tab.Screen 
        name="Timeline" 
        component={MyTimelineScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigatorClean = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="Earnings" 
        component={EarningsDashboard}
        options={{ 
          animation: 'slide_from_right',
          headerShown: true,
          headerTitle: 'Earnings',
          headerStyle: styles.header,
          headerTintColor: enhancedTheme.colors.text,
        }}
      />
      <Stack.Screen 
        name="MyTimeline" 
        component={MyTimelineScreen}
        options={{ 
          animation: 'slide_from_right',
          headerShown: true,
          headerTitle: 'My Timeline',
          headerStyle: styles.header,
          headerTintColor: enhancedTheme.colors.text,
        }}
      />
      <Stack.Screen 
        name="Achievements" 
        component={AchievementsScreen}
        options={{ 
          animation: 'slide_from_right',
          headerShown: true,
          headerTitle: 'Achievements',
          headerStyle: styles.header,
          headerTintColor: enhancedTheme.colors.text,
        }}
      />
      <Stack.Screen 
        name="Trends" 
        component={TrendsScreen}
        options={{ 
          animation: 'slide_from_right',
          headerShown: true,
          headerTitle: 'Trends',
          headerStyle: styles.header,
          headerTintColor: enhancedTheme.colors.text,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: enhancedTheme.colors.background,
    borderTopWidth: 1,
    borderTopColor: enhancedTheme.colors.border,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  header: {
    backgroundColor: enhancedTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: enhancedTheme.colors.border,
  },
});