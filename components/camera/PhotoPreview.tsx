"use client";

/* Photo preview and upload component
   Displays captured photo with upload progress */

import { useState } from "react";
import { uploadFieldPhoto, getPhotoUrl } from "@/app/actions/assessments";
import { processPhoto } from "@/lib/media";

interface PhotoPreviewProps {
  file: File;
  userId: string;
  onUploaded: (path: string) => void;
  onRetake?: () => void;
}

export function PhotoPreview({ file, userId, onUploaded, onRetake }: PhotoPreviewProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview] = useState(() => URL.createObjectURL(file));

  async function handleUpload() {
    setUploading(true);
    setError(null);

    try {
      // Process photo (strip EXIF, resize)
      const processed = await processPhoto(file);
      
      // Upload to Supabase Storage
      const result = await uploadFieldPhoto(processed, userId);
      
      if (result.error) {
        setError(result.error);
      } else if (result.path) {
        onUploaded(result.path);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="photo-preview">
      <img src={preview} alt="Captured photo" className="preview-image" />
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="photo-actions">
        {onRetake && (
          <button onClick={onRetake} disabled={uploading} type="button">
            Retake
          </button>
        )}
        
        <button onClick={handleUpload} disabled={uploading} type="button">
          {uploading ? "Uploading..." : "Use Photo"}
        </button>
      </div>
      
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
          <p>Processing and uploading photo...</p>
        </div>
      )}
    </div>
  );
}
