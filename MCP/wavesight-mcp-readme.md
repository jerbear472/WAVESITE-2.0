# WaveSight MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with the WaveSight trend tracking platform. This server provides tools for flagging trends, validating submissions, and accessing trend analytics.

## Features

- **Flag Trends**: Submit new trends spotted on social media platforms
- **Validate Trends**: Vote on whether submitted trends are actually trending
- **Search Trends**: Filter and search through the trend database
- **User Stats**: Get user statistics including points, level, and activity
- **Leaderboards**: View top trend spotters
- **Trending Now**: See currently validated trending topics

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/wavesight-mcp.git
cd wavesight-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Claude Desktop Integration

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "wavesight": {
      "command": "node",
      "args": ["/path/to/wavesight-mcp/build/index.js"],
      "env": {}
    }
  }
}
```

### Environment Variables (Optional)

For production use with a real database:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/wavesight
REDIS_URL=redis://localhost:6379
API_KEY=your-api-key
```

## Available Tools

### 1. `flag_trend`
Submit a new trend for validation.

**Parameters:**
- `title` (string): Title of the trend
- `url` (string): URL where the trend was spotted
- `platform` (enum): Platform (TikTok, Instagram, YouTube, Twitter, Other)
- `category` (enum): Category (Fashion, Beauty, Food, Music, Meme, Wellness, Tech, Other)
- `vibe` (enum): Vibe emoji (🔥, 👀, 💅, 🧠, ✨)
- `notes` (string, optional): Why this is a trend
- `userId` (string, optional): User submitting the trend

**Example:**
```javascript
{
  "title": "Silent walking trend",
  "url": "https://www.tiktok.com/@example/video/123",
  "platform": "TikTok",
  "category": "Wellness",
  "vibe": "🧠",
  "notes": "Gen Z is ditching podcasts for mindful walks"
}
```

### 2. `validate_trend`
Vote on a submitted trend.

**Parameters:**
- `trendId` (string): ID of the trend to validate
- `vote` (enum): Vote (yes, no, unsure)
- `userId` (string, optional): User validating

**Example:**
```javascript
{
  "trendId": "trend-1234567890",
  "vote": "yes"
}
```

### 3. `search_trends`
Search and filter trends.

**Parameters:**
- `platform` (string, optional): Filter by platform
- `category` (string, optional): Filter by category
- `status` (enum, optional): Filter by status (pending, validated, rejected, all)
- `limit` (number, optional): Maximum results (default: 10)

**Example:**
```javascript
{
  "platform": "TikTok",
  "category": "Fashion",
  "status": "validated",
  "limit": 5
}
```

### 4. `get_user_stats`
Get user statistics.

**Parameters:**
- `userId` (string, optional): User ID (default: demo-user)

**Returns:**
- User points, level, trends submitted, success rate
- Validated trends count
- Points needed for next level

### 5. `get_leaderboard`
Get top trend spotters.

**Parameters:**
- `timeframe` (enum, optional): Timeframe (daily, weekly, monthly, all-time)
- `limit` (number, optional): Number of users (default: 10)

### 6. `get_trending_now`
Get currently trending topics across all platforms.

**No parameters required**

**Returns:**
- Top trending topics from the last 7 days
- Trends grouped by category
- Platform distribution

## Points System

- **Flag new trend**: +50 points base
- **Trend validated**: +100 bonus points
- **Validation participation**: +5 points per vote
- **Validation accuracy**: +10 bonus (if vote matches majority)
- **Early spotter bonus**: +200 (if trend goes viral)

## Level Progression

- **Bronze**: 0-999 points
- **Silver**: 1,000-4,999 points
- **Gold**: 5,000-19,999 points
- **Diamond**: 20,000+ points

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture Notes

This MCP server connects to your WaveSight platform architecture:

1. **In-Memory Storage**: Demo version uses Maps for data storage
2. **Production Ready**: Designed to connect to PostgreSQL + Redis
3. **Similarity Detection**: Built-in algorithm to prevent duplicate trends
4. **Gamification Logic**: Complete points and level calculation
5. **Validation Consensus**: Requires 10 votes with 70% agreement

## Future Enhancements

- Real-time WebSocket updates for trending changes
- ML integration for advanced trend prediction
- Platform API integrations for automatic metrics
- Trend velocity calculations
- Group/team functionality

## License

MIT License - See LICENSE file for details