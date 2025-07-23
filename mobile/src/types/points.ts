export type ActionType = 
  | 'flag_trend'
  | 'trend_validated'
  | 'early_spotter'
  | 'validation_vote'
  | 'validation_accuracy'
  | 'daily_streak'
  | 'achievement_unlocked'
  | 'referral_bonus'
  | 'challenge_completed';

export interface PointsConfig {
  flag_trend: number;
  trend_validated: number;
  early_spotter: number;
  validation_vote: number;
  validation_accuracy: number;
  daily_streak: number;
  achievement_unlocked: number;
  referral_bonus: number;
  challenge_completed: number;
}

export const POINTS_CONFIG: PointsConfig = {
  flag_trend: 50,
  trend_validated: 100,
  early_spotter: 200,
  validation_vote: 5,
  validation_accuracy: 10,
  daily_streak: 25,
  achievement_unlocked: 50,
  referral_bonus: 100,
  challenge_completed: 75,
};

export interface PointsLog {
  id: string;
  user_id: string;
  action_type: ActionType;
  points: number;
  metadata?: {
    trend_id?: string;
    streak_days?: number;
    achievement_id?: string;
    challenge_id?: string;
  };
  created_at: string;
}

export type UserLevel = 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum';

export interface LevelThreshold {
  level: UserLevel;
  minPoints: number;
  maxPoints: number;
  color: string;
  icon: string;
  benefits: string[];
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  {
    level: 'bronze',
    minPoints: 0,
    maxPoints: 999,
    color: '#CD7F32',
    icon: 'medal',
    benefits: ['Basic trend spotting', '3 daily submissions'],
  },
  {
    level: 'silver',
    minPoints: 1000,
    maxPoints: 4999,
    color: '#C0C0C0',
    icon: 'medal',
    benefits: ['5 daily submissions', 'Trend insights access'],
  },
  {
    level: 'gold',
    minPoints: 5000,
    maxPoints: 19999,
    color: '#FFD700',
    icon: 'trophy',
    benefits: ['10 daily submissions', 'Priority validation queue', 'Weekly reports'],
  },
  {
    level: 'diamond',
    minPoints: 20000,
    maxPoints: 49999,
    color: '#B9F2FF',
    icon: 'diamond',
    benefits: ['Unlimited submissions', 'Trend API access', 'Custom badges'],
  },
  {
    level: 'platinum',
    minPoints: 50000,
    maxPoints: Infinity,
    color: '#E5E4E2',
    icon: 'crown',
    benefits: ['VIP status', 'Direct trend monetization', 'Personal account manager'],
  },
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  requirement: {
    type: 'trends_spotted' | 'validations' | 'streak' | 'accuracy' | 'referrals';
    value: number;
  };
  unlocked?: boolean;
  unlockedAt?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_mover',
    name: 'First Mover',
    description: 'Spot your first trend',
    icon: '🚀',
    points: 50,
    requirement: { type: 'trends_spotted', value: 1 },
  },
  {
    id: 'trend_oracle',
    name: 'Trend Oracle',
    description: 'Have 10 trends validated by the community',
    icon: '🔮',
    points: 200,
    requirement: { type: 'trends_spotted', value: 10 },
  },
  {
    id: 'validation_master',
    name: 'Validation Master',
    description: 'Vote on 100 trend validations',
    icon: '✅',
    points: 150,
    requirement: { type: 'validations', value: 100 },
  },
  {
    id: 'streak_warrior',
    name: 'Streak Warrior',
    description: 'Maintain a 30-day streak',
    icon: '🔥',
    points: 500,
    requirement: { type: 'streak', value: 30 },
  },
  {
    id: 'accuracy_champion',
    name: 'Accuracy Champion',
    description: 'Achieve 90% validation accuracy',
    icon: '🎯',
    points: 300,
    requirement: { type: 'accuracy', value: 90 },
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Refer 5 friends to WaveSight',
    icon: '🦋',
    points: 250,
    requirement: { type: 'referrals', value: 5 },
  },
];