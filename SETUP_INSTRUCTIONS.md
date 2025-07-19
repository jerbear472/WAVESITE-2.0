# WaveSight Setup Instructions

## Database Setup

### 1. Create Timeline Table and Seed Data

To populate your Supabase database with sample data including timeline data for trends and wave scores:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/achuavagkhjenaypawij
2. Navigate to the SQL Editor
3. Open the file `supabase/setup_and_seed.sql` 
4. Copy and paste the entire contents into the SQL editor
5. Click "Run" to execute the script

This will:
- Create the `trend_timeline` table for tracking wave scores over time
- Insert a demo user
- Create 5 sample trend submissions with different statuses (viral, approved, validating)
- Generate timeline data showing wave score progression over time
- Add sample trend validations

### 2. Start the Development Environment

#### Option A: Using Docker Compose
```bash
cd ~/Desktop/WAVESITE\ 2.0
docker-compose up
```

#### Option B: Running services individually

**Backend API:**
```bash
cd ~/Desktop/WAVESITE\ 2.0/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Web Dashboard:**
```bash
cd ~/Desktop/WAVESITE\ 2.0/web
npm install
npm run dev
```

### 3. Access the Applications

- **Web Dashboard**: http://localhost:3000/dashboard
- **Backend API**: http://localhost:8000/docs
- **Supabase Dashboard**: https://supabase.com/dashboard/project/achuavagkhjenaypawij

## Features Implemented

### Timeline Data
- Each trend has 20 data points tracking wave score progression
- Different growth patterns based on trend status:
  - **Viral trends**: Exponential growth curve
  - **Approved trends**: Steady linear growth
  - **Validating trends**: Slow initial growth

### Web Dashboard Updates
- Real-time data fetching from Supabase
- TrendRadar visualization with actual timeline data
- Insights feed showing trending content
- Competitor tracker displaying top trend spotters

## Troubleshooting

### If you see "trend_timeline table not found"
Run the SQL script in `supabase/setup_and_seed.sql` in the Supabase SQL editor.

### If you need to reset the data
Delete existing data and re-run the seed script:
```sql
TRUNCATE trend_timeline, trend_validations, trend_submissions, users CASCADE;
```
Then run the setup script again.

### Authentication Issues
The demo user credentials are:
- Email: demo@wavesight.com
- Password: demo123456

Note: User authentication through Supabase Auth is not fully set up in this seed script. The data uses a static user ID for demonstration purposes.