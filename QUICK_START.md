# WaveSite 2.0 Quick Start Guide

## 🚀 Quick Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL or Supabase account

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials

# Install dependencies and start
./start.sh
```

Backend will be available at http://localhost:8000
API docs at http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd web
cp .env.local.example .env.local
# Edit .env.local with your API URL and Supabase credentials

npm install
npm run dev
```

Frontend will be available at http://localhost:3000

### 3. One-Command Start (macOS)

From the project root:
```bash
./start-dev.sh
```

This will open both backend and frontend in separate terminal tabs.

## 🔑 Key Features Implemented

### Authentication
- ✅ User registration with email/username
- ✅ Login with JWT tokens
- ✅ Protected routes
- ✅ User profile management

### Trend Management
- ✅ Submit new trends
- ✅ Browse trending discoveries
- ✅ Get trend insights
- ✅ View leaderboard

### Dashboard
- ✅ Real-time trend radar
- ✅ Insights feed
- ✅ Competitor tracker
- ✅ Predictive alerts (UI ready)

## 📱 Mobile App

The React Native mobile app is in the `mobile/` directory. See `mobile/README.md` for setup instructions.

## 🛠️ Tech Stack

- **Backend**: FastAPI + PostgreSQL/Supabase
- **Frontend**: Next.js 14 + Tailwind CSS
- **Mobile**: React Native + TypeScript
- **Auth**: JWT + Supabase Auth
- **State**: React Query + Context API

## 📝 Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SECRET_KEY=your_secret_key
DATABASE_URL=your_database_url
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🧪 Testing

1. Start both backend and frontend
2. Go to http://localhost:3000
3. Click "Sign In" to create an account
4. Access the dashboard after authentication

## 🚧 Next Steps

1. Set up Supabase database with schema from `supabase/schema.sql`
2. Configure payment processing (Stripe)
3. Add ML trend analysis
4. Deploy to production

For detailed deployment instructions, see `DEPLOYMENT_GUIDE.md`