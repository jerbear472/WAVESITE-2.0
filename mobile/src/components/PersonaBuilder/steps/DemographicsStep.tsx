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

interface DemographicsStepProps {
  persona: PersonaData;
  updatePersona: (section: keyof PersonaData, data: any) => void;
}

export default function DemographicsStep({ persona, updatePersona }: DemographicsStepProps) {
  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const educationLevels = ['High School', 'Some College', 'Bachelor\'s', 'Master\'s', 'Doctorate'];
  const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Tell us about yourself</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Age Range</Text>
        <View style={styles.gridContainer}>
          {ageRanges.map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.gridButton,
                persona.demographics.ageRange === range && styles.gridButtonActive,
              ]}
              onPress={() => updatePersona('demographics', { ageRange: range })}
            >
              <Text
                style={[
                  styles.gridButtonText,
                  persona.demographics.ageRange === range && styles.gridButtonTextActive,
                ]}
              >
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.columnContainer}>
          {genderOptions.map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.selectButton,
                persona.demographics.gender === gender && styles.selectButtonActive,
              ]}
              onPress={() => updatePersona('demographics', { gender })}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  persona.demographics.gender === gender && styles.selectButtonTextActive,
                ]}
              >
                {gender}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Education Level</Text>
        <View style={styles.columnContainer}>
          {educationLevels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.selectButton,
                persona.demographics.educationLevel === level && styles.selectButtonActive,
              ]}
              onPress={() => updatePersona('demographics', { educationLevel: level })}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  persona.demographics.educationLevel === level && styles.selectButtonTextActive,
                ]}
              >
                {level}
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
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  gridButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    minWidth: '30%',
    alignItems: 'center',
  },
  gridButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  gridButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  gridButtonTextActive: {
    color: '#FFFFFF',
  },
  columnContainer: {
    gap: theme.spacing.sm,
  },
  selectButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  selectButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  selectButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  selectButtonTextActive: {
    color: '#FFFFFF',
  },
});