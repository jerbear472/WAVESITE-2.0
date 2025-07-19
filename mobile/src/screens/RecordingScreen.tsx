import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useRecording } from '../hooks/useRecording';
import { TrendSpotter } from '../components/TrendSpotter';
import { PrivacyFilter } from '../services/PrivacyFilter';

export const RecordingScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [showTrendSpotter, setShowTrendSpotter] = useState(false);
  const camera = useRef<Camera>(null);
  const { startRecording, stopRecording, uploadRecording } = useRecording();

  const handleStartRecording = useCallback(async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      if (permission === 'denied') {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }

      await startRecording({
        onRecordingStart: () => setIsRecording(true),
        onRecordingEnd: async (videoPath) => {
          setIsRecording(false);
          // Apply privacy filters before upload
          const filteredVideo = await PrivacyFilter.processVideo(videoPath);
          await uploadRecording(filteredVideo);
        },
      });
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  }, [startRecording, uploadRecording]);

  const handleTrendSpot = useCallback(() => {
    setShowTrendSpotter(true);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recording Session</Text>
        <Text style={styles.subtitle}>
          {isRecording ? 'Recording...' : 'Ready to record'}
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : handleStartRecording}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.trendButton}
          onPress={handleTrendSpot}
          disabled={!isRecording}
        >
          <Text style={styles.trendButtonText}>🔥 Spot a Trend</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          • Open Instagram or TikTok
        </Text>
        <Text style={styles.instructionText}>
          • Browse naturally for 10-15 minutes
        </Text>
        <Text style={styles.instructionText}>
          • Tap "Spot a Trend" when you see something new
        </Text>
      </View>

      {showTrendSpotter && (
        <TrendSpotter
          onClose={() => setShowTrendSpotter(false)}
          onSubmit={async (trendData) => {
            // Handle trend submission
            setShowTrendSpotter(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  recordButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  recordingButton: {
    backgroundColor: '#FF6B6B',
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  trendButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: '#8B5CF6',
    borderRadius: 25,
  },
  trendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructions: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 5,
  },
});