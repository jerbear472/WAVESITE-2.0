import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TrendCaptureScreen } from '../screens/TrendCaptureScreen';
import { TrendsScreen } from '../screens/TrendsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ValidationScreen } from '../screens/ValidationScreen';
import { View, Text, Platform, Image } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { enhancedTheme } from '../styles/theme.enhanced';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { Logo } from '../components/Logo';

export type AppTabParamList = {
  Capture: undefined;
  Validate: undefined;
  Trends: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const TabIcon = ({ name, color, focused }: { name: string; color: string; focused: boolean }) => {
  const iconMap: { [key: string]: string } = {
    Capture: 'flag',
    Validate: 'check-circle',
    Trends: 'trending-up',
    Profile: 'account',
  };
  
  const emojiMap: { [key: string]: string } = {
    Capture: '🚩',
    Validate: '✅',
    Trends: '📊',
    Profile: '👤',
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(focused ? 1.15 : 1, {
          damping: 15,
          stiffness: 150,
        }),
      },
    ],
  }));
  
  return (
    <Animated.View style={[{ alignItems: 'center' }, animatedStyle]}>
      {focused ? (
        <LinearGradient
          colors={enhancedTheme.colors.primaryGradient}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>{emojiMap[name]}</Text>
        </LinearGradient>
      ) : (
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
          }}
        >
          <Text style={{ fontSize: 24, opacity: 0.6 }}>{emojiMap[name]}</Text>
        </View>
      )}
    </Animated.View>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: enhancedTheme.colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: enhancedTheme.colors.glassBorder,
        },
        headerTintColor: enhancedTheme.colors.text,
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image
              source={require('../assets/images/logo2.png')}
              style={{ width: 32, height: 32, borderRadius: 10 }}
              resizeMode="cover"
            />
            <Text style={{
              fontSize: 20,
              fontWeight: '800',
              color: enhancedTheme.colors.text,
              letterSpacing: 1,
            }}>
              WAVESIGHT
            </Text>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: enhancedTheme.colors.backgroundSecondary,
          borderTopColor: enhancedTheme.colors.glassBorder,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 70,
          elevation: 0,
        },
        tabBarActiveTintColor: enhancedTheme.colors.primary,
        tabBarInactiveTintColor: enhancedTheme.colors.textTertiary,
        tabBarIcon: ({ color, focused }) => <TabIcon name={route.name} color={color} focused={focused} />,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Capture" 
        component={TrendCaptureScreen}
        options={{ title: 'Capture' }}
      />
      <Tab.Screen 
        name="Validate" 
        component={ValidationScreen}
        options={{ title: 'Validate' }}
      />
      <Tab.Screen 
        name="Trends" 
        component={TrendsScreen}
        options={{ title: 'Trends' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};