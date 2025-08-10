import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SimpleOnboarding from '../screens/onboarding/SimpleOnboarding';

export type OnboardingStackParamList = {
  Welcome: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Welcome" component={SimpleOnboarding} />
    </Stack.Navigator>
  );
};