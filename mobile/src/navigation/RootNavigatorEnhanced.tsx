import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigatorClean } from './AuthNavigatorClean';
import { AppNavigatorBeautiful } from './AppNavigatorBeautiful';
import { LoadingScreenBeautiful } from '../screens/LoadingScreenBeautiful';
import { PersonaBuilderScreen } from '../screens/PersonaBuilderScreen';
import { theme } from '../styles/theme';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  PersonaBuilder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigatorEnhanced: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
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
      {user ? (
        <>
          <Stack.Screen 
            name="App" 
            component={AppNavigatorBeautiful}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen 
            name="PersonaBuilder" 
            component={PersonaBuilderScreen}
            options={{
              headerShown: true,
              headerTitle: 'Personalize Your Experience',
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTintColor: theme.colors.text,
              headerBackTitle: 'Back',
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerTitleStyle: {
                fontWeight: '400',
                fontSize: 18,
                color: theme.colors.text,
              },
              headerShadowVisible: false,
            }}
          />
        </>
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