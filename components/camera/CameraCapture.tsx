"use client";

/* Camera capture component (Blueprint F-08)
   Handles camera access, live preview, and photo capture with EXIF stripping */

import { useEffect, useRef, useState } from "react";
import { requestCamera, capturePhoto, stopCamera, selectPhoto } from "@/lib/media";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel?: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stopCamera(stream);
    };
  }, [facingMode]);

  async function startCamera() {
    setError(null);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
      
      setStream(newStream);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access denied. Please enable camera permissions.");
    }
  }

  async function handleCapture() {
    if (!videoRef.current || !stream) return;

    try {
      const blob = await capturePhoto(videoRef.current);
      if (!blob) {
        setError("Failed to capture photo");
        return;
      }

      const file = new File([blob], `photo_${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      stopCamera(stream);
      setStream(null);
      onCapture(file);
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture photo");
    }
  }

  function toggleCamera() {
    if (stream) stopCamera(stream);
    setFacingMode((mode) => (mode === "user" ? "environment" : "user"));
  }

  async function handleGallery() {
    if (stream) {
      stopCamera(stream);
      setStream(null);
    }

    const file = await selectPhoto();
    if (file) {
      onCapture(file);
    }
  }

  function handleCancel() {
    if (stream) stopCamera(stream);
    setStream(null);
    onCancel?.();
  }

  if (error) {
    return (
      <div className="camera-error">
        <p>{error}</p>
        <button onClick={handleGallery}>Select from Gallery</button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
    );
  }

  return (
    <div className="camera-capture">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-preview"
      />
      
      <div className="camera-controls">
        <button onClick={handleGallery} type="button">
          Gallery
        </button>
        
        <button onClick={handleCapture} type="button" className="capture-btn">
          Capture
        </button>
        
        <button onClick={toggleCamera} type="button">
          {facingMode === "environment" ? "Front" : "Rear"}
        </button>
      </div>
      
      <button onClick={handleCancel} type="button" className="cancel-btn">
        Cancel
      </button>
    </div>
  );
}
