# 🚀 Production Deployment Checklist

## 📋 Pre-Deployment Tasks

### 1. Database Migration
- [ ] Run `PRODUCTION_FIX_MIGRATION.sql` on your Supabase instance
- [ ] Verify all tables are created correctly
- [ ] Check that RLS policies are enabled
- [ ] Test database functions work correctly
- [ ] Verify indexes are created for performance

### 2. Environment Variables
Update both `web/.env.local` and `web/.env.production` with:
```env
NEXT_PUBLIC_SUPABASE_URL=https://aicahushpcslwjwrlqbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Code Updates Required

#### Frontend Components to Update:
- [ ] `web/app/(authenticated)/submit/page.tsx` - Use ReliableTrendSubmissionV2
- [ ] `web/app/(authenticated)/validate/page.tsx` - Use ReliableValidationService
- [ ] `web/components/TrendSubmissionForm.tsx` - Use EARNINGS_STANDARD_V2
- [ ] `web/components/SwipeableVerificationFeed.tsx` - Use ReliableValidationService

#### Import Updates:
Replace old imports with new services:
```typescript
// Old
import { TrendSubmissionService } from '@/services/TrendSubmissionService';

// New
import { ReliableTrendSubmissionV2 } from '@/services/ReliableTrendSubmissionV2';
import { ReliableValidationService } from '@/services/ReliableValidationService';
import { EARNINGS_STANDARD_V2 } from '@/lib/EARNINGS_STANDARD_V2';
```

### 4. Storage Buckets
- [ ] Create `trend-images` bucket in Supabase Storage
- [ ] Set bucket to public
- [ ] Configure CORS if needed

### 5. Authentication Setup
- [ ] Enable email authentication in Supabase
- [ ] Configure email templates
- [ ] Set up redirect URLs for production domain
- [ ] Test magic link authentication

## 🧪 Testing Checklist

### Core Functionality Tests:
- [ ] User registration works
- [ ] User login works
- [ ] Profile creation/update works
- [ ] Trend submission works
- [ ] Image upload works
- [ ] Validation voting works
- [ ] Earnings calculation is correct
- [ ] Tier progression works
- [ ] Daily earnings tracking works

### Error Handling Tests:
- [ ] Network failures are handled gracefully
- [ ] Duplicate submissions are prevented
- [ ] Self-validation is blocked
- [ ] Invalid data is rejected with clear messages
- [ ] Rate limiting works (if implemented)

### Performance Tests:
- [ ] Page load times are acceptable
- [ ] Database queries are optimized
- [ ] Images load quickly
- [ ] No memory leaks in long sessions

## 🚀 Deployment Steps

### 1. Deploy to Vercel:
```bash
# Push to GitHub
git add .
git commit -m "Production ready deployment"
git push origin main

# In Vercel Dashboard:
# 1. Import project from GitHub
# 2. Set environment variables
# 3. Deploy
```

### 2. Vercel Environment Variables:
Add these in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Domain Configuration:
- [ ] Add custom domain in Vercel
- [ ] Configure DNS records
- [ ] Enable HTTPS (automatic in Vercel)
- [ ] Test domain works

### 4. Supabase Configuration:
- [ ] Add production URL to allowed redirect URLs
- [ ] Configure rate limiting
- [ ] Enable database backups
- [ ] Set up monitoring alerts

## 🔍 Post-Deployment Verification

### Immediate Checks:
- [ ] Site loads on production URL
- [ ] Authentication works
- [ ] Database connections work
- [ ] Images upload and display
- [ ] Console has no critical errors

### First Hour Monitoring:
- [ ] Monitor error logs in Vercel
- [ ] Check Supabase logs for issues
- [ ] Verify no 500 errors
- [ ] Test all core user flows
- [ ] Check performance metrics

### First Day Monitoring:
- [ ] Review user feedback
- [ ] Check database performance
- [ ] Monitor storage usage
- [ ] Verify earnings calculations
- [ ] Check for any security issues

## 🛠️ Rollback Plan

If critical issues occur:
1. Revert to previous deployment in Vercel
2. Restore database backup if needed
3. Communicate with users about downtime
4. Fix issues in development
5. Re-deploy with fixes

## 📊 Success Metrics

Track these KPIs after launch:
- User registration rate
- Trend submission rate
- Validation participation rate
- Average earnings per user
- User retention (DAU/MAU)
- Error rate < 1%
- Page load time < 3 seconds
- Database query time < 100ms

## 🔐 Security Checklist

- [ ] All API keys are in environment variables
- [ ] RLS policies are properly configured
- [ ] No sensitive data in client-side code
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] HTTPS enforced

## 📱 Mobile App Deployment (Optional)

### iOS:
- [ ] Update bundle identifier
- [ ] Configure certificates and provisioning profiles
- [ ] Update API endpoints to production
- [ ] Test on real devices
- [ ] Submit to App Store

### Android:
- [ ] Update package name
- [ ] Sign APK with production key
- [ ] Update API endpoints
- [ ] Test on various devices
- [ ] Submit to Google Play

## 🆘 Support Setup

- [ ] Create support email address
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Create user documentation
- [ ] Prepare FAQ section
- [ ] Set up user feedback collection

## 📝 Documentation

- [ ] Update README with production info
- [ ] Document API endpoints
- [ ] Create admin guide
- [ ] Document database schema
- [ ] Create troubleshooting guide

## ✅ Final Sign-off

- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security review complete
- [ ] Documentation updated
- [ ] Team trained on support
- [ ] Monitoring configured
- [ ] Backup plan ready
- [ ] **Ready for launch! 🎉**

---

## Quick Commands Reference

```bash
# Run database migration
psql $DATABASE_URL < PRODUCTION_FIX_MIGRATION.sql

# Test production build locally
npm run build
npm run start

# Deploy to Vercel
vercel --prod

# Monitor logs
vercel logs --follow
```

## Contact for Issues

If you encounter any issues during deployment:
1. Check Supabase logs
2. Check Vercel logs
3. Review browser console
4. Test with different user accounts
5. Verify environment variables

Remember: Take backups before any major changes!