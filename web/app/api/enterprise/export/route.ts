import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has enterprise access
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['professional', 'enterprise', 'hedge_fund'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Enterprise access required' }, { status: 403 });
    }

    // Get request parameters
    const body = await request.json();
    const { 
      format = 'xlsx',
      dateRange,
      categories = ['all'],
      includeStats = true,
      includeTrends = true,
      includeMetadata = true,
      limit = 1000
    } = body;

    // Build query
    let query = supabase
      .from('trend_submissions')
      .select(`
        *,
        spotter:profiles!spotter_id (username, email),
        validations:trend_validations (
          is_valid,
          created_at,
          validator_id
        )
      `)
      .gt('validation_count', 0)
      .gt('validation_ratio', 0.5)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply date range filter
    if (dateRange?.start) {
      query = query.gte('created_at', dateRange.start);
    }
    if (dateRange?.end) {
      query = query.lte('created_at', dateRange.end);
    }

    // Apply category filter
    if (!categories.includes('all') && categories.length > 0) {
      query = query.in('category', categories);
    }

    const { data: trends, error } = await query;
    
    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = calculateStats(trends || []);

    // Generate report based on format
    if (format === 'xlsx') {
      const buffer = await generateExcelReport(trends || [], stats, {
        includeStats,
        includeTrends,
        includeMetadata
      });
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="WaveSight_Enterprise_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx"`
        }
      });
    } else if (format === 'csv') {
      const csv = generateCSVReport(trends || []);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="WaveSight_Enterprise_Report_${format(new Date(), 'yyyy-MM-dd')}.csv"`
        }
      });
    } else if (format === 'json') {
      return NextResponse.json({
        metadata: {
          generated_at: new Date().toISOString(),
          total_trends: trends?.length || 0,
          date_range: dateRange,
          categories: categories
        },
        stats: includeStats ? stats : undefined,
        trends: includeTrends ? trends : undefined,
        category_analysis: includeMetadata ? generateCategoryAnalysis(trends || []) : undefined
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function calculateStats(trends: any[]) {
  const categoryMap = new Map();
  const spotterMap = new Map();
  let totalScore = 0;
  let todayCount = 0;
  let weekCount = 0;
  
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  trends.forEach(trend => {
    // Category counting
    categoryMap.set(trend.category, (categoryMap.get(trend.category) || 0) + 1);
    
    // Spotter counting
    spotterMap.set(trend.spotter_id, (spotterMap.get(trend.spotter_id) || 0) + 1);
    
    // Score calculation
    totalScore += trend.validation_ratio;
    
    // Time-based counting
    const trendDate = new Date(trend.created_at);
    if (trendDate >= dayAgo) todayCount++;
    if (trendDate >= weekAgo) weekCount++;
  });

  const topCategory = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])[0];
    
  const topSpotter = Array.from(spotterMap.entries())
    .sort((a, b) => b[1] - a[1])[0];

  return {
    total_validated_trends: trends.length,
    avg_validation_score: trends.length > 0 ? (totalScore / trends.length) * 100 : 0,
    total_categories: categoryMap.size,
    top_category: topCategory ? topCategory[0] : 'N/A',
    top_category_count: topCategory ? topCategory[1] : 0,
    trends_today: todayCount,
    trends_this_week: weekCount,
    total_spotters: spotterMap.size,
    top_spotter_id: topSpotter ? topSpotter[0] : null,
    top_spotter_trends: topSpotter ? topSpotter[1] : 0,
    validation_rate: trends.length > 0 
      ? trends.reduce((sum, t) => sum + t.validation_count, 0) / trends.length 
      : 0
  };
}

function generateCategoryAnalysis(trends: any[]) {
  const categoryMap = new Map();
  
  trends.forEach(trend => {
    if (!categoryMap.has(trend.category)) {
      categoryMap.set(trend.category, {
        name: trend.category,
        count: 0,
        totalScore: 0,
        positiveVotes: 0,
        negativeVotes: 0,
        trends: []
      });
    }
    
    const cat = categoryMap.get(trend.category);
    cat.count++;
    cat.totalScore += trend.validation_ratio;
    cat.positiveVotes += trend.positive_validations;
    cat.negativeVotes += trend.negative_validations;
    cat.trends.push({
      id: trend.id,
      description: trend.description,
      score: trend.validation_ratio
    });
  });
  
  return Array.from(categoryMap.values()).map(cat => ({
    category: cat.name,
    total_trends: cat.count,
    average_score: (cat.totalScore / cat.count) * 100,
    total_positive_votes: cat.positiveVotes,
    total_negative_votes: cat.negativeVotes,
    approval_rate: (cat.positiveVotes / (cat.positiveVotes + cat.negativeVotes)) * 100,
    top_trends: cat.trends
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5)
  }));
}

async function generateExcelReport(trends: any[], stats: any, options: any) {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  if (options.includeStats) {
    const summaryData = [
      ['WaveSight Enterprise Analytics Report'],
      ['Generated on', format(new Date(), 'PPP pp')],
      [''],
      ['Executive Summary'],
      [''],
      ['Key Metrics'],
      ['Total Validated Trends', stats.total_validated_trends],
      ['Average Validation Score', `${Math.round(stats.avg_validation_score)}%`],
      ['Total Categories', stats.total_categories],
      ['Top Category', stats.top_category, `(${stats.top_category_count} trends)`],
      ['Trends Today', stats.trends_today],
      ['Trends This Week', stats.trends_this_week],
      ['Active Contributors', stats.total_spotters],
      ['Average Validations per Trend', Math.round(stats.validation_rate)],
      [''],
      ['Performance Indicators'],
      ['High Confidence Trends (>80%)', trends.filter(t => t.validation_ratio > 0.8).length],
      ['Medium Confidence (60-80%)', trends.filter(t => t.validation_ratio >= 0.6 && t.validation_ratio <= 0.8).length],
      ['Low Confidence (<60%)', trends.filter(t => t.validation_ratio < 0.6).length],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Apply column widths
    summarySheet['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 20 }
    ];
    
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Summary');
  }
  
  // Detailed trends sheet
  if (options.includeTrends) {
    const trendsData = trends.map(trend => ({
      'Trend ID': trend.id,
      'Description': trend.description,
      'Category': trend.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      'Confidence Score': `${Math.round(trend.validation_ratio * 100)}%`,
      'Positive Votes': trend.positive_validations,
      'Negative Votes': trend.negative_validations,
      'Total Validators': trend.validation_count,
      'Created Date': format(new Date(trend.created_at), 'yyyy-MM-dd'),
      'Created Time': format(new Date(trend.created_at), 'HH:mm:ss'),
      'Days Active': Math.floor((new Date().getTime() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      'Status': trend.status,
      'Spotter': trend.spotter?.username || 'Anonymous',
      'Evidence URL': trend.screenshot_url || trend.evidence?.url || ''
    }));
    
    const trendsSheet = XLSX.utils.json_to_sheet(trendsData);
    
    // Apply column widths
    trendsSheet['!cols'] = [
      { wch: 15 }, // ID
      { wch: 50 }, // Description
      { wch: 20 }, // Category
      { wch: 15 }, // Score
      { wch: 12 }, // Positive
      { wch: 12 }, // Negative
      { wch: 15 }, // Validators
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 10 }, // Days
      { wch: 12 }, // Status
      { wch: 20 }, // Spotter
      { wch: 30 }  // URL
    ];
    
    XLSX.utils.book_append_sheet(wb, trendsSheet, 'Trend Details');
  }
  
  // Category analysis sheet
  if (options.includeMetadata) {
    const categoryAnalysis = generateCategoryAnalysis(trends);
    
    const categoryData = categoryAnalysis.map(cat => ({
      'Category': cat.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      'Total Trends': cat.total_trends,
      'Average Confidence': `${Math.round(cat.average_score)}%`,
      'Approval Rate': `${Math.round(cat.approval_rate)}%`,
      'Total Positive': cat.total_positive_votes,
      'Total Negative': cat.total_negative_votes,
      'Top Trend': cat.top_trends[0]?.description || 'N/A'
    }));
    
    const categorySheet = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, categorySheet, 'Category Analysis');
  }
  
  // Generate buffer
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return buffer;
}

function generateCSVReport(trends: any[]) {
  const headers = [
    'ID',
    'Description',
    'Category',
    'Confidence Score',
    'Positive Votes',
    'Negative Votes',
    'Total Validators',
    'Created Date',
    'Status',
    'Spotter'
  ];
  
  const rows = trends.map(trend => [
    trend.id,
    `"${trend.description.replace(/"/g, '""')}"`,
    trend.category,
    `${Math.round(trend.validation_ratio * 100)}%`,
    trend.positive_validations,
    trend.negative_validations,
    trend.validation_count,
    format(new Date(trend.created_at), 'yyyy-MM-dd HH:mm:ss'),
    trend.status,
    trend.spotter?.username || 'Anonymous'
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}