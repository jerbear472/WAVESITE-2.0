import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  View,
  Text,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  runOnJS,
  SharedValue,
  withRepeat,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import HapticFeedback from 'react-native-haptic-feedback';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface FABAction {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  onPress?: () => void;
  icon?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  style?: any;
  mini?: boolean;
  animated?: boolean;
  gradientColors?: string[];
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions,
  onPress,
  icon = 'add',
  position = 'bottom-right',
  style,
  mini = false,
  animated = true,
  gradientColors,
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const mainButtonScale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const actionScales = actions?.map(() => useSharedValue(0)) || [];
  const actionTranslates = actions?.map(() => useSharedValue(0)) || [];
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });

    // Pulse animation
    if (animated) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, []);

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    HapticFeedback.trigger('impactMedium');

    // Rotate main button
    rotation.value = withSpring(newExpanded ? 45 : 0, {
      damping: 15,
      stiffness: 150,
    });

    // Show/hide backdrop
    backdropOpacity.value = withTiming(newExpanded ? 1 : 0, {
      duration: 200,
    });

    // Animate action buttons
    if (actions) {
      actions.forEach((_, index) => {
        if (newExpanded) {
          actionScales[index].value = withDelay(
            index * 50,
            withSpring(1, {
              damping: 15,
              stiffness: 150,
            })
          );
          actionTranslates[index].value = withDelay(
            index * 50,
            withSpring((index + 1) * 70, {
              damping: 15,
              stiffness: 150,
            })
          );
        } else {
          actionScales[index].value = withSpring(0);
          actionTranslates[index].value = withSpring(0);
        }
      });
    }
  };

  const handleMainPress = () => {
    if (actions && actions.length > 0) {
      toggleExpanded();
    } else if (onPress) {
      HapticFeedback.trigger('impactMedium');
      mainButtonScale.value = withSequence(
        withSpring(0.9, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
      runOnJS(onPress)();
    }
  };

  const handleActionPress = (action: FABAction, index: number) => {
    HapticFeedback.trigger('impactLight');
    
    // Animate the pressed action
    actionScales[index].value = withSequence(
      withSpring(1.2, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );

    // Close the menu after a delay
    setTimeout(() => {
      runOnJS(action.onPress)();
      toggleExpanded();
    }, 200);
  };

  const getPositionStyles = () => {
    const base = { position: 'absolute' as const };
    switch (position) {
      case 'bottom-left':
        return { ...base, bottom: 20, left: 20 };
      case 'bottom-center':
        return { ...base, bottom: 20, left: screenWidth / 2 - 28 };
      default:
        return { ...base, bottom: 20, right: 20 };
    }
  };

  const mainButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value * mainButtonScale.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: interpolate(
        pulse.value,
        [1, 1.1],
        [0.3, 0],
        Extrapolate.CLAMP
      ),
    };
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
      pointerEvents: isExpanded ? 'auto' : 'none',
    };
  });

  const colors = gradientColors || [theme.colors.primary, theme.colors.secondary];

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, backdropAnimatedStyle]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={toggleExpanded}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurType="dark"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.5)"
          />
        </Pressable>
      </Animated.View>

      {/* Action Buttons */}
      {actions?.map((action, index) => {
        const actionAnimatedStyle = useAnimatedStyle(() => {
          return {
            transform: [
              { scale: actionScales[index].value },
              { translateY: -actionTranslates[index].value },
            ],
            opacity: actionScales[index].value,
          };
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.actionButton,
              getPositionStyles(),
              actionAnimatedStyle,
            ]}
          >
            <Pressable
              onPress={() => handleActionPress(action, index)}
              style={styles.actionPressable}
            >
              <View style={[styles.actionContent, { backgroundColor: action.color || theme.colors.surface }]}>
                <Icon name={action.icon} size={24} color={theme.colors.text} />
              </View>
              <View style={styles.actionLabelContainer}>
                <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                  {action.label}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* Main FAB */}
      <View style={[getPositionStyles(), style]}>
        {/* Pulse effect */}
        {animated && !isExpanded && (
          <Animated.View
            style={[
              styles.pulseEffect,
              pulseAnimatedStyle,
              { width: mini ? 40 : 56, height: mini ? 40 : 56 },
            ]}
          >
            <LinearGradient
              colors={[...colors, 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        )}

        {/* Main button */}
        <Animated.View style={mainButtonAnimatedStyle}>
          <Pressable
            onPress={handleMainPress}
            onPressIn={() => {
              mainButtonScale.value = withSpring(0.9);
            }}
            onPressOut={() => {
              mainButtonScale.value = withSpring(1);
            }}
            style={[
              styles.mainButton,
              mini && styles.miniButton,
            ]}
          >
            <LinearGradient
              colors={colors}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Icon
              name={icon}
              size={mini ? 20 : 28}
              color="#FFFFFF"
            />
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  miniButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pulseEffect: {
    position: 'absolute',
    borderRadius: 100,
    zIndex: 999,
  },
  actionButton: {
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionContent: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionLabelContainer: {
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});