import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigatorClean } from './AuthNavigatorClean';
import { AppStackNavigator } from './AppStackNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import WaveSightOnboarding from '../screens/onboarding/WaveSightOnboarding';
import { LoadingScreenBeautiful } from '../screens/LoadingScreenBeautiful';
import { theme } from '../styles/theme';
import { storage } from '../../App';

export type RootStackParamList = {
  Onboarding: undefined;
  WaveSightOnboarding: undefined;
  Auth: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigatorEnhanced: React.FC = () => {
  const { user, loading, needsCulturalAnalystOnboarding } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = () => {
    try {
      const onboardingCompleted = storage.getString('onboarding_completed');
      setIsOnboardingComplete(onboardingCompleted === 'true');
    } catch (error) {
      setIsOnboardingComplete(false);
    }
  };

  if (loading || isOnboardingComplete === null) {
    return <LoadingScreenBeautiful />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade',
        animationDuration: 250,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {!isOnboardingComplete ? (
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingNavigator}
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
      ) : !isOnboardingComplete ? (
        <Stack.Screen 
          name="WaveSightOnboarding" 
          component={WaveSightOnboarding}
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
      ) : user ? (
        <Stack.Screen 
          name="App" 
          component={AppStackNavigator}
          options={{
            animation: 'fade',
          }}
        />
      ) : (
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigatorClean}
          options={{
            animation: 'fade',
          }}
        />
      )}
    </Stack.Navigator>
  );
};