# 🚨 IMMEDIATE FIXES REQUIRED

## 1. Remove eval() - CRITICAL SECURITY ISSUE
**File**: `capture-submission-error.js` line 47
```javascript
// REMOVE THIS:
const val = eval(loc);

// REPLACE WITH:
const val = window[loc] || document.querySelector(loc);
```

## 2. Fix Admin Authentication
**File**: `web/contexts/AuthContext.tsx` lines 100, 168, 254
```typescript
// REMOVE hardcoded emails:
const isAdmin = profile.email === 'jeremyuys@gmail.com' || profile.email === 'enterprise@test.com';

// REPLACE WITH database field:
const isAdmin = profile.is_admin === true;
```

## 3. Add Database Indexes for Performance
Run this SQL immediately:
```sql
-- Critical performance indexes
CREATE INDEX idx_trend_submissions_spotter_created 
ON trend_submissions(spotter_id, created_at DESC);

CREATE INDEX idx_trend_submissions_status 
ON trend_submissions(status);

CREATE INDEX idx_profiles_email 
ON profiles(email);

CREATE INDEX idx_trend_validations_validator 
ON trend_validations(validator_id);

CREATE INDEX idx_earnings_ledger_user 
ON earnings_ledger(user_id, created_at DESC);
```

## 4. Fix XSS in Browser Extension
**Files**: `browser-extension/enhanced-popup.js`, `enhanced-content.js`
```javascript
// NEVER use innerHTML with user content
// Replace ALL instances of:
element.innerHTML = userContent;

// With:
element.textContent = userContent;
// OR if HTML needed, sanitize first:
element.innerHTML = DOMPurify.sanitize(userContent);
```

## 5. Optimize Database Queries
**Multiple files** using `select('*')`
```javascript
// STOP doing this:
.select('*')

// Be specific:
.select('id, username, email, total_earnings, created_at')
```

## 6. Environment Variables Security
**NEVER commit .env to git!**
Add to `.gitignore`:
```
.env
.env.local
.env.production
```

Move sensitive values to Vercel/hosting environment variables.

## 7. Add Error Boundaries
Your app crashes on errors. Add error boundaries:
```typescript
// web/components/ErrorBoundary.tsx exists but isn't used everywhere
// Wrap main app components with it
```

## 8. Fix Empty Catch Blocks
**Multiple files** have empty catches that hide errors:
```javascript
} catch (e) {} // BAD - hides errors

// Replace with:
} catch (error) {
  console.error('Operation failed:', error);
  // Handle error appropriately
}
```

## 9. Consolidate Database Schema
You have **7 different versions** of the same tables!
- Pick ONE source of truth
- Delete duplicate migration files
- Use proper migration versioning

## 10. Add Rate Limiting
No rate limiting on API routes = abuse risk
```typescript
// Add to API routes:
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
```

## Priority Order:
1. **TODAY**: Fix eval(), hardcoded admins, add indexes
2. **THIS WEEK**: Fix XSS, optimize queries, add error handling
3. **NEXT WEEK**: Schema consolidation, rate limiting, security audit

## Testing After Fixes:
- [ ] Submissions still work
- [ ] Login/auth still works
- [ ] Admin panel accessible (with proper auth)
- [ ] Performance improved (check query times)
- [ ] No console errors