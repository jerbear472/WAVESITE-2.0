"""
Marketing Agency API Endpoints
RESTful API for cultural insights and brand intelligence
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.supabase_client import supabase
from app.models.models import User
from app.services.cultural_extractor import CulturalIntelligenceExtractor

router = APIRouter(
    prefix="/marketing",
    tags=["marketing"],
    responses={404: {"description": "Not found"}},
)


# Check if user has marketing access
async def verify_marketing_access(current_user: User = Depends(get_current_user)):
    """Verify user has marketing dashboard access"""
    # Check subscription tier
    if current_user.subscription_tier not in ['starter_agency', 'professional_agency', 'enterprise_agency', 'enterprise']:
        raise HTTPException(
            status_code=403, 
            detail="Marketing dashboard requires agency subscription"
        )
    return current_user


@router.get("/trends")
async def get_marketing_trends(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    timeframe: str = Query("7d", regex="^(24h|7d|30d)$"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(verify_marketing_access)
):
    """
    Get trends with cultural insights for marketing campaigns
    """
    try:
        # Calculate timeframe
        if timeframe == "24h":
            since = datetime.utcnow() - timedelta(hours=24)
        elif timeframe == "30d":
            since = datetime.utcnow() - timedelta(days=30)
        else:  # 7d default
            since = datetime.utcnow() - timedelta(days=7)
        
        # Build query
        query = supabase.table('trend_submissions').select(
            '*'
        ).gte('created_at', since.isoformat()).order(
            'validation_count', desc=True
        ).limit(limit)
        
        # Apply filters
        if category and category != 'all':
            query = query.eq('category', category)
        
        # Execute query
        response = query.execute()
        trends_data = response.data
        
        # Process each trend for marketing insights
        extractor = CulturalIntelligenceExtractor()
        marketing_trends = []
        
        for trend in trends_data:
            # Extract cultural insights
            insights = await extractor.extract_cultural_insights(trend)
            
            # Determine status based on lifecycle
            lifecycle = insights['lifecycle_phase']
            
            # Filter by status if specified
            if status and status != 'all' and lifecycle['phase'] != status:
                continue
            
            # Filter by mood if specified
            if mood and mood != 'all' and insights['cultural_context']['mood_tone'] != mood:
                continue
            
            # Format for marketing dashboard
            marketing_trend = {
                'id': trend['id'],
                'name': insights['name'],
                'description': trend['description'],
                'category': trend['category'],
                'status': lifecycle['phase'],
                'validation_count': trend['validation_count'],
                'validation_ratio': trend['validation_ratio'],
                'screenshot_url': trend.get('screenshot_url'),
                'demographics': insights['demographics'],
                'psychographics': insights['psychographics'],
                'mood_tone': insights['cultural_context']['mood_tone'],
                'why_trending': insights['why_trending'],
                'geographic_spread': insights['geographic_insights'],
                'platforms': ['instagram', 'tiktok', 'twitter'],  # Would come from real data
                'hashtags': insights['hashtags'],
                'brands_mentioned': trend.get('evidence', {}).get('mentioned_brands', []),
                'influencers': insights['influencers'],
                'content_style': insights['content_style'],
                'brand_opportunities': insights['brand_opportunities'],
                'campaign_ideas': insights['campaign_ideas'],
                'created_at': trend['created_at']
            }
            
            marketing_trends.append(marketing_trend)
        
        return {
            'trends': marketing_trends,
            'total': len(marketing_trends),
            'timeframe': timeframe
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/{trend_id}/detailed-insights")
async def get_detailed_trend_insights(
    trend_id: str,
    current_user: User = Depends(verify_marketing_access)
):
    """
    Get deep cultural insights for a specific trend
    """
    try:
        # Get trend data
        trend_response = supabase.table('trend_submissions').select('*').eq('id', trend_id).single().execute()
        
        if not trend_response.data:
            raise HTTPException(status_code=404, detail="Trend not found")
        
        trend = trend_response.data
        
        # Extract detailed insights
        extractor = CulturalIntelligenceExtractor()
        insights = await extractor.extract_cultural_insights(trend)
        
        # Get related trends
        related_response = supabase.table('trend_submissions').select(
            'id, description, category, validation_count'
        ).eq('category', trend['category']).neq('id', trend_id).order(
            'validation_count', desc=True
        ).limit(5).execute()
        
        return {
            'trend': {
                'id': trend['id'],
                'name': insights['name'],
                'description': trend['description'],
                'category': trend['category'],
                'created_at': trend['created_at'],
                'validation_metrics': {
                    'count': trend['validation_count'],
                    'ratio': trend['validation_ratio'],
                    'velocity': calculate_trend_velocity(trend)
                }
            },
            'cultural_insights': {
                'mood_analysis': insights['cultural_context'],
                'why_trending': insights['why_trending'],
                'content_style': insights['content_style'],
                'lifecycle_phase': insights['lifecycle_phase']
            },
            'audience_intelligence': {
                'demographics': insights['demographics'],
                'psychographics': insights['psychographics'],
                'shopping_behavior': insights['shopping_behavior'],
                'cross_platform_behavior': insights['cross_platform_behavior']
            },
            'activation_opportunities': {
                'brand_opportunities': insights['brand_opportunities'],
                'campaign_ideas': insights['campaign_ideas'],
                'hashtag_strategy': insights['hashtags'],
                'influencer_strategy': insights['influencers']
            },
            'competitive_landscape': {
                'brands_participating': trend.get('evidence', {}).get('mentioned_brands', []),
                'related_trends': [
                    {
                        'id': t['id'],
                        'description': t['description'],
                        'validation_count': t['validation_count']
                    }
                    for t in related_response.data
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mood-boards")
async def get_mood_boards(
    category: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(verify_marketing_access)
):
    """
    Get visual mood boards for trend aesthetics
    """
    try:
        # Query trends with screenshots
        query = supabase.table('trend_submissions').select(
            'id, description, category, screenshot_url, validation_count'
        ).not_.is_('screenshot_url', 'null').order(
            'validation_count', desc=True
        ).limit(limit)
        
        if category and category != 'all':
            query = query.eq('category', category)
        
        response = query.execute()
        
        # Process for mood boards
        extractor = CulturalIntelligenceExtractor()
        mood_boards = []
        
        for trend in response.data:
            insights = await extractor.extract_cultural_insights(trend)
            
            if mood and mood != 'all' and insights['cultural_context']['mood_tone'] != mood:
                continue
            
            mood_boards.append({
                'id': trend['id'],
                'image_url': trend['screenshot_url'],
                'mood': insights['cultural_context']['mood_tone'],
                'aesthetic': insights['content_style'],
                'color_palette': extract_color_palette(insights['cultural_context']['mood_tone']),
                'keywords': insights['cultural_context']['emotional_drivers'],
                'styling_notes': generate_styling_notes(insights)
            })
        
        return {
            'mood_boards': mood_boards,
            'total': len(mood_boards)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaign-calendar")
async def get_campaign_calendar(
    timeframe: str = Query("30d", regex="^(7d|30d|90d)$"),
    current_user: User = Depends(verify_marketing_access)
):
    """
    Get campaign timing recommendations based on trend lifecycles
    """
    try:
        # Get trends in different lifecycle phases
        days = int(timeframe.replace('d', ''))
        since = datetime.utcnow() - timedelta(days=days)
        
        trends_response = supabase.table('trend_submissions').select(
            '*'
        ).gte('created_at', since.isoformat()).order(
            'created_at', desc=True
        ).execute()
        
        # Process and categorize by urgency
        extractor = CulturalIntelligenceExtractor()
        calendar_items = {
            'immediate_action': [],  # Viral trends
            'this_week': [],         # Picking up trends
            'next_month': [],        # Just starting trends
            'monitor': []            # Saturated/declining trends
        }
        
        for trend in trends_response.data:
            insights = await extractor.extract_cultural_insights(trend)
            lifecycle = insights['lifecycle_phase']
            
            calendar_entry = {
                'trend_id': trend['id'],
                'trend_name': insights['name'],
                'category': trend['category'],
                'lifecycle_phase': lifecycle['phase'],
                'recommended_action': lifecycle['marketing_action'],
                'urgency': determine_campaign_urgency(lifecycle['phase']),
                'campaign_window': estimate_campaign_window(lifecycle['phase']),
                'created_at': trend['created_at']
            }
            
            # Categorize by urgency
            if lifecycle['phase'] == 'viral':
                calendar_items['immediate_action'].append(calendar_entry)
            elif lifecycle['phase'] == 'picking_up':
                calendar_items['this_week'].append(calendar_entry)
            elif lifecycle['phase'] == 'just_starting':
                calendar_items['next_month'].append(calendar_entry)
            else:
                calendar_items['monitor'].append(calendar_entry)
        
        return {
            'timeframe': timeframe,
            'calendar': calendar_items,
            'summary': {
                'immediate_opportunities': len(calendar_items['immediate_action']),
                'upcoming_opportunities': len(calendar_items['this_week']),
                'planning_opportunities': len(calendar_items['next_month']),
                'total_trends': sum(len(items) for items in calendar_items.values())
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audience-insights")
async def get_audience_insights(
    demographic: Optional[str] = Query(None),
    psychographic: Optional[str] = Query(None),
    current_user: User = Depends(verify_marketing_access)
):
    """
    Get aggregated audience insights across trends
    """
    try:
        # Get recent trends
        trends_response = supabase.table('trend_submissions').select(
            '*'
        ).gte('validation_count', 20).order(
            'validation_count', desc=True
        ).limit(100).execute()
        
        # Aggregate audience data
        extractor = CulturalIntelligenceExtractor()
        audience_segments = {}
        value_frequencies = {}
        interest_frequencies = {}
        lifestyle_segments = {}
        
        for trend in trends_response.data:
            insights = await extractor.extract_cultural_insights(trend)
            
            # Aggregate demographics
            demo_key = insights['demographics']['primary_age']
            if demo_key not in audience_segments:
                audience_segments[demo_key] = {
                    'count': 0,
                    'trends': [],
                    'dominant_categories': {},
                    'common_moods': {}
                }
            
            audience_segments[demo_key]['count'] += 1
            audience_segments[demo_key]['trends'].append(insights['name'])
            
            # Count categories
            cat = trend['category']
            if cat not in audience_segments[demo_key]['dominant_categories']:
                audience_segments[demo_key]['dominant_categories'][cat] = 0
            audience_segments[demo_key]['dominant_categories'][cat] += 1
            
            # Count moods
            mood = insights['cultural_context']['mood_tone']
            if mood not in audience_segments[demo_key]['common_moods']:
                audience_segments[demo_key]['common_moods'][mood] = 0
            audience_segments[demo_key]['common_moods'][mood] += 1
            
            # Aggregate psychographics
            for value in insights['psychographics']['values']:
                value_frequencies[value] = value_frequencies.get(value, 0) + 1
            
            for interest in insights['psychographics']['interests']:
                interest_frequencies[interest] = interest_frequencies.get(interest, 0) + 1
            
            lifestyle = insights['psychographics']['lifestyle']
            lifestyle_segments[lifestyle] = lifestyle_segments.get(lifestyle, 0) + 1
        
        # Sort and format results
        top_values = sorted(value_frequencies.items(), key=lambda x: x[1], reverse=True)[:10]
        top_interests = sorted(interest_frequencies.items(), key=lambda x: x[1], reverse=True)[:10]
        top_lifestyles = sorted(lifestyle_segments.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            'audience_segments': format_audience_segments(audience_segments),
            'psychographic_insights': {
                'top_values': [{'value': v[0], 'frequency': v[1]} for v in top_values],
                'top_interests': [{'interest': i[0], 'frequency': i[1]} for i in top_interests],
                'lifestyle_segments': [{'lifestyle': l[0], 'count': l[1]} for l in top_lifestyles]
            },
            'targeting_recommendations': generate_targeting_recommendations(audience_segments, top_values)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brand-opportunities/{brand_category}")
async def get_brand_opportunities(
    brand_category: str,
    urgency: Optional[str] = Query(None),
    current_user: User = Depends(verify_marketing_access)
):
    """
    Get specific brand opportunities by category
    """
    try:
        # Get relevant trends for brand category
        trends_response = supabase.table('trend_submissions').select(
            '*'
        ).gte('validation_count', 10).order(
            'validation_count', desc=True
        ).limit(50).execute()
        
        # Filter and process for brand opportunities
        extractor = CulturalIntelligenceExtractor()
        opportunities = []
        
        for trend in trends_response.data:
            # Skip if not relevant category
            if not is_relevant_for_brand_category(trend['category'], brand_category):
                continue
            
            insights = await extractor.extract_cultural_insights(trend)
            lifecycle = insights['lifecycle_phase']
            
            # Filter by urgency if specified
            if urgency:
                urgency_map = {
                    'just_starting': 'low',
                    'picking_up': 'high',
                    'viral': 'critical',
                    'saturated': 'medium',
                    'declining': 'low'
                }
                if urgency_map.get(lifecycle['phase']) != urgency:
                    continue
            
            opportunity = {
                'trend_id': trend['id'],
                'trend_name': insights['name'],
                'relevance_score': calculate_brand_relevance(trend, brand_category),
                'lifecycle_phase': lifecycle['phase'],
                'urgency': determine_campaign_urgency(lifecycle['phase']),
                'specific_opportunities': filter_opportunities_for_brand(
                    insights['brand_opportunities'], 
                    brand_category
                ),
                'campaign_concepts': filter_campaigns_for_brand(
                    insights['campaign_ideas'],
                    brand_category
                ),
                'target_audience': {
                    'demographics': insights['demographics'],
                    'psychographics': insights['psychographics']
                },
                'activation_timeline': estimate_activation_timeline(lifecycle['phase'])
            }
            
            opportunities.append(opportunity)
        
        # Sort by relevance and urgency
        opportunities.sort(key=lambda x: (x['relevance_score'], x['urgency'] == 'critical'), reverse=True)
        
        return {
            'brand_category': brand_category,
            'opportunities': opportunities[:20],  # Top 20
            'summary': {
                'immediate_actions': len([o for o in opportunities if o['urgency'] == 'critical']),
                'high_relevance': len([o for o in opportunities if o['relevance_score'] > 0.7]),
                'total_opportunities': len(opportunities)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions
def calculate_trend_velocity(trend: Dict) -> float:
    """Calculate how fast a trend is growing"""
    hours_old = (datetime.utcnow() - 
                datetime.fromisoformat(trend['created_at'].replace('Z', '+00:00'))
               ).total_seconds() / 3600
    return trend['validation_count'] / max(hours_old, 1)


def extract_color_palette(mood: str) -> List[str]:
    """Extract color palette based on mood"""
    color_palettes = {
        'empowering': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
        'wholesome': ['#F8B195', '#F67280', '#C06C84', '#6C5B7B'],
        'nostalgic': ['#D4A574', '#E9C893', '#FAEDCA', '#C1DBB3'],
        'cozy': ['#8B7355', '#D2B48C', '#F5DEB3', '#FFF8DC'],
        'rebellious': ['#2C3E50', '#E74C3C', '#1A1A1A', '#95A5A6'],
        'fancy': ['#FFD700', '#C0C0C0', '#1C1C1C', '#FFFFFF']
    }
    return color_palettes.get(mood, ['#3498DB', '#2ECC71', '#F39C12', '#E74C3C'])


def generate_styling_notes(insights: Dict) -> List[str]:
    """Generate visual styling notes based on insights"""
    mood = insights['cultural_context']['mood_tone']
    style = insights['content_style']
    
    notes = []
    
    if 'aesthetic' in style.lower():
        notes.append("Focus on cohesive visual identity")
    if 'tutorial' in style.lower():
        notes.append("Step-by-step visual guides work best")
    
    mood_notes = {
        'empowering': "Bold typography, dynamic compositions",
        'wholesome': "Soft lighting, natural tones",
        'nostalgic': "Vintage filters, retro elements",
        'cozy': "Warm tones, intimate framing"
    }
    
    if mood in mood_notes:
        notes.append(mood_notes[mood])
    
    return notes


def determine_campaign_urgency(phase: str) -> str:
    """Determine campaign urgency based on lifecycle phase"""
    urgency_map = {
        'just_starting': 'low',
        'picking_up': 'high',
        'viral': 'critical',
        'saturated': 'medium',
        'declining': 'low'
    }
    return urgency_map.get(phase, 'medium')


def estimate_campaign_window(phase: str) -> str:
    """Estimate optimal campaign window"""
    window_map = {
        'just_starting': '2-4 weeks to prepare',
        'picking_up': '1 week to launch',
        'viral': 'Launch within 48 hours',
        'saturated': 'Differentiate or skip',
        'declining': 'Archive for future reference'
    }
    return window_map.get(phase, '1-2 weeks')


def format_audience_segments(segments: Dict) -> List[Dict]:
    """Format audience segments for response"""
    formatted = []
    
    for demo, data in segments.items():
        # Get top category and mood
        top_category = max(data['dominant_categories'].items(), key=lambda x: x[1])[0] if data['dominant_categories'] else 'mixed'
        top_mood = max(data['common_moods'].items(), key=lambda x: x[1])[0] if data['common_moods'] else 'varied'
        
        formatted.append({
            'demographic': demo,
            'size': data['count'],
            'dominant_category': top_category,
            'common_mood': top_mood,
            'example_trends': data['trends'][:3]
        })
    
    return sorted(formatted, key=lambda x: x['size'], reverse=True)


def generate_targeting_recommendations(segments: Dict, values: List) -> List[str]:
    """Generate targeting recommendations based on insights"""
    recommendations = []
    
    # Find largest segment
    if segments:
        largest_segment = max(segments.items(), key=lambda x: x[1]['count'])[0]
        recommendations.append(f"Primary target: {largest_segment} demographic showing highest engagement")
    
    # Value-based recommendations
    if values and values[0][1] > 10:
        recommendations.append(f"Message focus: Appeal to '{values[0][0]}' value strongly present in audience")
    
    recommendations.append("Use platform-native content formats for authentic engagement")
    recommendations.append("Partner with micro-influencers for initial campaign testing")
    
    return recommendations


def is_relevant_for_brand_category(trend_category: str, brand_category: str) -> bool:
    """Check if trend is relevant for brand category"""
    relevance_map = {
        'beauty': ['beauty', 'fashion', 'lifestyle'],
        'fashion': ['fashion', 'beauty', 'lifestyle'],
        'food': ['food', 'lifestyle', 'health'],
        'tech': ['tech', 'gaming', 'lifestyle'],
        'lifestyle': ['lifestyle', 'fashion', 'beauty', 'food', 'health'],
        'retail': ['fashion', 'beauty', 'lifestyle', 'tech']
    }
    
    relevant_categories = relevance_map.get(brand_category.lower(), [])
    return trend_category.lower() in relevant_categories


def calculate_brand_relevance(trend: Dict, brand_category: str) -> float:
    """Calculate relevance score for brand"""
    base_score = 0.5
    
    # Category match
    if trend['category'].lower() == brand_category.lower():
        base_score += 0.3
    
    # Validation strength
    if trend['validation_count'] > 100:
        base_score += 0.2
    elif trend['validation_count'] > 50:
        base_score += 0.1
    
    return min(base_score, 1.0)


def filter_opportunities_for_brand(opportunities: List[str], brand_category: str) -> List[str]:
    """Filter opportunities relevant to brand category"""
    # In real implementation, this would be more sophisticated
    return opportunities[:2] if opportunities else [
        f"Leverage trend for {brand_category} product showcase",
        f"Create {brand_category}-specific content series"
    ]


def filter_campaigns_for_brand(campaigns: List[str], brand_category: str) -> List[str]:
    """Filter campaign ideas for brand category"""
    return campaigns[:2] if campaigns else [
        f"Launch {brand_category} challenge campaign",
        f"Partner with creators for {brand_category} content"
    ]


def estimate_activation_timeline(phase: str) -> str:
    """Estimate timeline for campaign activation"""
    timelines = {
        'just_starting': '2-4 weeks preparation',
        'picking_up': '1 week rapid deployment',
        'viral': '24-48 hours immediate action',
        'saturated': '1-2 weeks for differentiation',
        'declining': 'Not recommended'
    }
    return timelines.get(phase, '1-2 weeks')