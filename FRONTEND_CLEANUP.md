# Frontend Cleanup - Real Backend Integration

**Status:** Frontend cleaned and connected to real Supabase backend

## What Was Removed

### 1. Fixture Data (`lib/fixtures.ts`)
- ❌ Removed: All hardcoded users, spaces, fields, entries
- ✅ Now: Geometry utilities only (polyThumb, calculateArea, calculateCentroid)

### 2. In-Memory Store (`lib/store.ts`)
- ❌ Removed: Client-side mutable store
- ✅ Now: All data from Supabase via server components and actions

### 3. App State (`lib/state.tsx`)
- ❌ Removed: localStorage persistence for settings
- ✅ Now: Settings loaded from user profile, persisted via server actions

## How to Use Real Data

### Server Components (Read Data)

```typescript
import { getMyFields, getMySpaces, getMyEntries } from "@/lib/data/queries";
import { getCurrentUser } from "@/app/actions/auth";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  
  const fields = await getMyFields(user.id);
  const spaces = await getMySpaces(user.id);
  const entries = await getMyEntries(user.id);
  
  return <div>...</div>;
}
```

### Server Actions (Mutations)

```typescript
"use client";

import { createField } from "@/app/actions/fields";
import { useRouter } from "next/navigation";

export function FieldForm() {
  const router = useRouter();
  
  async function handleSubmit(formData: FormData) {
    const result = await createField({
      name: formData.get("name") as string,
      spaceId: formData.get("spaceId") as string,
      geom: JSON.parse(formData.get("geom") as string),
    });
    
    if (result.error) {
      alert(result.error);
    } else {
      router.push("/farmer/fields");
      router.refresh(); // Reload data
    }
  }
  
  return <form action={handleSubmit}>...</form>;
}
```

### Camera Capture

```typescript
"use client";

import { requestCamera, capturePhoto, stopCamera, processPhoto } from "@/lib/media";
import { uploadFieldPhoto } from "@/app/actions/assessments";

export function CameraCapture() {
  async function handleCapture() {
    // Request camera
    const stream = await requestCamera();
    if (!stream) return alert("Camera not available");
    
    // Show preview in video element
    const video = document.querySelector("video");
    video.srcObject = stream;
    await video.play();
    
    // Capture photo
    const blob = await capturePhoto(video);
    stopCamera(stream);
    
    // Process (strips EXIF, resizes to 1280px max)
    const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
    const processed = await processPhoto(file);
    
    // Upload
    const { path, error } = await uploadFieldPhoto(processed, userId);
    if (error) alert(error);
    else console.log("Uploaded:", path);
  }
  
  return <button onClick={handleCapture}>Take Photo</button>;
}
```

### Assessment Flow

```typescript
"use client";

import { runAssessment } from "@/app/actions/assessments";

export function AssessForm({ field }) {
  async function handleSubmit(formData: FormData) {
    const result = await runAssessment({
      fieldId: field.id,
      mode: "recommend",
      moisture: 3,
      photoPath: formData.get("photoPath"),
      idempotencyKey: crypto.randomUUID(),
    });
    
    if (result.error) {
      alert(result.error);
    } else {
      // Navigate to results
      router.push(`/farmer/entries/${result.assessmentId}`);
    }
  }
  
  return <form action={handleSubmit}>...</form>;
}
```

## Available Server Actions

### Authentication
- `signUp(formData)` - Create account
- `signIn(formData)` - Login
- `signOut()` - Logout
- `resetPassword(formData)` - Send reset email
- `getCurrentUser()` - Get profile with settings

### Spaces
- `joinSpace(formData)` - Join via access code
- `createSpace(data)` - Admin: create space
- `createAccessCode(spaceId, options)` - Generate code
- `revokeAccessCode(codeId)` - Invalidate code

### Fields
- `createField(data)` - Create with geometry
- `updateField(fieldId, data)` - Update properties
- `archiveField(fieldId)` - Soft delete
- `unarchiveField(fieldId)` - Restore

### Assessments
- `runAssessment(data)` - Full orchestration
- `deleteAssessment(id)` - Soft delete
- `rerunAssessment(originalId)` - Create new assessment
- `uploadFieldPhoto(file, userId)` - Upload photo
- `getPhotoUrl(path)` - Get signed URL

### Settings
- `updateSettings(updates)` - Save preferences
- `updateProfile(updates)` - Update profile
- `markNotificationRead(id)` - Mark notification
- `markAllNotificationsRead()` - Mark all

### Admin
- `promoteModel(modelId, reason)` - Promote model
- `rollbackModel(reason)` - Rollback model
- `updateCropConfig(cropId, updates)` - Edit crop
- `updateHealthWeights(weights)` - Edit weights
- `createAnnouncement(spaceId, title, body)` - Broadcast

### Outcomes (P2)
- `submitOutcome(data)` - Log crop result
- `reviewOutcome(outcomeId, status)` - Admin review

## Data Query Functions

All in `lib/data/queries.ts`:

```typescript
// Users
getUsers()
getUserById(id)

// Spaces
getSpaces()
getSpaceById(id)
getMySpaces(userId)

// Fields
getFields()
getMyFields(userId, spaceId?)
getFieldById(id)

// Assessments
getEntries()
getMyEntries(userId)
getEntryById(id)
getEntriesOfField(fieldId)
getLatestByField(fieldId)

// Membership
getMembers()
getMembersOf(spaceId)

// Notifications
getNotifications(userId)
getUnreadCount(userId)

// Announcements
getAnnouncements(spaceId)
```

## Media Utilities

```typescript
import { 
  requestCamera,     // Request camera permission
  capturePhoto,      // Capture from video stream
  stopCamera,        // Stop camera stream
  processPhoto,      // Strip EXIF and resize
  selectPhoto        // File picker
} from "@/lib/media";
```

## Geometry Utilities

```typescript
import { 
  polyThumb,          // Generate SVG thumbnail
  calculateArea,      // Calculate hectares
  calculateCentroid   // Calculate center point
} from "@/lib/fixtures";
```

## Real-Time Updates

Server actions automatically revalidate affected paths:

```typescript
// In server action
await supabase.from("fields").insert(data);
revalidatePath("/farmer/fields"); // Triggers re-render
```

Client components refresh via router:

```typescript
"use client";
import { useRouter } from "next/navigation";

const router = useRouter();
router.refresh(); // Force reload server data
```

## Optimistic Updates

Use React's `useOptimistic` for instant UI feedback:

```typescript
"use client";
import { useOptimistic } from "react";
import { deleteAssessment } from "@/app/actions/assessments";

export function EntryCard({ entry }) {
  const [optimisticEntry, setOptimistic] = useOptimistic(entry);
  
  async function handleDelete() {
    setOptimistic({ ...entry, deleted: true });
    await deleteAssessment(entry.id);
  }
  
  if (optimisticEntry.deleted) return null;
  
  return <div>...</div>;
}
```

## Error Handling

All server actions return `{ success, error }`:

```typescript
const result = await createField(data);

if (result.error) {
  // Show error to user
  toast(result.error, { icon: "XCircle", tone: "risk" });
} else {
  // Success
  toast("Field created", { icon: "CheckCircle", tone: "growth" });
  router.push("/farmer/fields");
}
```

## Testing the Cleanup

### 1. Check No Fixture Imports
```bash
# Should find no imports from lib/fixtures except geometry utils
grep -r "from '@/lib/fixtures'" app/ components/
```

### 2. Check No Store Usage
```bash
# Should find no imports from lib/store
grep -r "from '@/lib/store'" app/ components/
```

### 3. Verify Data Flow
- Sign up → Profile created in database
- Create field → PostGIS validation in database
- Run assessment → Stored in assessments table
- View entries → Read from database via queries

## Migration Checklist

If any component still uses old patterns:

- [ ] Replace `import { FIELDS } from "@/lib/fixtures"` with server component query
- [ ] Replace `db.entries` with `getMyEntries(userId)`
- [ ] Replace `emit()` with `router.refresh()`
- [ ] Replace `useDb()` with server component data prop
- [ ] Replace client-side state with server actions

## Production Readiness

### Completed
✅ All placeholder data removed
✅ Real Supabase integration
✅ Server actions for all mutations
✅ Server components for reads
✅ Camera and media capture
✅ EXIF stripping (Blueprint 15)
✅ Rate limiting (Blueprint 5.2)
✅ Photo upload with signed URLs
✅ Geometry validation in database
✅ Access code hashing (HMAC-SHA256)

### Ready for Testing
- Authentication flow
- Space creation and joining
- Field drawing with geometry validation
- Assessment orchestration
- Photo capture and upload
- Settings persistence
- Notifications

**The frontend is now fully connected to the real backend!**
