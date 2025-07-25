
# 📱 WaveSite Mobile App: Claude Build Prompts (Sticky Features)

This document outlines all feature prompts for Claude to build the WaveSite mobile app with strong retention mechanics and a clean UX for logging trends.

---

## 🧱 1. Scroll Session Timer & Tracker

**Prompt:**

Build a React Native component called `ScrollSession` that allows the user to:
- Tap a "Start Session" button that activates a live timer
- Show elapsed time in minutes:seconds
- Show count of trends logged in this session
- Show current session earnings (default $0.10/min + trend bonuses)
- Include a "Stop Session" button to end and store session metadata (duration, trends logged, earnings)
- Use Context or local state to track the session live
- On stop, send session data to Supabase for logging

---

## 🧠 2. Trend Logging Button (Overlay)

**Prompt:**

Build a floating button component in React Native (iOS + Android safe) that:
- Appears only when a session is active
- Tapping it opens a modal to "Log a Trend" with:
  - Dropdown for category (e.g. Fashion, Wellness, Meme, Audio)
  - Optional free text for notes or tags
  - Optional emoji selector for sentiment
- On submit, save timestamp + user ID + trend metadata to Supabase
- Reset fields after each submission

---

## 📓 3. My Trends Logbook

**Prompt:**

Build a `MyTrends` screen that pulls the logged trends from Supabase for the current user. Each trend should show:
- Timestamp
- Category
- User notes or emojis
- Trend status (Pending, Verified, Rewarded)
- Bonus earnings if applicable
- Display in reverse chronological order
- Add filters by category or status

---

## 🎯 4. Trend Verification Feed

**Prompt:**

Create a feed component that:
- Pulls unverified trends from Supabase (exclude current user)
- Displays: timestamp, category, short note, optional screenshot
- Let users swipe right to "Confirm" or left to "Not a trend"
- Submit vote to Supabase along with user ID and timestamp
- Add soft debounce so users don’t verify too rapidly
- Bonus: Add an icon or indicator for majority-confirmed trends

---

## 💵 5. Earnings Tracker

**Prompt:**

Build a `EarningsDashboard` screen that shows:
- Total earnings this week
- Number of sessions completed
- Avg $/session
- Bonuses earned (verified trends, early flags, viral bonus)
- Breakdown table with:
  - Session date
  - Duration
  - Base earning
  - Bonuses
- Pull data from Supabase `sessions` and `trends` tables

---

## 🔁 6. Streaks & Challenges

**Prompt:**

Create a `StreakAndChallenges` component:
- Show current daily streak count
- If streak breaks, reset to 0
- Store streaks in Supabase per user
- Display 3 current weekly challenges (e.g. "Log 3 fashion trends")
- Show progress bars for each challenge
- Upon completion, trigger bonus payout function and store it in Supabase

---

## 📈 7. Trend Radar / Explore Tab

**Prompt:**

Build a `TrendRadar` explore screen that shows:
- Live list of trends currently gaining traction (based on vote volume + timestamps)
- Sortable by category or region
- Mini chart view of upvotes over time
- Optional: tag cloud of frequent trend labels in the last 24 hrs
- Pull data from verified trends table in Supabase

---

## 🔔 8. Weekly Recap Notification

**Prompt:**

Build a background job or scheduled Supabase function that:
- Every Sunday, pulls each user's trend activity for the week
- Summarizes:
  - Trends logged
  - Verified trends
  - Bonus earnings
  - Top-performing trend
- Sends this data as a push notification (or email) using Supabase Edge Functions + Expo push

---


