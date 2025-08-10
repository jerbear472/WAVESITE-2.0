import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreenClean } from '../screens/WelcomeScreenClean';
import { LoginScreenClean } from '../screens/LoginScreenClean';
import { RegisterScreenBeautiful } from '../screens/RegisterScreenBeautiful';
import { theme } from '../styles/theme';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigatorClean: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: 'slide_from_right',
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreenClean} />
      <Stack.Screen name="Login" component={LoginScreenClean} />
      <Stack.Screen name="Register" component={RegisterScreenBeautiful} />
    </Stack.Navigator>
  );
};