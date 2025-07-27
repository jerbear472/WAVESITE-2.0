# Enhanced Trends Page with Grouping Functionality

## Overview
The trends page has been enhanced with powerful grouping capabilities that allow you to create "trend umbrellas" - overarching trends that group related individual trend submissions together.

## New Features

### 1. View Modes
- **Timeline View**: Traditional timeline view showing individual trends over time
- **Grouped View**: Shows trend umbrellas with grouped submissions
- **Grid View**: Card-based layout with selection capabilities

### 2. Trend Grouping
- Select multiple individual trends using checkboxes
- Create trend umbrellas with custom names and descriptions
- Automatic aggregation of statistics (wave score, earnings, content count)
- Keyword and hashtag extraction from grouped trends

### 3. Selection Controls
- Select All / Deselect All functionality
- Visual feedback for selected trends (purple border)
- Group creation modal with validation

### 4. Enhanced Statistics
- Combined earnings across grouped trends
- Aggregated wave scores
- Total content count from all submissions
- Platform distribution analysis

## Technical Implementation

### Backend API Endpoints
- `GET /api/v1/trend-umbrellas` - Fetch trend umbrellas
- `POST /api/v1/trend-umbrellas` - Create new trend umbrella
- `GET /api/v1/trend-umbrellas/{id}/submissions` - Get umbrella submissions
- `PUT /api/v1/trend-umbrellas/{id}/add-submission/{submission_id}` - Add submission to umbrella
- `DELETE /api/v1/trend-umbrellas/{id}/remove-submission/{submission_id}` - Remove submission from umbrella

### Database Schema
Added `trend_umbrella_id` field to `trend_submissions` table for linking submissions to umbrellas.

### Frontend Components
- Enhanced `TrendTimeline` component with selection support
- New grouped view layout
- Grid view with selection checkboxes
- Group creation modal

## How to Use

### Creating a Trend Group
1. Switch to Timeline or Grid view
2. Select multiple trends using checkboxes
3. Click "Group Selected" button
4. Enter group name and description
5. Click "Create Group"

### Viewing Grouped Trends
1. Switch to "Grouped" view mode
2. Browse trend umbrellas with aggregated statistics
3. See keywords and hashtags extracted from grouped trends
4. View thumbnails from individual submissions

### Managing Groups
- Add more submissions to existing umbrellas via API
- Remove submissions from umbrellas
- View detailed submission breakdown

## Benefits

1. **Better Organization**: Group related trends for clearer insights
2. **Aggregate Analytics**: See combined performance of related trends
3. **Pattern Recognition**: Identify overarching trend themes
4. **Simplified Management**: Manage multiple related submissions as one unit
5. **Enhanced Reporting**: Generate insights at both individual and umbrella levels

## Future Enhancements

- AI-powered automatic grouping suggestions
- Machine learning-based similarity detection
- Visual timeline showing umbrella evolution
- Export functionality for trend reports
- Advanced filtering by umbrella characteristics