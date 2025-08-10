import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreenClean } from '../screens/DashboardScreenClean';
import { CaptureScreenClean } from '../screens/CaptureScreenClean';
import { TimelineScreen } from '../screens/TimelineScreen';
import { ValidationScreenClean } from '../screens/ValidationScreenClean';
import { ProfileScreenClean } from '../screens/ProfileScreenClean';
import { theme } from '../styles/theme';

export type AppTabParamList = {
  Home: undefined;
  Capture: undefined;
  Timeline: undefined;
  Validate: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, icon, label }) => (
  <View style={styles.tabItem}>
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
  </View>
);

export const AppNavigatorBeautiful: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreenClean}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🏠" label="Home" />
          ),
        }}
      />
      <Tab.Screen
        name="Capture"
        component={CaptureScreenClean}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📸" label="Capture" />
          ),
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📊" label="My Timeline" />
          ),
        }}
      />
      <Tab.Screen
        name="Validate"
        component={ValidationScreenClean}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="✅" label="Validate" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreenClean}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👤" label="Profile" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.md,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: theme.colors.textMuted,
  },
  tabLabelFocused: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
});