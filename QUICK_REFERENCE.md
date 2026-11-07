# 🚀 Quick Reference - Herra Web

## 30-Second Start

```bash
# 1. Setup Supabase (copy URL + keys to .env.local)
# 2. Run 11 migrations in Supabase SQL Editor
# 3. Set access code pepper in database
# 4. Start dev server
npm install && npm run dev
```

## Common Tasks

### Take a Photo
```typescript
import { CameraCapture } from "@/components/camera";

<CameraCapture onCapture={(file) => console.log(file)} />
```

### Set Moisture Level
```typescript
import { MoistureProbe } from "@/components/camera";

<MoistureProbe value={3} onChange={setMoisture} />
```

### Run Assessment
```typescript
import { runAssessment } from "@/app/actions/assessments";

await runAssessment({
  fieldId: "...",
  mode: "recommend",
  moisture: 3,
  photoPath: "...",
  idempotencyKey: crypto.randomUUID(),
});
```

### Create Field
```typescript
import { createField } from "@/app/actions/fields";

await createField({
  name: "My Field",
  spaceId: "...",
  geom: [[lat, lng], ...],
});
```

### Join Space
```typescript
import { joinSpace } from "@/app/actions/spaces";

await joinSpace(formData); // code in formData
```

## File Structure

```
app/
  actions/          ← Server actions (API)
  api/cron/         ← Cron jobs
components/
  camera/           ← Camera, probe, flow
lib/
  actions/          ← (use app/actions instead)
  data/             ← Database queries
  env/              ← Environment services
  geo/              ← Geocoding
  media.ts          ← Camera utilities
  hooks.ts          ← Custom hooks
  supabase/         ← DB clients
db/
  migrations/       ← 001-011.sql
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
HMAC_PEPPER=random-32-byte-hex
CRON_SECRET=random-secret
```

## Database Setup

```sql
-- 1. Run migrations 001-011 in order
-- 2. Set pepper
ALTER DATABASE postgres SET app.access_code_pepper = 'YOUR_PEPPER';

-- 3. Create admin
UPDATE profiles SET role = 'admin' WHERE email = 'you@email.com';
```

## Key Features

✅ Camera capture (front/rear)  
✅ EXIF stripping (security)  
✅ Moisture probe (1-5 slider)  
✅ PostGIS geometry  
✅ Weather forecast (Open-Meteo)  
✅ Access codes (HMAC-SHA256)  
✅ Rate limiting (30/hour)  
✅ RLS on all tables  

## Test Locally

```bash
# 1. Check camera
http://localhost:3000/farmer/analyze

# 2. Check moisture probe
# (appears in analyze flow)

# 3. Run assessment
# Select field → Take photo → Set moisture → Submit

# 4. View results
http://localhost:3000/farmer/entries
```

## Deploy

```bash
npm run build
vercel deploy
# Add env vars in Vercel dashboard
```

## Troubleshooting

**Camera not working?**
- Check HTTPS (required for camera API)
- Check browser permissions
- Try front camera toggle

**Upload failing?**
- Check file size < 5MB
- Check Supabase bucket exists
- Check service role key set

**Geometry validation error?**
- Min 3 points, max 500 ha
- Field must be within space boundary
- No crossing edges

**Assessment quota?**
- Max 30 per hour per user
- Failed assessments don't count
- Check rate_limits table

## Quick Links

- **Backend:** `BACKEND_README.md`
- **Frontend:** `FRONTEND_CLEANUP.md`
- **Integration:** `INTEGRATION_GUIDE.md`
- **Deploy:** `DEPLOYMENT_CHECKLIST.md`
- **Full Report:** `FINAL_REPORT.md`

## Status

✅ **Phase W1 Complete**  
✅ **Production Ready**  
✅ **All Features Working**

Camera ✅ | Probes ✅ | Backend ✅ | Security ✅

**Ready to deploy!** 🚀
