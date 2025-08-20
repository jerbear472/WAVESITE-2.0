import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to handle missing module gracefully
let googleTrends: any;
try {
  googleTrends = require('google-trends-api');
} catch (error) {
  console.warn('google-trends-api not available, using mock data');
}

export async function POST(request: NextRequest) {
  try {
    const { keyword, timeRange = 'today 3-m', geo = 'US' } = await request.json();

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }

    // Convert timeRange to startTime and endTime
    let startTime = new Date();
    let endTime = new Date();

    switch (timeRange) {
      case 'today 1-m':
        startTime.setMonth(startTime.getMonth() - 1);
        break;
      case 'today 3-m':
        startTime.setMonth(startTime.getMonth() - 3);
        break;
      case 'today 12-m':
        startTime.setMonth(startTime.getMonth() - 12);
        break;
      default:
        startTime.setMonth(startTime.getMonth() - 3);
    }

    // Check if googleTrends is available
    if (!googleTrends) {
      // Return mock data if google-trends-api is not available
      const mockData = generateMockTrendData();
      return NextResponse.json({
        success: true,
        trendData: mockData,
        relatedQueries: [],
        metadata: {
          keyword,
          geo,
          timeRange,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          mock: true
        }
      });
    }

    // Fetch interest over time
    const results = await googleTrends.interestOverTime({
      keyword: keyword,
      startTime: startTime,
      endTime: endTime,
      geo: geo
    });

    const data = JSON.parse(results);
    
    // Format the data
    const trendData = data.default.timelineData.map((item: any) => ({
      date: item.formattedTime,
      value: item.value[0]
    }));

    // Also get related queries for additional context
    let relatedQueries = [];
    try {
      const relatedResults = await googleTrends.relatedQueries({
        keyword: keyword,
        startTime: startTime,
        endTime: endTime,
        geo: geo
      });
      
      const relatedData = JSON.parse(relatedResults);
      if (relatedData.default.rankedList[0]) {
        relatedQueries = relatedData.default.rankedList[0].rankedKeyword.map((item: any) => ({
          query: item.query,
          value: item.value
        }));
      }
    } catch (error) {
      console.warn('Could not fetch related queries:', error);
    }

    return NextResponse.json({
      success: true,
      trendData,
      relatedQueries,
      metadata: {
        keyword,
        geo,
        timeRange,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Google Trends API error:', error);
    
    // Return mock data in development
    if (process.env.NODE_ENV === 'development') {
      const mockData = generateMockTrendData();
      return NextResponse.json({
        success: true,
        trendData: mockData,
        relatedQueries: [],
        metadata: {
          keyword: 'mock',
          geo: 'US',
          timeRange: 'today 3-m',
          mock: true
        }
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch trend data', details: error.message },
      { status: 500 }
    );
  }
}

function generateMockTrendData() {
  const data = [];
  const days = 90;
  const peakDay = Math.floor(days * 0.6);
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Create a bell curve
    const distance = Math.abs(i - peakDay);
    const value = Math.max(
      0,
      Math.min(
        100,
        100 * Math.exp(-(distance * distance) / (2 * 15 * 15))
      )
    );
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value + Math.random() * 10 - 5)
    });
  }
  
  return data;
}