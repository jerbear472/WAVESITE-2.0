# Trend Folders System Documentation

## Overview

The Trend Folders system allows users to organize their trends into hierarchical folder structures, similar to file management systems. This provides better organization, collaboration, and trend management capabilities.

## Features

### 1. Hierarchical Folder Structure
- **Nested folders**: Create folders within folders for deep organization
- **Tree view navigation**: Visual hierarchy with expand/collapse functionality
- **Path tracking**: Breadcrumb-style path display for navigation
- **Default folders**: New users get starter folders (Favorites, Research, Archive)

### 2. Folder Customization
- **Colors**: 9 color options (gray, red, orange, yellow, green, blue, indigo, purple, pink)
- **Icons**: Multiple icon choices (folder, star, search, archive, heart, bookmark, tag, trending, users)
- **Descriptions**: Add context to folders with descriptions
- **Privacy settings**: Public/private folder options
- **Collaborative folders**: Share folders with team members (future feature)

### 3. Trend Organization
- **Drag-and-drop**: Reorder trends within folders
- **Multi-folder support**: Trends can exist in multiple folders
- **Position tracking**: Maintains custom ordering
- **Tags and notes**: Add metadata to trends within folders
- **Batch operations**: Select and move multiple trends

### 4. Smart Features
- **Smart folders**: Auto-organize based on rules (category, score, status)
- **Activity tracking**: Log all folder and trend operations
- **Search**: Full-text search across folders and trends
- **Filters**: Filter by category, status, date, etc.
- **Statistics**: View folder-level analytics

## Database Schema

### Tables Created:
1. **trend_folders**: Main folder structure
2. **folder_trends**: Junction table for folder-trend relationships
3. **folder_collaborators**: Manage folder sharing
4. **folder_activity**: Activity log
5. **smart_folders**: Rule-based auto-organization

## Setup Instructions

### 1. Apply Database Migration

```bash
# Run the migration script
node apply-trend-folders.js

# Then in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of supabase/create_trend_folders_schema.sql
# 3. Execute the SQL
```

### 2. Install Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-hot-toast
# or
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-hot-toast
```

### 3. Deploy Changes

The migration script automatically updates the trends page to use the enhanced version with folder support.

## Usage Guide

### Creating Folders

1. Click the **+** button in the sidebar
2. Enter folder details:
   - Name (required)
   - Description (optional)
   - Choose color and icon
3. Click "Create Folder"

### Organizing Trends

1. **Add to folder**:
   - Select a folder
   - Click "Add Trend"
   - Choose trends from the modal
   - Click on trends to add them

2. **Reorder trends**:
   - Drag trends to new positions
   - Changes save automatically

3. **Move between folders**:
   - Drag trends to different folders (coming soon)
   - Or use the trend menu options

### Folder Operations

- **Rename**: Click folder menu > Rename
- **Delete**: Click folder menu > Delete (moves trends back to unfiled)
- **Share**: Click folder menu > Share (coming soon)
- **Export**: Click folder menu > Export trends

### Smart Folders

Create rule-based folders that auto-populate:

```javascript
// Example smart folder rules
{
  "category": ["tech", "gaming"],
  "min_wave_score": 80,
  "status": ["trending", "viral"],
  "created_after": "2025-01-01"
}
```

## API Functions

### `create_trend_folder`
Creates a new folder with customization options.

```sql
SELECT create_trend_folder(
  'My Tech Trends',     -- name
  'Latest tech trends', -- description
  'blue',              -- color
  'trending',          -- icon
  NULL                 -- parent_folder_id
);
```

### `add_trend_to_folder`
Adds a trend to a folder with optional metadata.

```sql
SELECT add_trend_to_folder(
  'folder-uuid',       -- folder_id
  'trend-uuid',        -- trend_id
  'Important trend',   -- notes
  ARRAY['urgent', 'review'] -- tags
);
```

### `get_folder_stats`
Returns comprehensive folder statistics.

```sql
SELECT * FROM get_folder_stats('folder-uuid');
```

### `get_user_folders_hierarchy`
Returns the complete folder tree for a user.

```sql
SELECT * FROM get_user_folders_hierarchy();
```

## Best Practices

### Folder Organization
1. **Use descriptive names**: "Q1 2025 Fashion Trends" not "Folder 1"
2. **Limit nesting**: Keep to 3-4 levels max for usability
3. **Color coding**: Use consistent colors for categories
4. **Regular cleanup**: Archive old trends periodically

### Performance Tips
1. **Avoid huge folders**: Split into sub-folders if >100 trends
2. **Use smart folders**: For dynamic collections
3. **Archive completed**: Move old trends to archive folders
4. **Search efficiently**: Use filters before text search

## Troubleshooting

### Common Issues

**"Cannot create folder"**
- Check folder name isn't duplicate at same level
- Ensure you're authenticated
- Verify database permissions

**"Drag and drop not working"**
- Refresh the page
- Check browser console for errors
- Ensure you have edit permissions

**"Trends not showing"**
- Verify folder selection
- Check filters aren't hiding trends
- Ensure trends exist in database

## Future Enhancements

### Planned Features
1. **Collaboration**:
   - Real-time collaborative editing
   - Folder sharing with permissions
   - Team activity feeds

2. **Advanced Organization**:
   - Bulk operations
   - Folder templates
   - Import/export functionality

3. **Analytics**:
   - Folder performance metrics
   - Trend trajectory analysis
   - ROI tracking per folder

4. **Automation**:
   - Scheduled folder rules
   - Trend lifecycle automation
   - Alert notifications

## Security Considerations

- **RLS Policies**: All folder operations respect row-level security
- **Permission Levels**: Viewer, Contributor, Admin roles
- **Activity Logging**: All actions are tracked
- **Private by Default**: New folders are private unless specified

## Support

For issues or questions:
1. Check the troubleshooting guide
2. Review browser console for errors
3. Verify database migrations completed
4. Contact support with:
   - User ID
   - Folder ID (if applicable)
   - Error messages
   - Steps to reproduce