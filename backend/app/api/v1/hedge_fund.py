"""
Hedge Fund API Endpoints
RESTful API for financial intelligence data
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.core.database import get_db
from app.core.auth import verify_api_key, get_current_user
from app.core.supabase_client import supabase
from app.schemas.trends import TrendBase
from app.services.financial_extractor import FinancialIntelligenceExtractor

router = APIRouter(
    prefix="/hedge-fund",
    tags=["hedge-fund"],
    responses={404: {"description": "Not found"}},
)


# Authentication dependency
async def verify_hedge_fund_access(x_api_key: Optional[str] = Header(None)):
    """Verify hedge fund API access"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # Verify API key
    client_response = supabase.table('hedge_fund_clients').select('*').eq('api_key', x_api_key).single().execute()
    
    if not client_response.data:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    client = client_response.data
    
    # Check contract validity
    if client['contract_end'] and datetime.fromisoformat(client['contract_end']) < datetime.utcnow():
        raise HTTPException(status_code=403, detail="Contract expired")
    
    # Check rate limits
    if client['api_calls_used'] >= client['api_calls_limit']:
        raise HTTPException(status_code=429, detail="API rate limit exceeded")
    
    # Increment usage counter
    supabase.table('hedge_fund_clients').update({
        'api_calls_used': client['api_calls_used'] + 1,
        'last_activity': datetime.utcnow().isoformat()
    }).eq('id', client['id']).execute()
    
    return client


@router.get("/trending-stocks")
async def get_trending_stocks(
    limit: int = Query(20, ge=1, le=100),
    min_relevance: float = Query(70.0, ge=0, le=100),
    timeframe: str = Query("24h", regex="^(1h|24h|7d|30d)$"),
    sector: Optional[str] = None,
    urgency: Optional[str] = Query(None, regex="^(low|medium|high|critical)$"),
    client: dict = Depends(verify_hedge_fund_access)
):
    """
    Get trending stocks based on viral social media trends
    
    Returns stocks with the highest signal counts and strength
    """
    try:
        # Calculate timeframe
        if timeframe == "1h":
            since = datetime.utcnow() - timedelta(hours=1)
        elif timeframe == "7d":
            since = datetime.utcnow() - timedelta(days=7)
        elif timeframe == "30d":
            since = datetime.utcnow() - timedelta(days=30)
        else:  # 24h default
            since = datetime.utcnow() - timedelta(hours=24)
        
        # Build query
        query = supabase.table('stock_signals').select(
            '*, financial_signals!inner(financial_relevance_score, trend_id), trend_submissions!inner(description, validation_count, validation_ratio)'
        ).gte('created_at', since.isoformat()).gte(
            'financial_signals.financial_relevance_score', min_relevance
        ).gt('expires_at', datetime.utcnow().isoformat())
        
        if sector:
            query = query.eq('sector', sector)
        
        if urgency:
            query = query.eq('urgency', urgency)
        
        # Execute query
        response = query.execute()
        
        # Group by ticker
        ticker_groups = {}
        for signal in response.data:
            ticker = signal['ticker']
            if ticker not in ticker_groups:
                ticker_groups[ticker] = {
                    'ticker': ticker,
                    'company_name': signal['company_name'],
                    'sector': signal['sector'],
                    'signals': [],
                    'total_strength': 0,
                    'max_urgency': 'low',
                    'trend_names': set()
                }
            
            ticker_groups[ticker]['signals'].append(signal)
            ticker_groups[ticker]['total_strength'] += signal['strength']
            
            # Update max urgency
            urgency_levels = ['low', 'medium', 'high', 'critical']
            if urgency_levels.index(signal['urgency']) > urgency_levels.index(ticker_groups[ticker]['max_urgency']):
                ticker_groups[ticker]['max_urgency'] = signal['urgency']
            
            # Add trend description
            ticker_groups[ticker]['trend_names'].add(signal['trend_submissions']['description'][:100])
        
        # Calculate aggregates and sort
        trending_stocks = []
        for ticker, data in ticker_groups.items():
            trending_stocks.append({
                'ticker': ticker,
                'company': data['company_name'],
                'sector': data['sector'],
                'signal_count': len(data['signals']),
                'average_strength': round(data['total_strength'] / len(data['signals']), 2),
                'max_urgency': data['max_urgency'],
                'latest_signal': max(s['created_at'] for s in data['signals']),
                'trend_descriptions': list(data['trend_names'])[:5],
                'signal_types': list(set(s['signal_type'] for s in data['signals']))
            })
        
        # Sort by signal count and strength
        trending_stocks.sort(key=lambda x: (x['signal_count'], x['average_strength']), reverse=True)
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'timeframe': timeframe,
            'total_tickers': len(trending_stocks[:limit]),
            'trending_stocks': trending_stocks[:limit]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live-alerts")
async def get_live_alerts(
    min_urgency: str = Query("medium", regex="^(low|medium|high|critical)$"),
    min_relevance: float = Query(75.0, ge=0, le=100),
    since: Optional[datetime] = None,
    limit: int = Query(50, ge=1, le=100),
    client: dict = Depends(verify_hedge_fund_access)
):
    """
    Get real-time alerts for high-impact financial signals
    """
    try:
        # Default to last hour if no since parameter
        if not since:
            since = datetime.utcnow() - timedelta(hours=1)
        
        # Map urgency levels
        urgency_levels = ['low', 'medium', 'high', 'critical']
        min_urgency_index = urgency_levels.index(min_urgency)
        allowed_urgencies = urgency_levels[min_urgency_index:]
        
        # Query alerts
        query = supabase.table('hedge_fund_alerts').select(
            '*, financial_signals!inner(financial_relevance_score, mentioned_brands), trend_submissions!inner(description, validation_count, category), stock_signals(*)'
        ).gte('created_at', since.isoformat()).gte(
            'financial_signals.financial_relevance_score', min_relevance
        ).in_('urgency', allowed_urgencies).order(
            'created_at', desc=True
        ).limit(limit)
        
        response = query.execute()
        
        # Format alerts
        alerts = []
        for alert in response.data:
            formatted_alert = {
                'id': alert['id'],
                'type': alert['alert_type'],
                'urgency': alert['urgency'],
                'title': alert['title'],
                'message': alert['message'],
                'relevance_score': alert['financial_signals']['financial_relevance_score'],
                'trend': {
                    'description': alert['trend_submissions']['description'],
                    'category': alert['trend_submissions']['category'],
                    'validation_count': alert['trend_submissions']['validation_count']
                },
                'mentioned_brands': alert['financial_signals']['mentioned_brands'],
                'created_at': alert['created_at']
            }
            
            # Add stock info if available
            if alert['stock_signals']:
                formatted_alert['affected_stocks'] = [
                    {
                        'ticker': s['ticker'],
                        'company': s['company_name'],
                        'signal_type': s['signal_type'],
                        'direction': s['direction']
                    }
                    for s in alert['stock_signals']
                ]
            
            alerts.append(formatted_alert)
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'alert_count': len(alerts),
            'alerts': alerts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stocks/{ticker}/analysis")
async def get_stock_analysis(
    ticker: str,
    timeframe: str = Query("7d", regex="^(24h|7d|30d)$"),
    client: dict = Depends(verify_hedge_fund_access)
):
    """
    Get detailed analysis for a specific stock ticker
    """
    try:
        ticker = ticker.upper()
        
        # Calculate timeframe
        if timeframe == "24h":
            since = datetime.utcnow() - timedelta(hours=24)
        elif timeframe == "30d":
            since = datetime.utcnow() - timedelta(days=30)
        else:  # 7d default
            since = datetime.utcnow() - timedelta(days=7)
        
        # Get signals for this ticker
        signals_response = supabase.table('stock_signals').select(
            '*, financial_signals!inner(financial_relevance_score, market_sentiment, consumer_behavior), trend_submissions!inner(description, category, validation_count, validation_ratio, created_at)'
        ).eq('ticker', ticker).gte('created_at', since.isoformat()).order('created_at', desc=True).execute()
        
        if not signals_response.data:
            raise HTTPException(status_code=404, detail=f"No signals found for ticker {ticker}")
        
        # Calculate aggregates
        signals = signals_response.data
        bullish_count = sum(1 for s in signals if s['direction'] == 'bullish')
        bearish_count = sum(1 for s in signals if s['direction'] == 'bearish')
        neutral_count = len(signals) - bullish_count - bearish_count
        
        avg_strength = sum(s['strength'] for s in signals) / len(signals)
        
        # Get unique categories
        categories = list(set(s['trend_submissions']['category'] for s in signals))
        
        # Determine overall sentiment
        if bullish_count > bearish_count * 1.5:
            overall_sentiment = 'bullish'
        elif bearish_count > bullish_count * 1.5:
            overall_sentiment = 'bearish'
        else:
            overall_sentiment = 'neutral'
        
        # Format recent signals
        recent_signals = []
        for signal in signals[:10]:  # Top 10 most recent
            recent_signals.append({
                'id': signal['id'],
                'signal_type': signal['signal_type'],
                'direction': signal['direction'],
                'strength': signal['strength'],
                'urgency': signal['urgency'],
                'catalyst': signal['catalyst'],
                'time_horizon': signal['time_horizon'],
                'relevance_score': signal['financial_signals']['financial_relevance_score'],
                'trend': {
                    'description': signal['trend_submissions']['description'],
                    'category': signal['trend_submissions']['category'],
                    'validation_count': signal['trend_submissions']['validation_count'],
                    'validation_ratio': signal['trend_submissions']['validation_ratio'],
                    'created_at': signal['trend_submissions']['created_at']
                },
                'created_at': signal['created_at']
            })
        
        return {
            'ticker': ticker,
            'company': signals[0]['company_name'] if signals else None,
            'sector': signals[0]['sector'] if signals else None,
            'analysis_timeframe': timeframe,
            'timestamp': datetime.utcnow().isoformat(),
            'summary': {
                'total_signals': len(signals),
                'bullish_signals': bullish_count,
                'bearish_signals': bearish_count,
                'neutral_signals': neutral_count,
                'sentiment': overall_sentiment,
                'average_strength': round(avg_strength, 2),
                'trend_categories': categories
            },
            'recent_signals': recent_signals
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sectors/momentum")
async def get_sector_momentum(
    timeframe: str = Query("24h", regex="^(1h|24h|7d)$"),
    min_signals: int = Query(5, ge=1),
    client: dict = Depends(verify_hedge_fund_access)
):
    """
    Get sector momentum based on aggregated signals
    """
    try:
        # Calculate timeframe
        if timeframe == "1h":
            since = datetime.utcnow() - timedelta(hours=1)
        elif timeframe == "7d":
            since = datetime.utcnow() - timedelta(days=7)
        else:  # 24h default
            since = datetime.utcnow() - timedelta(hours=24)
        
        # Get all signals in timeframe
        signals_response = supabase.table('stock_signals').select(
            'sector, direction, strength, urgency'
        ).gte('created_at', since.isoformat()).gt('expires_at', datetime.utcnow().isoformat()).execute()
        
        # Aggregate by sector
        sector_data = {}
        for signal in signals_response.data:
            sector = signal['sector']
            if sector not in sector_data:
                sector_data[sector] = {
                    'sector': sector,
                    'signals': [],
                    'bullish': 0,
                    'bearish': 0,
                    'neutral': 0,
                    'total_strength': 0
                }
            
            sector_data[sector]['signals'].append(signal)
            sector_data[sector]['total_strength'] += signal['strength']
            
            if signal['direction'] == 'bullish':
                sector_data[sector]['bullish'] += 1
            elif signal['direction'] == 'bearish':
                sector_data[sector]['bearish'] += 1
            else:
                sector_data[sector]['neutral'] += 1
        
        # Calculate momentum
        sector_momentum = []
        for sector, data in sector_data.items():
            signal_count = len(data['signals'])
            
            if signal_count >= min_signals:
                # Calculate momentum score
                momentum_score = (data['bullish'] - data['bearish']) / signal_count
                
                # Determine direction
                if data['bullish'] > data['bearish']:
                    momentum_direction = 'bullish'
                elif data['bearish'] > data['bullish']:
                    momentum_direction = 'bearish'
                else:
                    momentum_direction = 'neutral'
                
                sector_momentum.append({
                    'sector': sector,
                    'signal_count': signal_count,
                    'average_strength': round(data['total_strength'] / signal_count, 2),
                    'bullish_signals': data['bullish'],
                    'bearish_signals': data['bearish'],
                    'neutral_signals': data['neutral'],
                    'momentum_direction': momentum_direction,
                    'momentum_score': round(momentum_score, 3)
                })
        
        # Sort by momentum score
        sector_momentum.sort(key=lambda x: abs(x['momentum_score']), reverse=True)
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'timeframe': timeframe,
            'sector_count': len(sector_momentum),
            'sector_momentum': sector_momentum
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/{trend_id}/performance")
async def get_trend_performance(
    trend_id: str,
    client: dict = Depends(verify_hedge_fund_access)
):
    """
    Get historical performance of signals generated from a specific trend
    """
    try:
        # Get trend and financial signals
        trend_response = supabase.table('trend_submissions').select(
            '*, financial_signals!inner(*, stock_signals(*, signal_performance(*)))'
        ).eq('id', trend_id).single().execute()
        
        if not trend_response.data:
            raise HTTPException(status_code=404, detail="Trend not found")
        
        trend = trend_response.data
        financial_signal = trend['financial_signals'][0] if trend['financial_signals'] else None
        
        if not financial_signal:
            raise HTTPException(status_code=404, detail="No financial signals found for this trend")
        
        # Format response
        stock_performance = []
        for stock_signal in financial_signal.get('stock_signals', []):
            perf_data = {
                'ticker': stock_signal['ticker'],
                'company': stock_signal['company_name'],
                'signal_type': stock_signal['signal_type'],
                'direction': stock_signal['direction'],
                'strength': stock_signal['strength'],
                'signal_date': stock_signal['created_at']
            }
            
            # Add performance data if available
            if stock_signal.get('signal_performance'):
                perf = stock_signal['signal_performance'][0]
                perf_data['performance'] = {
                    'price_at_signal': perf['price_at_signal'],
                    'price_1d': perf['price_1d'],
                    'price_7d': perf['price_7d'],
                    'price_30d': perf['price_30d'],
                    'max_gain_pct': perf['max_gain_pct'],
                    'max_loss_pct': perf['max_loss_pct'],
                    'accuracy_score': perf['signal_accuracy_score']
                }
            
            stock_performance.append(perf_data)
        
        return {
            'trend': {
                'id': trend['id'],
                'description': trend['description'],
                'category': trend['category'],
                'submitted_at': trend['created_at'],
                'validation_count': trend['validation_count'],
                'validation_ratio': trend['validation_ratio']
            },
            'financial_analysis': {
                'relevance_score': financial_signal['financial_relevance_score'],
                'signal_strength': financial_signal['signal_strength'],
                'confidence_level': financial_signal['confidence_level'],
                'market_sentiment': financial_signal['market_sentiment'],
                'mentioned_brands': financial_signal['mentioned_brands']
            },
            'stock_performance': stock_performance
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/account/usage")
async def get_account_usage(
    client: dict = Depends(verify_hedge_fund_access)
):
    """
    Get API usage statistics for the authenticated client
    """
    try:
        # Get usage logs for the last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        usage_response = supabase.table('api_usage_logs').select(
            'created_at, endpoint, response_time_ms'
        ).eq('client_id', client['id']).gte(
            'created_at', thirty_days_ago.isoformat()
        ).order('created_at', desc=True).execute()
        
        # Group by date
        daily_usage = {}
        endpoint_usage = {}
        total_response_time = 0
        
        for log in usage_response.data:
            # Daily grouping
            date = log['created_at'][:10]  # Extract date part
            daily_usage[date] = daily_usage.get(date, 0) + 1
            
            # Endpoint grouping
            endpoint = log['endpoint']
            endpoint_usage[endpoint] = endpoint_usage.get(endpoint, 0) + 1
            
            # Response time
            if log['response_time_ms']:
                total_response_time += log['response_time_ms']
        
        # Sort daily usage
        sorted_daily = sorted(daily_usage.items(), key=lambda x: x[0], reverse=True)
        
        return {
            'client': {
                'name': client['client_name'],
                'tier': client['subscription_tier'],
                'contract_end': client['contract_end']
            },
            'current_period': {
                'api_calls_used': client['api_calls_used'],
                'api_calls_limit': client['api_calls_limit'],
                'usage_percentage': round((client['api_calls_used'] / client['api_calls_limit']) * 100, 1),
                'remaining_calls': client['api_calls_limit'] - client['api_calls_used']
            },
            'last_30_days': {
                'total_calls': len(usage_response.data),
                'average_response_time_ms': round(total_response_time / len(usage_response.data), 2) if usage_response.data else 0,
                'daily_usage': [{'date': date, 'calls': count} for date, count in sorted_daily[:30]],
                'endpoint_usage': endpoint_usage
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/subscribe")
async def subscribe_to_webhook(
    webhook_url: str,
    alert_types: List[str],
    min_relevance_score: float = 70.0,
    client: dict = Depends(verify_hedge_fund_access)
):
    """
    Subscribe to webhook notifications for specific alert types
    """
    try:
        # Update client preferences
        update_data = {
            'webhook_url': webhook_url,
            'alert_preferences': alert_types,
            'minimum_relevance_score': min_relevance_score
        }
        
        supabase.table('hedge_fund_clients').update(update_data).eq('id', client['id']).execute()
        
        return {
            'status': 'success',
            'message': 'Webhook subscription updated',
            'webhook_url': webhook_url,
            'alert_types': alert_types,
            'min_relevance_score': min_relevance_score
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Add middleware to log API usage
@router.middleware("http")
async def log_api_usage(request, call_next):
    """Log API usage for billing and analytics"""
    start_time = datetime.utcnow()
    response = await call_next(request)
    
    # Calculate response time
    response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
    
    # Log if authenticated request
    if hasattr(request.state, 'client'):
        try:
            log_data = {
                'client_id': request.state.client['id'],
                'endpoint': str(request.url.path),
                'method': request.method,
                'response_time_ms': response_time_ms,
                'status_code': response.status_code
            }
            supabase.table('api_usage_logs').insert(log_data).execute()
        except:
            pass  # Don't fail the request if logging fails
    
    return response