import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';

const CATEGORIES = [
  { value: 'fashion', label: 'Fashion', icon: 'tshirt-crew', color: '#FF6B6B' },
  { value: 'wellness', label: 'Wellness', icon: 'heart', color: '#4ECDC4' },
  { value: 'meme', label: 'Meme', icon: 'emoticon-happy', color: '#FFD93D' },
  { value: 'audio', label: 'Audio', icon: 'music', color: '#95E1D3' },
  { value: 'tech', label: 'Tech', icon: 'cellphone', color: '#A8E6CF' },
  { value: 'food', label: 'Food', icon: 'food', color: '#FFB6C1' },
  { value: 'lifestyle', label: 'Lifestyle', icon: 'home', color: '#DDA0DD' },
  { value: 'other', label: 'Other', icon: 'dots-horizontal', color: '#B0B0B0' },
];

const EMOJIS = ['🔥', '💯', '🚀', '💎', '⚡', '✨', '🌟', '💫', '🎯', '📈'];

interface FloatingTrendLoggerProps {
  isSessionActive: boolean;
  onTrendLogged?: () => void;
}

export const FloatingTrendLogger: React.FC<FloatingTrendLoggerProps> = ({
  isSessionActive,
  onTrendLogged,
}) => {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const buttonScale = useSharedValue(1);
  const buttonRotation = useSharedValue(0);

  const handlePress = useCallback(() => {
    buttonScale.value = withSpring(0.9, {}, () => {
      buttonScale.value = withSpring(1);
    });
    setModalVisible(true);
  }, [buttonScale]);

  const resetForm = useCallback(() => {
    setSelectedCategory('');
    setNotes('');
    setSelectedEmoji('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedCategory || !user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('logged_trends')
        .insert({
          user_id: user.id,
          category: selectedCategory,
          notes,
          emoji: selectedEmoji,
          timestamp: new Date().toISOString(),
          session_active: true,
        });

      if (error) throw error;

      buttonRotation.value = withSpring(360, {}, () => {
        buttonRotation.value = 0;
      });

      onTrendLogged?.();
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error logging trend:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCategory, notes, selectedEmoji, user, onTrendLogged, buttonRotation, resetForm]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: buttonScale.value },
      { rotate: `${buttonRotation.value}deg` },
    ],
  }));

  if (!isSessionActive) return null;

  return (
    <>
      <Animated.View
        entering={FadeIn.delay(300)}
        exiting={FadeOut}
        style={styles.floatingButton}
      >
        <Pressable onPress={handlePress}>
          <Animated.View style={animatedButtonStyle}>
            <LinearGradient
              colors={['#4da8ff', '#0080ff']}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="plus" size={28} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Animated.View>

      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setModalVisible(false)}
          />
          
          <Animated.View
            entering={SlideInDown.springify()}
            style={styles.modalContent}
          >
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Log a Trend</Text>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="rgba(255, 255, 255, 0.6)" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Category Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Category</Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORIES.map((category) => (
                      <Pressable
                        key={category.value}
                        onPress={() => setSelectedCategory(category.value)}
                        style={[
                          styles.categoryItem,
                          selectedCategory === category.value && styles.categoryItemSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.categoryIcon,
                            { backgroundColor: category.color + '20' },
                            selectedCategory === category.value && { backgroundColor: category.color },
                          ]}
                        >
                          <Icon
                            name={category.icon}
                            size={24}
                            color={selectedCategory === category.value ? '#FFFFFF' : category.color}
                          />
                        </View>
                        <Text
                          style={[
                            styles.categoryLabel,
                            selectedCategory === category.value && styles.categoryLabelSelected,
                          ]}
                        >
                          {category.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Add details about this trend..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Emoji Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sentiment (Optional)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.emojiScroll}
                  >
                    {EMOJIS.map((emoji) => (
                      <Pressable
                        key={emoji}
                        onPress={() => setSelectedEmoji(emoji)}
                        style={[
                          styles.emojiItem,
                          selectedEmoji === emoji && styles.emojiItemSelected,
                        ]}
                      >
                        <Text style={styles.emoji}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Submit Button */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={!selectedCategory || isSubmitting}
                  style={[
                    styles.submitButton,
                    (!selectedCategory || isSubmitting) && styles.submitButtonDisabled,
                  ]}
                >
                  <LinearGradient
                    colors={['#0080ff', '#00d4ff']}
                    style={styles.submitGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.submitText}>
                      {isSubmitting ? 'Logging...' : 'Log Trend'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    maxHeight: '80%',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    alignItems: 'center',
    width: '22%',
  },
  categoryItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiScroll: {
    flexDirection: 'row',
  },
  emojiItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiItemSelected: {
    backgroundColor: 'rgba(0, 128, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#0080ff',
  },
  emoji: {
    fontSize: 24,
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 25,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});