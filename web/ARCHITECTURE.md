# WaveSite Web App Architecture

## Overview
The WaveSite web app serves two distinct user types:
1. **Regular Users**: Scroll, log trends, earn money, build their trend-spotting reputation
2. **Business Users**: Access behavioral insights, trend analytics, and market intelligence

## User Types & Routing

### Regular Users (Trend Spotters)
- **Authentication**: Standard email/password
- **Main Features**:
  - `/dashboard` - Overview of trends, earnings, and activity
  - `/scroll` - Active scroll sessions with trend logging
  - `/timeline` - Personal trend history and performance
  - `/earnings` - Detailed earnings breakdown and payout info
  - `/verify` - Swipe through and verify other users' trends
  - `/profile` - Personal settings and achievements

### Business Users (Insight Seekers)
- **Authentication**: Business email with company verification
- **Main Features**:
  - `/business/dashboard` - Behavioral insights and trend analytics
  - `/business/trends` - Deep dive into trend data by category/region
  - `/business/reports` - Generate and export custom reports
  - `/business/alerts` - Set up trend monitoring and notifications
  - `/business/team` - Manage team members and permissions
  - `/business/api` - API access and documentation

## Component Architecture

### Shared Components
- `AuthContext` - Handles authentication for both user types
- `Navigation` - Dynamic navigation based on user type
- `TrendCard` - Reusable trend display component
- `Charts` - Visualization components for both dashboards

### User-Specific Components
- `ScrollSession` - Timer and tracker for active sessions
- `TrendLogger` - Quick trend capture interface
- `VerificationFeed` - Swipeable trend verification
- `EarningsTracker` - Real-time earnings display
- `StreakCounter` - Gamification elements

### Business-Specific Components
- `InsightsDashboard` - High-level behavioral analytics
- `TrendAnalyzer` - Deep trend analysis tools
- `ReportBuilder` - Custom report generation
- `TeamManager` - User and permission management
- `APIDocumentation` - Interactive API docs

## Data Flow

### User Flow
1. User starts scroll session
2. Logs trends during scrolling
3. Trends stored in Supabase with metadata
4. Other users verify trends
5. Earnings calculated based on activity
6. Weekly payouts processed

### Business Flow
1. Business subscribes to plan
2. Accesses aggregated trend data
3. Filters by demographics, categories, regions
4. Generates insights and reports
5. Sets up monitoring alerts
6. Exports data via API or downloads

## Database Schema Extensions

### Business Tables
```sql
-- Business accounts
businesses (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  domain text UNIQUE,
  subscription_tier text,
  api_key text UNIQUE,
  created_at timestamp
)

-- Business team members
business_members (
  id uuid PRIMARY KEY,
  business_id uuid REFERENCES businesses(id),
  user_id uuid REFERENCES auth.users(id),
  role text, -- admin, analyst, viewer
  permissions jsonb
)

-- Business reports
business_reports (
  id uuid PRIMARY KEY,
  business_id uuid REFERENCES businesses(id),
  name text,
  filters jsonb,
  data jsonb,
  created_by uuid,
  created_at timestamp
)

-- API usage tracking
api_usage (
  id uuid PRIMARY KEY,
  business_id uuid REFERENCES businesses(id),
  endpoint text,
  timestamp timestamp,
  response_time_ms integer
)
```

## Implementation Priority

### Phase 1: Core User Features (Mobile Parity)
1. Implement scroll session tracking
2. Build trend logging interface
3. Create timeline view
4. Add earnings dashboard

### Phase 2: Business Foundation
1. Set up business authentication
2. Create business dashboard layout
3. Implement basic analytics views
4. Add trend filtering and search

### Phase 3: Advanced Features
1. Custom report builder
2. API access and documentation
3. Team management
4. Advanced analytics and ML insights

### Phase 4: Polish & Scale
1. Performance optimization
2. Real-time updates
3. Mobile responsive design
4. Internationalization