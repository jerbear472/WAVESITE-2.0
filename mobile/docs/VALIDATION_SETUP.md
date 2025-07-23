# Validation Feature Setup Guide

This guide explains how to set up and use the validation feature in the WaveSite mobile app.

## Overview

The validation feature allows users to:
- Review trends captured by other users
- Vote whether content is actually trending or not
- Earn points for participating in validation
- Help maintain quality of the trend database

## Database Setup

### 1. Apply the Validation Schema

First, run the validation schema SQL in your Supabase dashboard:

```bash
# Navigate to the SQL editor in Supabase dashboard
# Copy and run the contents of:
/supabase/validation_schema.sql
```

This will:
- Create the necessary tables (`users`, `validations`, `points_transactions`, `achievements`)
- Add required columns to `captured_trends` table
- Set up Row Level Security policies
- Create helper functions and triggers
- Insert sample test data

### 2. Verify Database Setup

Run the setup script to verify everything is configured correctly:

```bash
cd mobile
npm run setup:validation
# or
node scripts/setup-validation.js
```

## How Validation Works

### User Flow

1. **Queue System**: Users see trends that need validation (less than 10 votes)
2. **Voting Options**:
   - ✅ "It's Trending!" - Confirms the content is trending
   - ❌ "Not Trending" - Indicates it's not a real trend
   - ⏭️ "Skip" - Pass on voting (limited to 3 skips in a row)

3. **Consensus**: After 10 votes:
   - 70%+ positive = Validated ✅
   - 30%- positive = Rejected ❌
   - In between = Continues collecting votes

### Points & Gamification

Users earn points for:
- **Participation**: 5 points per vote (not skips)
- **Accuracy**: 10 bonus points for voting with majority
- **Trend Validation**: 50 points when your submitted trend is validated

### Smart Queue Algorithm

The validation queue prioritizes trends based on:
1. **Age**: Older trends get priority (time decay)
2. **User Mix**: Balances trends from new and established users
3. **Category Rotation**: Ensures variety in trend types
4. **Vote Count**: Trends with fewer votes get priority

## Testing the Feature

### 1. Run the App

```bash
# iOS
npm run ios

# Android
npm run android
```

### 2. Navigate to Validation

1. Log in or create an account
2. Tap the "Validate" tab in the bottom navigation
3. Start reviewing trends!

### 3. Sample Data

The setup script creates 5 sample trends with varying vote counts:
- Dance Challenge (3 votes)
- Minimalist Photos (5 votes)
- ASMR Cooking (7 votes)
- POV Acting (2 votes)
- Outfit Transitions (0 votes)

## Monitoring Validation Activity

### Check Validation Stats

```sql
-- View pending validations
SELECT 
  title,
  platform,
  validation_count,
  positive_votes,
  ROUND((positive_votes::float / NULLIF(validation_count, 0)) * 100, 2) as approval_rate
FROM captured_trends
WHERE status = 'pending_validation'
ORDER BY validation_count DESC;

-- View user validation activity
SELECT 
  u.username,
  u.validations_count,
  u.accuracy_score,
  u.points
FROM users u
WHERE validations_count > 0
ORDER BY validations_count DESC;
```

### Check Consensus Results

```sql
-- Recently validated trends
SELECT title, platform, validation_count, positive_votes, validated_at
FROM captured_trends
WHERE status = 'validated'
ORDER BY validated_at DESC
LIMIT 10;

-- Recently rejected trends
SELECT title, platform, validation_count, positive_votes, rejected_at
FROM captured_trends
WHERE status = 'rejected'
ORDER BY rejected_at DESC
LIMIT 10;
```

## Troubleshooting

### Common Issues

1. **"No trends to validate"**
   - Ensure sample data was created
   - Check that trends have status = 'pending_validation'
   - Verify user hasn't already voted on all available trends

2. **Votes not recording**
   - Check RLS policies are enabled
   - Verify user is authenticated
   - Check browser console for errors

3. **Points not updating**
   - Ensure users table has points column
   - Check points_transactions table exists
   - Verify PointsService is using correct table names

### Reset Validation Data

To reset and start fresh:

```sql
-- Clear all validations
DELETE FROM validations;

-- Reset trend validation counts
UPDATE captured_trends 
SET 
  validation_count = 0,
  positive_votes = 0,
  skip_count = 0,
  status = 'pending_validation',
  validated_at = NULL,
  rejected_at = NULL
WHERE status IN ('validated', 'rejected', 'pending_validation');

-- Reset user stats
UPDATE users
SET
  validations_count = 0,
  accuracy_score = 0.00,
  validated_trends = 0;
```

## Next Steps

1. **Customize Points**: Adjust point values in `/src/types/points.ts`
2. **Add Categories**: Extend trend categories in the schema
3. **Analytics**: Build dashboards to track validation metrics
4. **Notifications**: Add push notifications for validation milestones