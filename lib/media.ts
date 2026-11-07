/* Media capture utilities (Blueprint F-08)
   Camera access, photo capture, and EXIF stripping */

/**
 * Request camera permission and check availability
 */
export async function requestCamera(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // Prefer rear camera
      audio: false,
    });
    return stream;
  } catch (error) {
    console.error("Camera access denied or unavailable:", error);
    return null;
  }
}

/**
 * Capture photo from video stream
 */
export function capturePhoto(video: HTMLVideoElement): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  
  ctx.drawImage(video, 0, 0);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

/**
 * Strip EXIF metadata and resize image (Blueprint 15)
 * Downsizes to max 1280px and re-encodes as JPEG to remove EXIF
 */
export async function processPhoto(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Calculate new dimensions (max 1280px)
      const MAX_SIZE = 1280;
      let width = img.width;
      let height = img.height;
      
      if (width > height && width > MAX_SIZE) {
        height = (height * MAX_SIZE) / width;
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width = (width * MAX_SIZE) / height;
        height = MAX_SIZE;
      }
      
      // Draw to canvas and re-encode (strips EXIF)
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to encode image"));
            return;
          }
          
          const processed = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          
          resolve(processed);
        },
        "image/jpeg",
        0.85
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
}

/**
 * Select photo from file system
 */
export function selectPhoto(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/jpg,image/png";
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      // Process to strip EXIF
      try {
        const processed = await processPhoto(file);
        resolve(processed);
      } catch (error) {
        console.error("Photo processing failed:", error);
        resolve(null);
      }
    };
    
    input.click();
  });
}

/**
 * Stop camera stream
 */
export function stopCamera(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}
