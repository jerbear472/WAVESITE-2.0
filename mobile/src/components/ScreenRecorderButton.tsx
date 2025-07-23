import React, { useRef } from 'react';
import {
  requireNativeComponent,
  ViewStyle,
  NativeModules,
  findNodeHandle,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';

const NativeScreenRecorderButton = requireNativeComponent<{
  style?: ViewStyle;
}>('ScreenRecorderButton');

const { ScreenRecorderButtonManager } = NativeModules;

interface ScreenRecorderButtonProps {
  onPress?: () => void;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const ScreenRecorderButton: React.FC<ScreenRecorderButtonProps> = ({
  onPress,
  style,
  children,
}) => {
  const buttonRef = useRef<any>(null);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    
    // Trigger the native broadcast picker
    const node = findNodeHandle(buttonRef.current);
    if (node && ScreenRecorderButtonManager) {
      ScreenRecorderButtonManager.startBroadcast(node);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={style}>
      <View style={styles.container}>
        {children}
        <NativeScreenRecorderButton
          ref={buttonRef}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});