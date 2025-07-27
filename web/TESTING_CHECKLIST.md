# Testing Checklist for Trend Submission Flow

## ✅ Database Setup Complete
Your database now has all the necessary columns and tables.

## Test the Complete Flow

### 1. Submit a New Trend
- Go to `/submit`
- Click "Submit New Trend"
- Paste a social media URL (TikTok, Instagram, YouTube, or Twitter)
- The form should auto-extract metadata if available
- Fill in any additional details
- Submit the trend

**What to verify:**
- [ ] Form accepts the URL
- [ ] Metadata extraction works (if available)
- [ ] Submission succeeds without errors
- [ ] You're redirected to timeline after submission

### 2. Check My Timeline
- Go to `/timeline`
- You should see your newly submitted trend

**What to verify:**
- [ ] Your trend appears in the list
- [ ] All metadata is displayed (likes, comments, shares, views)
- [ ] Creator information shows if provided
- [ ] Hashtags display correctly
- [ ] Status shows as "submitted"
- [ ] "View Post" link works (if URL was provided)

### 3. Test Validation (Requires 2nd User Account)
- Log out and log in as a different user (or use incognito/different browser)
- Go to `/verify`
- You should see trends submitted by other users

**What to verify:**
- [ ] Other users' trends appear in the validation feed
- [ ] All metadata displays correctly
- [ ] "View Original" link works
- [ ] Engagement metrics show with proper formatting (1.2K, 2.5M, etc.)
- [ ] Voting buttons work (Confirm Trend / Not a Trend)
- [ ] After voting, it moves to the next trend
- [ ] Progress indicator updates

### 4. Check Status Updates
- After a trend receives validations, check the timeline again
- Status should update from "submitted" → "validating" → "approved"

**Status progression:**
- 0 validations: "submitted"
- 1-4 validations: "validating" 
- 5+ validations: "approved"

## Common Issues & Solutions

### Trends not showing in timeline:
- Make sure you're logged in
- Check browser console for errors
- Refresh the page

### Trends not showing in validation feed:
- Ensure you're logged in as a different user than the submitter
- Check that trends have status "submitted" or "validating"
- There must be trends from other users to validate

### Metadata not displaying:
- The database columns are now created
- If using manual entry, ensure all fields are filled
- URL extraction depends on the social media platform's availability

## Sample Test URLs

Try these for testing:
- TikTok: `https://www.tiktok.com/@username/video/1234567890`
- Instagram: `https://www.instagram.com/p/ABC123/`
- YouTube: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Twitter/X: `https://twitter.com/username/status/1234567890`

## Success Indicators

✅ Trends save with all metadata
✅ Timeline displays all information correctly
✅ Other users can see and validate your trends
✅ Validation count increases
✅ Status updates based on validation count