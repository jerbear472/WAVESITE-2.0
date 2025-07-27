# 🚀 Launch Enterprise Dashboard

## Server is Running! ✅

The development server is now running at: **http://localhost:3001**

## Quick Access Links

### 1. Login Page
🔗 **http://localhost:3001/login**

**Credentials:**
- Email: `enterprise@test.com`
- Password: `test123456`

### 2. Enterprise Dashboard (after login)
🔗 **http://localhost:3001/enterprise/dashboard**

### 3. Pricing Page (public)
🔗 **http://localhost:3001/pricing**

## Dashboard Features to Explore

### 📊 Trend Intelligence Hub
- View real-time trends with velocity indicators
- Filter by category, phase, time range
- Click trends for detailed insights

### 📈 Advanced Analytics
- Interactive charts and visualizations
- ROI projections
- Competitor analysis
- Sentiment tracking

### 🔔 Smart Alerts
- Create custom alerts
- Set thresholds for trends
- Configure notification channels

### 💾 Data Export
- Export trends in CSV, JSON, Excel, PDF
- API key management
- Integration settings

### 🏢 Industry Tools
Switch between specialized dashboards:
- Marketing Agency view
- Hedge Fund view
- Content Creator view

## Test the API

In a new terminal, run:
```bash
node test-enterprise-api.js
```

Or use curl:
```bash
curl -X GET http://localhost:3001/api/v1/enterprise/trends \
  -H "X-API-Key: ws_test_zirwz2thyq" \
  -H "Content-Type: application/json" | json_pp
```

## Common Issues & Solutions

### Can't login?
- Make sure you're using the correct credentials
- Check browser console for errors (F12)
- Clear cookies/cache if needed

### Dashboard shows "Unauthorized"?
The user might not have the correct subscription tier. Run this SQL in Supabase:
```sql
UPDATE profiles 
SET subscription_tier = 'enterprise' 
WHERE email = 'enterprise@test.com';
```

### No trends showing?
Check if sample trends exist:
```sql
SELECT COUNT(*) FROM enterprise_trends;
-- Should return 5
```

### API returns 401?
Verify the API key:
```sql
SELECT * FROM api_keys WHERE key = 'ws_test_zirwz2thyq';
```

## Next Steps

1. **Explore the Dashboard**
   - Try all the different tabs
   - Create test alerts
   - Export some data

2. **Customize for Your Brand**
   - Update colors in components
   - Add your logo
   - Modify text content

3. **Add More Test Data**
   - Create more trends
   - Test with different categories
   - Try different alert types

## Stop the Server

When done, press `Ctrl+C` in the terminal running the server.

---

**Enjoy your enterprise dashboard! 🎉**