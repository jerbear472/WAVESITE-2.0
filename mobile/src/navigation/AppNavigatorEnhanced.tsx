import React from 'react';
import { View, Text, Platform, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import { DashboardScreenClean } from '../screens/DashboardScreenClean';
import { TrendCaptureScreenPolished } from '../screens/TrendCaptureScreenPolished';
import { ValidationScreenUpdated } from '../screens/ValidationScreenUpdated';
import MyTimelineScreen from '../screens/MyTimelineScreen';
import { ProfileScreenClean } from '../screens/ProfileScreenClean';
import { TrendsScreen } from '../screens/TrendsScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
// MyTimelineScreen is already imported above
import { AchievementsScreen } from '../screens/AchievementsScreen';

import { enhancedTheme } from '../styles/theme.enhanced';

export type AppTabParamList = {
  Home: undefined;
  Capture: undefined;
  Validate: undefined;
  Timeline: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  MyTimeline: undefined;
  Achievements: undefined;
  Trends: undefined;
  Leaderboard: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

interface TabIconProps {
  name: string;
  color: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => {
  const scale = useSharedValue(focused ? 1 : 0.9);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 0.9, {
      damping: 15,
      stiffness: 150,
    });
    
    if (focused) {
      rotation.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withSpring(0, { damping: 10 })
      );
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const iconMap: { [key: string]: string } = {
    Home: 'view-dashboard',
    Capture: 'eye-outline',
    Validate: 'check-decagram',
    Timeline: 'timeline-clock',
    Profile: 'account-circle',
  };

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      {focused ? (
        <LinearGradient
          colors={enhancedTheme.colors.primaryGradient}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name={iconMap[name]} size={24} color="#ffffff" />
        </LinearGradient>
      ) : (
        <View style={styles.iconGradient}>
          <Icon name={iconMap[name]} size={24} color={enhancedTheme.colors.textTertiary} />
        </View>
      )}
    </Animated.View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarContainer}>
      <BlurView
        style={StyleSheet.absoluteFillObject}
        blurType="dark"
        blurAmount={20}
        reducedTransparencyFallbackColor={enhancedTheme.colors.backgroundSecondary}
      />
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              <TabIcon
                name={route.name}
                color={isFocused ? enhancedTheme.colors.accent : enhancedTheme.colors.textTertiary}
                focused={isFocused}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelFocused,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreenClean}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Capture" 
        component={TrendCaptureScreenPolished}
        options={{ title: 'Spot' }}
      />
      <Tab.Screen 
        name="Validate" 
        component={ValidationScreenUpdated}
        options={{ title: 'Validate' }}
      />
      <Tab.Screen 
        name="Timeline" 
        component={MyTimelineScreen}
        options={{ title: 'Timeline' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreenClean}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigatorEnhanced: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator}
      />
      <Stack.Screen 
        name="MyTimeline" 
        component={MyTimelineScreen}
        options={{
          headerShown: true,
          headerTitle: 'My Timeline',
          headerStyle: {
            backgroundColor: enhancedTheme.colors.background,
          },
          headerTintColor: enhancedTheme.colors.text,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
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
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="Trends" 
        component={TrendsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Trending Now',
          headerStyle: {
            backgroundColor: enhancedTheme.colors.background,
          },
          headerTintColor: enhancedTheme.colors.text,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
        options={{
          headerShown: true,
          headerTitle: 'Leaderboard',
          headerStyle: {
            backgroundColor: enhancedTheme.colors.background,
          },
          headerTintColor: enhancedTheme.colors.text,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: enhancedTheme.colors.glass,
    borderTopWidth: 1,
    borderTopColor: enhancedTheme.colors.glassBorder,
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconGradient: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    opacity: 0.2,
  },
  icon: {
    fontSize: 26,
  },
  iconFocused: {
    fontSize: 28,
  },
  tabLabel: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
  },
  tabLabelFocused: {
    color: enhancedTheme.colors.text,
    fontWeight: '600',
  },
});