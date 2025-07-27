# WaveSight Performance-Based Payment Update

## Overview
WaveSight has transitioned from a time-based payment model to a performance-based reward system that incentivizes quality trend spotting over passive scrolling.

## New Payment Structure

### 🎯 Core Payments
- **Viral Trends (within 7 days)**: $1-5 per trend
- **Validated Trends**: $0.50 per trend (10+ validations, 70%+ approval)
- **Quality Submissions**: $0.25 per trend (complete metadata, proper categorization)
- **First Spotter Bonus**: 2x multiplier on all rewards

### 🔥 Streak System
- Daily submission streaks increase your multiplier (up to 2x at 30 days)
- Quality threshold: 70% quality score to maintain streak
- Streak multiplier applies to all trend rewards

### 🏆 Achievement Bonuses
- **Trend Scout**: $10 for spotting 10 viral trends
- **Viral Hunter**: $50 for spotting 50 viral trends
- **Trend Master**: $100 for spotting 100 viral trends
- **Sharp Eye**: $20 for maintaining 80% accuracy rate
- **Early Bird**: $25 for being first to spot 5 trends
- **Consistency King**: $30 for 30-day quality streak
- Category specialist achievements for different trend types

### 📊 Weekly Challenges
Dynamic challenges that reward specific behaviors:
- "Spot 5 emerging music trends" - $15
- "Find 3 fashion trends from new creators" - $10
- "Validate 20 community trends accurately" - $5

## Key Benefits

### For Users
1. **Merit-Based Earnings**: Income directly tied to skill and effort
2. **Higher Earning Potential**: Top spotters can earn $100+ per week
3. **Clear Progress Path**: Visible achievements and milestones
4. **Skill Development**: Become better at trend identification

### For Platform
1. **Quality Data**: Only paying for valuable trend intelligence
2. **Engaged Users**: Attracts serious trend spotters, not time-wasters
3. **Scalable Economics**: Costs tied directly to value received
4. **B2B Value**: Higher quality data for enterprise clients

## Implementation Changes

### Database
- Removed `scroll_sessions` table
- Added `payment_tiers`, `earnings_ledger`, and achievement tables
- Updated user profiles with performance metrics
- Added quality scoring system

### API Updates
- New endpoints for performance stats and earnings breakdown
- Quality feedback endpoint for trend improvement
- Leaderboard and achievement tracking
- Weekly challenge management

### Mobile App
- Removed scroll timer functionality
- New trend spotter dashboard with earnings focus
- Performance-based earnings screen
- Achievement and challenge tracking
- Quality improvement tips

## Migration Guide

### For Existing Users
1. All previous scroll-based earnings will be honored
2. Transition period allows both payment models for 30 days
3. Users encouraged to focus on quality submissions
4. Training materials provided for trend spotting

### Messaging Update
**Old**: "Turn your scroll time into money"
**New**: "Get paid for your trend-spotting skills"

This positions WaveSight as a platform for skilled cultural analysts rather than passive scrollers.

## Success Metrics
- Average trend quality score > 75%
- User retention rate > 60% at 30 days
- Viral trend detection rate > 30%
- B2B client satisfaction > 90%

## Technical Details
See individual component files for implementation specifics:
- `/backend/app/schemas/performance_trends.py` - New data models
- `/backend/app/api/v1/performance_trends.py` - API endpoints
- `/mobile/src/screens/TrendSpotterScreen.tsx` - Main dashboard
- `/mobile/src/screens/PerformanceEarningsScreen.tsx` - Earnings view
- `/supabase/migrations/20240301_performance_based_payments.sql` - Database changes