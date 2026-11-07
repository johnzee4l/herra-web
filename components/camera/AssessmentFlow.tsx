"use client";

/* Complete assessment flow example
   Shows how to use camera, moisture probe, and submit assessment */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CameraCapture, MoistureProbe, PhotoPreview } from "@/components/camera";
import { runAssessment } from "@/app/actions/assessments";
import { useServerAction } from "@/lib/hooks";
import { CROPS, CROP_IDS } from "@/lib/spec/crops";
import type { Field } from "@/lib/types";

interface AssessmentFlowProps {
  field: Field;
  userId: string;
  mode: "recommend" | "checkup";
}

export function AssessmentFlow({ field, userId, mode }: AssessmentFlowProps) {
  const router = useRouter();
  
  // Step state
  const [step, setStep] = useState<"camera" | "preview" | "details" | "processing">("camera");
  
  // Form state
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [moisture, setMoisture] = useState(3);
  const [currentCrop, setCurrentCrop] = useState("");

  // Server action
  const { execute, isPending } = useServerAction(runAssessment, {
    successMessage: "Assessment complete!",
    onSuccess: (result) => {
      if (result.assessmentId) {
        router.push(`/farmer/entries/${result.assessmentId}`);
      }
    },
  });

  function handlePhotoCapture(file: File) {
    setCapturedFile(file);
    setStep("preview");
  }

  function handlePhotoUploaded(path: string) {
    setPhotoPath(path);
    setStep("details");
  }

  function handleRetake() {
    setCapturedFile(null);
    setPhotoPath(null);
    setStep("camera");
  }

  async function handleSubmit() {
    if (!photoPath) return;

    setStep("processing");

    await execute({
      fieldId: field.id,
      mode,
      moisture,
      currentCrop: mode === "checkup" ? currentCrop : undefined,
      photoPath,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  // Step 1: Camera capture
  if (step === "camera") {
    return (
      <div className="assessment-flow">
        <div className="flow-header">
          <h2>Take a photo of your field</h2>
          <p>{field.name}</p>
        </div>

        <CameraCapture
          onCapture={handlePhotoCapture}
          onCancel={() => router.back()}
        />
      </div>
    );
  }

  // Step 2: Photo preview and upload
  if (step === "preview" && capturedFile) {
    return (
      <div className="assessment-flow">
        <div className="flow-header">
          <h2>Review your photo</h2>
        </div>

        <PhotoPreview
          file={capturedFile}
          userId={userId}
          onUploaded={handlePhotoUploaded}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  // Step 3: Additional details (moisture, etc.)
  if (step === "details") {
    return (
      <div className="assessment-flow">
        <div className="flow-header">
          <h2>Field details</h2>
          <p>{field.name}</p>
        </div>

        <div className="flow-content">
          {/* Moisture probe */}
          <MoistureProbe value={moisture} onChange={setMoisture} />

          {/* Current crop (check-up mode only) */}
          {mode === "checkup" && (
            <div className="form-field">
              <label htmlFor="currentCrop">Current crop</label>
              <select
                id="currentCrop"
                value={currentCrop}
                onChange={(e) => setCurrentCrop(e.target.value)}
                required
              >
                <option value="">Select crop</option>
                {CROP_IDS.map((id) => (
                  <option key={id} value={id}>
                    {CROPS[id].name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Field info display */}
          <div className="field-info">
            <div className="info-row">
              <span>Area:</span>
              <span>{field.area.toFixed(2)} ha</span>
            </div>
            <div className="info-row">
              <span>Location:</span>
              <span>{field.place.municipality || "Unknown"}</span>
            </div>
          </div>
        </div>

        <div className="flow-actions">
          <button onClick={handleRetake} type="button" disabled={isPending}>
            Change Photo
          </button>
          
          <button
            onClick={handleSubmit}
            type="button"
            disabled={isPending || (mode === "checkup" && !currentCrop)}
            className="primary"
          >
            {isPending ? "Processing..." : "Run Assessment"}
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Processing
  if (step === "processing") {
    return (
      <div className="assessment-flow processing">
        <div className="processing-animation">
          <div className="spinner" />
          <h2>Analyzing your field...</h2>
          <p>Building environmental profile</p>
          <p>Fetching weather forecast</p>
          <p>Running suitability model</p>
        </div>
      </div>
    );
  }

  return null;
}
