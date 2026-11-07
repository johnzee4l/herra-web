# Herra Web - Production Deployment Guide

**Last Updated:** 2026-11-07  
**Status:** Ready for Production Deployment

---

## 🎯 Pre-Deployment Checklist

### ✅ Code Ready
- [x] Backend implemented (15+ tables, 8 server actions)
- [x] Frontend cleaned (no placeholder data)
- [x] Camera & probes working
- [x] Security hardened (RLS, HMAC, EXIF stripping)
- [x] Documentation complete

### ✅ Environment Variables Ready
```env
NEXT_PUBLIC_SUPABASE_URL=https://osapicvigugdedqlydbj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUz...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUz...
HMAC_PEPPER=79TLmlbnjagIQcMV2f3sH6WFiuZCkrJUwOhx1EKy
CRON_SECRET=(generate new for production)
```

---

## 📦 Step 1: Prepare Supabase Database (15 minutes)

### A. Run All Migrations

Go to Supabase Dashboard → SQL Editor and run in order:

```sql
-- 1. Extensions
\i db/migrations/001_enable_extensions.sql

-- 2. Core tables
\i db/migrations/002_create_profiles.sql
\i db/migrations/003_create_spaces.sql
\i db/migrations/004_create_access_codes_and_members.sql
\i db/migrations/005_create_fields.sql
\i db/migrations/006_create_assessments.sql
\i db/migrations/007_create_outcomes_announcements_notifications.sql
\i db/migrations/008_create_admin_tables.sql

-- 3. Storage and registry
\i db/migrations/009_create_storage_buckets.sql
\i db/migrations/010_create_model_registry.sql
\i db/migrations/011_seed_data.sql
```

**Alternative:** Copy and paste each file's contents manually.

### B. Configure Access Code Pepper

```sql
-- Set the same pepper as your HMAC_PEPPER env var
ALTER DATABASE postgres 
SET app.access_code_pepper = '79TLmlbnjagIQcMV2f3sH6WFiuZCkrJUwOhx1EKy';
```

### C. Verify Setup

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Should return 15+ tables

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
-- Should return all tables

-- Check PostGIS
SELECT PostGIS_version();
-- Should return version info

-- Check pepper
SHOW app.access_code_pepper;
-- Should return your pepper value
```

### D. Verify Storage Buckets

Go to: Supabase Dashboard → Storage

Should see:
- ✅ `field-photos` bucket (private)
- ✅ `hi-models` bucket (private)

---

## 🚀 Step 2: Deploy to Vercel (10 minutes)

### A. Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

### B. Login to Vercel

```bash
vercel login
```

### C. Build and Test Locally

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Test production build locally
npm run start
```

### D. Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or use Vercel Dashboard:
# 1. Import Git repository
# 2. Configure project
# 3. Add environment variables
# 4. Deploy
```

### E. Configure Environment Variables in Vercel

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Add these for **Production, Preview, and Development**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://osapicvigugdedqlydbj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zYXBpY3ZpZ3VnZGVkcWx5ZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjM2NzIsImV4cCI6MjEwODkzOTY3Mn0.3ibTFvCu6JjjVAsg1S2y7_5LZDs1TOkplsBjxgfrtVQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zYXBpY3ZpZ3VnZGVkcWx5ZGJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzM2MzY3MiwiZXhwIjoyMTA4OTM5NjcyfQ.Hc7vD1srR8KCxr5N8X0dgxG9n0eO-vnLkgY5kgjYT4A
HMAC_PEPPER=79TLmlbnjagIQcMV2f3sH6WFiuZCkrJUwOhx1EKy
CRON_SECRET=generate-new-secret-for-production
```

**Security Note:** Generate a new `CRON_SECRET` for production:
```bash
openssl rand -hex 32
```

---

## 👤 Step 3: Create First Admin User (2 minutes)

### A. Sign Up Through the App

1. Go to your deployed URL: `https://your-app.vercel.app/sign-up`
2. Sign up with your email
3. Verify email (if email confirmation enabled)

### B. Promote to Admin

In Supabase SQL Editor:

```sql
-- Replace with your email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';

-- Verify
SELECT id, email, role FROM profiles WHERE role = 'admin';
```

---

## 🧪 Step 4: Test Production Deployment (10 minutes)

### Authentication Flow
- [ ] Sign up creates profile in database
- [ ] Sign in works
- [ ] Sign out clears session
- [ ] Protected routes redirect to sign-in

### Admin Features
- [ ] Access `/admin` dashboard
- [ ] View model registry at `/admin/models`
- [ ] Check data health at `/admin/data-health`
- [ ] Create access code
- [ ] View audit log

### Space & Field Creation
- [ ] Create a space with boundary
- [ ] Generate access code
- [ ] Sign up as new user
- [ ] Join space with code
- [ ] Draw and save a field

### Assessment Flow
- [ ] Navigate to `/farmer/analyze`
- [ ] Take photo (camera or upload)
- [ ] Set moisture level
- [ ] Submit assessment
- [ ] View results at `/farmer/entries`

### Camera & Photos
- [ ] Camera access works (front/rear toggle)
- [ ] Photo capture works
- [ ] Gallery selection works
- [ ] Photos upload successfully
- [ ] Photos appear in Supabase Storage

---

## 📊 Step 5: Monitor Deployment

### Vercel Dashboard
- ✅ Build successful
- ✅ Deployment status: Ready
- ✅ No build errors
- ✅ Functions deployed

### Supabase Dashboard

**Database:**
- ✅ Tables created (15+)
- ✅ Storage buckets exist
- ✅ RLS policies active

**Usage:**
- ✅ Database size < 500MB (free tier)
- ✅ Storage < 1GB (free tier)
- ✅ API requests monitored

### Test Cron Job

The cron job runs daily at 2 AM UTC. To test immediately:

```bash
# Get your Vercel deployment URL
VERCEL_URL="https://your-app.vercel.app"

# Call cron endpoint with secret
curl -X GET "${VERCEL_URL}/api/cron/daily" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should return: {"success": true, "results": {...}}
```

---

## 🔒 Step 6: Security Verification

### Database Security
```sql
-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- All should show rowsecurity = true

-- Test RLS policies (as non-admin)
SET ROLE authenticated;
SET request.jwt.claims.sub = 'some-user-id';
SELECT * FROM profiles WHERE id != 'some-user-id';
-- Should return 0 rows (can't see other users)
RESET ROLE;
```

### Storage Security
- [ ] Go to Supabase Storage → field-photos
- [ ] Try to access photo URL directly → Should fail (private bucket)
- [ ] Signed URLs should work and expire after 1 hour

### Access Code Security
```sql
-- Verify codes are hashed
SELECT id, code_hash, code_hint FROM access_codes LIMIT 1;
-- code_hash should be 64-char hex (SHA256)
-- code_hint should be last 4 chars only
```

---

## 📱 Step 7: Mobile Testing

### iOS Safari
- [ ] Camera works (asks permission)
- [ ] Photo capture works
- [ ] Video preview displays correctly
- [ ] Touch controls work

### Android Chrome
- [ ] Camera works (rear camera preferred)
- [ ] Photo capture works
- [ ] Orientation changes handled
- [ ] Upload works on mobile data

### PWA Features (Optional)
- [ ] Add to home screen works
- [ ] App icon displays
- [ ] Splash screen shows
- [ ] Works as standalone app

---

## 🎛️ Step 8: Optional Configurations

### Email Configuration (Recommended for Production)

**Supabase Dashboard → Authentication → Email Templates**

Options:
1. **Use Supabase built-in** (limited to 3-4 emails/hour on free tier)
2. **Configure SMTP** (recommended for production):
   - Gmail SMTP
   - SendGrid
   - Mailgun
   - Resend

### Disable Email Confirmation (Demo Only)

For faster testing without email setup:

**Supabase Dashboard → Authentication → Email**
- [ ] Uncheck "Enable email confirmations"

**⚠️ Warning:** Don't do this in production!

### Custom Domain (Optional)

**Vercel Dashboard → Your Project → Settings → Domains**
- Add your custom domain
- Configure DNS
- SSL certificate auto-generated

---

## 📈 Step 9: Post-Deployment Tasks

### Create Sample Data (Optional)

```sql
-- Create a demo space
INSERT INTO spaces (name, description, boundary, crop_focus)
VALUES (
  'Demo Cooperative',
  'Sample space for testing',
  ST_GeomFromText('POLYGON((121.0 14.0, 121.1 14.0, 121.1 14.1, 121.0 14.1, 121.0 14.0))', 4326),
  ARRAY['rice', 'corn']
);

-- Generate access code for the space
-- (Use the admin UI instead - this is just FYI)
```

### Setup Monitoring

**Vercel:**
- Enable Web Analytics
- Configure error tracking
- Set up usage alerts

**Supabase:**
- Monitor database size
- Watch API request count
- Set up disk usage alerts

### Backup Strategy

**Database:**
- Supabase Free: Daily automatic backups (7 days retention)
- Manual backup: Dashboard → Database → Backups

**Storage:**
- Consider periodic exports
- Document recovery procedure

---

## ✅ Deployment Verification Checklist

### Infrastructure
- [ ] Vercel deployment successful
- [ ] All 11 migrations ran successfully
- [ ] Environment variables set correctly
- [ ] Cron job configured (daily at 2 AM UTC)
- [ ] Storage buckets created
- [ ] RLS enabled on all tables

### User Flows
- [ ] Sign up → profile created
- [ ] Sign in → redirects to /farmer
- [ ] Create space → PostGIS validates
- [ ] Generate code → HMAC hash stored
- [ ] Join space → code validates
- [ ] Draw field → geometry validates
- [ ] Take photo → EXIF stripped
- [ ] Run assessment → results stored
- [ ] View entries → data displays

### Admin Features
- [ ] Access admin dashboard
- [ ] View model registry
- [ ] Create access codes
- [ ] View audit log
- [ ] Test data health checks
- [ ] Promote model works

### Security
- [ ] RLS policies enforced
- [ ] Service role key not in client bundle
- [ ] Photos require signed URLs
- [ ] Access codes hashed
- [ ] Rate limiting works
- [ ] EXIF metadata stripped

---

## 🚨 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
- Check Supabase project is not paused
- Verify environment variables are correct
- Check API keys haven't expired

### Camera Not Working
- Ensure HTTPS (required for camera API)
- Check browser permissions
- Test on different devices

### Photos Not Uploading
- Check storage bucket exists and is private
- Verify service role key is correct
- Check file size < 5MB
- Verify CORS settings in Supabase

### Cron Job Not Running
- Verify CRON_SECRET is set in Vercel
- Check Vercel logs for cron execution
- Test endpoint manually with curl

---

## 📞 Support & Resources

### Documentation
- **QUICK_REFERENCE.md** - Quick start guide
- **INTEGRATION_GUIDE.md** - Code examples
- **FINAL_REPORT.md** - Complete feature list

### External Docs
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

### Community
- Supabase Discord
- Next.js GitHub Discussions
- Stack Overflow

---

## 🎉 Success!

Your Herra Web application is now deployed and ready for use!

**Next Steps:**
1. Share the URL with your team
2. Create initial spaces and access codes
3. Onboard first farmers
4. Monitor usage and performance
5. Plan Phase W2 implementation (real grid file, trained model)

**Your deployment is complete!** 🚀

---

**Deployment Date:** 2026-11-07  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
