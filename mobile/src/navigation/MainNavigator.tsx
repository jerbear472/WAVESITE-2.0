import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { CaptureScreenSimple } from '../screens/CaptureScreenSimple';
import { TrendsScreen } from '../screens/TrendsScreen';
import MyTimelineScreen from '../screens/MyTimelineScreen';
import { ValidationScreen } from '../screens/ValidationScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ScrollDashboard } from '../screens/ScrollDashboard';

type TabType = 'capture' | 'validate' | 'trends' | 'my-timeline' | 'profile';
type ScreenType = TabType;

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('capture');
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('capture');

  const renderScreen = () => {
    switch (activeTab) {
      case 'capture':
        return <CaptureScreenSimple />;
      case 'trends':
        return <TrendsScreen />;
      case 'my-timeline':
        return <MyTimelineScreen onBack={() => setActiveTab('capture')} />;
      case 'validate':
        return <ValidationScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <CaptureScreenSimple />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setActiveTab('capture');
            setCurrentScreen('capture');
          }}>
          <View style={[styles.navIcon, activeTab === 'capture' && styles.activeNavIcon]}>
            <Text style={styles.navIconText}>▶️</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'capture' && styles.activeNavLabel]}>
            Capture
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setActiveTab('validate');
            setCurrentScreen('validate');
          }}>
          <View style={[styles.navIcon, activeTab === 'validate' && styles.activeNavIcon]}>
            <Text style={styles.navIconText}>✓</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'validate' && styles.activeNavLabel]}>
            Validate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setActiveTab('trends');
            setCurrentScreen('trends');
          }}>
          <View style={[styles.navIcon, activeTab === 'trends' && styles.activeNavIcon]}>
            <Text style={styles.navIconText}>📊</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'trends' && styles.activeNavLabel]}>
            Trends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setActiveTab('my-timeline');
            setCurrentScreen('my-timeline');
          }}>
          <View style={[styles.navIcon, activeTab === 'my-timeline' && styles.activeNavIcon]}>
            <Text style={styles.navIconText}>⭐</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'my-timeline' && styles.activeNavLabel]}>
            My Timeline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setActiveTab('profile');
            setCurrentScreen('profile');
          }}>
          <View style={[styles.navIcon, activeTab === 'profile' && styles.activeNavIcon]}>
            <Text style={styles.navIconText}>👤</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.activeNavLabel]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  placeholderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#666',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  navIcon: {
    marginBottom: 5,
  },
  activeNavIcon: {
    transform: [{ scale: 1.1 }],
  },
  navIconText: {
    fontSize: 24,
  },
  navLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    maxWidth: 80,
  },
  activeNavLabel: {
    color: '#0066ff',
    fontWeight: '600',
  },
});

export default MainNavigator;