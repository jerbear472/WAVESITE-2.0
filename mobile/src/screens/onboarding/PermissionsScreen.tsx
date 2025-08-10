import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  Permission,
} from 'react-native-permissions';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../../../App';

interface PermissionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  permission: Permission | Permission[];
  required: boolean;
  color: string;
}

const permissions: PermissionItem[] = [
  {
    id: 'camera',
    title: 'Camera Access',
    description: 'Capture trending content directly from the app',
    icon: 'camera',
    permission: Platform.select({
      ios: PERMISSIONS.IOS.CAMERA,
      android: PERMISSIONS.ANDROID.CAMERA,
    })!,
    required: true,
    color: '#667eea',
  },
  {
    id: 'photos',
    title: 'Photo Library',
    description: 'Save and access your captured trends',
    icon: 'image',
    permission: Platform.select({
      ios: [PERMISSIONS.IOS.PHOTO_LIBRARY, PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY],
      android: [
        PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
      ],
    })!,
    required: true,
    color: '#764ba2',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Get alerts for trending content and rewards',
    icon: 'bell',
    permission: Platform.select({
      ios: PERMISSIONS.IOS.NOTIFICATIONS,
      android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
    })!,
    required: false,
    color: '#f093fb',
  },
  {
    id: 'microphone',
    title: 'Microphone',
    description: 'Add voice notes to your trend captures',
    icon: 'mic',
    permission: Platform.select({
      ios: PERMISSIONS.IOS.MICROPHONE,
      android: PERMISSIONS.ANDROID.RECORD_AUDIO,
    })!,
    required: false,
    color: '#4facfe',
  },
];

const PermissionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const handlePermissionRequest = async (item: PermissionItem) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    
    try {
      const permissionsToRequest = Array.isArray(item.permission) 
        ? item.permission 
        : [item.permission];

      const results = await Promise.all(
        permissionsToRequest.map(async (perm) => {
          const status = await check(perm);
          if (status === RESULTS.GRANTED) {
            return RESULTS.GRANTED;
          }
          return await request(perm);
        })
      );

      const allGranted = results.every(result => result === RESULTS.GRANTED);
      
      if (allGranted) {
        setGrantedPermissions(prev => new Set([...prev, item.id]));
        ReactNativeHapticFeedback.trigger('notificationSuccess');
      } else if (results.some(r => r === RESULTS.BLOCKED)) {
        Alert.alert(
          'Permission Blocked',
          `Please enable ${item.title} in your device settings to use this feature.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {} },
          ]
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const handleContinue = async () => {
    setProcessing(true);
    ReactNativeHapticFeedback.trigger('impactMedium');

    // Check if required permissions are granted
    const requiredPermissions = permissions.filter(p => p.required);
    const allRequiredGranted = requiredPermissions.every(p => 
      grantedPermissions.has(p.id)
    );

    if (!allRequiredGranted) {
      Alert.alert(
        'Required Permissions',
        'Please grant camera and photo access to continue.',
        [{ text: 'OK' }]
      );
      setProcessing(false);
      return;
    }

    // Save permission status
    storage.set('permissions_granted', JSON.stringify(Array.from(grantedPermissions)));
    storage.set('permissions_date', new Date().toISOString());

    // Navigate to main app
    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' as never }],
      });
    }, 500);
  };

  const handleSkip = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    Alert.alert(
      'Skip Permissions?',
      'You can always enable these later in settings, but some features may not work properly.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            storage.set('permissions_skipped', 'true');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' as never }],
            });
          },
        },
      ]
    );
  };

  const renderPermissionCard = (item: PermissionItem, index: number) => {
    const isGranted = grantedPermissions.has(item.id);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).springify()}
        style={[styles.permissionCard, animatedStyle]}
      >
        <TouchableOpacity
          onPress={() => !isGranted && handlePermissionRequest(item)}
          onPressIn={() => {
            scale.value = withSpring(0.98);
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
          }}
          disabled={isGranted}
          activeOpacity={0.8}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
              <Icon name={item.icon} size={24} color={item.color} />
            </View>
            
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.required && (
                  <Text style={styles.requiredBadge}>Required</Text>
                )}
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>

            <View style={styles.statusContainer}>
              {isGranted ? (
                <View style={styles.grantedIcon}>
                  <Icon name="check-circle" size={24} color="#4CAF50" />
                </View>
              ) : (
                <Icon name="chevron-right" size={20} color="#999" />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const allRequiredGranted = permissions
    .filter(p => p.required)
    .every(p => grantedPermissions.has(p.id));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.springify()}>
          <Text style={styles.title}>Enable Features</Text>
          <Text style={styles.subtitle}>
            Grant permissions to unlock all WaveSight features
          </Text>
        </Animated.View>

        <View style={styles.permissionsContainer}>
          {permissions.map((item, index) => renderPermissionCard(item, index))}
        </View>

        <View style={styles.infoContainer}>
          <Icon name="shield" size={16} color="#666" />
          <Text style={styles.infoText}>
            Your privacy is protected. We only use these permissions when necessary.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Maybe Later</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!allRequiredGranted || processing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={allRequiredGranted ? ['#667eea', '#764ba2'] : ['#ccc', '#aaa']}
            style={styles.continueButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.continueText}>
              {processing ? 'Setting up...' : 'Continue'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  permissionsContainer: {
    marginTop: 10,
  },
  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f5576c',
    backgroundColor: '#fff0f3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  statusContainer: {
    marginLeft: 12,
  },
  grantedIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 12,
    lineHeight: 18,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  skipButton: {
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PermissionsScreen;