import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

interface PrivacyOverlayProps {
  children: ReactNode;
}

export const PrivacyOverlay: React.FC<PrivacyOverlayProps> = ({ children }) => {
  // This component can be used to add privacy features like blur when app goes to background
  // For now, it's a simple wrapper
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});