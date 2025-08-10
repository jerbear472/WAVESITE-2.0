import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppNavigatorBeautiful } from './AppNavigatorBeautiful';
import SubmitTrendScreen from '../screens/SubmitTrendScreen';
import { theme } from '../styles/theme';

export type AppStackParamList = {
  MainTabs: undefined;
  SubmitTrend: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={AppNavigatorBeautiful} 
      />
      <Stack.Screen
        name="SubmitTrend"
        component={SubmitTrendScreen}
        options={{
          headerShown: true,
          headerTitle: 'Submit Trend',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.primary,
        }}
      />
    </Stack.Navigator>
  );
};