# Wave Score Feature Setup

This guide explains how to add the new Wave Score feature to the trend submission form.

## What's New

We've added a **Wave Score** field that allows users to rate how cool a trend is on a scale from 0 to 100.

## Changes Made

### Frontend
1. **TrendSubmissionForm.tsx** - Added Wave Score slider component in Step 2 of the form
   - Interactive slider with visual feedback
   - Shows current score value
   - Emoji indicators for different score ranges
   - Displays score in the review step

2. **globals.css** - Added custom styling for the slider component

### Backend
1. **Database Models** (`models.py`)
   - Added `wave_score` field to `TrendSubmission` model

2. **API Schemas** (`trends.py`, `trends_updated.py`)
   - Added `wave_score` field with validation (0-100 range)
   - Updated all relevant request/response models

3. **API Endpoints** (`trends_enhanced.py`)
   - Updated submission endpoint to handle `wave_score`

## Database Migration

To apply the Wave Score column to your existing database, run:

```bash
# For PostgreSQL/Supabase
psql -U your_username -d your_database -f add-wave-score-column.sql

# Or via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy and run the contents of add-wave-score-column.sql
```

The migration script:
- Adds `wave_score` column to `trend_submissions` table
- Sets a constraint to ensure values are between 0-100
- Sets default value of 50 for existing records

## Testing the Feature

1. Start the backend server
2. Start the frontend development server
3. Navigate to the trend submission form
4. In Step 2, you'll see the new Wave Score slider
5. Submit a trend and verify the score is saved

## API Usage

When submitting a trend via API, include the `wave_score` field:

```json
{
  "url": "https://tiktok.com/...",
  "title": "Cool Trend",
  "category": "visual_style",
  "platform": "tiktok",
  "wave_score": 85,
  // ... other fields
}
```

The field is optional and defaults to 50 if not provided.