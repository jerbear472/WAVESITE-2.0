# WaveSight 2.0 - Strategic Rebuild

## The Pivot: Consumer App → Enterprise Signal Infrastructure

### What We're Killing (Old Vision)
- XP/Gamification system
- Leaderboards
- Consumer trend submissions
- Social upvoting
- "Trend spotter" positioning
- SMB/individual users

### What We're Building (New Vision)
**"The Early-Signal Layer"** - Enterprise forecasting infrastructure

---

## Strategic Positioning

### Core Value Proposition
> "We detect acceleration signals 14-90 days before mainstream awareness, with proven X% forecast accuracy."

### Target Customers
- Large agencies ($5-15k/mo contracts)
- Consumer brands (CPG, fashion, entertainment)
- Strategy/insights teams
- Media measurement companies

### Valuation Drivers We're Building For
1. **Historical Data Moat** - Time-series signal data others can't replicate
2. **Proven Forecast Accuracy** - "X% of signals reached Y threshold within Z days"
3. **Enterprise Stickiness** - Monthly workflows depend on WaveSight
4. **Category Ownership** - "The early-signal layer"

---

## New Architecture

### Core Modules

#### 1. Signal Detection Engine
- Automated signal ingestion (not user submissions)
- Platform coverage: TikTok, Instagram, YouTube, Twitter/X
- Signal types: Audio, Visual, Hashtag, Format, Creator
- Acceleration metrics (velocity, momentum, trajectory)

#### 2. Forecasting System
- Prediction models with confidence scores
- Time-to-mainstream estimates
- Category-specific baselines
- Historical accuracy tracking

#### 3. Enterprise Dashboard
- Signal feed with filtering/sorting
- Forecast accuracy metrics (front and center)
- Historical data visualization
- Export capabilities (CSV, API)

#### 4. Alert System
- Threshold-based notifications
- Custom watchlists
- Weekly/daily digests
- Slack/email integrations

#### 5. Data Moat Infrastructure
- 24+ months historical signal storage
- Baseline acceleration data by category
- Outcome tracking (did prediction hit?)

---

## Screen Architecture

### Main Navigation
1. **Signals** - Real-time signal feed with forecasts
2. **Accuracy** - Forecast performance metrics
3. **History** - Historical data exploration
4. **Alerts** - Custom notifications & watchlists
5. **Settings** - Account, integrations, exports

### Signal Card Components
- Platform + signal type indicator
- Current metrics (views, engagement, velocity)
- Acceleration score (0-100)
- Forecast: "Projected mainstream in X days"
- Confidence level (Low/Medium/High)
- Historical context ("2.3x faster than category baseline")

### Accuracy Dashboard
- Overall forecast accuracy %
- Accuracy by category
- Accuracy by time horizon (7d, 14d, 30d, 90d)
- Hit rate visualization
- Comparison to baseline

---

## Data Models

### Signal
```typescript
interface Signal {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter';
  signal_type: 'audio' | 'visual' | 'hashtag' | 'format' | 'creator';
  identifier: string; // sound ID, hashtag, etc.

  // Current metrics
  current_volume: number;
  velocity: number; // growth rate
  acceleration: number; // change in velocity
  momentum_score: number; // 0-100

  // Forecast
  forecast_mainstream_days: number;
  forecast_confidence: 'low' | 'medium' | 'high';
  forecast_peak_volume: number;

  // Historical context
  category_baseline_multiple: number; // "2.3x faster than baseline"
  similar_signals: string[]; // past signals with similar patterns

  // Tracking
  detected_at: string;
  last_updated: string;
  outcome?: SignalOutcome;
}

interface SignalOutcome {
  reached_mainstream: boolean;
  days_to_mainstream: number | null;
  peak_volume_achieved: number;
  forecast_accuracy: number; // % accuracy
}
```

### ForecastAccuracy
```typescript
interface ForecastAccuracy {
  period: '7d' | '14d' | '30d' | '90d' | 'all';
  total_predictions: number;
  accurate_predictions: number;
  accuracy_percentage: number;
  by_category: Record<string, number>;
  by_platform: Record<string, number>;
  by_confidence_level: Record<string, number>;
}
```

### Alert
```typescript
interface Alert {
  id: string;
  user_id: string;
  type: 'threshold' | 'watchlist' | 'digest';
  config: AlertConfig;
  channels: ('push' | 'email' | 'slack')[];
  active: boolean;
}
```

---

## UI Design Principles

### Enterprise, Not Consumer
- Clean, professional aesthetic
- Data-dense layouts
- Muted colors with accent highlights
- No gamification elements
- Charts and metrics prominent

### Trust-Building
- Accuracy metrics always visible
- Historical context on every signal
- Confidence levels transparent
- Source attribution clear

### Workflow Integration
- Quick export to CSV/PDF
- Shareable signal links
- API access info
- Slack/email integration points

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Gut old consumer code
- [ ] New navigation structure
- [ ] Signal data models
- [ ] Basic signal feed

### Phase 2: Core Features
- [ ] Signal detail views
- [ ] Forecast display
- [ ] Accuracy dashboard
- [ ] Historical data views

### Phase 3: Enterprise Features
- [ ] Alert system
- [ ] Export functionality
- [ ] Settings/preferences
- [ ] API documentation

### Phase 4: Polish
- [ ] Performance optimization
- [ ] Offline support
- [ ] Deep linking
- [ ] Analytics

---

## Success Metrics

### Product Metrics
- Signal detection latency
- Forecast accuracy %
- User session length
- Export/share frequency

### Business Metrics (for valuation)
- Historical data depth (months)
- Documented accuracy rate
- Enterprise customer count
- Contract values
