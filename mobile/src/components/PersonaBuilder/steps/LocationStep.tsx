import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';
import { theme } from '../../../styles/theme';
import { PersonaData } from '../../../types/persona';

interface LocationStepProps {
  persona: PersonaData;
  updatePersona: (section: keyof PersonaData, data: any) => void;
}

export default function LocationStep({ persona, updatePersona }: LocationStepProps) {
  const urbanTypes = ['urban', 'suburban', 'rural'] as const;

  return (
    <View style={styles.container}>
      <Animated.Text 
        entering={FadeInDown.duration(400).springify()}
        style={styles.heading}
      >
        Where are you based?
      </Animated.Text>
      
      <Animated.View 
        entering={FadeInUp.delay(200).duration(400).springify()}
        style={styles.inputGroup}
      >
        <Text style={styles.label}>Country</Text>
        <TextInput
          style={styles.input}
          value={persona.location.country}
          onChangeText={(text) => updatePersona('location', { country: text })}
          placeholder="e.g., United States"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </Animated.View>

      <Animated.View 
        entering={FadeInUp.delay(300).duration(400).springify()}
        style={styles.inputGroup}
      >
        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={persona.location.city}
          onChangeText={(text) => updatePersona('location', { city: text })}
          placeholder="e.g., San Francisco"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </Animated.View>

      <Animated.View 
        entering={FadeInUp.delay(400).duration(400).springify()}
        layout={Layout.springify()}
        style={styles.inputGroup}
      >
        <Text style={styles.label}>Area Type</Text>
        <View style={styles.buttonGroup}>
          {urbanTypes.map((type, index) => (
            <Animated.View
              key={type}
              entering={FadeInUp.delay(500 + index * 100).duration(400).springify()}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  persona.location.urbanType === type && styles.selectButtonActive,
                ]}
                onPress={() => updatePersona('location', { urbanType: type })}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    persona.location.urbanType === type && styles.selectButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  selectButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  selectButtonTextActive: {
    color: '#FFFFFF',
  },
});