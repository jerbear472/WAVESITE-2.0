# WaveSight Quick Fix Guide

## 🚨 If Login Isn't Working

### 1. Quick Cleanup (Recommended)
```bash
# Run the cleanup script
./cleanup.sh

# Then start fresh
./start.sh
```

### 2. Manual Cleanup Steps
If the scripts don't work:

```bash
# 1. Kill all processes
pkill -f "next dev"
pkill -f "node"
lsof -ti:3000 | xargs kill -9

# 2. Clear cache
cd web
rm -rf .next
rm -rf node_modules/.cache

# 3. Start fresh
npm run dev
```

### 3. Browser Cleanup
1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Clear for localhost:
   - Local Storage
   - Session Storage  
   - Cookies
4. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## 🔑 Test Accounts

### Admin Account (sees Enterprise button)
- Email: `jeremyuys@gmail.com`
- Password: (your password)

### Regular Test Account
- Email: Any registered email
- Password: Your password

## 🎯 Common Issues & Fixes

### "Invalid email or password"
- Check email is lowercase
- Clear browser storage (see above)
- Run cleanup script

### Page not loading/White screen
- Run cleanup script
- Check console for errors (F12)
- Try incognito/private window

### Multiple tabs issue
- Close all tabs except one
- Run cleanup script
- Open single tab to http://localhost:3000

### Session expired
- Clear browser storage
- Login again

### Port conflicts
The app automatically finds an available port. Check terminal for:
```
✅ Using port: 3001
```

## 🚀 Best Practices

1. **Use one tab** - Multiple tabs can cause session conflicts
2. **Run cleanup when switching accounts** - Prevents session mixing
3. **Use incognito for testing** - Clean session every time
4. **Check terminal for errors** - Most issues show error messages

## 📝 Enterprise Dashboard

Only visible to `jeremyuys@gmail.com`:
1. Login with the admin email
2. Look for "Enterprise Live" button in header
3. Click to access live dashboard

## 🛠️ Development Tips

### Fast Restart
```bash
./cleanup.sh && ./start.sh
```

### Check what's running
```bash
lsof -i :3000-3005
```

### View logs
```bash
cd web && npm run dev
# Watch the terminal for errors
```

## 💡 Still Having Issues?

1. Try incognito/private browsing mode
2. Check if Supabase is accessible
3. Verify `.env.local` has correct keys
4. Restart your computer (last resort)

---

**Remember**: Most login issues are solved by running `./cleanup.sh` and clearing browser storage!