import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreenPolished } from '../screens/LoginScreenPolished';
import { RegisterScreenPolished } from '../screens/RegisterScreenPolished';
import { WelcomeScreenPolished } from '../screens/WelcomeScreenPolished';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000d1a' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreenPolished} />
      <Stack.Screen name="Login" component={LoginScreenPolished} />
      <Stack.Screen name="Register" component={RegisterScreenPolished} />
    </Stack.Navigator>
  );
};