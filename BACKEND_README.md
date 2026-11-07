# Herra Web - Backend Implementation

This document covers the backend implementation according to `web_blueprint.md`.

## Status: Phase W1 Complete ✅

The backend foundation is now implemented with real Supabase integration.

### Completed

**Database (Blueprint Phase W1)**:
- ✅ Complete schema with 15+ tables (profiles, spaces, fields, assessments, etc.)
- ✅ PostGIS geometry validation and triggers
- ✅ RLS policies on every table
- ✅ Access code hashing with HMAC-SHA256
- ✅ Model registry (hi_models, hi_config, hi_datasets)
- ✅ Storage buckets (field-photos, hi-models)
- ✅ Security definer functions (join_space, hi_promote_model, hi_rollback)
- ✅ Audit logging infrastructure

**Server Actions**:
- ✅ Authentication (signup, signin, password reset)
- ✅ Spaces (create, join via access code, manage codes)
- ✅ Fields (create, update, archive with geometry validation)
- ✅ Assessments (run, store, rerun with idempotency)
- ✅ Settings (user preferences, notifications)
- ✅ Admin (model promotion, crop config, announcements)

**Core Services**:
- ✅ Environment profile builder (stub, ready for grid file)
- ✅ Weather forecast (Open-Meteo integration)
- ✅ Geocoding (Photon integration)
- ✅ Rate limiting
- ✅ Photo upload/signed URLs

**Infrastructure**:
- ✅ Middleware for session management
- ✅ Data mappers for Supabase → domain types
- ✅ Daily cron job (cleanup, keep-alive)
- ✅ Vercel deployment config

## Setup Instructions

### 1. Supabase Project Setup

1. Create a free Supabase project at https://supabase.com
2. Go to **Project Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 2. Run Database Migrations

In the Supabase SQL Editor, run migrations in order:

```bash
db/migrations/001_enable_extensions.sql
db/migrations/002_create_profiles.sql
db/migrations/003_create_spaces.sql
db/migrations/004_create_access_codes_and_members.sql
db/migrations/005_create_fields.sql
db/migrations/006_create_assessments.sql
db/migrations/007_create_outcomes_announcements_notifications.sql
db/migrations/008_create_admin_tables.sql
db/migrations/009_create_storage_buckets.sql
db/migrations/010_create_model_registry.sql
db/migrations/011_seed_data.sql
```

### 3. Configure Database Settings

In Supabase Dashboard → **Database > Configuration**, add:

```sql
ALTER DATABASE postgres SET app.access_code_pepper = 'YOUR_RANDOM_PEPPER_HERE';
```

Generate a secure random string for the pepper:
```bash
openssl rand -hex 32
```

### 4. Environment Variables

Create `.env.local`:

```env
# Supabase (from Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Access Code Security (same pepper as database config)
HMAC_PEPPER=your-random-pepper-here

# Cron Job Protection
CRON_SECRET=another-random-secret

# Optional: Override provider URLs
# OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
# PHOTON_BASE_URL=https://photon.komoot.io
```

### 5. Create First Admin

1. Sign up through the app UI (creates a farmer by default)
2. In Supabase SQL Editor, run:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 6. Disable Email Confirmation (Optional for Demo)

For faster testing without email setup:

Supabase Dashboard → **Authentication > Email Templates**
- Uncheck "Enable email confirmations"

For production, set up SMTP in **Authentication > Email**

### 7. Deploy to Vercel

```bash
npm run build  # Test build locally first
vercel deploy
```

Add environment variables in Vercel Dashboard → **Settings > Environment Variables**

The cron job runs daily at 2 AM UTC (configured in `vercel.json`)

## Architecture Overview

```
Browser (Farmer/Admin)
    ↓ (Server Actions)
Next.js Server
    ├─ lib/env → Build profiles from grid + forecast
    ├─ lib/hi → Model inference (stub)
    ├─ lib/geo → Geocoding (Photon)
    └─ Supabase Client
        ↓
Supabase (Postgres + PostGIS + Auth + Storage)
    ├─ Tables with RLS
    ├─ Security Definer functions
    └─ Storage buckets
```

**External APIs**:
- Open-Meteo: Weather forecast (free, non-commercial)
- Photon: Geocoding (free, low volume)

## Testing the Backend

### Test Assessment Flow

1. Sign up and create a space (or join with access code)
2. Create a field with valid geometry
3. Run an assessment from `/farmer/analyze`
4. Check `/farmer/entries` for results
5. Verify in Supabase dashboard: `assessments` table has row

### Test Admin Features

1. Promote yourself to admin (SQL above)
2. Go to `/admin/models` and check the stub model
3. Create an access code for your space
4. View audit log at `/admin/audit`

### Check Data Health

1. Go to `/admin/data-health`
2. Click "Test now" for Open-Meteo and Photon
3. Verify green status indicators

## Next Steps (Phase W2 - Analysis)

**Remaining for full W2**:
- [ ] Real environment grid integration (load `data/grid/grid.bin.gz`)
- [ ] Swap lib/hi stub for real trained model
- [ ] Photo EXIF stripping in browser before upload
- [ ] Place name integration in field creation
- [ ] Dashboard analytics queries
- [ ] Entry detail views with map toggle

**Phase W3 (Admin Console)**:
- [ ] Model Lab UI with promote/rollback
- [ ] Crop catalogue editor
- [ ] Advisory rules editor
- [ ] Analytics dashboards

## Quotas and Limits

**Supabase Free Tier**:
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth/month
- 50,000 monthly active users
- Database pauses after 7 days inactivity (cron prevents this)

**Vercel Hobby**:
- 100 GB bandwidth/month
- 1 cron job (daily at specified hour)
- Serverless functions: 10s execution limit

**Rate Limits (Blueprint 5.2)**:
- 30 assessments per user per hour
- 5 access code attempts per user per minute
- 20 access code attempts per IP per minute

## Security Notes

- RLS enabled on every table (Blueprint requirement)
- Service role key never in client bundles
- Photos: private bucket, signed URLs only
- Access codes: hashed with HMAC-SHA256
- CSRF protection via Next.js server actions
- Geometry validation in database triggers

## Blueprint Compliance

This implementation follows `web_blueprint.md` sections:
- §3: Architecture and stack ✅
- §4: Repository layout ✅
- §5: Data model with RLS ✅
- §6: Authentication and access codes ✅
- §9: Assessment orchestration ✅
- §13: Cron job ✅
- §15: Security and privacy ✅

## Troubleshooting

**"Supabase is not configured"**
- Check `.env.local` has correct URLs and keys
- Restart dev server after changing env vars

**"Access code pepper not configured"**
- Run the ALTER DATABASE command in Supabase SQL Editor
- Verify with: `SHOW app.access_code_pepper;`

**Fields fail geometry validation**
- Check field is at least 0.03 ha (300 m²)
- Check field is within space boundary
- Check polygon has no crossing edges

**Assessment fails immediately**
- Check profile building in server logs
- Verify lib/hi stub is working
- Check hourly quota (max 30/hour)

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript check
```

## Support

See `web_blueprint.md` for full specifications and design decisions.
