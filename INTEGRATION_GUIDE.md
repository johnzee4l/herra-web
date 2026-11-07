# Complete Integration Guide - Camera, Probes & Backend

## 🎯 Quick Start Examples

### 1. Basic Camera Capture

```typescript
"use client";

import { CameraCapture } from "@/components/camera";
import { useState } from "react";

export function SimpleCameraExample() {
  const [photo, setPhoto] = useState<File | null>(null);

  function handleCapture(file: File) {
    setPhoto(file);
    console.log("Photo captured:", file.name, file.size);
  }

  return (
    <div>
      {!photo ? (
        <CameraCapture onCapture={handleCapture} />
      ) : (
        <div>
          <p>Photo captured: {photo.name}</p>
          <button onClick={() => setPhoto(null)}>Retake</button>
        </div>
      )}
    </div>
  );
}
```

### 2. Moisture Probe

```typescript
"use client";

import { MoistureProbe } from "@/components/camera";
import { useState } from "react";

export function MoistureExample() {
  const [moisture, setMoisture] = useState(3);

  return (
    <div>
      <MoistureProbe value={moisture} onChange={setMoisture} />
      <p>Current moisture level: {moisture}</p>
    </div>
  );
}
```

### 3. Complete Assessment Flow

```typescript
"use client";

import { AssessmentFlow } from "@/components/camera";

export default function AssessPage({ 
  params 
}: { 
  params: { fieldId: string } 
}) {
  // This would come from server component
  const field = await getFieldById(params.fieldId);
  const user = await getCurrentUser();

  return (
    <AssessmentFlow
      field={field}
      userId={user.id}
      mode="recommend"
    />
  );
}
```

### 4. Using Server Actions

```typescript
"use client";

import { useServerAction } from "@/lib/hooks";
import { createField } from "@/app/actions/fields";

export function CreateFieldForm() {
  const { execute, isPending, error } = useServerAction(createField, {
    successMessage: "Field created!",
    onSuccess: () => router.push("/farmer/fields"),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    await execute({
      name: formData.get("name") as string,
      spaceId: formData.get("spaceId") as string,
      geom: JSON.parse(formData.get("geom") as string),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      {error && <p className="error">{error}</p>}
      <button disabled={isPending}>
        {isPending ? "Creating..." : "Create Field"}
      </button>
    </form>
  );
}
```

### 5. Camera Hook Usage

```typescript
"use client";

import { useCamera } from "@/lib/hooks";
import { useRef, useEffect } from "react";

export function CustomCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, start, stop, error, isActive } = useCamera();

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  async function handleStart() {
    await start("environment"); // or "user" for front camera
  }

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline />
      {error && <p>{error}</p>}
      <button onClick={handleStart} disabled={isActive}>
        Start Camera
      </button>
      <button onClick={stop} disabled={!isActive}>
        Stop Camera
      </button>
    </div>
  );
}
```

## 📦 Available Components

### Camera Components
```typescript
import { 
  CameraCapture,      // Full camera UI with capture/gallery
  MoistureProbe,      // 5-level moisture slider
  PhotoPreview,       // Photo preview with upload
  AssessmentFlow      // Complete assessment wizard
} from "@/components/camera";
```

### Custom Hooks
```typescript
import {
  useServerAction,       // Server action with loading/error states
  useOptimisticUpdate,   // Optimistic UI updates
  useFileUpload,         // File upload with progress
  useCamera,             // Camera access management
  useFormValidation      // Zod form validation
} from "@/lib/hooks";
```

### Media Utilities
```typescript
import {
  requestCamera,     // Get camera stream
  capturePhoto,      // Capture from video element
  stopCamera,        // Stop camera stream
  processPhoto,      // Strip EXIF + resize
  selectPhoto        // File picker with processing
} from "@/lib/media";
```

### Server Actions
```typescript
// Authentication
import { signUp, signIn, signOut, getCurrentUser } from "@/app/actions/auth";

// Fields
import { createField, updateField, archiveField } from "@/app/actions/fields";

// Assessments
import { 
  runAssessment, 
  deleteAssessment,
  uploadFieldPhoto,
  getPhotoUrl 
} from "@/app/actions/assessments";

// Spaces
import { joinSpace, createSpace, createAccessCode } from "@/app/actions/spaces";

// Settings
import { updateSettings, updateProfile } from "@/app/actions/settings";

// Admin
import { 
  promoteModel, 
  rollbackModel,
  updateCropConfig,
  createAnnouncement 
} from "@/app/actions/admin";

// Outcomes
import { submitOutcome, reviewOutcome } from "@/app/actions/outcomes";
```

## 🎨 Styling Examples

### Camera Styles
```css
.camera-capture {
  position: fixed;
  inset: 0;
  background: black;
  display: flex;
  flex-direction: column;
}

.camera-preview {
  flex: 1;
  width: 100%;
  object-fit: cover;
}

.camera-controls {
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
}

.capture-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 4px solid white;
  background: white;
}
```

### Moisture Probe Styles
```css
.moisture-probe {
  padding: 1rem;
  background: var(--surface-2);
  border-radius: var(--radius-lg);
}

.probe-slider input[type="range"] {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  appearance: none;
}

.probe-markers {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.probe-markers button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid;
  background: transparent;
  transition: all 0.2s;
}

.probe-markers button.active {
  transform: scale(1.2);
}
```

## 🔄 Data Flow Patterns

### Pattern 1: Server Component → Client Component
```typescript
// app/farmer/fields/page.tsx (Server Component)
import { getMyFields } from "@/lib/data/queries";
import { getCurrentUser } from "@/app/actions/auth";
import { FieldList } from "@/components/FieldList";

export default async function FieldsPage() {
  const user = await getCurrentUser();
  const fields = await getMyFields(user.id);
  
  return <FieldList fields={fields} userId={user.id} />;
}

// components/FieldList.tsx (Client Component)
"use client";

export function FieldList({ fields, userId }) {
  return (
    <div>
      {fields.map(field => (
        <FieldCard key={field.id} field={field} />
      ))}
    </div>
  );
}
```

### Pattern 2: Optimistic Updates
```typescript
"use client";

import { useOptimisticUpdate } from "@/lib/hooks";
import { archiveField } from "@/app/actions/fields";

export function FieldCard({ field }) {
  const { data, updateOptimistic, isPending } = useOptimisticUpdate(field);

  function handleArchive() {
    updateOptimistic(
      (f) => ({ ...f, archived: true }),
      () => archiveField(field.id)
    );
  }

  if (data.archived) return null;

  return (
    <div>
      <h3>{data.name}</h3>
      <button onClick={handleArchive} disabled={isPending}>
        Archive
      </button>
    </div>
  );
}
```

### Pattern 3: Form with Validation
```typescript
"use client";

import { useServerAction, useFormValidation } from "@/lib/hooks";
import { createField } from "@/app/actions/fields";
import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().min(1, "Name is required"),
  spaceId: z.string().uuid(),
  geom: z.array(z.tuple([z.number(), z.number()])).min(3),
});

export function FieldForm() {
  const { errors, validate } = useFormValidation(fieldSchema);
  const { execute, isPending } = useServerAction(createField);

  async function handleSubmit(formData: FormData) {
    const data = {
      name: formData.get("name"),
      spaceId: formData.get("spaceId"),
      geom: JSON.parse(formData.get("geom") as string),
    };

    if (validate(data)) {
      await execute(data);
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      {errors.name && <span>{errors.name}</span>}
      
      <button disabled={isPending}>Submit</button>
    </form>
  );
}
```

## 🧪 Testing Examples

### Test Camera Capture
```typescript
// Test in browser console
import { requestCamera, capturePhoto } from "@/lib/media";

const stream = await requestCamera();
const video = document.querySelector("video");
video.srcObject = stream;

// After preview shows
const photo = await capturePhoto(video);
console.log("Photo blob:", photo);
```

### Test Photo Processing
```typescript
import { processPhoto } from "@/lib/media";

const input = document.createElement("input");
input.type = "file";
input.accept = "image/*";

input.onchange = async (e) => {
  const file = e.target.files[0];
  console.log("Original:", file.size);
  
  const processed = await processPhoto(file);
  console.log("Processed:", processed.size);
  console.log("EXIF stripped:", processed.size < file.size);
};

input.click();
```

### Test Assessment Flow
```typescript
import { runAssessment } from "@/app/actions/assessments";

const result = await runAssessment({
  fieldId: "your-field-id",
  mode: "recommend",
  moisture: 3,
  photoPath: "userId/photo.jpg",
  idempotencyKey: crypto.randomUUID(),
});

console.log("Assessment result:", result);
```

## 🐛 Troubleshooting

### Camera not working
```typescript
// Check permissions
navigator.permissions.query({ name: 'camera' })
  .then(result => console.log('Camera permission:', result.state));

// Check available devices
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    console.log('Cameras:', devices.filter(d => d.kind === 'videoinput'));
  });
```

### Photo upload failing
```typescript
// Check file size (max 5MB)
if (file.size > 5 * 1024 * 1024) {
  console.error("File too large:", file.size);
}

// Check file type
if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
  console.error("Invalid file type:", file.type);
}
```

### Assessment quota exceeded
```sql
-- Check current usage
SELECT COUNT(*) 
FROM assessments 
WHERE user_id = 'your-user-id' 
  AND created_at > now() - INTERVAL '1 hour'
  AND status != 'failed';

-- Should be < 30
```

## 📱 Mobile Considerations

### iOS Safari
```typescript
// Must have playsinline attribute
<video autoPlay playsInline muted />

// Must be triggered by user action
<button onClick={async () => {
  const stream = await requestCamera();
  // Will work because it's in click handler
}}>Start Camera</button>
```

### Android Chrome
```typescript
// Prefer environment camera (rear)
{ video: { facingMode: "environment" } }

// Handle orientation changes
window.addEventListener('orientationchange', () => {
  // Restart camera if needed
});
```

## 🎉 Complete Example App

See `components/camera/AssessmentFlow.tsx` for a complete working example that integrates:
- ✅ Camera capture
- ✅ Photo upload
- ✅ Moisture probe
- ✅ Form validation
- ✅ Server actions
- ✅ Loading states
- ✅ Error handling
- ✅ Navigation

**Everything is ready to use!** 🚀
