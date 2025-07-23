import React from 'react';
import { View, Text, Platform, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import { TrendCaptureScreen } from '../screens/TrendCaptureScreen';
import { TrendsScreen } from '../screens/TrendsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { enhancedTheme } from '../styles/theme.enhanced';

export type AppTabParamList = {
  Capture: undefined;
  Trends: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

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

  const icons: { [key: string]: { icon: string; gradient: string[] } } = {
    Capture: { 
      icon: '🚩', 
      gradient: enhancedTheme.colors.primaryGradient 
    },
    Trends: { 
      icon: '📊', 
      gradient: enhancedTheme.colors.successGradient 
    },
    Profile: { 
      icon: '✨', 
      gradient: enhancedTheme.colors.secondaryGradient 
    },
  };

  const { icon, gradient } = icons[name];

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      {focused && (
        <LinearGradient
          colors={gradient}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <Text style={[styles.icon, focused && styles.iconFocused]}>{icon}</Text>
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

export const AppNavigatorEnhanced: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Capture" 
        component={TrendCaptureScreen}
        options={{ title: 'Capture' }}
      />
      <Tab.Screen 
        name="Trends" 
        component={TrendsScreen}
        options={{ title: 'Discover' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
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