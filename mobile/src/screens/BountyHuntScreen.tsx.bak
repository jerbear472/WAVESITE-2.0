import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createClientComponentClient } from '@supabase/auth-helpers-react-native';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../hooks/useAuth';

interface BountyDetails {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  price_per_spot: number;
  total_spots: number;
  filled_spots: number;
  urgency_level: string;
  expires_at: string;
}

interface HuntStats {
  submissions_count: number;
  approved_count: number;
  earned_total: number;
}

export function BountyHuntScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  const bountyId = route.params?.bountyId;
  
  const [bounty, setBounty] = useState<BountyDetails | null>(null);
  const [huntStats, setHuntStats] = useState<HuntStats>({
    submissions_count: 0,
    approved_count: 0,
    earned_total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  
  // Submission form
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [screenshot, setScreenshot] = useState<any>(null);
  
  useEffect(() => {
    if (bountyId) {
      fetchBountyDetails();
      fetchHuntStats();
    }
    
    // Update time remaining every second
    const timer = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(timer);
  }, [bountyId]);
  
  const fetchBountyDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bounties')
        .select('*')
        .eq('id', bountyId)
        .single();
      
      if (error) throw error;
      setBounty(data);
    } catch (error) {
      console.error('Error fetching bounty:', error);
      Alert.alert('Error', 'Failed to load bounty details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  
  const fetchHuntStats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('active_hunts')
        .select('*')
        .eq('bounty_id', bountyId)
        .eq('spotter_id', user.id)
        .single();
      
      if (data) {
        setHuntStats({
          submissions_count: data.submissions_count,
          approved_count: data.approved_count,
          earned_total: data.earned_total,
        });
      }
    } catch (error) {
      console.error('Error fetching hunt stats:', error);
    }
  };
  
  const updateTimeRemaining = () => {
    if (!bounty) return;
    
    const now = new Date();
    const expires = new Date(bounty.expires_at);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeRemaining('EXPIRED');
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };
  
  const selectImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.7,
      },
      (response) => {
        if (response.assets && response.assets[0]) {
          setScreenshot(response.assets[0]);
        }
      }
    );
  };
  
  const submitSpot = async () => {
    if (!user || !bounty) return;
    
    // Validate required fields
    if (!headline.trim()) {
      Alert.alert('Missing Information', 'Please enter a headline');
      return;
    }
    
    if (!link.trim()) {
      Alert.alert('Missing Information', 'Link is required for bounty submissions');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Upload screenshot if provided
      let screenshotUrl = null;
      if (screenshot) {
        const formData = new FormData();
        formData.append('file', {
          uri: screenshot.uri,
          type: screenshot.type || 'image/jpeg',
          name: screenshot.fileName || 'screenshot.jpg',
        } as any);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bounty-screenshots')
          .upload(`${user.id}/${Date.now()}.jpg`, formData);
        
        if (uploadData) {
          screenshotUrl = uploadData.path;
        }
      }
      
      // Submit the bounty spot
      const { data, error } = await supabase
        .from('bounty_submissions')
        .insert({
          bounty_id: bountyId,
          spotter_id: user.id,
          headline: headline.trim(),
          description: description.trim(),
          link: link.trim(),
          screenshot_url: screenshotUrl,
          earned_amount: bounty.price_per_spot,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update hunt stats
      await supabase
        .from('active_hunts')
        .update({
          submissions_count: huntStats.submissions_count + 1,
          last_activity: new Date().toISOString(),
        })
        .eq('bounty_id', bountyId)
        .eq('spotter_id', user.id);
      
      // Clear form
      setHeadline('');
      setDescription('');
      setLink('');
      setScreenshot(null);
      
      // Update local stats
      setHuntStats(prev => ({
        ...prev,
        submissions_count: prev.submissions_count + 1,
      }));
      
      Alert.alert(
        'Spot Submitted!',
        `Your spot has been submitted. You'll earn $${bounty.price_per_spot.toFixed(2)} once validated.`,
        [{ text: 'Keep Hunting', style: 'default' }]
      );
      
    } catch (error) {
      console.error('Error submitting spot:', error);
      Alert.alert('Error', 'Failed to submit spot. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const exitHunt = () => {
    Alert.alert(
      'Exit Hunt?',
      'Are you sure you want to exit this hunt? You can return to it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4FF" />
        </View>
      </SafeAreaView>
    );
  }
  
  if (!bounty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Bounty not found</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const progress = (bounty.filled_spots / bounty.total_spots) * 100;
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Mission Header */}
          <View style={styles.missionHeader}>
            <View style={styles.missionTitleRow}>
              <Text style={styles.missionTitle}>BOUNTY MISSION BRIEF</Text>
              <TouchableOpacity onPress={exitHunt}>
                <Icon name="x" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.bountyTitle}>{bounty.title}</Text>
            
            <View style={styles.timerContainer}>
              <Icon name="clock" size={16} color="#FF3333" />
              <Text style={styles.timerText}>Time left: {timeRemaining}</Text>
            </View>
          </View>
          
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{huntStats.submissions_count}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.approvedValue]}>
                {huntStats.approved_count}
              </Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.earningsValue]}>
                ${huntStats.earned_total.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
          
          {/* Requirements */}
          <View style={styles.requirementsSection}>
            <Text style={styles.sectionTitle}>LOOKING FOR:</Text>
            {bounty.requirements.map((req, index) => (
              <View key={index} style={styles.requirement}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <Text style={styles.progressText}>
              Progress: {bounty.filled_spots}/{bounty.total_spots} spots filled
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
          
          {/* Submission Form */}
          <View style={styles.submissionForm}>
            <Text style={styles.formTitle}>GOT ONE?</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Headline (what did you find?)"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={headline}
              onChangeText={setHeadline}
            />
            
            <TextInput
              style={[styles.input, styles.linkInput]}
              placeholder="Link (required)"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              keyboardType="url"
            />
            
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Additional details (optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity
              style={styles.screenshotButton}
              onPress={selectImage}
            >
              {screenshot ? (
                <View style={styles.screenshotPreview}>
                  <Image source={{ uri: screenshot.uri }} style={styles.previewImage} />
                  <Text style={styles.screenshotButtonText}>Change Screenshot</Text>
                </View>
              ) : (
                <>
                  <Icon name="camera" size={20} color="#00D4FF" />
                  <Text style={styles.screenshotButtonText}>Add Screenshot (optional)</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={submitSpot}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitButtonText}>
                  SUBMIT SPOT (+${bounty.price_per_spot.toFixed(2)})
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.keepHuntingButton}
              onPress={() => {
                // Could navigate to main feed or scroll session
                navigation.navigate('Scroll');
              }}
            >
              <Text style={styles.keepHuntingText}>KEEP HUNTING</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.exitButton}
              onPress={exitHunt}
            >
              <Text style={styles.exitButtonText}>EXIT BOUNTY</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
  },
  missionHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  missionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  missionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00D4FF',
    letterSpacing: 1,
  },
  bountyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 51, 51, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  timerText: {
    color: '#FF3333',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  approvedValue: {
    color: '#4AE54A',
  },
  earningsValue: {
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 5,
  },
  requirementsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00D4FF',
    letterSpacing: 1,
    marginBottom: 10,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkmark: {
    color: '#4AE54A',
    fontSize: 16,
    marginRight: 10,
  },
  requirementText: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4FF',
  },
  submissionForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    color: '#FFF',
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  linkInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  screenshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    borderStyle: 'dashed',
  },
  screenshotButtonText: {
    color: '#00D4FF',
    fontSize: 14,
    marginLeft: 10,
  },
  screenshotPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keepHuntingButton: {
    flex: 1,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  keepHuntingText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exitButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 51, 51, 0.1)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 51, 0.3)',
  },
  exitButtonText: {
    color: '#FF3333',
    fontSize: 14,
    fontWeight: 'bold',
  },
});