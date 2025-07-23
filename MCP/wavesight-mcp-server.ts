import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Database simulation (in production, use real PostgreSQL)
interface Trend {
  id: string;
  title: string;
  url: string;
  platform: string;
  category: string;
  vibe: string;
  status: 'pending' | 'validated' | 'rejected';
  submittedBy: string;
  submittedAt: Date;
  points: number;
  validationCount: number;
  similarityScore?: number;
}

interface User {
  id: string;
  username: string;
  points: number;
  level: string;
  trendsSubmitted: number;
  validationsCompleted: number;
}

// In-memory storage for demo
const trends: Map<string, Trend> = new Map();
const users: Map<string, User> = new Map();
const validations: Map<string, { trendId: string; userId: string; vote: string }[]> = new Map();

// Initialize demo user
users.set('demo-user', {
  id: 'demo-user',
  username: 'TrendScout',
  points: 2450,
  level: 'Silver',
  trendsSubmitted: 12,
  validationsCompleted: 87
});

// Schema definitions
const FlagTrendSchema = z.object({
  title: z.string().describe('Title of the trend'),
  url: z.string().describe('URL where the trend was spotted'),
  platform: z.enum(['TikTok', 'Instagram', 'YouTube', 'Twitter', 'Other']).describe('Platform where trend was found'),
  category: z.enum(['Fashion', 'Beauty', 'Food', 'Music', 'Meme', 'Wellness', 'Tech', 'Other']).describe('Category of the trend'),
  vibe: z.enum(['🔥', '👀', '💅', '🧠', '✨']).describe('Vibe/emoji that represents the trend'),
  notes: z.string().optional().describe('Optional notes about why this is a trend'),
  userId: z.string().optional().default('demo-user').describe('User ID submitting the trend')
});

const ValidateTrendSchema = z.object({
  trendId: z.string().describe('ID of the trend to validate'),
  vote: z.enum(['yes', 'no', 'unsure']).describe('Validation vote'),
  userId: z.string().optional().default('demo-user').describe('User ID validating')
});

const SearchTrendsSchema = z.object({
  platform: z.string().optional().describe('Filter by platform'),
  category: z.string().optional().describe('Filter by category'),
  status: z.enum(['pending', 'validated', 'rejected', 'all']).optional().default('all').describe('Filter by status'),
  limit: z.number().optional().default(10).describe('Maximum number of results')
});

const GetUserStatsSchema = z.object({
  userId: z.string().optional().default('demo-user').describe('User ID to get stats for')
});

const GetLeaderboardSchema = z.object({
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'all-time']).optional().default('weekly').describe('Leaderboard timeframe'),
  limit: z.number().optional().default(10).describe('Number of top users to return')
});

// Helper functions
function calculatePoints(action: string): number {
  const pointsMap: Record<string, number> = {
    'flag_trend': 50,
    'trend_validated': 100,
    'validation_participation': 5,
    'validation_accuracy': 10,
    'early_spotter_bonus': 200
  };
  return pointsMap[action] || 0;
}

function determineLevel(points: number): string {
  if (points >= 20000) return 'Diamond';
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Bronze';
}

function calculateSimilarity(trend1: Trend, trend2: Trend): number {
  // Simplified similarity calculation
  let score = 0;
  if (trend1.platform === trend2.platform) score += 30;
  if (trend1.category === trend2.category) score += 40;
  if (trend1.title.toLowerCase().includes(trend2.title.toLowerCase()) || 
      trend2.title.toLowerCase().includes(trend1.title.toLowerCase())) score += 30;
  return Math.min(score, 100);
}

// Create MCP server
const server = new Server(
  {
    name: 'wavesight-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'flag_trend',
        description: 'Submit a new trend to WaveSight for validation',
        inputSchema: FlagTrendSchema,
      },
      {
        name: 'validate_trend',
        description: 'Vote on whether a submitted trend is actually trending',
        inputSchema: ValidateTrendSchema,
      },
      {
        name: 'search_trends',
        description: 'Search and filter trends in the database',
        inputSchema: SearchTrendsSchema,
      },
      {
        name: 'get_user_stats',
        description: 'Get user statistics including points, level, and activity',
        inputSchema: GetUserStatsSchema,
      },
      {
        name: 'get_leaderboard',
        description: 'Get the top trend spotters leaderboard',
        inputSchema: GetLeaderboardSchema,
      },
      {
        name: 'get_trending_now',
        description: 'Get currently trending topics across all platforms',
        inputSchema: z.object({}),
      }
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'flag_trend') {
      const validated = FlagTrendSchema.parse(args);
      
      // Create new trend
      const trendId = `trend-${Date.now()}`;
      const newTrend: Trend = {
        id: trendId,
        title: validated.title,
        url: validated.url,
        platform: validated.platform,
        category: validated.category,
        vibe: validated.vibe,
        status: 'pending',
        submittedBy: validated.userId,
        submittedAt: new Date(),
        points: 0,
        validationCount: 0
      };
      
      // Check for similar trends
      let maxSimilarity = 0;
      let mostSimilarTrend: Trend | null = null;
      
      trends.forEach(trend => {
        const similarity = calculateSimilarity(newTrend, trend);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          mostSimilarTrend = trend;
        }
      });
      
      if (maxSimilarity > 85) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Similar trend already exists',
                similarTrend: mostSimilarTrend,
                similarityScore: maxSimilarity
              }, null, 2)
            }
          ]
        };
      }
      
      // Save trend
      trends.set(trendId, newTrend);
      
      // Award points to user
      const user = users.get(validated.userId);
      if (user) {
        user.points += calculatePoints('flag_trend');
        user.trendsSubmitted += 1;
        user.level = determineLevel(user.points);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              trendId,
              message: 'Trend flagged successfully!',
              pointsAwarded: 50,
              totalPoints: user?.points || 0,
              status: 'pending_validation'
            }, null, 2)
          }
        ]
      };
    }
    
    if (name === 'validate_trend') {
      const validated = ValidateTrendSchema.parse(args);
      
      const trend = trends.get(validated.trendId);
      if (!trend) {
        throw new McpError(ErrorCode.InvalidRequest, 'Trend not found');
      }
      
      // Record validation
      if (!validations.has(validated.trendId)) {
        validations.set(validated.trendId, []);
      }
      
      validations.get(validated.trendId)!.push({
        trendId: validated.trendId,
        userId: validated.userId,
        vote: validated.vote
      });
      
      trend.validationCount += 1;
      
      // Award points for participation
      const user = users.get(validated.userId);
      if (user) {
        user.points += calculatePoints('validation_participation');
        user.validationsCompleted += 1;
        user.level = determineLevel(user.points);
      }
      
      // Check if trend has enough validations
      const trendValidations = validations.get(validated.trendId) || [];
      if (trendValidations.length >= 10) {
        const yesVotes = trendValidations.filter(v => v.vote === 'yes').length;
        const consensus = (yesVotes / trendValidations.length) * 100;
        
        if (consensus >= 70) {
          trend.status = 'validated';
          trend.points = calculatePoints('trend_validated');
          
          // Award bonus to original submitter
          const submitter = users.get(trend.submittedBy);
          if (submitter) {
            submitter.points += calculatePoints('trend_validated');
            submitter.level = determineLevel(submitter.points);
          }
        } else if (consensus <= 30) {
          trend.status = 'rejected';
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Validation recorded',
              pointsAwarded: 5,
              totalPoints: user?.points || 0,
              trendStatus: trend.status,
              validationCount: trend.validationCount,
              consensusNeeded: Math.max(0, 10 - trend.validationCount)
            }, null, 2)
          }
        ]
      };
    }
    
    if (name === 'search_trends') {
      const validated = SearchTrendsSchema.parse(args);
      
      let results = Array.from(trends.values());
      
      // Apply filters
      if (validated.platform) {
        results = results.filter(t => t.platform === validated.platform);
      }
      if (validated.category) {
        results = results.filter(t => t.category === validated.category);
      }
      if (validated.status !== 'all') {
        results = results.filter(t => t.status === validated.status);
      }
      
      // Sort by submission date (newest first)
      results.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      
      // Limit results
      results = results.slice(0, validated.limit);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: results.length,
              trends: results.map(t => ({
                ...t,
                submittedAt: t.submittedAt.toISOString()
              }))
            }, null, 2)
          }
        ]
      };
    }
    
    if (name === 'get_user_stats') {
      const validated = GetUserStatsSchema.parse(args);
      
      const user = users.get(validated.userId);
      if (!user) {
        throw new McpError(ErrorCode.InvalidRequest, 'User not found');
      }
      
      // Calculate additional stats
      const userTrends = Array.from(trends.values()).filter(t => t.submittedBy === validated.userId);
      const validatedTrends = userTrends.filter(t => t.status === 'validated').length;
      const successRate = userTrends.length > 0 ? (validatedTrends / userTrends.length) * 100 : 0;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              user: {
                ...user,
                successRate: `${successRate.toFixed(1)}%`,
                validatedTrends,
                pendingTrends: userTrends.filter(t => t.status === 'pending').length,
                nextLevelPoints: user.level === 'Bronze' ? 1000 - user.points :
                                user.level === 'Silver' ? 5000 - user.points :
                                user.level === 'Gold' ? 20000 - user.points : 0
              }
            }, null, 2)
          }
        ]
      };
    }
    
    if (name === 'get_leaderboard') {
      const validated = GetLeaderboardSchema.parse(args);
      
      const leaderboard = Array.from(users.values())
        .sort((a, b) => b.points - a.points)
        .slice(0, validated.limit)
        .map((user, index) => ({
          rank: index + 1,
          username: user.username,
          points: user.points,
          level: user.level,
          trendsSubmitted: user.trendsSubmitted
        }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              timeframe: validated.timeframe,
              leaderboard
            }, null, 2)
          }
        ]
      };
    }
    
    if (name === 'get_trending_now') {
      // Get validated trends from the last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const trendingNow = Array.from(trends.values())
        .filter(t => t.status === 'validated' && t.submittedAt > weekAgo)
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);
      
      // Group by category
      const byCategory = trendingNow.reduce((acc, trend) => {
        if (!acc[trend.category]) acc[trend.category] = [];
        acc[trend.category].push(trend);
        return acc;
      }, {} as Record<string, Trend[]>);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              totalTrending: trendingNow.length,
              topTrends: trendingNow.slice(0, 5).map(t => ({
                title: t.title,
                platform: t.platform,
                category: t.category,
                vibe: t.vibe
              })),
              byCategory: Object.entries(byCategory).map(([cat, trends]) => ({
                category: cat,
                count: trends.length,
                trends: trends.slice(0, 3).map(t => t.title)
              }))
            }, null, 2)
          }
        ]
      };
    }
    
    throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('WaveSight MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});