import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { PersonaData } from '../../../types/persona';

interface LifestyleStepProps {
  persona: PersonaData;
  updatePersona: (section: keyof PersonaData, data: any) => void;
}

export default function LifestyleStep({ persona, updatePersona }: LifestyleStepProps) {
  const shoppingHabits = [
    'In-store browser',
    'Online researcher',
    'Impulse buyer',
    'Deal hunter',
    'Brand loyal',
    'Eco-conscious',
    'Early adopter',
    'Budget-focused'
  ];

  const mediaOptions = [
    'Social media daily',
    'News reader',
    'Streaming services',
    'Traditional TV',
    'Radio listener',
    'Podcast enthusiast',
    'Blog reader',
    'Video content'
  ];

  const valueOptions = [
    'Sustainability',
    'Quality over quantity',
    'Supporting local',
    'Innovation',
    'Convenience',
    'Health & wellness',
    'Family-oriented',
    'Work-life balance',
    'Social impact',
    'Personal growth'
  ];

  const toggleOption = (category: 'shoppingHabits' | 'mediaConsumption' | 'values', option: string) => {
    const currentOptions = persona.lifestyle[category] || [];
    const updatedOptions = currentOptions.includes(option)
      ? currentOptions.filter(o => o !== option)
      : [...currentOptions, option];
    
    updatePersona('lifestyle', { [category]: updatedOptions });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Your lifestyle preferences</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shopping Habits</Text>
        <Text style={styles.sectionSubtitle}>How do you prefer to shop?</Text>
        <View style={styles.gridContainer}>
          {shoppingHabits.map((habit) => (
            <TouchableOpacity
              key={habit}
              style={[
                styles.optionButton,
                persona.lifestyle.shoppingHabits?.includes(habit) && styles.optionButtonActive,
              ]}
              onPress={() => toggleOption('shoppingHabits', habit)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  persona.lifestyle.shoppingHabits?.includes(habit) && styles.optionButtonTextActive,
                ]}
              >
                {habit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Media Consumption</Text>
        <Text style={styles.sectionSubtitle}>How do you stay informed and entertained?</Text>
        <View style={styles.gridContainer}>
          {mediaOptions.map((media) => (
            <TouchableOpacity
              key={media}
              style={[
                styles.optionButton,
                persona.lifestyle.mediaConsumption?.includes(media) && styles.optionButtonActive,
              ]}
              onPress={() => toggleOption('mediaConsumption', media)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  persona.lifestyle.mediaConsumption?.includes(media) && styles.optionButtonTextActive,
                ]}
              >
                {media}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Values</Text>
        <Text style={styles.sectionSubtitle}>What matters most to you?</Text>
        <View style={styles.gridContainer}>
          {valueOptions.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.optionButton,
                persona.lifestyle.values?.includes(value) && styles.optionButtonActive,
              ]}
              onPress={() => toggleOption('values', value)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  persona.lifestyle.values?.includes(value) && styles.optionButtonTextActive,
                ]}
              >
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  optionButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: theme.colors.primary,
  },
});