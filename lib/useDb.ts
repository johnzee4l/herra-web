"use client";

/* Hook for client components that need reactivity
   Use with React's useOptimistic for optimistic updates */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/store";
import type { Entry, Field, Space, Notification, Announcement } from "@/lib/types";

export function useRefresh() {
  const router = useRouter();
  return useCallback(() => {
    router.refresh();
  }, [router]);
}

// Hook for reactive database access
export function useDb() {
  const [data, setData] = useState(db);
  
  useEffect(() => {
    // In a real implementation, this would subscribe to Supabase realtime
    // For now, just return the mock data
    const interval = setInterval(() => {
      setData({ ...db });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return data;
}
