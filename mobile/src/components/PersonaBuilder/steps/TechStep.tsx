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

interface TechStepProps {
  persona: PersonaData;
  updatePersona: (section: keyof PersonaData, data: any) => void;
}

export default function TechStep({ persona, updatePersona }: TechStepProps) {
  const proficiencyLevels = [
    { value: 'basic', label: 'Basic', description: 'Email, browsing, basic apps' },
    { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with most technology' },
    { value: 'advanced', label: 'Advanced', description: 'Power user, early adopter' },
    { value: 'expert', label: 'Expert', description: 'Tech professional or enthusiast' }
  ] as const;

  const devices = [
    'Smartphone',
    'Laptop',
    'Desktop',
    'Tablet',
    'Smart TV',
    'Smartwatch',
    'Gaming console',
    'Smart home devices'
  ];

  const socialPlatforms = [
    'Facebook',
    'Instagram',
    'Twitter/X',
    'LinkedIn',
    'TikTok',
    'YouTube',
    'Snapchat',
    'Pinterest',
    'Reddit',
    'Discord',
    'WhatsApp',
    'Telegram'
  ];

  const toggleDevice = (device: string) => {
    const currentDevices = persona.tech.primaryDevices || [];
    const updatedDevices = currentDevices.includes(device)
      ? currentDevices.filter(d => d !== device)
      : [...currentDevices, device];
    
    updatePersona('tech', { primaryDevices: updatedDevices });
  };

  const togglePlatform = (platform: string) => {
    const currentPlatforms = persona.tech.socialPlatforms || [];
    const updatedPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter(p => p !== platform)
      : [...currentPlatforms, platform];
    
    updatePersona('tech', { socialPlatforms: updatedPlatforms });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Your tech profile</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tech Proficiency</Text>
        <Text style={styles.sectionSubtitle}>How comfortable are you with technology?</Text>
        <View style={styles.proficiencyContainer}>
          {proficiencyLevels.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.proficiencyButton,
                persona.tech.proficiency === level.value && styles.proficiencyButtonActive,
              ]}
              onPress={() => updatePersona('tech', { proficiency: level.value })}
            >
              <Text
                style={[
                  styles.proficiencyLabel,
                  persona.tech.proficiency === level.value && styles.proficiencyLabelActive,
                ]}
              >
                {level.label}
              </Text>
              <Text
                style={[
                  styles.proficiencyDescription,
                  persona.tech.proficiency === level.value && styles.proficiencyDescriptionActive,
                ]}
              >
                {level.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Devices</Text>
        <Text style={styles.sectionSubtitle}>Which devices do you use regularly?</Text>
        <View style={styles.gridContainer}>
          {devices.map((device) => (
            <TouchableOpacity
              key={device}
              style={[
                styles.optionButton,
                persona.tech.primaryDevices?.includes(device) && styles.optionButtonActive,
              ]}
              onPress={() => toggleDevice(device)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  persona.tech.primaryDevices?.includes(device) && styles.optionButtonTextActive,
                ]}
              >
                {device}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Platforms</Text>
        <Text style={styles.sectionSubtitle}>Where are you active online?</Text>
        <View style={styles.gridContainer}>
          {socialPlatforms.map((platform) => (
            <TouchableOpacity
              key={platform}
              style={[
                styles.optionButton,
                persona.tech.socialPlatforms?.includes(platform) && styles.optionButtonActive,
              ]}
              onPress={() => togglePlatform(platform)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  persona.tech.socialPlatforms?.includes(platform) && styles.optionButtonTextActive,
                ]}
              >
                {platform}
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
  proficiencyContainer: {
    gap: theme.spacing.sm,
  },
  proficiencyButton: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  proficiencyButtonActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  proficiencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  proficiencyLabelActive: {
    color: theme.colors.primary,
  },
  proficiencyDescription: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  proficiencyDescriptionActive: {
    color: theme.colors.textSecondary,
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