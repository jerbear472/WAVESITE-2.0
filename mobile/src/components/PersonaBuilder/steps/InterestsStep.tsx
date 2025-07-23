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

interface InterestsStepProps {
  persona: PersonaData;
  updatePersona: (section: keyof PersonaData, data: any) => void;
}

export default function InterestsStep({ persona, updatePersona }: InterestsStepProps) {
  const interestCategories = [
    {
      category: 'Hobbies & Activities',
      options: [
        'Sports & Fitness',
        'Cooking',
        'Gaming',
        'Reading',
        'Travel',
        'Photography',
        'Music',
        'Art & Design',
        'Gardening',
        'DIY Projects'
      ]
    },
    {
      category: 'Entertainment',
      options: [
        'Movies & TV',
        'Live Events',
        'Theater',
        'Concerts',
        'Podcasts',
        'Streaming',
        'Social Media',
        'YouTube'
      ]
    },
    {
      category: 'Learning & Growth',
      options: [
        'Online Courses',
        'Professional Development',
        'Languages',
        'History',
        'Science',
        'Technology',
        'Business',
        'Personal Finance'
      ]
    }
  ];

  const toggleInterest = (interest: string) => {
    const currentInterests = persona.interests || [];
    const updatedInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    
    updatePersona('interests', updatedInterests);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>What are you interested in?</Text>
      <Text style={styles.subheading}>Select all that apply</Text>
      
      {interestCategories.map((category) => (
        <View key={category.category} style={styles.section}>
          <Text style={styles.categoryTitle}>{category.category}</Text>
          <View style={styles.gridContainer}>
            {category.options.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestButton,
                  persona.interests?.includes(interest) && styles.interestButtonActive,
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.interestButtonText,
                    persona.interests?.includes(interest) && styles.interestButtonTextActive,
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.selectedCount}>
        <Text style={styles.selectedCountText}>
          {persona.interests?.length || 0} interests selected
        </Text>
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
    marginBottom: theme.spacing.sm,
  },
  subheading: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  interestButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  interestButtonActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  interestButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  interestButtonTextActive: {
    color: theme.colors.primary,
  },
  selectedCount: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
});