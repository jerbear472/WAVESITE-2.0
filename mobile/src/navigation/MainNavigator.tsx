import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import ScrollScreen from '../screens/ScrollScreen';
import { ValidationScreen } from '../screens/ValidationScreen';
import { TrendRadar } from '../screens/TrendRadar';
import { ProfileScreen } from '../screens/ProfileScreen';
import AchievementsScreen from '../components/QualityGamification/AchievementsScreen';

type TabType = 'scroll' | 'achievements' | 'validate' | 'radar' | 'profile';
type ScreenType = TabType;

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('scroll');
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('scroll');

  const renderScreen = () => {
    switch (activeTab) {
      case 'scroll':
        return <ScrollScreen />;
      case 'achievements':
        return <AchievementsScreen />;
      case 'validate':
        return <ValidationScreen />;
      case 'radar':
        return <TrendRadar />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <ScrollScreen />;
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
            setActiveTab('scroll');
            setCurrentScreen('scroll');
          }}>
          <View style={[styles.navIcon, activeTab === 'scroll' && styles.activeNavIcon]}>
            <Text style={styles.navIconText}>📱</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'scroll' && styles.activeNavLabel]}>
            Scroll
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setActiveTab('achievements');
            setCurrentScreen('achievements');
          }}>
          <View style={[styles.navIcon, activeTab === 'achievements' && styles.activeNavIcon]}>
            <Text style={styles.navIconText}>🏆</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'achievements' && styles.activeNavLabel]}>
            XP & Awards
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
            setActiveTab('radar');
            setCurrentScreen('radar');
          }}>
          <View style={[styles.navIcon, activeTab === 'radar' && styles.activeNavIcon]}>
            <Text style={styles.navIconText}>📡</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'radar' && styles.activeNavLabel]}>
            Radar
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