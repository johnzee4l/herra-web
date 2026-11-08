"use client";

/* App root. Replaces the mockup's Stage component: the app fills the
   viewport, no device frame (section 0.1). Breakpoints respond to the app
   root width via ResizeObserver, never viewport media queries (R8). */

import { useEffect, useRef, type ReactNode } from "react";
import { useApp, type Bp } from "@/lib/state";
import { cx } from "@/lib/utils";
import { Toasts, Overlays } from "@/components/ui/overlays";

const BP_TABLE: [Bp, number][] = [
  ["2xl", 1600],
  ["xl", 1280],
  ["lg", 1024],
  ["md", 768],
  ["sm", 480],
];

function bpClasses(w: number) {
  const hit = BP_TABLE.filter(([, min]) => w >= min).map(([n]) => `bp-${n}`);
  const bp: Bp = (BP_TABLE.find(([, min]) => w >= min)?.[0] ?? "xs") as Bp;
  return { cls: hit.join(" "), bp };
}

export function AppRoot({ children }: { children: ReactNode }) {
  const { settings, setSettings, setBp, bp } = useApp();
  const ref = useRef<HTMLDivElement | null>(null);

  // Breakpoints from the app root width.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { bp: next } = bpClasses(el.clientWidth);
      setBp(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setBp]);

  // Theme + glow on the document element (section 16.2).
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = settings.theme === "system" ? (mq.matches ? "dark" : "light") : settings.theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.setProperty(
        "--glow",
        "color-mix(in oklab, var(--primary) 14%, transparent)"
      );
    };
    apply();
    if (settings.theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  /* A locally saved choice is the most recent one. Do not let a stale profile
     row overwrite it on the first client render. */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("herra-theme");
      if ((stored === "dark" || stored === "light" || stored === "system") && stored !== settings.theme) {
        setSettings({ theme: stored });
      }
    } catch {
      /* storage can be unavailable in private browsing */
    }
    // Intentionally only on mount: later changes flow through setSettings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phone-width safe areas.
  useEffect(() => {
    const f = () => document.body.classList.toggle("mobile-real", innerWidth < 720);
    f();
    addEventListener("resize", f);
    return () => removeEventListener("resize", f);
  }, []);

  // Reduced motion class on the app root (section 9.4).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const f = () =>
      el.classList.toggle("reduce-motion", mq.matches || settings.motion === "reduced");
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [settings.motion]);

  const { cls } = bpClasses(
    typeof window === "undefined" ? 390 : ref.current?.clientWidth ?? 390
  );

  return (
    <div ref={ref} className={cx("app app-root", cls)} data-bp={bp}>
      {children}
      <Toasts />
      <Overlays />
    </div>
  );
}
