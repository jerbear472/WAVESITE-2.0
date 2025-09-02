import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedText } from '../components/ui/AnimatedText';
import { Logo } from '../components/Logo';

interface Trend {
  id: string;
  category: string;
  description: string;
  title: string;
  quality_score: number;
  validation_count: number;
  approve_count: number;
  reject_count: number;
  trend_velocity: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining' | null;
  trend_size: 'micro' | 'niche' | 'viral' | 'mega' | 'global' | null;
  ai_angle: 'using_ai' | 'reacting_to_ai' | 'ai_tool_viral' | 'ai_technique' | 'anti_ai' | 'not_ai' | null;
  predicted_peak: string;
  created_at: string;
  spotter_id: string;
  hashtags?: string[];
}

export const TrendsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: trends, refetch } = useQuery({
    queryKey: ['trends', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('trend_submissions')
        .select('id, category, description, title, quality_score, validation_count, approve_count, reject_count, trend_velocity, trend_size, ai_angle, predicted_peak, created_at, spotter_id, hashtags')
        .in('status', ['approved', 'viral'])
        .order('validation_count', { ascending: false })
        .limit(50);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Trend[];
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const categories = [
    { value: 'all', label: 'All', icon: 'view-grid', color: enhancedTheme.colors.primary },
    { value: 'visual_style', label: 'Visual', icon: 'palette', color: '#FF6B6B' },
    { value: 'audio_music', label: 'Audio', icon: 'music-note', color: '#4ECDC4' },
    { value: 'creator_technique', label: 'Creator', icon: 'movie-open', color: '#45B7D1' },
    { value: 'meme_format', label: 'Meme', icon: 'emoticon-happy', color: '#F7DC6F' },
    { value: 'product_brand', label: 'Product', icon: 'shopping', color: '#BB8FCE' },
  ];

  const handleCardPress = (_trend: Trend) => {
    // Handle trend selection
    console.log('Trend selected:', _trend.id);
  };

  const getTrendVelocityIcon = (velocity: string | null) => {
    switch (velocity) {
      case 'just_starting': return '🌱';
      case 'picking_up': return '⚡';
      case 'viral': return '🚀';
      case 'saturated': return '📈';
      case 'declining': return '📉';
      default: return '📊';
    }
  };

  const getTrendSizeIcon = (size: string | null) => {
    switch (size) {
      case 'micro': return '🔍';
      case 'niche': return '🎯';
      case 'viral': return '💥';
      case 'mega': return '🌟';
      case 'global': return '🌍';
      default: return '📱';
    }
  };

  const renderTrend = ({ item }: { item: Trend }) => {
    const categoryData = categories.find(c => c.value === item.category) || categories[0];
    
    return (
        <Pressable
          onPress={() => handleCardPress(item)}
          style={({ pressed }) => [
            pressed && styles.cardPressed
          ]}
        >
          <GlassCard style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <View style={styles.categoryBadge}>
                <LinearGradient
                  colors={enhancedTheme.colors.primaryGradient}
                  style={styles.categoryGradient}
                >
                  <Icon name={categoryData.icon} size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.trendCategory}>
                  {item.category.replace('_', ' ')}
                </Text>
              </View>
              
              {/* Community Validation */}
              <View style={styles.validationStats}>
                <View style={styles.validationItem}>
                  <Text style={styles.validationIcon}>👍</Text>
                  <Text style={styles.validationCount}>{item.approve_count || 0}</Text>
                </View>
                <View style={styles.validationItem}>
                  <Text style={styles.validationIcon}>👎</Text>
                  <Text style={styles.validationCount}>{item.reject_count || 0}</Text>
                </View>
              </View>
            </View>
            
            {/* Title and Description */}
            {item.title && (
              <Text style={styles.trendTitle} numberOfLines={1}>
                {item.title}
              </Text>
            )}
            <Text style={styles.trendDescription} numberOfLines={2}>
              {item.description}
            </Text>
            
            {/* User-tagged metadata */}
            <View style={styles.trendMetadata}>
              {item.trend_velocity && (
                <View style={styles.metadataTag}>
                  <Text style={styles.metadataIcon}>{getTrendVelocityIcon(item.trend_velocity)}</Text>
                  <Text style={styles.metadataText}>{item.trend_velocity.replace('_', ' ')}</Text>
                </View>
              )}
              {item.trend_size && (
                <View style={styles.metadataTag}>
                  <Text style={styles.metadataIcon}>{getTrendSizeIcon(item.trend_size)}</Text>
                  <Text style={styles.metadataText}>{item.trend_size}</Text>
                </View>
              )}
            </View>
            
            {/* Hashtags */}
            {item.hashtags && item.hashtags.length > 0 && (
              <View style={styles.hashtagsContainer}>
                {item.hashtags.map((tag, index) => (
                  <View key={index} style={styles.hashtag}>
                    <Text style={styles.hashtagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.trendFooter}>
              <Text style={styles.trendTime}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
              {item.predicted_peak && (
                <Text style={styles.peakPrediction}>
                  Peak: {item.predicted_peak}
                </Text>
              )}
            </View>
          </GlassCard>
        </Pressable>
    );
  };

  return (
    <LinearGradient
      colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <AnimatedText
            type="slide"
            style={styles.title}
            gradient
          >
            Trending Now
          </AnimatedText>
          <AnimatedText
            type="fade"
            delay={200}
            style={styles.subtitle}
          >
            Discover viral trends early
          </AnimatedText>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.categoryButton,
                pressed && styles.categoryButtonPressed
              ]}
              onPress={() => setSelectedCategory(item.value)}
            >
              {selectedCategory === item.value ? (
                <LinearGradient
                  colors={enhancedTheme.colors.primaryGradient}
                  style={styles.categoryGradientFill}
                >
                  <Icon name={item.icon} size={20} color="#FFFFFF" />
                  <Text style={styles.categoryTextActive}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.categoryGlass}>
                  <Icon name={item.icon} size={20} color={enhancedTheme.colors.primary} />
                  <Text style={styles.categoryText}>{item.label}</Text>
                </View>
              )}
            </Pressable>
          )}
          contentContainerStyle={styles.categoriesContainer}
        />

        <FlatList
          data={trends}
          keyExtractor={(item) => item.id}
          renderItem={renderTrend}
          contentContainerStyle={styles.trendsContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={enhancedTheme.colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="trending-up" size={64} color={enhancedTheme.colors.textTertiary} />
              <Text style={styles.emptyText}>No trends found</Text>
              <Text style={styles.emptySubtext}>Pull to refresh</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...enhancedTheme.typography.bodyLarge,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoryButton: {
    marginRight: 12,
    borderRadius: enhancedTheme.borderRadius.full,
  },
  categoryButtonPressed: {
    opacity: 0.7,
  },
  categoryGradientFill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: enhancedTheme.borderRadius.full,
    gap: 6,
  },
  categoryGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: enhancedTheme.colors.glass,
    borderRadius: enhancedTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
    gap: 6,
  },
  categoryEmojiButton: {
    fontSize: 20,
    marginRight: 6,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.text,
    fontWeight: '600',
  },
  categoryTextActive: {
    ...enhancedTheme.typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  trendsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  trendCard: {
    padding: 20,
    marginVertical: 8,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendCategory: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.text,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  validationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validationIcon: {
    fontSize: 16,
  },
  validationCount: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.text,
    fontWeight: '600',
  },
  trendTitle: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  trendDescription: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  trendMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metadataTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.glass,
    borderRadius: enhancedTheme.borderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  metadataIcon: {
    fontSize: 14,
  },
  metadataText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.text,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  hashtag: {
    backgroundColor: enhancedTheme.colors.primary + '20',
    borderRadius: enhancedTheme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.primary + '40',
  },
  hashtagText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.primary,
    fontWeight: '600',
  },
  trendFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validationCount: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
  },
  trendTime: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
  },
  peakPrediction: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.textTertiary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.textTertiary,
  },
});