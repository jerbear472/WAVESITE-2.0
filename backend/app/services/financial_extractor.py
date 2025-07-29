"""
Financial Intelligence Extraction Service
Processes trend data to extract investment signals for hedge funds
"""

import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from decimal import Decimal
import logging

from app.core.database import get_db
from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)


class FinancialIntelligenceExtractor:
    """Extract financial signals from trend data"""
    
    def __init__(self):
        self.brand_database = self._load_brand_database()
        self.sentiment_keywords = self._initialize_sentiment_keywords()
        
    async def extract_financial_signals(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Main extraction function - processes submitted trends"""
        
        full_text = f"{trend_data.get('description', '')} {trend_data.get('evidence', {}).get('caption', '')}"
        
        # Extract entities
        entities = await self._extract_entities(full_text)
        
        # Generate stock signals
        stock_signals = await self._generate_stock_signals(trend_data, entities)
        
        # Calculate financial metrics
        investment_timing = self._map_validation_to_timing(trend_data)
        market_sentiment = self._analyze_market_sentiment(trend_data)
        consumer_behavior = self._analyze_consumer_behavior(trend_data)
        sector_impacts = self._calculate_sector_impact(trend_data)
        financial_relevance_score = self._calculate_financial_relevance(trend_data, entities)
        
        # Generate alerts if high relevance
        hedge_fund_alerts = []
        if financial_relevance_score >= 70:
            hedge_fund_alerts = self._generate_hedge_fund_alerts(trend_data, entities, stock_signals)
        
        return {
            'trend_id': trend_data['id'],
            'mentioned_brands': entities['brands'],
            'mentioned_products': entities['products'],
            'stock_tickers': entities['stock_tickers'],
            'crypto_mentions': entities['crypto_mentions'],
            'investment_timing': investment_timing,
            'market_sentiment': market_sentiment,
            'consumer_behavior': consumer_behavior,
            'sector_impacts': sector_impacts,
            'financial_relevance_score': financial_relevance_score,
            'signal_strength': self._calculate_signal_strength(trend_data),
            'confidence_level': self._calculate_confidence_level(trend_data),
            'time_sensitivity': investment_timing.get('time_sensitivity', 'medium_term'),
            'estimated_market_impact': self._estimate_market_impact(trend_data),
            'stock_signals': stock_signals,
            'hedge_fund_alerts': hedge_fund_alerts
        }
    
    async def _extract_entities(self, text: str) -> Dict[str, List]:
        """Extract brands, companies, products from text"""
        entities = {
            'brands': [],
            'products': [],
            'stock_tickers': [],
            'crypto_mentions': [],
            'retail_locations': []
        }
        
        normalized_text = text.lower()
        
        # Brand detection
        for brand_data in self.brand_database:
            brand_name = brand_data['brand_name']
            variations = [brand_name] + brand_data.get('aliases', [])
            
            for variation in variations:
                if self._fuzzy_match(normalized_text, variation.lower()):
                    confidence = self._calculate_match_confidence(text, variation)
                    if confidence > 0.6:
                        entities['brands'].append({
                            'name': brand_name,
                            'ticker': brand_data.get('ticker'),
                            'confidence': confidence,
                            'sector': brand_data.get('sector'),
                            'market_cap': brand_data.get('market_cap')
                        })
                        break
        
        # Stock ticker detection (e.g., $TSLA, $GME)
        ticker_pattern = r'\$([A-Z]{1,5})\b'
        tickers = re.findall(ticker_pattern, text.upper())
        entities['stock_tickers'] = list(set(tickers))
        
        # Crypto detection
        crypto_keywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'dogecoin', 'doge', 
                          'crypto', 'nft', 'defi', 'blockchain']
        entities['crypto_mentions'] = [kw for kw in crypto_keywords if kw in normalized_text]
        
        # Product categories
        entities['products'] = self._extract_product_categories(normalized_text)
        
        return entities
    
    async def _generate_stock_signals(
        self, 
        trend_data: Dict[str, Any], 
        entities: Dict[str, List]
    ) -> List[Dict[str, Any]]:
        """Generate specific stock signals based on trend data"""
        signals = []
        
        for brand in entities['brands']:
            if brand.get('ticker'):
                signal = {
                    'ticker': brand['ticker'],
                    'company_name': brand['name'],
                    'sector': brand.get('sector', 'Unknown'),
                    'market_cap': brand.get('market_cap', 'unknown'),
                    'signal_type': self._determine_signal_type(trend_data, brand),
                    'direction': self._determine_direction(trend_data, brand),
                    'strength': self._calculate_brand_signal_strength(trend_data, brand),
                    'urgency': self._calculate_urgency(trend_data),
                    'catalyst': self._identify_catalyst(trend_data, brand),
                    'risk_factors': self._identify_risk_factors(trend_data, brand),
                    'time_horizon': self._determine_time_horizon(trend_data),
                    'expires_at': self._calculate_expiry(trend_data)
                }
                signals.append(signal)
        
        return signals
    
    def _map_validation_to_timing(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map validation metrics to investment timing"""
        validation_ratio = trend_data.get('validation_ratio', 0)
        validation_count = trend_data.get('validation_count', 0)
        hours_since_submission = (datetime.utcnow() - 
                                 datetime.fromisoformat(trend_data['created_at'].replace('Z', '+00:00'))
                                ).total_seconds() / 3600
        
        # Calculate trend velocity
        velocity = validation_count / max(hours_since_submission, 1)
        
        if velocity > 10 and validation_ratio > 0.8:
            return {
                'investment_phase': 'viral_momentum',
                'time_horizon': '1-3 days',
                'risk_level': 'high',
                'potential_return': 'very_high',
                'action': 'immediate_entry',
                'time_sensitivity': 'immediate'
            }
        elif velocity > 5 and validation_ratio > 0.7:
            return {
                'investment_phase': 'early_growth',
                'time_horizon': '1-2 weeks',
                'risk_level': 'medium',
                'potential_return': 'high',
                'action': 'accumulate_position',
                'time_sensitivity': 'short_term'
            }
        elif validation_ratio > 0.6:
            return {
                'investment_phase': 'steady_growth',
                'time_horizon': '2-4 weeks',
                'risk_level': 'low',
                'potential_return': 'medium',
                'action': 'monitor_entry',
                'time_sensitivity': 'medium_term'
            }
        else:
            return {
                'investment_phase': 'uncertain',
                'time_horizon': '1+ months',
                'risk_level': 'very_high',
                'potential_return': 'speculative',
                'action': 'watch_list',
                'time_sensitivity': 'long_term'
            }
    
    def _analyze_market_sentiment(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze market sentiment from trend data"""
        description = trend_data.get('description', '').lower()
        category = trend_data.get('category', '')
        
        # Sentiment analysis based on keywords
        positive_keywords = ['love', 'amazing', 'best', 'favorite', 'need', 'want', 'bullish']
        negative_keywords = ['hate', 'worst', 'avoid', 'bearish', 'crash', 'dump']
        
        positive_count = sum(1 for kw in positive_keywords if kw in description)
        negative_count = sum(1 for kw in negative_keywords if kw in description)
        
        if positive_count > negative_count:
            primary_sentiment = 'bullish'
        elif negative_count > positive_count:
            primary_sentiment = 'bearish'
        else:
            primary_sentiment = 'neutral'
        
        # Special handling for meme stocks
        if 'meme' in category.lower():
            primary_sentiment = 'volatile_bullish'
        
        return {
            'primary_sentiment': primary_sentiment,
            'confidence': min(0.5 + (abs(positive_count - negative_count) * 0.1), 1.0),
            'purchase_intent': self._detect_purchase_intent(description),
            'viral_potential': self._calculate_viral_potential(trend_data)
        }
    
    def _analyze_consumer_behavior(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze consumer behavior patterns"""
        return {
            'spending_pattern': self._identify_spending_pattern(trend_data),
            'demographic_profile': self._analyze_demographics(trend_data),
            'adoption_stage': self._determine_adoption_stage(trend_data),
            'geographic_concentration': self._analyze_geographic_spread(trend_data),
            'viral_mechanics': self._analyze_viral_mechanics(trend_data)
        }
    
    def _calculate_sector_impact(self, trend_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Calculate which market sectors are impacted"""
        sector_impacts = []
        category = trend_data.get('category', '').lower()
        
        category_to_sector = {
            'fashion': {'sector': 'Consumer Discretionary', 'etf': 'XLY'},
            'beauty': {'sector': 'Consumer Staples', 'etf': 'XLP'},
            'food': {'sector': 'Consumer Staples', 'etf': 'XLP'},
            'tech': {'sector': 'Technology', 'etf': 'XLK'},
            'gaming': {'sector': 'Communication Services', 'etf': 'XLC'},
            'finance': {'sector': 'Financials', 'etf': 'XLF'},
            'health': {'sector': 'Healthcare', 'etf': 'XLV'},
            'entertainment': {'sector': 'Communication Services', 'etf': 'XLC'},
            'sports': {'sector': 'Consumer Discretionary', 'etf': 'XLY'},
            'travel': {'sector': 'Consumer Discretionary', 'etf': 'XLY'}
        }
        
        for cat_key, sector_info in category_to_sector.items():
            if cat_key in category:
                sector_impacts.append({
                    'sector': sector_info['sector'],
                    'etf_ticker': sector_info['etf'],
                    'impact_type': 'direct' if cat_key == category else 'indirect',
                    'strength': self._calculate_sector_strength(trend_data)
                })
        
        return sector_impacts
    
    def _calculate_financial_relevance(
        self, 
        trend_data: Dict[str, Any], 
        entities: Dict[str, List]
    ) -> float:
        """Calculate overall financial relevance score (0-100)"""
        score = 0.0
        
        # Brand mentions (up to 30 points)
        brand_count = len(entities['brands'])
        score += min(brand_count * 10, 30)
        
        # High-value categories (25 points)
        high_value_categories = ['finance', 'tech', 'gaming', 'fashion', 'beauty']
        if any(cat in trend_data.get('category', '').lower() for cat in high_value_categories):
            score += 25
        
        # Validation metrics (up to 25 points)
        validation_ratio = trend_data.get('validation_ratio', 0)
        score += validation_ratio * 25
        
        # Viral velocity (up to 20 points)
        validation_count = trend_data.get('validation_count', 0)
        if validation_count > 100:
            score += 20
        elif validation_count > 50:
            score += 15
        elif validation_count > 20:
            score += 10
        elif validation_count > 10:
            score += 5
        
        return min(score, 100.0)
    
    def _generate_hedge_fund_alerts(
        self, 
        trend_data: Dict[str, Any], 
        entities: Dict[str, List],
        stock_signals: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate alerts for hedge fund clients"""
        alerts = []
        
        # High relevance brand mention
        for brand in entities['brands']:
            if brand['confidence'] > 0.8 and brand.get('ticker'):
                alerts.append({
                    'alert_type': 'high_confidence_brand_trend',
                    'urgency': 'high' if trend_data.get('validation_count', 0) > 50 else 'medium',
                    'title': f"Viral Trend Alert: {brand['name']} ({brand['ticker']})",
                    'message': f"High-confidence brand detection in viral trend: {trend_data.get('description', '')[:100]}...",
                    'ticker': brand['ticker'],
                    'relevance_score': brand['confidence'] * 100
                })
        
        # Meme stock detection
        if 'meme' in trend_data.get('category', '').lower() and entities['stock_tickers']:
            alerts.append({
                'alert_type': 'meme_stock_momentum',
                'urgency': 'critical',
                'title': f"Meme Stock Alert: {', '.join(entities['stock_tickers'])}",
                'message': f"Potential meme stock activity detected. Tickers mentioned: {', '.join(entities['stock_tickers'])}",
                'tickers': entities['stock_tickers']
            })
        
        # Viral product breakout
        if (trend_data.get('validation_count', 0) > 100 and 
            trend_data.get('validation_ratio', 0) > 0.8 and
            entities['brands']):
            alerts.append({
                'alert_type': 'viral_product_breakout',
                'urgency': 'high',
                'title': 'Viral Product Trend Detected',
                'message': f"Rapidly spreading trend with {trend_data.get('validation_count')} validations",
                'affected_brands': [b['name'] for b in entities['brands']]
            })
        
        return alerts
    
    def _load_brand_database(self) -> List[Dict[str, Any]]:
        """Load brand database from Supabase"""
        try:
            response = supabase.table('brand_database').select('*').execute()
            return response.data
        except Exception as e:
            logger.error(f"Error loading brand database: {e}")
            # Return hardcoded brands as fallback
            return [
                {
                    'brand_name': 'Apple',
                    'ticker': 'AAPL',
                    'aliases': ['iPhone', 'iPad', 'MacBook', 'AirPods'],
                    'sector': 'Technology',
                    'market_cap': 'mega'
                },
                {
                    'brand_name': 'Tesla',
                    'ticker': 'TSLA',
                    'aliases': ['Model S', 'Model 3', 'Model Y', 'Cybertruck'],
                    'sector': 'Automotive',
                    'market_cap': 'large'
                },
                # Add more brands as needed
            ]
    
    def _fuzzy_match(self, text: str, target: str) -> bool:
        """Simple fuzzy matching"""
        return target in text or self._levenshtein_distance(text, target) < 3
    
    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings"""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def _calculate_match_confidence(self, text: str, variation: str) -> float:
        """Calculate confidence score for brand match"""
        exact_match = variation.lower() in text.lower()
        context_score = self._has_relevant_context(text, variation)
        
        confidence = 0.5
        if exact_match:
            confidence += 0.3
        if context_score:
            confidence += 0.2
        
        return min(confidence, 1.0)
    
    def _has_relevant_context(self, text: str, brand: str) -> bool:
        """Check if surrounding words provide relevant context"""
        context_keywords = ['trending', 'viral', 'popular', 'everyone', 'using', 
                          'wearing', 'buying', 'love', 'obsessed', 'need']
        normalized_text = text.lower()
        return any(keyword in normalized_text for keyword in context_keywords)
    
    def _initialize_sentiment_keywords(self) -> Dict[str, List[str]]:
        """Initialize sentiment analysis keywords"""
        return {
            'positive': ['amazing', 'love', 'best', 'favorite', 'want', 'need', 
                        'obsessed', 'perfect', 'incredible', 'fantastic'],
            'negative': ['hate', 'worst', 'terrible', 'awful', 'disappointing',
                        'avoid', 'overrated', 'scam', 'waste'],
            'purchase_intent': ['buying', 'bought', 'purchase', 'order', 'getting',
                              'want this', 'need this', 'sold out', 'restock']
        }
    
    def _detect_purchase_intent(self, text: str) -> float:
        """Detect purchase intent from text"""
        text_lower = text.lower()
        intent_score = sum(1 for kw in self.sentiment_keywords['purchase_intent'] 
                          if kw in text_lower)
        return min(intent_score * 0.2, 1.0)
    
    def _calculate_viral_potential(self, trend_data: Dict[str, Any]) -> float:
        """Calculate viral potential score"""
        validation_count = trend_data.get('validation_count', 0)
        validation_ratio = trend_data.get('validation_ratio', 0)
        
        # Simple viral score calculation
        viral_score = (validation_count / 100) * validation_ratio
        return min(viral_score, 1.0)
    
    def _extract_product_categories(self, text: str) -> List[str]:
        """Extract product categories from text"""
        product_keywords = {
            'clothing': ['shirt', 'pants', 'dress', 'jacket', 'shoes'],
            'accessories': ['bag', 'watch', 'jewelry', 'sunglasses'],
            'tech': ['phone', 'laptop', 'headphones', 'tablet', 'gadget'],
            'beauty': ['makeup', 'skincare', 'perfume', 'cosmetics'],
            'food': ['snack', 'drink', 'meal', 'restaurant', 'coffee']
        }
        
        found_categories = []
        for category, keywords in product_keywords.items():
            if any(kw in text for kw in keywords):
                found_categories.append(category)
        
        return found_categories
    
    def _determine_signal_type(self, trend_data: Dict[str, Any], brand: Dict[str, Any]) -> str:
        """Determine the type of financial signal"""
        category = trend_data.get('category', '').lower()
        
        if 'meme' in category:
            return 'meme_momentum'
        elif brand.get('sector') == 'Consumer Discretionary':
            return 'consumer_trend'
        elif brand.get('sector') == 'Technology':
            return 'tech_adoption'
        elif trend_data.get('validation_count', 0) > 100:
            return 'viral_breakout'
        else:
            return 'emerging_trend'
    
    def _determine_direction(self, trend_data: Dict[str, Any], brand: Dict[str, Any]) -> str:
        """Determine bullish/bearish direction"""
        sentiment = self._analyze_market_sentiment(trend_data)
        if sentiment['primary_sentiment'] in ['bullish', 'volatile_bullish']:
            return 'bullish'
        elif sentiment['primary_sentiment'] == 'bearish':
            return 'bearish'
        else:
            return 'neutral'
    
    def _calculate_brand_signal_strength(self, trend_data: Dict[str, Any], brand: Dict[str, Any]) -> float:
        """Calculate signal strength for a specific brand"""
        base_strength = brand['confidence'] * 50
        
        # Boost for validation metrics
        validation_boost = trend_data.get('validation_ratio', 0) * 30
        
        # Boost for viral velocity
        velocity_boost = min(trend_data.get('validation_count', 0) / 10, 20)
        
        return min(base_strength + validation_boost + velocity_boost, 100)
    
    def _calculate_urgency(self, trend_data: Dict[str, Any]) -> str:
        """Calculate urgency level"""
        validation_count = trend_data.get('validation_count', 0)
        hours_old = (datetime.utcnow() - 
                    datetime.fromisoformat(trend_data['created_at'].replace('Z', '+00:00'))
                   ).total_seconds() / 3600
        
        velocity = validation_count / max(hours_old, 1)
        
        if velocity > 20:
            return 'critical'
        elif velocity > 10:
            return 'high'
        elif velocity > 5:
            return 'medium'
        else:
            return 'low'
    
    def _identify_catalyst(self, trend_data: Dict[str, Any], brand: Dict[str, Any]) -> str:
        """Identify what's driving the signal"""
        if trend_data.get('validation_count', 0) > 100:
            return f"Viral trend with {trend_data['validation_count']} validations"
        elif 'meme' in trend_data.get('category', '').lower():
            return "Meme-driven momentum"
        else:
            return f"Emerging consumer interest in {brand['name']}"
    
    def _identify_risk_factors(self, trend_data: Dict[str, Any], brand: Dict[str, Any]) -> List[str]:
        """Identify investment risks"""
        risks = []
        
        if trend_data.get('validation_ratio', 0) < 0.7:
            risks.append('Low validation consensus')
        
        if 'meme' in trend_data.get('category', '').lower():
            risks.append('High volatility meme-driven movement')
        
        if brand.get('market_cap') == 'small':
            risks.append('Small cap volatility')
        
        return risks
    
    def _determine_time_horizon(self, trend_data: Dict[str, Any]) -> str:
        """Determine investment time horizon"""
        validation_count = trend_data.get('validation_count', 0)
        
        if validation_count > 100:
            return '1-7 days'
        elif validation_count > 50:
            return '1-2 weeks'
        elif validation_count > 20:
            return '2-4 weeks'
        else:
            return '1-3 months'
    
    def _calculate_expiry(self, trend_data: Dict[str, Any]) -> datetime:
        """Calculate when signal expires"""
        # Signals expire faster for viral trends
        validation_count = trend_data.get('validation_count', 0)
        
        if validation_count > 100:
            days_until_expiry = 7
        elif validation_count > 50:
            days_until_expiry = 14
        else:
            days_until_expiry = 30
        
        return datetime.utcnow() + timedelta(days=days_until_expiry)
    
    def _calculate_signal_strength(self, trend_data: Dict[str, Any]) -> float:
        """Calculate overall signal strength"""
        validation_strength = trend_data.get('validation_ratio', 0) * 50
        volume_strength = min(trend_data.get('validation_count', 0) / 2, 50)
        return validation_strength + volume_strength
    
    def _calculate_confidence_level(self, trend_data: Dict[str, Any]) -> float:
        """Calculate confidence in the signal"""
        validation_ratio = trend_data.get('validation_ratio', 0)
        validation_count = trend_data.get('validation_count', 0)
        
        if validation_count < 10:
            confidence_multiplier = 0.5
        elif validation_count < 50:
            confidence_multiplier = 0.8
        else:
            confidence_multiplier = 1.0
        
        return validation_ratio * confidence_multiplier
    
    def _estimate_market_impact(self, trend_data: Dict[str, Any]) -> str:
        """Estimate potential market impact"""
        score = self._calculate_financial_relevance(trend_data, {'brands': []})
        
        if score > 80:
            return 'very_high'
        elif score > 60:
            return 'high'
        elif score > 40:
            return 'medium'
        else:
            return 'low'
    
    def _identify_spending_pattern(self, trend_data: Dict[str, Any]) -> str:
        """Identify consumer spending patterns"""
        category = trend_data.get('category', '').lower()
        
        if any(lux in category for lux in ['luxury', 'premium', 'designer']):
            return 'luxury_spending'
        elif any(budget in category for budget in ['deal', 'discount', 'budget']):
            return 'value_seeking'
        else:
            return 'mainstream_consumption'
    
    def _analyze_demographics(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze demographic patterns"""
        # This would integrate with your existing demographic data
        return {
            'primary_age_group': '18-34',  # Example
            'gender_distribution': 'balanced',
            'income_level': 'middle_to_high'
        }
    
    def _determine_adoption_stage(self, trend_data: Dict[str, Any]) -> str:
        """Determine where trend is in adoption curve"""
        validation_count = trend_data.get('validation_count', 0)
        
        if validation_count < 10:
            return 'innovators'
        elif validation_count < 50:
            return 'early_adopters'
        elif validation_count < 200:
            return 'early_majority'
        elif validation_count < 500:
            return 'late_majority'
        else:
            return 'laggards'
    
    def _analyze_geographic_spread(self, trend_data: Dict[str, Any]) -> str:
        """Analyze geographic concentration"""
        # Simplified - would use actual location data
        return 'concentrated_urban'
    
    def _analyze_viral_mechanics(self, trend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze how the trend spreads"""
        return {
            'spread_pattern': 'exponential' if trend_data.get('validation_count', 0) > 100 else 'linear',
            'influencer_driven': False,  # Would check for influencer mentions
            'organic_growth': True
        }
    
    def _calculate_sector_strength(self, trend_data: Dict[str, Any]) -> float:
        """Calculate sector impact strength"""
        relevance = self._calculate_financial_relevance(trend_data, {'brands': []})
        return relevance / 100


# Process trend and save financial signals
async def process_financial_signals(trend_id: str):
    """Process a trend submission for financial signals"""
    try:
        # Get trend data
        trend_response = supabase.table('trend_submissions').select('*').eq('id', trend_id).single().execute()
        trend_data = trend_response.data
        
        if not trend_data:
            logger.error(f"Trend {trend_id} not found")
            return
        
        # Extract financial signals
        extractor = FinancialIntelligenceExtractor()
        signals = await extractor.extract_financial_signals(trend_data)
        
        # Save financial signals
        financial_signal_data = {
            'trend_id': trend_id,
            'mentioned_brands': json.dumps(signals['mentioned_brands']),
            'mentioned_products': json.dumps(signals['mentioned_products']),
            'stock_tickers': json.dumps(signals['stock_tickers']),
            'crypto_mentions': json.dumps(signals['crypto_mentions']),
            'investment_timing': signals['investment_timing']['investment_phase'],
            'market_sentiment': signals['market_sentiment']['primary_sentiment'],
            'consumer_behavior': json.dumps(signals['consumer_behavior']),
            'sector_impacts': json.dumps(signals['sector_impacts']),
            'financial_relevance_score': signals['financial_relevance_score'],
            'signal_strength': signals['signal_strength'],
            'confidence_level': signals['confidence_level'],
            'time_sensitivity': signals['time_sensitivity'],
            'estimated_market_impact': signals['estimated_market_impact']
        }
        
        financial_signal_response = supabase.table('financial_signals').insert(financial_signal_data).execute()
        financial_signal_id = financial_signal_response.data[0]['id']
        
        # Save stock signals
        for stock_signal in signals['stock_signals']:
            stock_signal_data = {
                'financial_signal_id': financial_signal_id,
                'trend_id': trend_id,
                **stock_signal
            }
            supabase.table('stock_signals').insert(stock_signal_data).execute()
        
        # Save alerts
        for alert in signals['hedge_fund_alerts']:
            alert_data = {
                'financial_signal_id': financial_signal_id,
                'trend_id': trend_id,
                **alert,
                'client_tier': 'all'  # Send to all tiers initially
            }
            supabase.table('hedge_fund_alerts').insert(alert_data).execute()
        
        # Update trend as processed
        supabase.table('trend_submissions').update({
            'financial_signals_processed': True,
            'financial_relevance_score': signals['financial_relevance_score']
        }).eq('id', trend_id).execute()
        
        logger.info(f"Successfully processed financial signals for trend {trend_id}")
        
    except Exception as e:
        logger.error(f"Error processing financial signals for trend {trend_id}: {e}")
        raise