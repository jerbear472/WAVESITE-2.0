# Trend Submission Setup Guide

## ✅ What I've Done

1. **Fixed the "+ New Trend" button** on the trends page to navigate to `/submit`
2. **Updated the submission flow** to store all trend information including:
   - Basic info: URL, title, description, category, platform
   - Social media metadata: creator info, engagement metrics, hashtags
   - Image uploads with storage bucket support
   - Trend umbrella grouping for similar trends

## 🔧 Database Setup Required

To make trend submission fully functional, you need to apply database updates:

### Option 1: Run SQL in Supabase Dashboard (Recommended)

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/achuavagkhjenaypawij/sql/new

2. Copy the contents of `supabase/apply_all_updates.sql`

3. Paste and click "Run"

This will:
- Add social media metadata columns to `trend_submissions` table
- Create `trend_umbrellas` table for grouping similar trends
- Set up proper RLS policies
- Create storage bucket for trend images

### Option 2: Check Database Status

Run this command to check your database status:

```bash
cd /Users/JeremyUys_1/Desktop/WAVESITE2
node apply-database-updates.js
```

## 📝 How Trend Submission Works

1. **User clicks "+ New Trend"** → navigates to `/submit`
2. **3-step form process**:
   - Step 1: URL and basic info (auto-extracts metadata)
   - Step 2: Category, platform, and social media details
   - Step 3: Review and submit
3. **Data is stored** in `trend_submissions` table with:
   - All form fields
   - Auto-extracted social media metadata
   - Image uploads to Supabase storage
   - Link to trend umbrella for grouping

## 🚀 Features Included

- **Auto-metadata extraction** from social media URLs
- **Duplicate detection** to prevent resubmissions
- **Draft saving** to localStorage
- **Image upload** with preview
- **Trend umbrellas** for grouping similar trends
- **Form validation** with helpful error messages
- **Success feedback** with redirect to timeline

## 🔍 Testing

After applying database updates:

1. Start your development server:
   ```bash
   cd web
   npm run dev
   ```

2. Navigate to http://localhost:3000/trends

3. Click the "+ New Trend" button

4. Submit a test trend with a real social media URL

5. Check your Supabase dashboard to verify the data was saved

## 💡 Tips

- The form automatically extracts metadata from TikTok, Instagram, YouTube, and Twitter URLs
- Drafts are automatically saved as you type
- Similar trends are grouped under "trend umbrellas" for better organization
- All submissions require authentication

Let me know if you need any help with the database setup!