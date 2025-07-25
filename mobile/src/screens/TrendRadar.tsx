import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Dimensions,
  FlatList,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedText } from '../components/ui/AnimatedText';
import { enhancedTheme } from '../styles/theme.enhanced';
import { supabase } from '../config/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TrendingItem {
  id: string;
  category: string;
  notes: string;
  emoji: string;
  verificationCount: number;
  timestamp: string;
  momentum: number;
  region?: string;
}

interface CategoryFilter {
  value: string;
  label: string;
  icon: string;
  color: string;
}

const CATEGORIES: CategoryFilter[] = [
  { value: 'all', label: 'All', icon: 'view-grid', color: enhancedTheme.colors.primary },
  { value: 'fashion', label: 'Fashion', icon: 'tshirt-crew', color: '#FF6B6B' },
  { value: 'wellness', label: 'Wellness', icon: 'heart', color: '#4ECDC4' },
  { value: 'meme', label: 'Meme', icon: 'emoticon-happy', color: '#FFD93D' },
  { value: 'audio', label: 'Audio', icon: 'music', color: '#95E1D3' },
  { value: 'tech', label: 'Tech', icon: 'cellphone', color: '#A8E6CF' },
];

type TimeFrame = '24h' | '7d' | '30d';

export const TrendRadar: React.FC = () => {
  const [trends, setTrends] = useState<TrendingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('24h');
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({
    labels: [],
    data: [],
  });
  const [tagCloud, setTagCloud] = useState<{ tag: string; count: number }[]>([]);
  
  const radarRotation = useSharedValue(0);

  // Fetch trending data
  const fetchTrendingData = useCallback(async () => {
    try {
      // Calculate time range
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFrame) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      // Fetch verified trends with aggregated data
      const { data: trendsData, error } = await supabase
        .from('logged_trends')
        .select(`
          *,
          trend_verifications!inner (
            vote,
            timestamp
          )
        `)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Process and calculate momentum
      const processedTrends = trendsData?.reduce((acc: TrendingItem[], trend) => {
        const verifications = trend.trend_verifications || [];
        const confirmVotes = verifications.filter((v: any) => v.vote === 'confirm').length;
        const totalVotes = verifications.length;
        
        if (totalVotes > 0 && confirmVotes / totalVotes > 0.6) {
          // Calculate momentum (recent votes weighted higher)
          const recentVotes = verifications.filter((v: any) => {
            const voteTime = new Date(v.timestamp);
            const hoursSince = (now.getTime() - voteTime.getTime()) / (1000 * 60 * 60);
            return hoursSince < 6;
          }).length;
          
          const momentum = (recentVotes * 2 + confirmVotes) / (totalVotes + 1);
          
          acc.push({
            id: trend.id,
            category: trend.category,
            notes: trend.notes || '',
            emoji: trend.emoji || '',
            verificationCount: confirmVotes,
            timestamp: trend.timestamp,
            momentum,
          });
        }
        
        return acc;
      }, []) || [];

      // Sort by momentum
      processedTrends.sort((a, b) => b.momentum - a.momentum);

      // Filter by category
      const filteredTrends = selectedCategory === 'all'
        ? processedTrends
        : processedTrends.filter(t => t.category === selectedCategory);

      setTrends(filteredTrends.slice(0, 20));

      // Generate chart data (hourly for 24h, daily for 7d/30d)
      const chartPoints = timeFrame === '24h' ? 24 : timeFrame === '7d' ? 7 : 30;
      const chartLabels: string[] = [];
      const chartValues: number[] = [];
      
      for (let i = chartPoints - 1; i >= 0; i--) {
        const pointDate = new Date();
        
        if (timeFrame === '24h') {
          pointDate.setHours(pointDate.getHours() - i);
          chartLabels.push(pointDate.getHours().toString());
        } else {
          pointDate.setDate(pointDate.getDate() - i);
          chartLabels.push(pointDate.toLocaleDateString('en', { weekday: 'short' }));
        }
        
        const pointTrends = processedTrends.filter(t => {
          const trendDate = new Date(t.timestamp);
          if (timeFrame === '24h') {
            return trendDate.getHours() === pointDate.getHours() &&
                   trendDate.toDateString() === pointDate.toDateString();
          } else {
            return trendDate.toDateString() === pointDate.toDateString();
          }
        });
        
        chartValues.push(pointTrends.length);
      }
      
      setChartData({ labels: chartLabels, data: chartValues });

      // Generate tag cloud from notes
      const tagMap = new Map<string, number>();
      processedTrends.forEach(trend => {
        const words = trend.notes.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 3 && !['this', 'that', 'with', 'from'].includes(word)) {
            tagMap.set(word, (tagMap.get(word) || 0) + 1);
          }
        });
      });
      
      const tags = Array.from(tagMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
      
      setTagCloud(tags);

    } catch (error) {
      console.error('Error fetching trending data:', error);
    }
  }, [selectedCategory, timeFrame]);

  useEffect(() => {
    fetchTrendingData();
    
    // Animate radar rotation
    radarRotation.value = withSpring(360, { duration: 2000 });
  }, [fetchTrendingData, radarRotation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrendingData();
    setRefreshing(false);
  }, [fetchTrendingData]);

  const radarStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${radarRotation.value}deg` }],
  }));

  const renderTrendItem = ({ item, index }: { item: TrendingItem; index: number }) => {
    const categoryConfig = CATEGORIES.find(c => c.value === item.category) || CATEGORIES[0];
    
    return (
      <Animated.View entering={SlideInDown.delay(index * 50)}>
        <GlassCard style={styles.trendItem}>
          <View style={styles.trendHeader}>
            <View
              style={[
                styles.trendIcon,
                { backgroundColor: categoryConfig.color + '20' },
              ]}
            >
              <Icon
                name={categoryConfig.icon}
                size={20}
                color={categoryConfig.color}
              />
            </View>
            <Text style={styles.trendCategory}>
              {categoryConfig.label}
            </Text>
            <View style={styles.momentumBadge}>
              <Icon name="trending-up" size={14} color={enhancedTheme.colors.success} />
              <Text style={styles.momentumText}>
                {(item.momentum * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
          
          <View style={styles.trendContent}>
            {item.emoji && <Text style={styles.trendEmoji}>{item.emoji}</Text>}
            <Text style={styles.trendNotes} numberOfLines={2}>
              {item.notes || 'No description'}
            </Text>
          </View>
          
          <View style={styles.trendFooter}>
            <View style={styles.trendStat}>
              <Icon name="check-circle" size={14} color={enhancedTheme.colors.textSecondary} />
              <Text style={styles.trendStatText}>
                {item.verificationCount} verifications
              </Text>
            </View>
            <Text style={styles.trendTime}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Trend Radar</Text>
            <Animated.View style={[styles.radarIcon, radarStyle]}>
              <Icon name="radar" size={32} color={enhancedTheme.colors.primary} />
            </Animated.View>
          </View>
          <Text style={styles.subtitle}>
            Live trends gaining traction
          </Text>
        </View>

        {/* Time Frame Selector */}
        <View style={styles.timeFrameContainer}>
          {(['24h', '7d', '30d'] as TimeFrame[]).map((frame) => (
            <Pressable
              key={frame}
              onPress={() => setTimeFrame(frame)}
              style={[
                styles.timeFrameButton,
                timeFrame === frame && styles.timeFrameButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.timeFrameText,
                  timeFrame === frame && styles.timeFrameTextActive,
                ]}
              >
                {frame === '24h' ? '24 Hours' : frame === '7d' ? '7 Days' : '30 Days'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.value}
              onPress={() => setSelectedCategory(category.value)}
              style={[
                styles.categoryButton,
                selectedCategory === category.value && styles.categoryButtonActive,
              ]}
            >
              <Icon
                name={category.icon}
                size={20}
                color={
                  selectedCategory === category.value
                    ? '#FFFFFF'
                    : category.color
                }
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.value && styles.categoryTextActive,
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Trend Volume Chart */}
        <Animated.View entering={FadeIn.delay(200)}>
          <GlassCard style={styles.chartCard}>
            <Text style={styles.chartTitle}>Trend Volume</Text>
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{
                  data: chartData.data.length > 0 ? chartData.data : [0],
                }],
              }}
              width={SCREEN_WIDTH - 60}
              height={180}
              chartConfig={{
                backgroundColor: enhancedTheme.colors.surface,
                backgroundGradientFrom: enhancedTheme.colors.surface,
                backgroundGradientTo: enhancedTheme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => enhancedTheme.colors.primary,
                labelColor: (opacity = 1) => enhancedTheme.colors.textSecondary,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: enhancedTheme.colors.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          </GlassCard>
        </Animated.View>

        {/* Tag Cloud */}
        {tagCloud.length > 0 && (
          <Animated.View entering={FadeIn.delay(300)}>
            <GlassCard style={styles.tagCloudCard}>
              <Text style={styles.tagCloudTitle}>Trending Keywords</Text>
              <View style={styles.tagCloud}>
                {tagCloud.map((item, index) => (
                  <Pressable
                    key={item.tag}
                    style={[
                      styles.tag,
                      { opacity: 1 - (index / tagCloud.length) * 0.5 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { fontSize: 14 + (tagCloud.length - index) / 2 },
                      ]}
                    >
                      {item.tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Trending List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Top Trending</Text>
          {trends.map((trend, index) => renderTrendItem({ item: trend, index }))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  header: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
  },
  radarIcon: {
    padding: 8,
  },
  subtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 4,
  },
  timeFrameContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: enhancedTheme.colors.surface,
    alignItems: 'center',
  },
  timeFrameButtonActive: {
    backgroundColor: enhancedTheme.colors.primary,
  },
  timeFrameText: {
    fontSize: 14,
    fontWeight: '600',
    color: enhancedTheme.colors.textSecondary,
  },
  timeFrameTextActive: {
    color: '#FFFFFF',
  },
  categoryScroll: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: enhancedTheme.colors.surface,
    marginRight: 12,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: enhancedTheme.colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: enhancedTheme.colors.text,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  tagCloudCard: {
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 16,
  },
  tagCloudTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: enhancedTheme.colors.primary + '20',
  },
  tagText: {
    color: enhancedTheme.colors.primary,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  trendItem: {
    padding: 16,
    marginBottom: 12,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: enhancedTheme.colors.text,
    marginLeft: 8,
    flex: 1,
  },
  momentumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  momentumText: {
    fontSize: 12,
    fontWeight: '600',
    color: enhancedTheme.colors.success,
  },
  trendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trendEmoji: {
    fontSize: 24,
  },
  trendNotes: {
    fontSize: 14,
    color: enhancedTheme.colors.text,
    flex: 1,
    lineHeight: 20,
  },
  trendFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendStatText: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
  },
  trendTime: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
  },
});