import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../../../App';
import { personaService } from '../../services/personaService';
import { supabase } from '../../config/supabase';

interface Interest {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const interests: Interest[] = [
  { id: 'fashion', label: 'Fashion', icon: 'shopping-bag', color: '#f093fb' },
  { id: 'tech', label: 'Technology', icon: 'cpu', color: '#4facfe' },
  { id: 'food', label: 'Food & Drink', icon: 'coffee', color: '#fa709a' },
  { id: 'travel', label: 'Travel', icon: 'map-pin', color: '#43e97b' },
  { id: 'fitness', label: 'Fitness', icon: 'activity', color: '#f5576c' },
  { id: 'music', label: 'Music', icon: 'music', color: '#667eea' },
  { id: 'gaming', label: 'Gaming', icon: 'monitor', color: '#764ba2' },
  { id: 'beauty', label: 'Beauty', icon: 'star', color: '#feca57' },
  { id: 'sports', label: 'Sports', icon: 'target', color: '#00f2fe' },
  { id: 'art', label: 'Art & Design', icon: 'aperture', color: '#a29bfe' },
  { id: 'finance', label: 'Finance', icon: 'trending-up', color: '#6c5ce7' },
  { id: 'entertainment', label: 'Entertainment', icon: 'tv', color: '#ff6b6b' },
];

const platforms: Platform[] = [
  { id: 'tiktok', name: 'TikTok', icon: 'video', color: '#000' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', color: '#E4405F' },
  { id: 'twitter', name: 'Twitter', icon: 'twitter', color: '#1DA1F2' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube', color: '#FF0000' },
  { id: 'reddit', name: 'Reddit', icon: 'message-circle', color: '#FF4500' },
  { id: 'pinterest', name: 'Pinterest', icon: 'grid', color: '#E60023' },
];

const PersonalizationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(0); // 0: username, 1: interests, 2: platforms
  const [loading, setLoading] = useState(true);

  const progress = useSharedValue(0);

  // Load existing persona data on mount
  React.useEffect(() => {
    loadExistingPersona();
  }, []);

  React.useEffect(() => {
    progress.value = withTiming((step + 1) / 3, { duration: 300 });
  }, [step]);

  const loadExistingPersona = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const persona = await personaService.loadPersona(user.id);
        
        if (persona) {
          if (persona.username) setUsername(persona.username);
          if (persona.interests.length > 0) setSelectedInterests(new Set(persona.interests));
          if (persona.platforms.length > 0) setSelectedPlatforms(new Set(persona.platforms));
        }
      }
    } catch (error) {
      console.error('Error loading persona:', error);
    } finally {
      setLoading(false);
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const toggleInterest = (id: string) => {
    ReactNativeHapticFeedback.trigger('selection');
    setSelectedInterests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const togglePlatform = (id: string) => {
    ReactNativeHapticFeedback.trigger('selection');
    setSelectedPlatforms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    
    if (step === 0 && username.trim()) {
      setStep(1);
    } else if (step === 1 && selectedInterests.size >= 3) {
      setStep(2);
    } else if (step === 2 && selectedPlatforms.size >= 1) {
      completePersonalization();
    }
  };

  const completePersonalization = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Save to both local storage and Supabase
        await personaService.savePersona(user.id, {
          username: username,
          interests: Array.from(selectedInterests),
          platforms: Array.from(selectedPlatforms),
          persona_data: {
            onboarding_version: '1.0',
            completed_at: new Date().toISOString(),
          }
        });
      } else {
        // Fallback to local storage only if no user
        storage.set('user_username', username);
        storage.set('user_interests', JSON.stringify(Array.from(selectedInterests)));
        storage.set('user_platforms', JSON.stringify(Array.from(selectedPlatforms)));
        storage.set('personalization_completed', 'true');
      }
      
      // Navigate to permissions
      navigation.navigate('Permissions' as never);
    } catch (error) {
      console.error('Error saving personalization:', error);
      // Still navigate even if save fails
      navigation.navigate('Permissions' as never);
    }
  };

  const canProceed = () => {
    if (step === 0) return username.trim().length >= 3;
    if (step === 1) return selectedInterests.size >= 3;
    if (step === 2) return selectedPlatforms.size >= 1;
    return false;
  };

  const renderUsername = () => (
    <Animated.View entering={FadeInUp.springify()}>
      <Text style={styles.stepTitle}>What should we call you?</Text>
      <Text style={styles.stepSubtitle}>Choose a username for your profile</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        <Text style={styles.charCount}>{username.length}/20</Text>
      </View>
      
      {username.length > 0 && username.length < 3 && (
        <Text style={styles.hint}>Username must be at least 3 characters</Text>
      )}
    </Animated.View>
  );

  const renderInterests = () => (
    <Animated.View entering={FadeInUp.springify()}>
      <Text style={styles.stepTitle}>What are you interested in?</Text>
      <Text style={styles.stepSubtitle}>Pick at least 3 topics you love</Text>
      
      <View style={styles.chipsContainer}>
        {interests.map((interest, index) => {
          const isSelected = selectedInterests.has(interest.id);
          const scale = useSharedValue(1);
          
          const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
          }));
          
          return (
            <Animated.View
              key={interest.id}
              entering={FadeInDown.delay(index * 30).springify()}
              style={animatedStyle}
            >
              <TouchableOpacity
                onPress={() => toggleInterest(interest.id)}
                onPressIn={() => {
                  scale.value = withSpring(0.95);
                }}
                onPressOut={() => {
                  scale.value = withSpring(1);
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: interest.color + '20', borderColor: interest.color },
                  ]}
                >
                  <Icon
                    name={interest.icon}
                    size={16}
                    color={isSelected ? interest.color : '#666'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && { color: interest.color, fontWeight: '600' },
                    ]}
                  >
                    {interest.label}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={14} color={interest.color} />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      
      <Text style={styles.selectionCount}>
        {selectedInterests.size} selected {selectedInterests.size < 3 && `(${3 - selectedInterests.size} more needed)`}
      </Text>
    </Animated.View>
  );

  const renderPlatforms = () => (
    <Animated.View entering={FadeInUp.springify()}>
      <Text style={styles.stepTitle}>Where do you browse?</Text>
      <Text style={styles.stepSubtitle}>Select your favorite platforms</Text>
      
      <View style={styles.platformsGrid}>
        {platforms.map((platform, index) => {
          const isSelected = selectedPlatforms.has(platform.id);
          const scale = useSharedValue(1);
          
          const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
          }));
          
          return (
            <Animated.View
              key={platform.id}
              entering={FadeInDown.delay(index * 50).springify()}
              style={[styles.platformCard, animatedStyle]}
            >
              <TouchableOpacity
                onPress={() => togglePlatform(platform.id)}
                onPressIn={() => {
                  scale.value = withSpring(0.95);
                }}
                onPressOut={() => {
                  scale.value = withSpring(1);
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.platformContent,
                    isSelected && { borderColor: platform.color, borderWidth: 2 },
                  ]}
                >
                  <Icon
                    name={platform.icon}
                    size={28}
                    color={isSelected ? platform.color : '#999'}
                  />
                  <Text
                    style={[
                      styles.platformName,
                      isSelected && { color: '#1a1a1a', fontWeight: '600' },
                    ]}
                  >
                    {platform.name}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: platform.color }]}>
                      <Icon name="check" size={12} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      
      <Text style={styles.selectionCount}>
        {selectedPlatforms.size} selected
      </Text>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && renderUsername()}
        {step === 1 && renderInterests()}
        {step === 2 && renderPlatforms()}
      </ScrollView>

      <View style={styles.bottomContainer}>
        {step > 0 && (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={20} color="#666" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canProceed()}
          activeOpacity={0.8}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={canProceed() ? ['#667eea', '#764ba2'] : ['#ccc', '#aaa']}
            style={styles.nextButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextText}>
              {step === 2 ? 'Complete' : 'Continue'}
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 20,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  input: {
    fontSize: 18,
    color: '#1a1a1a',
    paddingVertical: 12,
  },
  charCount: {
    position: 'absolute',
    right: 16,
    top: 18,
    fontSize: 12,
    color: '#999',
  },
  hint: {
    fontSize: 13,
    color: '#f5576c',
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 4,
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 6,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  platformCard: {
    width: '31%',
    margin: '1.16%',
  },
  platformContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  platformName: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  checkCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PersonalizationScreen;