import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../contexts';
import { designSystem } from '../styles/designSystem';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignalsScreen from '../screens/SignalsScreen';
import SignalDetailScreen from '../screens/SignalDetailScreen';
import AccuracyScreen from '../screens/AccuracyScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AlertsScreen from '../screens/AlertsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoadingScreen from '../screens/LoadingScreen';

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  SignalDetail: { signalId: string };
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Signals: undefined;
  Accuracy: undefined;
  History: undefined;
  Alerts: undefined;
  Settings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: designSystem.colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  const { colors } = designSystem;

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Signals':
              iconName = focused ? 'pulse' : 'pulse';
              break;
            case 'Accuracy':
              iconName = focused ? 'target' : 'target';
              break;
            case 'History':
              iconName = focused ? 'chart-timeline-variant' : 'chart-timeline-variant';
              break;
            case 'Alerts':
              iconName = focused ? 'bell' : 'bell-outline';
              break;
            case 'Settings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
      })}
    >
      <MainTab.Screen
        name="Signals"
        component={SignalsScreen}
        options={{ tabBarLabel: 'Signals' }}
      />
      <MainTab.Screen
        name="Accuracy"
        component={AccuracyScreen}
        options={{ tabBarLabel: 'Accuracy' }}
      />
      <MainTab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <MainTab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ tabBarLabel: 'Alerts' }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </MainTab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = designSystem;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text.primary,
          border: colors.border,
          notification: colors.danger,
        },
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="Main" component={MainNavigator} />
            <RootStack.Screen
              name="SignalDetail"
              component={SignalDetailScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
