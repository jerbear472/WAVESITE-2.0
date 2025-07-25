// Reanimated configuration and initialization
import 'react-native-reanimated';

// Export a flag to check if Reanimated is available
export const isReanimatedAvailable = () => {
  try {
    const Reanimated = require('react-native-reanimated');
    return Reanimated && Reanimated.useSharedValue;
  } catch (error) {
    console.warn('Reanimated not properly initialized:', error);
    return false;
  }
};