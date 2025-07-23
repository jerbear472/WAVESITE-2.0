# 🌊 WAVESITE 2.0 - Quick Start Guide

## 🚀 Getting Started in 30 Minutes

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- Xcode (for iOS development)
- Git

### Step 1: Run Setup Script
```bash
chmod +x setup-wavesite.sh
./setup-wavesite.sh
```

### Step 2: Set Up Supabase (5 minutes)

1. **Create Supabase Account**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up for free account
   - Create new project (name: "wavesite")

2. **Get Your API Keys**
   - Go to Settings → API
   - Copy:
     - Project URL
     - anon public key
     - service_role key (keep secret!)

3. **Run Database Schema**
   - Go to SQL Editor
   - Copy contents of `supabase/schema.sql`
   - Run the query

4. **Enable Authentication**
   - Go to Authentication → Settings
   - Enable Email auth
   - Enable Apple/Google auth (optional)

### Step 3: Configure Environment Variables

1. **Update `web/.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. **Update `mobile/.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
API_URL=http://localhost:8000
```

3. **Update `backend/.env`**
```env
DATABASE_URL=your-supabase-database-url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
REDIS_URL=redis://localhost:6379
SECRET_KEY=generate-a-random-key
```

### Step 4: Install Redis (Optional for MVP)

**Option A: Local Redis**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
```

**Option B: Use Upstash (Free Cloud Redis)**
- Go to [https://upstash.com](https://upstash.com)
- Create free Redis database
- Copy connection URL to backend/.env

### Step 5: Start Services

**Terminal 1 - Backend API:**
```bash
cd backend
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Web Dashboard:**
```bash
cd web
npm run dev
```

**Terminal 3 - Mobile App (after Xcode setup):**
```bash
cd mobile
# For iOS
npm run ios

# For Android
npm run android
```

### Step 6: iOS Development Setup

1. **Open Xcode Project**
   ```bash
   cd mobile/ios
   open mobile.xcworkspace
   ```

2. **Configure Signing**
   - Select the project in navigator
   - Go to "Signing & Capabilities"
   - Select your team (create Apple ID if needed)
   - Change bundle identifier to something unique

3. **Add Required Capabilities**
   - Screen Recording (ReplayKit)
   - Background Modes → Background fetch

4. **Trust Developer Certificate**
   - Build and run on your device
   - On device: Settings → General → Device Management → Trust

## 🎯 First Run Checklist

- [ ] Web dashboard loads at http://localhost:3000
- [ ] Can create account and login
- [ ] Backend API docs at http://localhost:8000/docs
- [ ] Mobile app launches and connects to Supabase
- [ ] Can start screen recording in mobile app

## 🔧 Common Issues & Solutions

### Issue: "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: iOS build fails
```bash
cd mobile/ios
pod deintegrate
pod install
# Clean build in Xcode: Product → Clean Build Folder
```

### Issue: Supabase connection failed
- Check your API keys are correct
- Ensure Supabase project is not paused
- Check Row Level Security policies

### Issue: Python import errors
```bash
cd backend
pip install -r requirements.txt --upgrade
```

## 📱 Testing the App

1. **Create Test Account**
   - Open web dashboard
   - Sign up with email
   - Verify email

2. **Submit Test Trend**
   - Click "Submit Trend"
   - Fill in details
   - Upload screenshot

3. **Test Mobile Recording**
   - Open mobile app
   - Login with same account
   - Start recording
   - Open TikTok/Instagram
   - Browse for 30 seconds
   - Stop recording

## 🚀 Next Steps

1. **Deploy to Production**
   - See `DEPLOYMENT_GUIDE.md`
   - Recommended: Vercel (web) + Render (backend)

2. **Add ML Features**
   - Get OpenAI API key
   - Enable trend analysis
   - Configure CLIP model

3. **Set Up Payments**
   - Create Stripe account
   - Add webhook endpoints
   - Enable payouts

## 📞 Need Help?

- Check logs in each terminal
- Backend API docs: http://localhost:8000/docs
- Supabase logs: Dashboard → Logs
- Mobile logs: Xcode console or `npx react-native log-ios`

---

**Ready to ride the wave? 🌊** Your WAVESITE instance should now be running locally!