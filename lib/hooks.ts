"use client";

/* Custom hooks for common operations */

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { useApp } from "@/lib/state";

/**
 * Hook for form submissions with loading state and error handling
 */
export function useServerAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options?: {
    onSuccess?: (result: any) => void;
    onError?: (error: string) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useApp();
  const router = useRouter();

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setError(null);
      
      startTransition(async () => {
        try {
          const result = await action(...args);
          
          if (result?.error) {
            const errorMsg = options?.errorMessage || result.error;
            setError(errorMsg);
            toast(errorMsg, { icon: "XCircle", tone: "risk" });
            options?.onError?.(errorMsg);
          } else {
            if (options?.successMessage) {
              toast(options.successMessage, { icon: "CheckCircle", tone: "growth" });
            }
            options?.onSuccess?.(result);
            router.refresh();
          }
        } catch (err) {
          const errorMsg = options?.errorMessage || "An error occurred";
          setError(errorMsg);
          toast(errorMsg, { icon: "XCircle", tone: "risk" });
          options?.onError?.(errorMsg);
        }
      });
    },
    [action, options, toast, router]
  );

  return { execute, isPending, error };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<T>(initialData: T) {
  const [optimisticData, setOptimisticData] = useState<T>(initialData);
  const [isPending, startTransition] = useTransition();

  const updateOptimistic = useCallback(
    (updater: (data: T) => T, action: () => Promise<any>) => {
      startTransition(async () => {
        setOptimisticData(updater);
        try {
          await action();
        } catch (err) {
          // Revert on error
          setOptimisticData(initialData);
        }
      });
    },
    [initialData]
  );

  return { data: optimisticData, updateOptimistic, isPending };
}

/**
 * Hook for file upload with progress
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, uploadFn: (file: File) => Promise<any>) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress for small files
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 100);

      const result = await uploadFn(file);
      
      clearInterval(interval);
      setProgress(100);

      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      return { success: true, ...result };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, progress, error };
}

/**
 * Hook for camera access with error handling
 */
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const start = useCallback(async (facingMode: "user" | "environment" = "environment") => {
    setError(null);
    setIsActive(true);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });

      setStream(newStream);
      return newStream;
    } catch (err) {
      const errorMsg = "Camera access denied. Please enable camera permissions.";
      setError(errorMsg);
      setIsActive(false);
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsActive(false);
  }, [stream]);

  return { stream, start, stop, error, isActive };
}

/**
 * Hook for form validation
 */
export function useFormValidation<T extends Record<string, any>>(
  schema: any // Zod schema
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = useCallback(
    (data: T) => {
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof T, string>> = {};
        result.error.errors.forEach((err: any) => {
          const field = err.path[0] as keyof T;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        return false;
      }

      setErrors({});
      return true;
    },
    [schema]
  );

  const clearErrors = useCallback(() => setErrors({}), []);

  return { errors, validate, clearErrors };
}
