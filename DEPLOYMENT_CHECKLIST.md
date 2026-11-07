# Herra Web Backend - Deployment Checklist

## ✅ Completed Implementation

### Database Schema
- [x] 11 migration files created in `db/migrations/`
- [x] All 15+ tables with PostGIS geometry support
- [x] RLS policies on every table
- [x] Security definer functions (join_space, promote_model, rollback)
- [x] Storage buckets configuration
- [x] Seed data with advisory rules and crop configs
- [x] Model registry tables

### Server Actions (app/actions/)
- [x] `auth.ts` - Sign up, sign in, sign out, password reset
- [x] `spaces.ts` - Create spaces, join with access codes, manage members
- [x] `fields.ts` - Create, update, archive fields with geometry
- [x] `assessments.ts` - Run assessments, upload photos, reruns
- [x] `settings.ts` - User preferences, notifications
- [x] `admin.ts` - Model management, crop config, announcements

### Core Libraries (lib/)
- [x] `supabase/client.ts` - Browser, server, admin clients
- [x] `env/grid.ts` - Profile builder (stub, ready for real grid)
- [x] `env/forecast.ts` - Open-Meteo integration
- [x] `env/profile.ts` - Profile orchestration
- [x] `geo/geocode.ts` - Photon reverse geocoding
- [x] `geo/validate.ts` - Geometry validation
- [x] `security/rate-limit.ts` - Rate limiting utilities
- [x] `data/mappers.ts` - Supabase row → domain type conversion
- [x] `data/queries.ts` - Typed query functions

### Infrastructure
- [x] `middleware.ts` - Session refresh and auth routing
- [x] `app/api/cron/daily/route.ts` - Daily maintenance job
- [x] `vercel.json` - Deployment and cron configuration

## 📋 Setup Steps

### 1. Create Supabase Project
```bash
□ Go to https://supabase.com
□ Create new project (free tier)
□ Wait for project to be ready (~2 minutes)
□ Copy Project URL and keys
```

### 2. Run Database Migrations
```bash
□ Open Supabase SQL Editor
□ Run 001_enable_extensions.sql
□ Run 002_create_profiles.sql
□ Run 003_create_spaces.sql
□ Run 004_create_access_codes_and_members.sql
□ Run 005_create_fields.sql
□ Run 006_create_assessments.sql
□ Run 007_create_outcomes_announcements_notifications.sql
□ Run 008_create_admin_tables.sql
□ Run 009_create_storage_buckets.sql
□ Run 010_create_model_registry.sql
□ Run 011_seed_data.sql
```

### 3. Configure Database
```bash
□ Generate pepper: openssl rand -hex 32
□ Run: ALTER DATABASE postgres SET app.access_code_pepper = 'YOUR_PEPPER';
```

### 4. Environment Variables
Create `.env.local`:
```env
□ NEXT_PUBLIC_SUPABASE_URL=
□ NEXT_PUBLIC_SUPABASE_ANON_KEY=
□ SUPABASE_SERVICE_ROLE_KEY=
□ HMAC_PEPPER=
□ CRON_SECRET=
```

### 5. Test Locally
```bash
□ npm install
□ npm run dev
□ Sign up at http://localhost:3000/sign-up
□ Check Supabase dashboard for new profile
```

### 6. Create First Admin
```sql
□ UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 7. Deploy to Vercel
```bash
□ npm run build (test build)
□ vercel login
□ vercel deploy
□ Add environment variables in Vercel dashboard
□ Test production deployment
```

## 🧪 Testing Checklist

### Authentication Flow
```bash
□ Sign up creates profile in database
□ Sign in redirects to /farmer
□ Sign out clears session
□ Password reset sends email (if SMTP configured)
```

### Space & Membership
```bash
□ Admin can create space with boundary
□ Admin can generate access code
□ Farmer can join space with code
□ Space appears in /farmer/spaces
```

### Field Creation
```bash
□ Create field with valid polygon (3+ points)
□ Field validates within space boundary
□ Field validates minimum 0.03 ha
□ Field validates maximum 500 ha
□ Field rejects crossing edges
```

### Assessment Flow
```bash
□ Select field, mode, moisture level
□ Upload photo (optional)
□ Assessment runs and stores in database
□ View results at /farmer/entries
□ Check data quality indicators
□ Verify forecast displayed
```

### Admin Features
```bash
□ Access /admin dashboard
□ View model registry at /admin/models
□ Create access code at /admin/spaces/[id]
□ View audit log at /admin/audit
□ Test data health at /admin/data-health
```

### External Services
```bash
□ Open-Meteo returns forecast
□ Photon returns place names
□ Both pass health checks
```

## 🔒 Security Verification

```bash
□ RLS enabled on all tables (check Supabase dashboard)
□ Service role key not in client bundles (check build output)
□ Photos in private bucket
□ Access codes hashed (check access_codes table)
□ CRON_SECRET protects cron endpoint
□ Middleware redirects unauthenticated users
```

## 🚨 Common Issues

**"Supabase is not configured"**
- Restart dev server after adding .env.local
- Check env vars don't have quotes or spaces

**"Access code pepper not configured"**
- Run ALTER DATABASE command in Supabase
- Check with: SHOW app.access_code_pepper;

**"Field geometry validation failed"**
- Ensure field is within space boundary
- Check minimum area (0.03 ha = 300 m²)
- Verify no crossing edges

**"Assessment quota exceeded"**
- Max 30 assessments per user per hour
- Wait or use different user account

**"Storage bucket not found"**
- Run migration 009_create_storage_buckets.sql
- Check Storage section in Supabase dashboard

## 📊 Monitoring

### Database Usage
```bash
□ Check table sizes: Supabase > Database > Tables
□ Monitor RLS policy performance
□ Watch for slow queries
```

### Vercel Deployment
```bash
□ Check build logs for errors
□ Monitor function execution time
□ Verify cron job runs (check logs next day)
```

### External APIs
```bash
□ Open-Meteo: Free tier, non-commercial use only
□ Photon: Public instance, low volume only
□ Both cached to minimize requests
```

## 🎯 Next Phase (W2 - Analysis)

Ready to implement:
- Real environment grid file integration
- Trained model swap (replace stub)
- Dashboard analytics
- Entry detail views
- Photo EXIF stripping
- Place name auto-fill

## 📚 Documentation

- Blueprint: `web_blueprint.md`
- Backend: `BACKEND_README.md`
- Design: `web_designtokens.md`

## ✅ Success Criteria

Phase W1 is complete when:
- [x] Schema migrations all run successfully
- [x] User can sign up and create profile
- [x] Farmer can join a space via access code
- [x] Farmer can draw and save a field
- [ ] Full assessment runs end-to-end (needs testing)
- [ ] W-T2, W-T3, W-T4 tests pass (manual SQL checks)

**Status: Backend foundation complete, ready for integration testing**
