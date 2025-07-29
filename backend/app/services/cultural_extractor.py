"""
Cultural Intelligence Extraction Service
Processes trend data to extract marketing insights and brand opportunities
"""

import json
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)


class CulturalIntelligenceExtractor:
    """Extract cultural and marketing insights from trend data"""
    
    def __init__(self):
        self.mood_mappings = self._initialize_mood_mappings()
        self.demographic_profiles = self._initialize_demographic_profiles()
        self.brand_opportunity_templates = self._initialize_opportunity_templates()
    
    async def extract_cultural_insights(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract marketing-relevant cultural insights from trend"""
        
        # Analyze cultural context
        mood_analysis = self._analyze_mood_and_tone(trend_data)
        demographic_insights = self._extract_demographic_insights(trend_data)
        psychographic_profile = self._build_psychographic_profile(trend_data, mood_analysis)
        
        # Extract marketing opportunities
        why_trending = self._analyze_why_trending(trend_data)
        content_style = self._identify_content_style(trend_data)
        hashtags = self._extract_relevant_hashtags(trend_data)
        influencers = self._identify_key_influencers(trend_data)
        
        # Generate strategic insights
        brand_opportunities = self._generate_brand_opportunities(trend_data, mood_analysis)
        campaign_ideas = self._generate_campaign_ideas(trend_data, mood_analysis, content_style)
        lifecycle_phase = self._determine_lifecycle_phase(trend_data)
        
        return {
            'trend_id': trend_data['id'],
            'name': self._generate_trend_name(trend_data),
            'cultural_context': {
                'mood_tone': mood_analysis['primary_mood'],
                'emotional_drivers': mood_analysis['emotional_drivers'],
                'cultural_moment': mood_analysis['cultural_moment']
            },
            'demographics': demographic_insights,
            'psychographics': psychographic_profile,
            'why_trending': why_trending,
            'content_style': content_style,
            'hashtags': hashtags,
            'influencers': influencers,
            'brand_opportunities': brand_opportunities,
            'campaign_ideas': campaign_ideas,
            'lifecycle_phase': lifecycle_phase,
            'cross_platform_behavior': self._analyze_cross_platform(trend_data),
            'geographic_insights': self._analyze_geographic_spread(trend_data),
            'shopping_behavior': self._predict_shopping_behavior(trend_data, psychographic_profile)
        }
    
    def _analyze_mood_and_tone(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the emotional and cultural tone of the trend"""
        description = trend_data.get('description', '').lower()
        category = trend_data.get('category', '')
        
        # Map to primary moods
        mood_indicators = {
            'empowering': ['empower', 'strong', 'confidence', 'boss', 'queen', 'king', 'slay'],
            'funny': ['lol', 'hilarious', 'meme', 'joke', 'comedy', 'laugh', 'funny'],
            'wholesome': ['cute', 'sweet', 'adorable', 'heartwarming', 'pure', 'lovely'],
            'nostalgic': ['throwback', 'remember', 'nostalgia', '90s', '2000s', 'childhood'],
            'rebellious': ['rebel', 'break', 'against', 'fight', 'resist', 'punk', 'alt'],
            'cozy': ['cozy', 'comfort', 'warm', 'hygge', 'soft', 'relax', 'chill'],
            'sexy': ['hot', 'sexy', 'attractive', 'sultry', 'steamy', 'desire'],
            'fancy': ['luxury', 'elegant', 'sophisticated', 'classy', 'premium', 'high-end'],
            'chaotic': ['chaos', 'wild', 'crazy', 'unhinged', 'random', 'messy'],
            'cringe': ['cringe', 'awkward', 'embarrassing', 'yikes', 'oof']
        }
        
        detected_moods = []
        for mood, keywords in mood_indicators.items():
            if any(keyword in description for keyword in keywords):
                detected_moods.append(mood)
        
        primary_mood = detected_moods[0] if detected_moods else 'trendy'
        
        # Determine emotional drivers
        emotional_drivers = self._identify_emotional_drivers(description, primary_mood)
        
        # Identify cultural moment
        cultural_moment = self._identify_cultural_moment(trend_data, primary_mood)
        
        return {
            'primary_mood': primary_mood,
            'secondary_moods': detected_moods[1:] if len(detected_moods) > 1 else [],
            'emotional_drivers': emotional_drivers,
            'cultural_moment': cultural_moment
        }
    
    def _extract_demographic_insights(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract detailed demographic insights"""
        # This would integrate with your actual demographic data
        # For now, using intelligent defaults based on category and content
        
        category = trend_data.get('category', '').lower()
        description = trend_data.get('description', '').lower()
        
        # Age group detection
        if any(term in description for term in ['college', 'university', 'student']):
            primary_age = 'Gen Z (18-24)'
            secondary_age = 'Young Millennials (25-30)'
        elif any(term in description for term in ['mom', 'parent', 'family']):
            primary_age = 'Millennials (30-40)'
            secondary_age = 'Gen X (40-55)'
        elif 'teen' in description or 'high school' in description:
            primary_age = 'Gen Z (13-17)'
            secondary_age = 'Gen Z (18-24)'
        else:
            primary_age = 'Gen Z (18-24)'
            secondary_age = 'Millennials (25-35)'
        
        # Gender split estimation
        if category in ['beauty', 'fashion']:
            gender_split = '70% Female, 30% Male'
        elif category in ['gaming', 'tech']:
            gender_split = '60% Male, 40% Female'
        else:
            gender_split = '55% Female, 45% Male'
        
        return {
            'primary_age': primary_age,
            'secondary_age': secondary_age,
            'gender_split': gender_split,
            'income_level': self._estimate_income_level(trend_data),
            'education': self._estimate_education_level(trend_data),
            'location_type': self._estimate_location_type(trend_data)
        }
    
    def _build_psychographic_profile(
        self, 
        trend_data: Dict[str, Any], 
        mood_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build detailed psychographic profile"""
        
        mood = mood_analysis['primary_mood']
        category = trend_data.get('category', '')
        
        # Values mapping
        values_map = {
            'empowering': ['authenticity', 'self-expression', 'confidence'],
            'wholesome': ['community', 'kindness', 'positivity'],
            'rebellious': ['independence', 'non-conformity', 'creativity'],
            'cozy': ['comfort', 'mindfulness', 'simplicity'],
            'fancy': ['quality', 'status', 'sophistication'],
            'nostalgic': ['tradition', 'connection', 'memories']
        }
        
        # Interests mapping
        interests_map = {
            'fashion': ['style', 'beauty', 'self-care'],
            'tech': ['innovation', 'gadgets', 'gaming'],
            'food': ['cooking', 'restaurants', 'wellness'],
            'entertainment': ['pop culture', 'music', 'streaming'],
            'lifestyle': ['home decor', 'travel', 'wellness']
        }
        
        # Lifestyle determination
        lifestyle = self._determine_lifestyle(trend_data, mood_analysis)
        
        return {
            'values': values_map.get(mood, ['authenticity', 'community', 'creativity']),
            'interests': interests_map.get(category, ['culture', 'social media', 'trends']),
            'lifestyle': lifestyle,
            'personality_traits': self._identify_personality_traits(mood, category),
            'media_consumption': self._predict_media_consumption(trend_data),
            'brand_affinity': self._predict_brand_affinity(mood, lifestyle)
        }
    
    def _analyze_why_trending(self, trend_data: Dict[str, Any]) -> str:
        """Analyze the deeper cultural reason why something is trending"""
        
        description = trend_data.get('description', '')
        category = trend_data.get('category', '')
        validation_count = trend_data.get('validation_count', 0)
        
        # Quick viral = often rejection of something or embrace of authenticity
        if validation_count > 100:
            if 'reject' in description or 'instead of' in description:
                return "Rejection of traditional norms in favor of authentic self-expression"
            elif 'everyone' in description or 'obsessed' in description:
                return "FOMO-driven adoption creating viral social proof cycle"
            else:
                return "Capturing a shared cultural moment that resonates across demographics"
        
        # Category-specific insights
        category_insights = {
            'beauty': "Shift in beauty standards toward more inclusive/authentic representation",
            'fashion': "Expression of identity and values through style choices",
            'tech': "Early adopters showcasing innovation and digital lifestyle",
            'food': "Social bonding through shared culinary experiences",
            'lifestyle': "Aspirational content meeting attainable reality"
        }
        
        return category_insights.get(category, "Tapping into emerging cultural values and desires")
    
    def _identify_content_style(self, trend_data: Dict[str, Any]) -> str:
        """Identify the visual and content style of the trend"""
        
        description = trend_data.get('description', '').lower()
        category = trend_data.get('category', '')
        
        # Style indicators
        if any(term in description for term in ['aesthetic', 'vibe', 'core']):
            return "Curated aesthetic lifestyle content"
        elif any(term in description for term in ['tutorial', 'how to', 'diy']):
            return "Educational/tutorial style content"
        elif any(term in description for term in ['challenge', 'trend', 'dance']):
            return "Participatory challenge content"
        elif any(term in description for term in ['story', 'journey', 'transformation']):
            return "Narrative/storytelling content"
        elif any(term in description for term in ['haul', 'review', 'unboxing']):
            return "Product showcase/review content"
        else:
            return "Lifestyle documentation content"
    
    def _extract_relevant_hashtags(self, trend_data: Dict[str, Any]) -> List[str]:
        """Extract and generate relevant hashtags"""
        
        name = self._generate_trend_name(trend_data)
        category = trend_data.get('category', '')
        description = trend_data.get('description', '')
        
        # Generate hashtags
        hashtags = []
        
        # Name-based hashtags
        name_parts = name.lower().replace(' ', '')
        hashtags.append(name_parts)
        
        # Category hashtags
        category_tags = {
            'beauty': ['beauty', 'makeup', 'skincare'],
            'fashion': ['fashion', 'style', 'ootd'],
            'tech': ['tech', 'gadgets', 'innovation'],
            'food': ['foodie', 'recipe', 'cooking'],
            'lifestyle': ['lifestyle', 'aesthetic', 'vibes']
        }
        
        if category in category_tags:
            hashtags.extend(category_tags[category])
        
        # Extract hashtags from description
        import re
        found_hashtags = re.findall(r'#(\w+)', description)
        hashtags.extend(found_hashtags)
        
        # Add trending suffixes
        hashtags.extend([f"{name_parts}trend", f"{name_parts}challenge", f"{name_parts}vibes"])
        
        return list(set(hashtags))[:10]  # Return top 10 unique hashtags
    
    def _identify_key_influencers(self, trend_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify types of influencers driving the trend"""
        
        validation_count = trend_data.get('validation_count', 0)
        category = trend_data.get('category', '')
        
        # Influencer tiers based on trend stage
        if validation_count < 20:
            tier = "micro"
            follower_range = "1K-10K"
        elif validation_count < 50:
            tier = "mid"
            follower_range = "10K-100K"
        elif validation_count < 100:
            tier = "macro"
            follower_range = "100K-1M"
        else:
            tier = "mega"
            follower_range = "1M+"
        
        # Generate influencer profiles based on category
        influencer_types = {
            'beauty': [
                {'name': f'{tier.title()} Beauty Creator', 'followers': follower_range, 'platform': 'Instagram'},
                {'name': f'{tier.title()} MUA', 'followers': follower_range, 'platform': 'TikTok'}
            ],
            'fashion': [
                {'name': f'{tier.title()} Fashion Blogger', 'followers': follower_range, 'platform': 'Instagram'},
                {'name': f'{tier.title()} Style Creator', 'followers': follower_range, 'platform': 'TikTok'}
            ],
            'tech': [
                {'name': f'{tier.title()} Tech Reviewer', 'followers': follower_range, 'platform': 'YouTube'},
                {'name': f'{tier.title()} Tech Creator', 'followers': follower_range, 'platform': 'TikTok'}
            ],
            'lifestyle': [
                {'name': f'{tier.title()} Lifestyle Vlogger', 'followers': follower_range, 'platform': 'YouTube'},
                {'name': f'{tier.title()} Lifestyle Creator', 'followers': follower_range, 'platform': 'Instagram'}
            ]
        }
        
        return influencer_types.get(category, [
            {'name': f'{tier.title()} Content Creator', 'followers': follower_range, 'platform': 'TikTok'},
            {'name': f'{tier.title()} Influencer', 'followers': follower_range, 'platform': 'Instagram'}
        ])
    
    def _generate_brand_opportunities(
        self, 
        trend_data: Dict[str, Any], 
        mood_analysis: Dict[str, Any]
    ) -> List[str]:
        """Generate specific brand opportunity recommendations"""
        
        mood = mood_analysis['primary_mood']
        category = trend_data.get('category', '')
        validation_count = trend_data.get('validation_count', 0)
        
        opportunities = []
        
        # Timing-based opportunities
        if validation_count < 50:
            opportunities.append("Perfect timing for test campaigns with micro-influencers before mainstream adoption")
        elif validation_count < 100:
            opportunities.append("Launch limited edition products/collections aligned with trend aesthetic")
        else:
            opportunities.append("Amplify existing brand values through trend participation")
        
        # Mood-based opportunities
        mood_opportunities = {
            'empowering': "Position brand as enabler of self-expression and confidence",
            'wholesome': "Create community-building campaigns with user-generated content",
            'nostalgic': "Tap into retro product lines or throwback marketing",
            'cozy': "Launch comfort-focused products or wellness initiatives",
            'rebellious': "Challenge industry norms with bold campaigns"
        }
        
        if mood in mood_opportunities:
            opportunities.append(mood_opportunities[mood])
        
        # Category-specific opportunities
        category_opportunities = {
            'beauty': "Develop trend-specific product bundles or tutorials",
            'fashion': "Create capsule collections inspired by trend aesthetic",
            'tech': "Showcase product features that enable trend participation",
            'lifestyle': "Partner with creators for authentic lifestyle integration"
        }
        
        if category in category_opportunities:
            opportunities.append(category_opportunities[category])
        
        return opportunities[:3]  # Return top 3 opportunities
    
    def _generate_campaign_ideas(
        self, 
        trend_data: Dict[str, Any], 
        mood_analysis: Dict[str, Any],
        content_style: str
    ) -> List[str]:
        """Generate specific campaign ideas"""
        
        ideas = []
        mood = mood_analysis['primary_mood']
        
        # Content style based ideas
        if "tutorial" in content_style.lower():
            ideas.append("Create educational content series teaching trend techniques with product integration")
        elif "challenge" in content_style.lower():
            ideas.append("Launch branded challenge encouraging user participation with prizes")
        elif "aesthetic" in content_style.lower():
            ideas.append("Develop visual content library showcasing brand products within trend aesthetic")
        
        # Mood-based campaign ideas
        mood_campaigns = {
            'empowering': "Launch 'Be Your Own [Trend]' campaign celebrating individual interpretation",
            'wholesome': "Create community stories showcasing how trend brings people together",
            'nostalgic': "Develop 'Then vs Now' content comparing past and present",
            'rebellious': "Challenge conventions with 'Break the Rules' campaign"
        }
        
        if mood in mood_campaigns:
            ideas.append(mood_campaigns[mood])
        
        # Platform-specific ideas
        ideas.append("Partner with trend creators for authentic behind-the-scenes content")
        ideas.append("Develop AR filters or interactive experiences for trend participation")
        
        return ideas[:4]  # Return top 4 ideas
    
    def _determine_lifecycle_phase(self, trend_data: Dict[str, Any]) -> Dict[str, str]:
        """Determine where trend is in its lifecycle"""
        
        validation_count = trend_data.get('validation_count', 0)
        validation_ratio = trend_data.get('validation_ratio', 0)
        hours_old = (datetime.utcnow() - 
                    datetime.fromisoformat(trend_data['created_at'].replace('Z', '+00:00'))
                   ).total_seconds() / 3600
        
        velocity = validation_count / max(hours_old, 1)
        
        if validation_count < 10:
            return {
                'phase': 'just_starting',
                'description': 'Early experimentation by niche communities',
                'marketing_action': 'Monitor closely and prepare creative concepts'
            }
        elif validation_count < 50 and velocity > 2:
            return {
                'phase': 'picking_up',
                'description': 'Growing momentum with early adopters',
                'marketing_action': 'Launch test campaigns immediately'
            }
        elif validation_count > 100 and velocity > 5:
            return {
                'phase': 'viral',
                'description': 'Mainstream breakthrough moment',
                'marketing_action': 'Activate all prepared campaigns NOW'
            }
        elif validation_count > 200 and velocity < 2:
            return {
                'phase': 'saturated',
                'description': 'Peak saturation with major brand participation',
                'marketing_action': 'Focus on differentiation and authenticity'
            }
        else:
            return {
                'phase': 'declining',
                'description': 'Trend fatigue setting in',
                'marketing_action': 'Scout for counter-trends and evolution'
            }
    
    def _generate_trend_name(self, trend_data: Dict[str, Any]) -> str:
        """Generate a catchy marketing name for the trend"""
        
        description = trend_data.get('description', '')
        category = trend_data.get('category', '')
        
        # Extract key phrases
        if 'aesthetic' in description.lower():
            # Find the word before "aesthetic"
            words = description.lower().split()
            for i, word in enumerate(words):
                if word == 'aesthetic' and i > 0:
                    return f"{words[i-1].title()} Aesthetic"
        
        # Category-based naming
        category_prefixes = {
            'beauty': 'Beauty',
            'fashion': 'Style',
            'tech': 'Tech',
            'food': 'Food',
            'lifestyle': 'Life'
        }
        
        prefix = category_prefixes.get(category, 'Trend')
        
        # Extract action or key descriptor
        key_words = ['challenge', 'style', 'vibe', 'core', 'wave', 'movement']
        for word in key_words:
            if word in description.lower():
                return f"{prefix} {word.title()}"
        
        return f"{prefix} Trend #{trend_data.get('id', '')[:8]}"
    
    def _analyze_cross_platform(self, trend_data: Dict[str, Any]) -> Dict[str, str]:
        """Analyze cross-platform behavior patterns"""
        
        return {
            'discovery_platform': 'TikTok',
            'engagement_platform': 'Instagram',
            'purchase_research_platform': 'YouTube',
            'community_platform': 'Discord/Reddit',
            'sharing_pattern': 'TikTok → Instagram Stories → Twitter discourse'
        }
    
    def _analyze_geographic_spread(self, trend_data: Dict[str, Any]) -> List[str]:
        """Analyze geographic spread pattern"""
        
        # This would use real location data
        # For now, returning common patterns
        validation_count = trend_data.get('validation_count', 0)
        
        if validation_count < 50:
            return ['Major urban centers', 'Coastal cities', 'College towns']
        else:
            return ['Nationwide spread', 'Suburban adoption', 'International interest']
    
    def _predict_shopping_behavior(
        self, 
        trend_data: Dict[str, Any],
        psychographic_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predict shopping behavior based on trend participation"""
        
        lifestyle = psychographic_profile.get('lifestyle', '')
        values = psychographic_profile.get('values', [])
        
        return {
            'purchase_drivers': self._identify_purchase_drivers(values),
            'price_sensitivity': self._calculate_price_sensitivity(lifestyle),
            'brand_loyalty': self._predict_brand_loyalty(values),
            'channel_preference': self._predict_channel_preference(trend_data),
            'decision_timeline': self._predict_decision_timeline(trend_data)
        }
    
    # Helper methods
    def _initialize_mood_mappings(self) -> Dict[str, Any]:
        """Initialize mood to marketing mappings"""
        return {
            'empowering': {
                'brand_voice': 'confident, supportive, bold',
                'visual_style': 'strong colors, dynamic compositions',
                'messaging': 'you can, you will, you are'
            },
            'wholesome': {
                'brand_voice': 'warm, friendly, inclusive',
                'visual_style': 'soft colors, natural lighting',
                'messaging': 'together, community, love'
            },
            'rebellious': {
                'brand_voice': 'edgy, provocative, bold',
                'visual_style': 'high contrast, unconventional',
                'messaging': 'break, challenge, different'
            }
        }
    
    def _initialize_demographic_profiles(self) -> Dict[str, Any]:
        """Initialize demographic profile templates"""
        return {
            'gen_z': {
                'age_range': '13-24',
                'values': ['authenticity', 'diversity', 'sustainability'],
                'media': ['TikTok', 'Instagram', 'YouTube'],
                'shopping': ['online-first', 'value-conscious', 'brand-aware']
            },
            'millennials': {
                'age_range': '25-40',
                'values': ['experiences', 'wellness', 'convenience'],
                'media': ['Instagram', 'YouTube', 'Twitter'],
                'shopping': ['research-heavy', 'review-dependent', 'loyalty-prone']
            }
        }
    
    def _initialize_opportunity_templates(self) -> Dict[str, List[str]]:
        """Initialize brand opportunity templates"""
        return {
            'early_stage': [
                'Partner with micro-influencers for authentic content',
                'Create limited test products for trend validation',
                'Develop content strategy for trend participation'
            ],
            'growth_stage': [
                'Launch trend-specific product lines',
                'Activate influencer partnerships at scale',
                'Create branded challenges or campaigns'
            ],
            'viral_stage': [
                'Amplify existing campaigns with paid media',
                'Leverage user-generated content',
                'Fast-follow with complementary products'
            ]
        }
    
    def _identify_emotional_drivers(self, description: str, mood: str) -> List[str]:
        """Identify emotional drivers behind trend adoption"""
        
        drivers = []
        
        if mood == 'empowering':
            drivers = ['self-confidence', 'personal growth', 'achievement']
        elif mood == 'wholesome':
            drivers = ['belonging', 'comfort', 'joy']
        elif mood == 'nostalgic':
            drivers = ['connection', 'comfort', 'identity']
        elif mood == 'rebellious':
            drivers = ['independence', 'self-expression', 'change']
        else:
            drivers = ['discovery', 'expression', 'connection']
        
        return drivers
    
    def _identify_cultural_moment(self, trend_data: Dict[str, Any], mood: str) -> str:
        """Identify the broader cultural moment the trend represents"""
        
        validation_count = trend_data.get('validation_count', 0)
        
        if validation_count > 100:
            return "Mainstream cultural shift in progress"
        elif mood in ['empowering', 'rebellious']:
            return "Counter-culture movement gaining momentum"
        elif mood in ['wholesome', 'cozy']:
            return "Return to comfort and authenticity"
        else:
            return "Emerging subculture exploration"
    
    def _estimate_income_level(self, trend_data: Dict[str, Any]) -> str:
        """Estimate income level of trend participants"""
        
        description = trend_data.get('description', '').lower()
        
        if any(term in description for term in ['luxury', 'premium', 'expensive']):
            return 'High income ($100K+)'
        elif any(term in description for term in ['budget', 'cheap', 'affordable']):
            return 'Lower-middle income ($25K-50K)'
        else:
            return 'Middle income ($50K-100K)'
    
    def _estimate_education_level(self, trend_data: Dict[str, Any]) -> str:
        """Estimate education level"""
        
        description = trend_data.get('description', '').lower()
        
        if any(term in description for term in ['college', 'university', 'student']):
            return 'College/University'
        elif any(term in description for term in ['professional', 'career']):
            return 'College graduate+'
        else:
            return 'Mixed education levels'
    
    def _estimate_location_type(self, trend_data: Dict[str, Any]) -> str:
        """Estimate location type"""
        
        validation_count = trend_data.get('validation_count', 0)
        
        if validation_count < 50:
            return 'Urban centers'
        elif validation_count < 150:
            return 'Urban + Suburban'
        else:
            return 'Widespread (Urban/Suburban/Rural)'
    
    def _determine_lifestyle(self, trend_data: Dict[str, Any], mood_analysis: Dict[str, Any]) -> str:
        """Determine lifestyle categorization"""
        
        mood = mood_analysis['primary_mood']
        category = trend_data.get('category', '')
        
        lifestyle_map = {
            ('empowering', 'fitness'): 'Active go-getter',
            ('wholesome', 'lifestyle'): 'Mindful minimalist',
            ('fancy', 'fashion'): 'Luxury aspirational',
            ('cozy', 'lifestyle'): 'Comfort seeker',
            ('rebellious', 'fashion'): 'Alternative trendsetter'
        }
        
        return lifestyle_map.get((mood, category), 'Trend-conscious consumer')
    
    def _identify_personality_traits(self, mood: str, category: str) -> List[str]:
        """Identify personality traits of trend participants"""
        
        trait_map = {
            'empowering': ['confident', 'ambitious', 'leader'],
            'wholesome': ['caring', 'community-oriented', 'positive'],
            'rebellious': ['independent', 'creative', 'bold'],
            'cozy': ['introverted', 'thoughtful', 'comfort-seeking'],
            'fancy': ['status-conscious', 'sophisticated', 'quality-focused']
        }
        
        return trait_map.get(mood, ['curious', 'social', 'expressive'])
    
    def _predict_media_consumption(self, trend_data: Dict[str, Any]) -> Dict[str, str]:
        """Predict media consumption habits"""
        
        return {
            'primary_platform': 'TikTok/Instagram',
            'content_preference': 'Short-form video',
            'engagement_style': 'Active participant',
            'discovery_method': 'Algorithm + Friend sharing'
        }
    
    def _predict_brand_affinity(self, mood: str, lifestyle: str) -> List[str]:
        """Predict brand affinity based on psychographics"""
        
        brand_map = {
            'empowering': ['Nike', 'Glossier', 'Athleta'],
            'wholesome': ['Patagonia', 'Trader Joe\'s', 'Target'],
            'fancy': ['Sephora', 'Nordstrom', 'Apple'],
            'rebellious': ['Urban Outfitters', 'Dr. Martens', 'Glossier']
        }
        
        return brand_map.get(mood, ['Target', 'Amazon', 'Nike'])
    
    def _identify_purchase_drivers(self, values: List[str]) -> List[str]:
        """Identify what drives purchase decisions"""
        
        drivers = []
        
        if 'authenticity' in values:
            drivers.append('Brand values alignment')
        if 'quality' in values:
            drivers.append('Product quality and durability')
        if 'community' in values:
            drivers.append('Social proof and recommendations')
        if 'sustainability' in values:
            drivers.append('Environmental impact')
        
        return drivers or ['Trend relevance', 'Social proof', 'Value for money']
    
    def _calculate_price_sensitivity(self, lifestyle: str) -> str:
        """Calculate price sensitivity"""
        
        if 'luxury' in lifestyle.lower():
            return 'Low - Quality over price'
        elif 'minimalist' in lifestyle.lower():
            return 'Medium - Value-conscious'
        else:
            return 'High - Price-comparison shopper'
    
    def _predict_brand_loyalty(self, values: List[str]) -> str:
        """Predict brand loyalty level"""
        
        if 'authenticity' in values or 'community' in values:
            return 'High - Values-driven loyalty'
        else:
            return 'Medium - Open to alternatives'
    
    def _predict_channel_preference(self, trend_data: Dict[str, Any]) -> str:
        """Predict shopping channel preference"""
        
        category = trend_data.get('category', '')
        
        if category in ['fashion', 'beauty']:
            return 'Omnichannel - Online research, in-store trial'
        elif category == 'tech':
            return 'Online-first with review research'
        else:
            return 'Mobile commerce dominant'
    
    def _predict_decision_timeline(self, trend_data: Dict[str, Any]) -> str:
        """Predict purchase decision timeline"""
        
        validation_count = trend_data.get('validation_count', 0)
        
        if validation_count > 100:
            return 'Impulse - Quick FOMO-driven decisions'
        else:
            return 'Considered - 1-2 week research period'


# Process trend for marketing insights
async def process_cultural_insights(trend_id: str):
    """Process a trend submission for cultural and marketing insights"""
    try:
        # Get trend data
        trend_response = supabase.table('trend_submissions').select('*').eq('id', trend_id).single().execute()
        trend_data = trend_response.data
        
        if not trend_data:
            logger.error(f"Trend {trend_id} not found")
            return
        
        # Extract cultural insights
        extractor = CulturalIntelligenceExtractor()
        insights = await extractor.extract_cultural_insights(trend_data)
        
        # Save marketing insights (you would create a marketing_insights table)
        marketing_data = {
            'trend_id': trend_id,
            'trend_name': insights['name'],
            'mood_tone': insights['cultural_context']['mood_tone'],
            'demographics': json.dumps(insights['demographics']),
            'psychographics': json.dumps(insights['psychographics']),
            'why_trending': insights['why_trending'],
            'content_style': insights['content_style'],
            'hashtags': json.dumps(insights['hashtags']),
            'influencers': json.dumps(insights['influencers']),
            'brand_opportunities': json.dumps(insights['brand_opportunities']),
            'campaign_ideas': json.dumps(insights['campaign_ideas']),
            'lifecycle_phase': insights['lifecycle_phase']['phase'],
            'shopping_behavior': json.dumps(insights['shopping_behavior'])
        }
        
        # This would save to a marketing_insights table
        logger.info(f"Successfully processed cultural insights for trend {trend_id}")
        
    except Exception as e:
        logger.error(f"Error processing cultural insights for trend {trend_id}: {e}")
        raise