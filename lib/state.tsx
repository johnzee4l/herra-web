"use client";

/* App state - connected to real backend
   Settings sync with Supabase profiles table via server actions */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { normalizeSettings, type Settings, type Space, type User } from "@/lib/types";
import { uid } from "@/lib/utils";
import { updateSettings } from "@/app/actions/settings";

export type Bp = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface ToastItem {
  id: string;
  msg: string;
  icon: string;
  tone: string;
  action?: string;
  onAction?: () => void;
  out: boolean;
}

export type OverlayKind = "sheet" | "dialog";

export interface OverlayItem {
  id: string;
  kind: OverlayKind;
  title?: string;
  drawer?: boolean;
  wide?: boolean;
  closing: boolean;
  render: (close: () => void) => ReactNode;
}

interface AppState {
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  user: User;
  readonly: boolean;
  space: Space | null;
  spaceId: string | null;
  setSpaceId: (id: string) => void;
  bp: Bp;
  setBp: (bp: Bp) => void;
  reduced: boolean;
  toasts: ToastItem[];
  toast: (msg: string, o?: Partial<Omit<ToastItem, "id" | "msg" | "out">> & { dur?: number }) => void;
  dismissToast: (id: string) => void;
  overlays: OverlayItem[];
  openSheet: (o: Omit<OverlayItem, "id" | "kind" | "closing">) => string;
  openDialog: (o: Omit<OverlayItem, "id" | "kind" | "closing">) => string;
  closeOverlay: (id?: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({
  children,
  user,
  space,
  spaces,
  readonly = false,
}: {
  children: ReactNode;
  user: User;
  space: Space | null;
  spaces: Space[];
  readonly?: boolean;
}) {
  const [settings, setSettingsState] = useState<Settings>(() => normalizeSettings(user.settings));
  const [spaceId, setSpaceId] = useState<string | null>(space?.id ?? null);
  const [bp, setBp] = useState<Bp>("xs");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [osReduced, setOsReduced] = useState(false);

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setOsReduced(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((s) => normalizeSettings({ ...s, ...patch }));
    if (patch.theme) {
      try {
        localStorage.setItem("herra-theme", patch.theme);
        document.cookie = `herra-theme=${patch.theme}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        /* storage can be unavailable in private browsing */
      }
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((list) => list.map((x) => (x.id === id ? { ...x, out: true } : x)));
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 260);
  }, []);

  const toast = useCallback<AppState["toast"]>(
    (msg, o = {}) => {
      const id = uid("t");
      setToasts((list) => [
        ...list,
        {
          id,
          msg,
          icon: o.icon || "CheckCircle",
          tone: o.tone || "growth",
          action: o.action,
          onAction: o.onAction,
          out: false,
        },
      ]);
      setTimeout(() => dismissToast(id), o.dur || 3200);
    },
    [dismissToast]
  );

  /* Persist settings after the user changes them. The first render is the
     value already loaded from the profile, so it must not be written back. */
  const settingsMounted = useRef(false);
  useEffect(() => {
    if (!settingsMounted.current) {
      settingsMounted.current = true;
      return;
    }
    if (!user.id) return;
    const tm = setTimeout(() => {
      void updateSettings(settings).then((res) => {
        if (res && "error" in res) console.error("Could not save settings:", res.error);
      });
    }, 450);
    return () => clearTimeout(tm);
  }, [settings, user.id]);

  const pushOverlay = useCallback(
    (kind: OverlayKind, o: Omit<OverlayItem, "id" | "kind" | "closing">) => {
      const id = uid("ov");
      setOverlays((list) => [...list, { ...o, id, kind, closing: false }]);
      return id;
    },
    []
  );

  const openSheet = useCallback<AppState["openSheet"]>(
    (o) => pushOverlay("sheet", o),
    [pushOverlay]
  );
  const openDialog = useCallback<AppState["openDialog"]>(
    (o) => pushOverlay("dialog", o),
    [pushOverlay]
  );

  const closeOverlay = useCallback((id?: string) => {
    setOverlays((list) => {
      const target = id ? list.find((x) => x.id === id) : list[list.length - 1];
      if (!target || target.closing) return list;
      return list.map((x) => (x.id === target.id ? { ...x, closing: true } : x));
    });
    setTimeout(() => {
      setOverlays((list) => {
        const target = id ? list.find((x) => x.id === id) : list[list.length - 1];
        return target ? list.filter((x) => x.id !== target.id) : list;
      });
    }, 240);
  }, []);

  // Escape closes the top overlay
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [closeOverlay]);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === spaceId) ?? space,
    [spaces, spaceId, space]
  );

  const value: AppState = {
    settings,
    setSettings,
    user,
    readonly,
    space: activeSpace,
    spaceId,
    setSpaceId,
    bp,
    setBp,
    reduced: settings.motion === "reduced" || osReduced,
    toasts,
    toast,
    dismissToast,
    overlays,
    openSheet,
    openDialog,
    closeOverlay,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
