# Frontend to Database Field Mapping

## Fields Sent from SmartTrendSubmission Component

### Core Fields (Already in DB)
- `url` → `url`
- `platform` → `platform`
- `title` → `description` (or new `title` column)
- `creator_handle` → `creator_handle`
- `creator_name` → `creator_name`
- `post_caption` → `post_caption`
- `likes_count` → `likes_count`
- `comments_count` → `comments_count`
- `views_count` → `views_count`
- `hashtags` → `hashtags[]`
- `thumbnail_url` → `thumbnail_url`
- `posted_at` → `posted_at`
- `category` → `category`
- `wave_score` → `wave_score`

### New Intelligence Fields (Need DB Columns)
- `trendVelocity` → `trend_velocity` ✅ (Added in migration)
- `trendSize` → `trend_size` ✅ (Added in migration)
- `aiAngle` → `ai_angle` ✅ (Added in migration)
- `velocityMetrics` → `velocity_metrics` (JSONB) ✅ (Added in migration)

### Composite/Calculated Fields
- `categoryAnswers` → Could store in `metadata` JSONB or new column
- `audienceAge[]` → Could store in `audience_age` TEXT[] or in metadata
- `sentiment` → Could add `sentiment` INTEGER column

### Fields We Removed (No longer need columns)
- ~~`firstSeen`~~ - Removed from flow
- ~~`brandSafe`~~ - Removed from flow
- ~~`is_ai_generated`~~ - Now derived from `ai_angle`

## Recommended Additional Migration

```sql
-- Add remaining fields that might be missing
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS category_answers JSONB,
ADD COLUMN IF NOT EXISTS audience_age TEXT[],
ADD COLUMN IF NOT EXISTS sentiment INTEGER DEFAULT 50;
```

## Submission Data Structure

```javascript
const submissionData = {
  // Metadata
  url: string,
  platform: string,
  thumbnail_url: string,
  
  // Content Info
  title: string,
  creator_handle: string,
  creator_name: string,
  post_caption: string,
  
  // Engagement Metrics
  views_count: number,
  likes_count: number,
  comments_count: number,
  hashtags: string[],
  
  // Intelligence Data (HIGH VALUE)
  trendVelocity: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining',
  trendSize: 'micro' | 'niche' | 'viral' | 'mega' | 'global',
  aiAngle: 'using_ai' | 'reacting_to_ai' | 'ai_tool_viral' | 'ai_technique' | 'anti_ai' | 'not_ai',
  
  // Category Data
  category: string,
  categoryAnswers: Record<string, string>,
  audienceAge: string[],
  
  // Scoring
  sentiment: number,
  wave_score: number,
  
  // Detailed Metrics
  velocityMetrics: {
    velocity: string,
    size: string,
    timing: string,
    capturedAt: string
  }
}
```