import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import CaptureTrendsScreen from '../screens/CaptureTrendsScreen';
import TrendTimelineScreen from '../screens/TrendTimelineScreen';
import MyTimelineScreen from '../screens/MyTimelineScreen';
import ValidateScreen from '../screens/ValidateScreen';

type TabType = 'capture' | 'validate' | 'trends' | 'my-timeline' | 'profile';
type ScreenType = TabType;

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('capture');
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('capture');

  const renderScreen = () => {
    switch (activeTab) {
      case 'capture':
        return <CaptureTrendsScreen />;
      case 'trends':
        return <TrendTimelineScreen />;
      case 'my-timeline':
        return <MyTimelineScreen onBack={() => setActiveTab('capture')} />;
      case 'validate':
        return <ValidateScreen />;
      case 'profile':
        return (
          <View style={styles.placeholderScreen}>
            <Text style={styles.placeholderText}>Profile Screen</Text>
            <Text style={styles.placeholderSubtext}>Coming Soon</Text>
          </View>
        );
      default:
        return <CaptureTrendsScreen />;
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
            Timeline
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
    fontSize: 12,
    color: '#666',
  },
  activeNavLabel: {
    color: '#0066ff',
    fontWeight: '600',
  },
});

export default MainNavigator;