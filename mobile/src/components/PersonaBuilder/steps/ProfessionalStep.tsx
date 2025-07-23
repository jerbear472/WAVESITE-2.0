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

interface ProfessionalStepProps {
  persona: PersonaData;
  updatePersona: (section: keyof PersonaData, data: any) => void;
}

export default function ProfessionalStep({ persona, updatePersona }: ProfessionalStepProps) {
  const employmentOptions = [
    'Full-time',
    'Part-time',
    'Self-employed',
    'Student',
    'Retired',
    'Unemployed'
  ];

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Marketing',
    'Real Estate',
    'Government',
    'Other'
  ];

  const incomeRanges = [
    'Under $25k',
    '$25k-$50k',
    '$50k-$75k',
    '$75k-$100k',
    '$100k-$150k',
    '$150k+'
  ];

  const workStyles = [
    { value: 'office', label: 'Office' },
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' }
  ] as const;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Your professional life</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Employment Status</Text>
        <View style={styles.gridContainer}>
          {employmentOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.gridButton,
                persona.professional.employmentStatus === status && styles.gridButtonActive,
              ]}
              onPress={() => updatePersona('professional', { employmentStatus: status })}
            >
              <Text
                style={[
                  styles.gridButtonText,
                  persona.professional.employmentStatus === status && styles.gridButtonTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Industry</Text>
        <View style={styles.gridContainer}>
          {industries.map((industry) => (
            <TouchableOpacity
              key={industry}
              style={[
                styles.gridButton,
                persona.professional.industry === industry && styles.gridButtonActive,
              ]}
              onPress={() => updatePersona('professional', { industry })}
            >
              <Text
                style={[
                  styles.gridButtonText,
                  persona.professional.industry === industry && styles.gridButtonTextActive,
                ]}
              >
                {industry}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Income Range</Text>
        <View style={styles.gridContainer}>
          {incomeRanges.map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.gridButton,
                persona.professional.incomeRange === range && styles.gridButtonActive,
              ]}
              onPress={() => updatePersona('professional', { incomeRange: range })}
            >
              <Text
                style={[
                  styles.gridButtonText,
                  persona.professional.incomeRange === range && styles.gridButtonTextActive,
                ]}
              >
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Work Style</Text>
        <View style={styles.buttonGroup}>
          {workStyles.map((style) => (
            <TouchableOpacity
              key={style.value}
              style={[
                styles.selectButton,
                persona.professional.workStyle === style.value && styles.selectButtonActive,
              ]}
              onPress={() => updatePersona('professional', { workStyle: style.value })}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  persona.professional.workStyle === style.value && styles.selectButtonTextActive,
                ]}
              >
                {style.label}
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
  buttonGroup: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  selectButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
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