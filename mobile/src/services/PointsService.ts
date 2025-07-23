import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ActionType, 
  POINTS_CONFIG, 
  PointsLog, 
  UserLevel, 
  LEVEL_THRESHOLDS,
  Achievement,
  ACHIEVEMENTS 
} from '../types/points';

class PointsService {
  private static instance: PointsService;
  
  private constructor() {}
  
  static getInstance(): PointsService {
    if (!PointsService.instance) {
      PointsService.instance = new PointsService();
    }
    return PointsService.instance;
  }

  /**
   * Award points to a user for a specific action
   */
  async awardPoints(
    userId: string,
    actionType: ActionType,
    metadata?: any
  ): Promise<{ points: number; newTotal: number; levelUp?: UserLevel }> {
    try {
      const points = POINTS_CONFIG[actionType];
      
      // Record points in database
      const { data: pointsLog, error: logError } = await supabase
        .from('points_transactions')
        .insert({
          user_id: userId,
          transaction_type: actionType,
          points,
          metadata,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (logError) throw logError;
      
      // Get or create user profile
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('points')
        .eq('id', userId)
        .single();
      
      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create profile
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ id: userId, points: 0 })
          .select()
          .single();
        
        if (createError) throw createError;
        user = newUser;
      } else if (userError) {
        throw userError;
      }
      
      const oldTotal = user?.points || 0;
      const newTotal = oldTotal + points;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: newTotal })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      // Check for level up
      const oldLevel = this.getUserLevel(oldTotal);
      const newLevel = this.getUserLevel(newTotal);
      const levelUp = oldLevel.level !== newLevel.level ? newLevel.level : undefined;
      
      // Cache the new total locally for quick access
      await this.cacheUserPoints(userId, newTotal);
      
      // Check for achievement unlocks
      await this.checkAchievements(userId, actionType);
      
      return { points, newTotal, levelUp };
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Get user's current level based on points
   */
  getUserLevel(points: number): typeof LEVEL_THRESHOLDS[0] {
    return LEVEL_THRESHOLDS.find(
      level => points >= level.minPoints && points <= level.maxPoints
    ) || LEVEL_THRESHOLDS[0];
  }

  /**
   * Calculate points to next level
   */
  getPointsToNextLevel(currentPoints: number): { points: number; percentage: number } {
    const currentLevel = this.getUserLevel(currentPoints);
    const currentIndex = LEVEL_THRESHOLDS.findIndex(l => l.level === currentLevel.level);
    
    if (currentIndex === LEVEL_THRESHOLDS.length - 1) {
      // Already at max level
      return { points: 0, percentage: 100 };
    }
    
    const nextLevel = LEVEL_THRESHOLDS[currentIndex + 1];
    const pointsInCurrentLevel = currentPoints - currentLevel.minPoints;
    const levelRange = nextLevel.minPoints - currentLevel.minPoints;
    const percentage = (pointsInCurrentLevel / levelRange) * 100;
    const pointsNeeded = nextLevel.minPoints - currentPoints;
    
    return { points: pointsNeeded, percentage };
  }

  /**
   * Get user's points history
   */
  async getUserPointsHistory(
    userId: string,
    limit = 50
  ): Promise<PointsLog[]> {
    try {
      const { data, error } = await supabase
        .from('points_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching points history:', error);
      return [];
    }
  }

  /**
   * Get daily streak for user
   */
  async getUserStreak(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('streak_days')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.streak_days || 0;
    } catch (error) {
      console.error('Error fetching user streak:', error);
      return 0;
    }
  }

  /**
   * Update user's daily streak
   */
  async updateUserStreak(userId: string): Promise<{ streak: number; points?: number }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('streak_days, last_activity_date')
        .eq('id', userId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      let streak = 1;
      let pointsAwarded = 0;
      
      if (userData) {
        const lastActive = userData.last_activity_date ? new Date(userData.last_activity_date) : null;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActive && lastActive.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          // Continue streak
          streak = (userData.streak_days || 0) + 1;
        } else if (lastActive && lastActive.toISOString().split('T')[0] === today) {
          // Already updated today
          return { streak: userData.streak_days || 0 };
        }
        
        // Update existing streak
        await supabase
          .from('users')
          .update({
            streak_days: streak,
            last_activity_date: today,
          })
          .eq('id', userId);
      } else {
        // Create new user record
        await supabase
          .from('users')
          .insert({
            id: userId,
            streak_days: streak,
            last_activity_date: today,
          });
      }
      
      // Award streak bonus every 7 days
      if (streak % 7 === 0) {
        const result = await this.awardPoints(userId, 'daily_streak', { streak_days: streak });
        pointsAwarded = result.points;
      }
      
      return { streak, points: pointsAwarded };
    } catch (error) {
      console.error('Error updating user streak:', error);
      return { streak: 0 };
    }
  }

  /**
   * Check and unlock achievements
   */
  async checkAchievements(userId: string, actionType?: ActionType): Promise<Achievement[]> {
    try {
      const unlockedAchievements: Achievement[] = [];
      
      // Get user stats
      const { data: userStats } = await supabase
        .from('users')
        .select('trends_spotted, validations_count, accuracy_score, referrals_count')
        .eq('id', userId)
        .single();
      
      if (!userStats) return [];
      
      // Get user's current achievements
      const { data: userAchievements } = await supabase
        .from('achievements')
        .select('achievement_type')
        .eq('user_id', userId);
      
      const unlockedTypes = userAchievements?.map(a => a.achievement_type) || [];
      
      // Check each achievement
      for (const achievement of ACHIEVEMENTS) {
        if (unlockedTypes.includes(achievement.id)) continue;
        
        let qualified = false;
        
        switch (achievement.requirement.type) {
          case 'trends_spotted':
            qualified = userStats.trends_spotted >= achievement.requirement.value;
            break;
          case 'validations':
            qualified = userStats.validations_count >= achievement.requirement.value;
            break;
          case 'accuracy':
            qualified = (userStats.accuracy_score * 100) >= achievement.requirement.value;
            break;
          case 'referrals':
            qualified = userStats.referrals_count >= achievement.requirement.value;
            break;
          case 'streak':
            const streak = await this.getUserStreak(userId);
            qualified = streak >= achievement.requirement.value;
            break;
        }
        
        if (qualified) {
          // Unlock achievement
          await supabase
            .from('achievements')
            .insert({
              user_id: userId,
              achievement_type: achievement.id,
              achieved_at: new Date().toISOString(),
            });
          
          // Award points
          await this.awardPoints(userId, 'achievement_unlocked', { 
            achievement_id: achievement.id 
          });
          
          unlockedAchievements.push(achievement);
        }
      }
      
      return unlockedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId);
      
      const unlockedIds = data?.map(a => a.achievement_id) || [];
      
      return ACHIEVEMENTS.map(achievement => ({
        ...achievement,
        unlocked: unlockedIds.includes(achievement.id),
        unlockedAt: data?.find(a => a.achievement_id === achievement.id)?.unlocked_at,
      }));
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }));
    }
  }

  /**
   * Cache user points locally
   */
  private async cacheUserPoints(userId: string, points: number): Promise<void> {
    try {
      await AsyncStorage.setItem(`user_points_${userId}`, points.toString());
    } catch (error) {
      console.error('Error caching user points:', error);
    }
  }

  /**
   * Get cached user points
   */
  async getCachedUserPoints(userId: string): Promise<number | null> {
    try {
      const cached = await AsyncStorage.getItem(`user_points_${userId}`);
      return cached ? parseInt(cached, 10) : null;
    } catch (error) {
      console.error('Error getting cached points:', error);
      return null;
    }
  }
}

export default PointsService.getInstance();