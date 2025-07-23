import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { LoadingScreenEnhanced } from '../screens/LoadingScreenEnhanced';
import { PersonaBuilderScreen } from '../screens/PersonaBuilderScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { MyTrendsScreen } from '../screens/MyTrendsScreen';
import { enhancedTheme } from '../styles/theme.enhanced';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  PersonaBuilder: undefined;
  Achievements: undefined;
  MyTrends: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreenEnhanced />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      {user ? (
        <>
          <Stack.Screen 
            name="App" 
            component={AppNavigator}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen 
            name="PersonaBuilder" 
            component={PersonaBuilderScreen}
            options={{
              headerShown: true,
              headerTitle: 'Build Your Persona',
              headerStyle: {
                backgroundColor: enhancedTheme.colors.background,
              },
              headerTintColor: enhancedTheme.colors.text,
              headerBackTitle: 'Back',
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerTitleStyle: {
                fontWeight: '700',
                fontSize: 18,
                color: enhancedTheme.colors.text,
              },
              headerShadowVisible: false,
              headerBackTitleStyle: {
                fontSize: 16,
                color: enhancedTheme.colors.textSecondary,
              },
            }}
          />
          <Stack.Screen 
            name="Achievements" 
            component={AchievementsScreen}
            options={{
              headerShown: true,
              headerTitle: 'Achievements',
              headerStyle: {
                backgroundColor: enhancedTheme.colors.background,
              },
              headerTintColor: enhancedTheme.colors.text,
              headerBackTitle: 'Back',
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerTitleStyle: {
                fontWeight: '700',
                fontSize: 18,
                color: enhancedTheme.colors.text,
              },
              headerShadowVisible: false,
              headerBackTitleStyle: {
                fontSize: 16,
                color: enhancedTheme.colors.textSecondary,
              },
            }}
          />
          <Stack.Screen 
            name="MyTrends" 
            component={MyTrendsScreen}
            options={{
              headerShown: true,
              headerTitle: 'My Trends',
              headerStyle: {
                backgroundColor: enhancedTheme.colors.background,
              },
              headerTintColor: enhancedTheme.colors.text,
              headerBackTitle: 'Back',
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerTitleStyle: {
                fontWeight: '700',
                fontSize: 18,
                color: enhancedTheme.colors.text,
              },
              headerShadowVisible: false,
              headerBackTitleStyle: {
                fontSize: 16,
                color: enhancedTheme.colors.textSecondary,
              },
            }}
          />
        </>
      ) : (
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator}
          options={{
            animation: 'fade',
          }}
        />
      )}
    </Stack.Navigator>
  );
};