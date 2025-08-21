import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { theme } from '../../styles/theme';

interface EnhancedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'right',
  style,
  textStyle,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const getButtonStyle = () => {
    const baseStyle = [
      styles.button,
      styles[size],
      fullWidth && styles.fullWidth,
      disabled && styles.disabled,
      style,
    ];

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseTextStyle = [
      styles.text,
      styles[`${size}Text`],
      styles[`${variant}Text`],
      disabled && styles.disabledText,
      textStyle,
    ];

    return baseTextStyle;
  };

  const renderContent = () => (
    <>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? theme.colors.primary : '#fff'}
          style={styles.loader}
        />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <Icon
          name={icon}
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
          color={variant === 'ghost' ? theme.colors.primary : '#fff'}
          style={styles.iconLeft}
        />
      )}
      <Text style={getTextStyle()}>{title}</Text>
      {!loading && icon && iconPosition === 'right' && (
        <Icon
          name={icon}
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
          color={variant === 'ghost' ? theme.colors.primary : '#fff'}
          style={styles.iconRight}
        />
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={0.8}
          style={[getButtonStyle(), { overflow: 'hidden' }]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientContainer}
          >
            {renderContent()}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[getButtonStyle(), styles[variant]]}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  // Sizes
  small: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 40,
  },
  medium: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  large: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  
  fullWidth: {
    width: '100%',
  },
  
  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  secondary: {
    backgroundColor: theme.colors.backgroundCard,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.primary,
  },
  
  // States
  disabled: {
    opacity: 0.6,
  },
  
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  
  // Text colors
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: theme.colors.text,
  },
  ghostText: {
    color: theme.colors.primary,
  },
  
  disabledText: {
    opacity: 0.7,
  },
  
  // Icons
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  
  // Loader
  loader: {
    marginRight: 8,
  },
  
  // Gradient
  gradientContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
});