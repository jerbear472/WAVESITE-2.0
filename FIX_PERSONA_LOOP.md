# Fix for Profile Page Persona Loop Issue

## Problem
The profile page was continuously redirecting to the persona builder even when a persona was already built and saved.

## Root Cause
The issue occurred because:
1. Personas were being saved to localStorage but might have incomplete or invalid data
2. The validation logic wasn't properly checking if all required fields were filled
3. The profile page would redirect if `hasPersona` was false, but this wasn't being set correctly

## Solution Applied

### 1. Added Persona Validation
Added a validation function in `hooks/usePersona.ts` that checks if all required persona fields are filled:
- Location (country, city)
- Demographics (age range, education level)
- Professional info (employment status, industry)
- At least one interest

### 2. Updated Persona Loading Logic
- When loading from localStorage, the persona data is now validated
- Invalid personas are automatically cleared from localStorage
- Only valid personas set `hasPersona` to true

### 3. Created API Route
Created `/app/api/v1/persona/route.ts` to properly proxy persona requests to the backend API

### 4. Updated Persona Page
The persona page now redirects directly to the profile page after saving a persona

## For Users Experiencing the Issue

If you're still stuck in the persona loop:

1. **Option 1: Clear Invalid Persona Data**
   - Open your browser's developer console (F12)
   - Copy and paste the contents of `scripts/clear-invalid-personas.js`
   - Press Enter to run it
   - Refresh the page

2. **Option 2: Manual Clear**
   - Open developer tools (F12)
   - Go to Application/Storage tab
   - Find Local Storage for your domain
   - Delete any keys starting with `persona_`
   - Refresh the page

3. **Option 3: Build a Complete Persona**
   - Go to `/persona` directly
   - Fill out ALL required fields
   - Save the persona
   - You should be redirected to the profile page

## Backend Setup Required

To fully enable persona persistence in the database:

1. Apply the persona schema to your Supabase database:
   ```sql
   -- Run the contents of supabase/add_user_personas_schema.sql
   ```

2. Ensure the backend is running with the personas endpoint enabled (already configured in the backend)

## Testing

After applying the fix:
1. Clear any existing persona data
2. Go to the persona builder
3. Fill out all required fields
4. Save the persona
5. Verify you're redirected to the profile page
6. Refresh the profile page - you should NOT be redirected back to persona builder