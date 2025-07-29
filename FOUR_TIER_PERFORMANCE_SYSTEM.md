# Four-Tier Performance Management System

## Overview

This system implements a comprehensive performance-based tier system that rewards high-quality validators and filters out poor performers, creating a self-improving ecosystem.

## The Four Tiers

### ⭐ Premium Tier
- **Payment Multiplier**: 1.5x
- **Requirements**: 85%+ composite score, 50+ activities
- **Benefits**:
  - 50% higher payments
  - Priority access to high-difficulty trends
  - Streak bonuses enabled (up to 20% extra)
  - 200 daily validation limit
  - Can submit trends

### ✓ Standard Tier
- **Payment Multiplier**: 1.0x
- **Requirements**: 65%+ composite score
- **Benefits**:
  - Standard payment rates
  - Normal trend access
  - Streak bonuses enabled
  - 100 daily validation limit
  - Can submit trends

### ⚠️ Probation Tier
- **Payment Multiplier**: 0.5x
- **Requirements**: 45%+ composite score
- **Benefits**:
  - Reduced payments (50%)
  - Limited to easier trends
  - No streak bonuses
  - 50 daily validation limit
  - Can still submit trends (monitored)

### 🚫 Suspended Tier
- **Payment Multiplier**: 0.0x
- **Triggered by**: <45% composite score or 3+ suspensions
- **Restrictions**:
  - No payment for validations
  - Cannot submit trends
  - Limited to 20 validations/day
  - 30-day review period
  - 3 suspensions = permanent ban

## Key Features

### 1. Performance Metrics (30-day rolling)
- **Verification Accuracy**: How often your votes match final consensus
- **Trend Approval Rate**: Percentage of submitted trends that get approved
- **Composite Score**: 60% verification + 40% trend approval
- **Consecutive Streaks**: Track good/poor vote streaks

### 2. Automated Tier Management
- Daily performance reviews for all users
- Automatic promotions/demotions based on metrics
- 24-hour review cycle for at-risk users
- Immediate review after 5 consecutive poor votes

### 3. Payment System
```
Total Payment = Base Rate × Tier Multiplier × (1 + Streak Bonus) + Bonuses

Example for Premium user with 15-vote streak:
- Base: $0.05
- Tier: 1.5x
- Streak: +15%
- Total: $0.05 × 1.5 × 1.15 = $0.086
```

### 4. Quality Control
- Suspended users can only verify (no trend submission)
- Poor performers filtered to lower-paying tiers
- Persistent poor performers permanently banned
- Quality control trends randomly inserted

## Implementation Components

### Database Tables
1. **profiles** - Enhanced with tier and performance fields
2. **user_performance_history** - Daily performance snapshots
3. **tier_change_log** - Track all tier changes
4. **suspension_history** - Monitor suspensions

### Services
1. **PerformanceManagementService** - Core tier management
2. **ValidationAntiGamingService** - Anti-manipulation measures
3. **Automated Daily Reviews** - Background performance updates

### UI Components
1. **PerformanceTierDisplay** - Shows current tier and progress
2. **Enhanced Verify Page** - Tier-aware validation interface
3. **Real-time Payment Calculator** - Shows estimated earnings

## Deployment Steps

### 1. Apply Database Migration

```bash
# Via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of: /supabase/migrations/20250729_four_tier_performance_system.sql
3. Run the migration
```

### 2. Deploy Updated UI

```bash
# Replace verify page with tier-enabled version
cd /Users/JeremyUys_1/Desktop/wavesite2/web/app/(authenticated)/verify
cp page-with-tiers.tsx page.tsx
```

### 3. Set Up Daily Reviews

The system includes a daily review function that should be scheduled:
```sql
-- Run daily at 2 AM (requires pg_cron or external scheduler)
SELECT public.review_all_user_performance();
```

### 4. Monitor Performance

Key metrics to track:
- Tier distribution across users
- Average payment multipliers
- Suspension rates
- Performance improvement trends

## Testing the System

### 1. Create Test Users
```sql
-- Create users at different performance levels
INSERT INTO profiles (id, email, username, performance_tier, composite_reputation_score)
VALUES 
  ('test-premium-id', 'premium@test.com', 'premium_user', 'premium', 0.90),
  ('test-standard-id', 'standard@test.com', 'standard_user', 'standard', 0.70),
  ('test-probation-id', 'probation@test.com', 'probation_user', 'probation', 0.50),
  ('test-suspended-id', 'suspended@test.com', 'suspended_user', 'suspended', 0.30);
```

### 2. Test Tier Changes
```sql
-- Trigger performance review for a user
SELECT public.update_user_performance_tier('user-id-here');
```

### 3. Verify Payment Calculations
```sql
-- Check payment for different tiers
SELECT public.calculate_tiered_validation_payment(
  'user-id-here',
  0.05, -- base amount
  0.01, -- difficulty bonus
  0.01  -- consensus bonus
);
```

## Benefits of the System

### For High Performers
- Up to 70% more earnings (1.5x tier + 20% streak)
- Priority access to valuable trends
- Recognition through tier badges
- Motivation to maintain quality

### For the Platform
- Automated quality control
- Self-improving data quality
- Reduced manual moderation
- Clear performance incentives

### Natural Selection Process
1. Good performers rise to Premium tier
2. Average users maintain Standard tier
3. Poor performers drop to Probation
4. Persistent poor performers get Suspended
5. Worst performers permanently removed

## Monitoring Queries

```sql
-- Tier distribution
SELECT performance_tier, COUNT(*) 
FROM profiles 
WHERE is_permanently_banned = false 
GROUP BY performance_tier;

-- Recent tier changes
SELECT * FROM tier_change_log 
ORDER BY changed_at DESC 
LIMIT 20;

-- Users at risk of suspension
SELECT username, composite_reputation_score, consecutive_poor_votes
FROM profiles
WHERE performance_tier = 'probation'
AND composite_reputation_score < 0.50
ORDER BY composite_reputation_score ASC;

-- Payment analysis by tier
SELECT 
  performance_tier,
  AVG(amount) as avg_payment,
  COUNT(*) as payment_count
FROM earnings_ledger el
JOIN profiles p ON el.user_id = p.id
WHERE el.created_at >= NOW() - INTERVAL '7 days'
GROUP BY performance_tier;
```

## Future Enhancements

1. **ML-based Performance Prediction**
   - Predict users likely to improve/decline
   - Proactive interventions

2. **Tier-specific Features**
   - Premium-only trend categories
   - Early access to new features
   - Tier-specific challenges

3. **Gamification**
   - Tier progression animations
   - Achievement system
   - Leaderboards by tier

4. **Advanced Analytics**
   - Performance trend analysis
   - Tier mobility patterns
   - ROI by tier

The four-tier system creates a sustainable, self-improving ecosystem where quality is rewarded and poor performance is naturally filtered out, resulting in increasingly accurate trend validation over time.