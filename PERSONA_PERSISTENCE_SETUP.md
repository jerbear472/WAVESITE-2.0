# User Persona Persistence Setup Guide

This guide will help you set up persistent user personas and settings that survive across sessions, browsers, and devices.

## 🎯 What This Implements

✅ **Database-backed persona storage** - No more localStorage limitations  
✅ **Cross-session persistence** - Personas survive browser restarts  
✅ **Cross-device sync** - Same persona on phone, tablet, desktop  
✅ **Automatic fallback** - localStorage backup when API is unavailable  
✅ **User settings management** - Theme, notifications, privacy preferences  
✅ **Enterprise-ready** - Proper authentication and security  

## 🚀 Quick Setup

### 1. Apply Database Schema

Run the deployment script to create the necessary tables:

```bash
# Install dependencies if needed
npm install @supabase/supabase-js dotenv

# Apply the schema
node apply-personas-schema.js
```

**OR** manually run the SQL in your Supabase dashboard:
```sql
-- Copy and paste the contents of supabase/add_user_personas_schema.sql
-- into your Supabase SQL Editor and execute
```

### 2. Update Your Environment Variables

Ensure these are set in your `.env` files:

```env
# Required for backend
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for mobile
API_BASE_URL=http://your-backend-url:8000
```

### 3. Start Your Services

```bash
# Start backend (includes new persona endpoints)
cd backend
python -m uvicorn app.main:app --reload

# Start web app (uses new usePersona hook)
cd web
npm run dev

# Start mobile app (uses new mobile hooks)
cd mobile
npm run start
```

## 📋 New API Endpoints

The following endpoints are now available:

### Persona Management
- `GET /api/v1/persona` - Get user's persona
- `POST /api/v1/persona` - Create/update persona
- `PATCH /api/v1/persona` - Partial persona update
- `DELETE /api/v1/persona` - Delete persona

### Settings Management
- `GET /api/v1/settings` - Get user settings
- `POST /api/v1/settings` - Update settings
- `PATCH /api/v1/settings` - Partial settings update
- `GET /api/v1/settings/{key}` - Get specific setting
- `PUT /api/v1/settings/{key}` - Update specific setting
- `DELETE /api/v1/settings` - Reset to defaults

## 🔧 Database Schema

### user_personas table
Stores complete persona information:
- Location (country, city, urban type)
- Demographics (age, gender, education, etc.)
- Professional (employment, industry, income)
- Interests (array of interests)
- Lifestyle (shopping habits, media consumption, values)
- Tech preferences (proficiency, devices, platforms)

### user_settings table
Stores app preferences:
- Notification settings
- Privacy controls
- App theme and language
- Feature flags
- Custom settings (extensible JSON)

## 🛡️ Security Features

- **Row Level Security (RLS)** - Users only access their own data
- **Authentication required** - All endpoints require valid auth tokens
- **Automatic user association** - Data tied to authenticated user ID
- **Backup storage** - localStorage fallback for offline scenarios

## 🔄 Migration from localStorage

The new hooks automatically handle migration:

1. **First load**: Tries API, falls back to localStorage if needed
2. **On save**: Saves to both API and localStorage for reliability  
3. **Background sync**: Attempts to sync localStorage data to API when possible

## 🧪 Testing

### Test Persona Persistence

1. **Create a persona** on web or mobile
2. **Close browser/app** completely
3. **Reopen** - persona should still be there
4. **Switch devices** - login on different device, persona should sync
5. **Go offline** - persona should still work from local storage

### Test Settings Persistence

```typescript
// Example: Test theme persistence
const { updateSetting } = useUserSettings();
await updateSetting('theme', 'dark');
// Refresh page - theme should remain dark
```

## 🎨 Frontend Integration

### Web (React)
```typescript
import { usePersona } from '@/hooks/usePersona';
import { useUserSettings } from '@/hooks/useUserSettings';

function MyComponent() {
  const { personaData, savePersonaData, loading } = usePersona();
  const { settings, updateSetting } = useUserSettings();
  
  // Persona is automatically loaded and persisted
  // Settings sync across all sessions
}
```

### Mobile (React Native)
```typescript
import { usePersona } from '../hooks/usePersona';

function PersonaScreen() {
  const { personaData, savePersonaData, syncWithServer } = usePersona();
  
  // Data persists across app restarts
  // Syncs with server when online
}
```

## 🐛 Troubleshooting

### "Table doesn't exist" error
- Run the schema deployment script
- Check Supabase dashboard for table creation
- Verify RLS policies are active

### "Authentication failed" error
- Check user is logged in before accessing persona endpoints
- Verify access tokens are being passed correctly
- Check CORS settings for web requests

### "Sync failed" warning
- Normal behavior when offline
- Data saves locally and syncs when connection restored
- Check API_BASE_URL environment variable

### Migration issues
- Old localStorage data automatically migrates on first load
- Clear localStorage if you want fresh start: `localStorage.clear()`
- Check browser console for migration logs

## 🔮 Advanced Features

### Custom Settings
```typescript
// Add app-specific settings
await updateSetting('customSettings', {
  aiPreferences: { model: 'gpt-4', temperature: 0.7 },
  uiCustomizations: { compactMode: true, animations: false }
});
```

### Bulk Updates
```typescript
// Update multiple persona fields at once
await savePersonaData({
  ...currentPersona,
  location: { country: 'US', city: 'NYC', urbanType: 'urban' },
  interests: [...currentPersona.interests, 'AI', 'Crypto']
});
```

### Real-time Sync
The system is ready for real-time sync via WebSockets or server-sent events when needed.

## 📞 Support

Your persona and settings data is now:
- ✅ Persistent across sessions
- ✅ Synced across devices  
- ✅ Backed up automatically
- ✅ Secure and private
- ✅ Ready for production

Enjoy your enhanced user experience! 🎉