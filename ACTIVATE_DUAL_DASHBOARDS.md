# Activating Dual Dashboards in WAVESITE2

## Quick Start Guide

### 1. Database Setup

Run the financial intelligence migration:
```bash
cd /Users/JeremyUys_1/Desktop/WAVESITE2
psql $DATABASE_URL < supabase/migrations/20250729_add_financial_intelligence_schema.sql
```

### 2. Backend Updates

Add the new routers to your main FastAPI app:

```python
# In backend/app/main.py, add:
from app.api.v1 import hedge_fund, marketing

app.include_router(hedge_fund.router, prefix="/api/v1")
app.include_router(marketing.router, prefix="/api/v1")
```

### 3. Environment Variables

Add to your `.env` file:
```env
# Feature flags
ENABLE_FINANCIAL_EXTRACTION=true
ENABLE_CULTURAL_EXTRACTION=true

# API Keys for external services (if needed)
ALPHA_VANTAGE_API_KEY=your_key_here  # For stock price data
```

### 4. Update Trend Submission Flow

In your existing trends API, add the extraction calls:

```python
# In backend/app/api/v1/trends.py
from app.services.financial_extractor import process_financial_signals
from app.services.cultural_extractor import process_cultural_insights

# After saving trend submission:
asyncio.create_task(process_financial_signals(trend.id))
asyncio.create_task(process_cultural_insights(trend.id))
```

### 5. Access the Dashboards

#### Marketing Dashboard
Navigate to: `http://localhost:3000/marketing/dashboard`

Features available:
- Trend discovery feed with cultural insights
- Visual mood boards
- Campaign calendar
- Audience intelligence

#### Hedge Fund Dashboard  
Navigate to: `http://localhost:3000/hedge-fund/dashboard`

Features available:
- Real-time stock signals
- Sector momentum tracking
- Live alerts feed
- API access for algorithmic trading

### 6. Testing the Integration

1. Submit a test trend:
```javascript
POST /api/v1/trends/submit
{
  "description": "Everyone obsessed with Stanley cups at my university",
  "category": "lifestyle",
  "evidence": {
    "screenshot_url": "https://example.com/stanley-trend.jpg"
  }
}
```

2. Check marketing insights:
```javascript
GET /api/v1/marketing/trends?category=lifestyle
// Returns cultural insights, mood analysis, campaign ideas
```

3. Check financial signals:
```javascript
GET /api/v1/hedge-fund/trending-stocks?sector=Consumer%20Discretionary
// Returns stock signals, urgency levels, market impact
```

### 7. User Access Control

Update user subscription tiers:
```sql
-- For marketing access
UPDATE profiles 
SET subscription_tier = 'professional_agency' 
WHERE user_id = 'user-uuid';

-- For hedge fund access
INSERT INTO hedge_fund_clients (
  client_name,
  subscription_tier,
  api_key,
  api_calls_limit
) VALUES (
  'Test Hedge Fund',
  'professional',
  'hf_test_key_123',
  5000
);
```

### 8. Monitor Performance

Check extraction logs:
```bash
# Financial extraction logs
tail -f backend/logs/financial_extractor.log

# Cultural extraction logs  
tail -f backend/logs/cultural_extractor.log
```

## Next Steps

1. **Customize Extraction Logic**: Modify the extractors in `/backend/app/services/` to refine insights

2. **Add Real Stock Data**: Integrate with financial data APIs for real-time pricing

3. **Enhance UI/UX**: Customize the dashboard designs in `/web/app/marketing/` and `/web/app/hedge-fund/`

4. **Set Up Webhooks**: Configure real-time alerts for hedge fund clients

5. **Add Analytics**: Track which insights drive the most value for each audience

## Troubleshooting

### Dashboards not loading?
- Check user permissions in Supabase
- Verify subscription_tier is set correctly
- Ensure all migrations have run

### No financial signals appearing?
- Check that trends have validation_count > 0
- Verify financial_extractor.py is processing trends
- Look for errors in backend logs

### Marketing insights missing?
- Ensure cultural_extractor.py is running
- Check that trend has required fields (description, category)
- Verify API endpoints are registered

## Support

For issues or questions:
- Check logs in `/backend/logs/`
- Review error messages in browser console
- Verify all services are running with `docker-compose ps`