"use client";

/* Primitives, ported from the mockup runtime (tokens 16.1).
   Markup, class names, inline styles, delays and copy are kept as written. */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Ic, type IconWeight } from "@/components/ui/Ic";
import { clamp, cx, fnum, sum } from "@/lib/utils";
import { useApp } from "@/lib/state";
import { MOIST, MOIST_DESC } from "@/lib/codes";
import { t } from "@/lib/i18n/en";

/* ---------- haptics ---------- */

export function haptic(k: "tick" | "ok" | "other" = "tick") {
  try {
    navigator.vibrate?.(k === "tick" ? 8 : k === "ok" ? [10, 40, 16] : 20);
  } catch {
    /* vibration unsupported */
  }
}

/* ---------- hooks ---------- */

export function useReduced() {
  return useApp().reduced;
}

export function useCount(target: number, init?: number, dur = 620) {
  const reduced = useReduced();
  const [n, setN] = useState(init ?? target);
  const prev = useRef(init ?? target);

  useEffect(() => {
    if (reduced) {
      setN(target);
      prev.current = target;
      return;
    }
    const from = prev.current;
    const to = target;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * e;
      prev.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, reduced]);

  return n;
}

const loadedKeys = new Set<string>();

export function useLoad(key: string, ms = 520) {
  const reduced = useReduced();
  const first = !loadedKeys.has(key);
  const [l, setL] = useState(first && !reduced);

  useEffect(() => {
    if (!l) {
      loadedKeys.add(key);
      return;
    }
    const tm = setTimeout(() => {
      loadedKeys.add(key);
      setL(false);
    }, ms);
    return () => clearTimeout(tm);
  }, [key, ms, l]);

  return l;
}

export function useInView(once = true) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [v, setV] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setV(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          setV(true);
          if (once) io.disconnect();
        } else if (!once) setV(false);
      },
      { threshold: 0.12 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [once]);

  return [ref, v] as const;
}

export function useClickOut(
  ref: React.RefObject<HTMLElement | null>,
  fn: () => void,
  on = true
) {
  useEffect(() => {
    if (!on) return;
    const f = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fn();
    };
    addEventListener("pointerdown", f, true);
    return () => removeEventListener("pointerdown", f, true);
  }, [on, ref, fn]);
}

/* ---------- typography / reveal ---------- */

export function BlurFade({
  children,
  delay = 0,
  cls = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  cls?: string;
  style?: CSSProperties;
}) {
  const [ref, v] = useInView();
  const reduced = useReduced();
  return (
    <div
      ref={ref}
      className={cx("bf", (v || reduced) && "in", cls)}
      style={{ ["--d" as string]: delay + "ms", ...style }}
    >
      {children}
    </div>
  );
}

export function TextAnimate({
  parts,
}: {
  parts: { t: string; w?: number; c?: string }[];
}) {
  const reduced = useReduced();
  return (
    <span>
      {parts.map((p, i) => (
        <span
          key={i}
          style={{
            fontWeight: p.w || 300,
            display: "inline-block",
            whiteSpace: "pre",
            color: p.c,
            animation: reduced ? "none" : `morphin .7s var(--ease-em) ${i * 80}ms both`,
          }}
        >
          {p.t}
        </span>
      ))}
    </span>
  );
}

/* ---------- rings and meters ---------- */

const seenRings = new Set<string>();

export function Ring({
  value = 0,
  max = 100,
  size = 96,
  stroke = 8,
  color = "var(--primary)",
  label,
  sub,
  delta,
  id,
  dec = 0,
  suffix = "",
  unit,
  center,
  noNum,
  lblCls,
  onClick,
}: {
  value?: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sub?: string;
  delta?: number;
  id?: string;
  dec?: number;
  suffix?: string;
  unit?: string;
  center?: ReactNode;
  noNum?: boolean;
  lblCls?: string;
  onClick?: () => void;
}) {
  const reduced = useReduced();
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const key = id || label + "|" + size + "|" + color;
  const [v, setV] = useState(seenRings.has(key) || reduced ? value : 0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (seenRings.has(key) || reduced) {
      setV(value);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          seenRings.add(key);
          setTimeout(() => setV(value), 80);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [value, key, reduced]);

  const n = useCount(v, 0);
  const frac = clamp(v / max, 0, 1);
  const fs = Math.round(size * (size > 150 ? 0.36 : 0.33));

  return (
    <div className="ring-wrap col" style={{ alignItems: "center" }} onClick={onClick}>
      <div className="ring" ref={ref} style={{ width: size + "px", height: size + "px" }}>
        <svg width={size} height={size}>
          <circle className="rtrack" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
          <circle
            className="rval"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            stroke={color}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
          />
        </svg>
        <div className="rc">
          {center ||
            (noNum ? null : (
              <span
                style={{
                  font: `250 ${fs}px/1 var(--font-display)`,
                  letterSpacing: "-.03em",
                }}
              >
                {fnum(n, dec)}
                {suffix && (
                  <span
                    style={{
                      fontSize: Math.round(fs * 0.45) + "px",
                      fontWeight: 300,
                      marginLeft: "1px",
                    }}
                  >
                    {suffix}
                  </span>
                )}
              </span>
            ))}
          {unit && (
            <span className="caption" style={{ marginTop: 3 }}>
              {unit}
            </span>
          )}
        </div>
      </div>
      {label && (
        <div className={cx("ring-lbl", lblCls)}>
          <div className="label">{label}</div>
          {sub && <div className="caption mt1">{sub}</div>}
          {delta != null && (
            <div className="mt1">
              <Delta v={delta} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Delta({ v, suffix = "" }: { v: number; suffix?: string }) {
  const c = v > 0 ? "up" : v < 0 ? "dn" : "eq";
  return (
    <span className={cx("delta", c)}>
      <Ic n={v > 0 ? "ArrowUp" : v < 0 ? "ArrowDown" : "Minus"} s={11} w="bold" />
      {v > 0 ? "+" : ""}
      {v}
      {suffix}
    </span>
  );
}

export function Meter({
  v,
  max = 100,
  color,
  cls = "",
  seg,
}: {
  v: number;
  max?: number;
  color?: string;
  cls?: string;
  seg?: number;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const a = requestAnimationFrame(() => setW(clamp(v / max, 0, 1)));
    return () => cancelAnimationFrame(a);
  }, [v, max]);

  if (seg) {
    const n = Math.round(w * seg);
    return (
      <div className={cx("meter seg8", cls)}>
        {Array.from({ length: seg }, (_, i) => (
          <i key={i} className={i < n ? "f" : ""} style={i < n && color ? { background: color } : undefined} />
        ))}
      </div>
    );
  }

  return (
    <div className={cx("meter", cls)}>
      <i style={{ width: w * 100 + "%", background: color }} />
    </div>
  );
}

export function SegBar({
  items,
  h = 12,
}: {
  items: { v: number; c: string; l: string }[];
  h?: number;
}) {
  const tot = sum(items.map((i) => i.v)) || 1;
  return (
    <div className="sbar" style={{ height: h + "px" }}>
      {items.map((i, k) => (
        <i
          key={k}
          style={{ flex: i.v / tot, background: i.c }}
          data-tip={i.l + " · " + fnum((i.v / tot) * 100, 0) + "%"}
        />
      ))}
    </div>
  );
}

export function SegRing({
  items,
  size = 170,
  stroke = 18,
  center,
}: {
  items: { v: number; c: string }[];
  size?: number;
  stroke?: number;
  center?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const tot = sum(items.map((i) => i.v)) || 1;
  const [go, setGo] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setGo(true), 80);
    return () => clearTimeout(a);
  }, []);

  let off = 0;
  return (
    <div className="ring" style={{ width: size + "px", height: size + "px" }}>
      <svg width={size} height={size}>
        <circle className="rtrack" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        {items.map((i, k) => {
          const len = (i.v / tot) * C;
          const gap = 3;
          const el = (
            <circle
              key={k}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={i.c}
              strokeWidth={stroke}
              strokeDasharray={go ? `${Math.max(len - gap, 1)} ${C}` : `0 ${C}`}
              strokeDashoffset={-off}
              style={{ transition: `stroke-dasharray .8s var(--ease-ring) ${k * 60}ms` }}
            />
          );
          off += len;
          return el;
        })}
      </svg>
      <div className="rc">{center}</div>
    </div>
  );
}

/* ---------- badges, chips, dots ---------- */

export function Badge({
  tone = "",
  icon,
  children,
  cls = "",
  lg,
  onClick,
}: {
  tone?: string;
  icon?: string;
  children: ReactNode;
  cls?: string;
  lg?: boolean;
  onClick?: () => void;
}) {
  return (
    <span className={cx("badge", tone, lg && "lg", cls)} onClick={onClick}>
      {icon && <Ic n={icon} w="fill" s={13} />}
      {children}
    </span>
  );
}

export function Chip({
  on,
  onClick,
  icon,
  children,
  sm,
  cls = "",
}: {
  on?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  icon?: string;
  children: ReactNode;
  sm?: boolean;
  cls?: string;
}) {
  return (
    <button
      className={cx("chip", on && "on", sm && "sm", cls)}
      onClick={(e) => {
        haptic();
        onClick?.(e);
      }}
      aria-pressed={!!on}
    >
      {icon && <Ic n={icon} s={16} w={on ? "fill" : "regular"} />}
      {children}
    </button>
  );
}

export function Dot({ s = "ok", live }: { s?: string; live?: boolean }) {
  return <span className={cx("dot", s, live && "live")} />;
}

/* ---------- buttons ---------- */

export function Btn({
  children,
  cls = "primary",
  icon,
  onClick,
  sz = "",
  block,
  disabled,
  shimmer,
  ripple = true,
  style,
  title,
  type,
}: {
  children?: ReactNode;
  cls?: string;
  icon?: string;
  onClick?: (e: React.MouseEvent) => void;
  sz?: "" | "sm" | "lg";
  block?: boolean;
  disabled?: boolean;
  shimmer?: boolean;
  ripple?: boolean;
  style?: CSSProperties;
  title?: string;
  type?: "button" | "submit";
}) {
  const ref = useRef<HTMLButtonElement | null>(null);

  const down = (e: React.PointerEvent) => {
    if (!ripple || !ref.current) return;
    const b = ref.current;
    const rc = b.getBoundingClientRect();
    const sc = rc.width / (b.offsetWidth || 1);
    const d = (Math.max(rc.width, rc.height) / sc) * 2.2;
    const s = document.createElement("span");
    s.className = "ripple-s";
    s.style.cssText = `width:${d}px;height:${d}px;left:${
      (e.clientX - rc.left) / sc - d / 2
    }px;top:${(e.clientY - rc.top) / sc - d / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 620);
  };

  return (
    <button
      ref={ref}
      type={type || "button"}
      className={cx("btn", cls, sz, block && "block", shimmer && "shimmer")}
      disabled={disabled}
      onPointerDown={down}
      onClick={(e) => {
        haptic();
        onClick?.(e);
      }}
      style={style}
      title={title}
    >
      {icon && <Ic n={icon} w={cls === "primary" ? "fill" : "regular"} s={sz === "sm" ? 16 : 20} />}
      {children}
    </button>
  );
}

/* ---------- segmented control and tabs ---------- */

export function Seg<K extends string>({
  opts,
  v,
  on,
  cls = "",
  block,
  sm,
}: {
  opts: { k: K; l: string; i?: string; n?: number }[];
  v: K;
  on: (k: K) => void;
  cls?: string;
  block?: boolean;
  sm?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ l: 0, w: 0 });

  const m = useCallback(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>("button.on");
    if (el) setPos({ l: el.offsetLeft, w: el.offsetWidth });
  }, []);

  useLayoutEffect(m, [v, opts.length, m]);
  useEffect(() => {
    const ro = new ResizeObserver(m);
    if (ref.current) ro.observe(ref.current);
    document.fonts?.ready.then(m);
    return () => ro.disconnect();
  }, [m]);

  return (
    <div className={cx("seg", sm && "sm", cls, block && "block")} ref={ref} role="tablist">
      <span className="ind" style={{ left: pos.l + "px", width: pos.w + "px" }} />
      {opts.map((o) => (
        <button
          key={o.k}
          role="tab"
          className={o.k === v ? "on" : ""}
          onClick={() => {
            haptic();
            on(o.k);
          }}
        >
          {o.i && <Ic n={o.i} s={16} w={o.k === v ? "fill" : "regular"} />}
          {o.l}
          {o.n != null && <span style={{ opacity: 0.65, fontSize: ".9em" }}>{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Tabs<K extends string>({
  opts,
  v,
  on,
}: {
  opts: { k: K; l: string; i?: string; n?: number }[];
  v: K;
  on: (k: K) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ l: 0, w: 0 });

  const m = useCallback(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>("button.on");
    if (el) setPos({ l: el.offsetLeft, w: el.offsetWidth });
  }, []);

  useLayoutEffect(m, [v, m]);
  useEffect(() => {
    const ro = new ResizeObserver(m);
    if (ref.current) ro.observe(ref.current);
    document.fonts?.ready.then(m);
    return () => ro.disconnect();
  }, [m]);

  return (
    <div className="tabs hide-sb" ref={ref}>
      {opts.map((o) => (
        <button key={o.k} className={o.k === v ? "on" : ""} onClick={() => on(o.k)}>
          {o.i && <Ic n={o.i} s={17} w={o.k === v ? "fill" : "regular"} />}
          {o.l}
          {o.n != null && <span className="badge">{o.n}</span>}
        </button>
      ))}
      <span className="tind" style={{ left: pos.l + "px", width: pos.w + "px" }} />
    </div>
  );
}

export function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      className={cx("switch", on && "on")}
      role="switch"
      aria-checked={!!on}
      aria-label={label}
      onClick={() => {
        haptic();
        onChange(!on);
      }}
    />
  );
}

export function Acc({
  head,
  children,
  open: o0 = false,
}: {
  head: ReactNode;
  children: ReactNode;
  open?: boolean;
}) {
  const [o, setO] = useState(o0);
  return (
    <div className={cx("acc", o && "open")}>
      <button className="acc-h" onClick={() => setO(!o)} aria-expanded={o}>
        <div className="grow">{head}</div>
        <Ic n="CaretRight" s={16} cls="chev" w="bold" />
      </button>
      <div className="acc-b">
        <div>
          <div className="in">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- misc ---------- */

export function Skel({
  w = "100%",
  h = 16,
  r,
  cls = "",
}: {
  w?: number | string;
  h?: number;
  r?: string;
  cls?: string;
}) {
  return (
    <div
      className={cx("skel", cls)}
      style={{ width: typeof w === "number" ? w + "px" : w, height: h + "px", borderRadius: r }}
    />
  );
}

export function Empty({
  icon = "Plant",
  title,
  sub,
  action,
  onAction,
}: {
  icon?: string;
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty">
      <div className="dotpat" />
      <Ic n={icon} w="duotone" s={48} cls="ei" />
      <div className="title-md">{title}</div>
      <div className="muted body-sm" style={{ maxWidth: "34ch" }}>
        {sub}
      </div>
      {action && (
        <div className="mt4">
          <Btn onClick={onAction}>{action}</Btn>
        </div>
      )}
    </div>
  );
}

export function Alert({
  tone = "info",
  icon,
  title,
  children,
  action,
  onAction,
}: {
  tone?: "info" | "ok" | "warn" | "risk";
  icon?: string;
  title: string;
  children?: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  const defaultIcon =
    tone === "risk" ? "WarningOctagon" : tone === "warn" ? "Warning" : tone === "ok" ? "CheckCircle" : "Info";
  return (
    <div className={cx("alert", tone)}>
      <Ic n={icon || defaultIcon} w="fill" s={22} />
      <div className="grow">
        <b>{title}</b>
        <span className="muted">{children}</span>
      </div>
      {action && (
        <button className="btn sm secondary" onClick={onAction} style={{ alignSelf: "center" }}>
          {action}
        </button>
      )}
    </div>
  );
}

export function Avatar({
  u,
  sz = "",
  style,
}: {
  u?: { id?: string; name: string; photo?: string } | null;
  sz?: string;
  style?: CSSProperties;
}) {
  const nm = u ? u.name : "?";
  const bg = u && u.photo ? `url(${u.photo})` : `hsl(${u ? hashHue(u.id || nm) : 0} 55% 68%)`;
  return (
    <span className={cx("avatar", sz)} style={{ background: bg, ...style }}>
      {!(u && u.photo) &&
        nm
          .split(" ")
          .map((x) => x[0])
          .slice(0, 2)
          .join("")}
    </span>
  );
}

function hashHue(s: string) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return (x >>> 0) % 360;
}

export function AvatarStack({
  users,
  max = 4,
}: {
  users: { id: string; name: string; photo?: string }[];
  max?: number;
}) {
  return (
    <div className="astack">
      {users.slice(0, max).map((u) => (
        <Avatar key={u.id} u={u} sz="sm" />
      ))}
      {users.length > max && <span className="avatar sm more">+{users.length - max}</span>}
    </div>
  );
}

export function SecHead({
  label,
  right,
  cls = "",
}: {
  label: string;
  right?: ReactNode;
  cls?: string;
}) {
  return (
    <div className={cx("sec-h", cls)}>
      <span className="label">{label}</span>
      {right}
    </div>
  );
}

export function StatRow({
  label,
  value,
  delta,
  sub,
  unit,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  sub?: ReactNode;
  unit?: string;
}) {
  return (
    <div className="stat-row">
      <span className="label">{label}</span>
      <div className="row g3 baseline">
        <span className="metric-md">{value}</span>
        {unit && <span className="muted body-sm">{unit}</span>}
        {delta != null && <Delta v={delta} />}
      </div>
      {sub && <span className="caption">{sub}</span>}
    </div>
  );
}

export function Table<T>({
  cols,
  rows,
  onRow,
  empty = "Nothing here yet",
  dense,
}: {
  cols: { h: string; num?: boolean; w?: string; r: (row: T, i: number) => ReactNode }[];
  rows: T[];
  onRow?: (row: T) => void;
  empty?: string;
  dense?: boolean;
}) {
  return (
    <div className="tscroll">
      <table className={cx("table", dense && "dense")}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={c.num ? "num" : ""} style={c.w ? { width: c.w } : undefined}>
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i} className={onRow ? "hv" : ""} onClick={onRow ? () => onRow(r) : undefined}>
                {cols.map((c, k) => (
                  <td key={k} className={c.num ? "num" : ""}>
                    {c.r(r, i)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={cols.length}>
                <Empty icon="Database" title={empty} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function NumField({
  v,
  on,
  min = 0,
  max = 999,
  step = 1,
  suffix,
}: {
  v: number;
  on: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="numfield">
      <button onClick={() => on(clamp(+(v - step).toFixed(2), min, max))}>
        <Ic n="Minus" s={14} w="bold" />
      </button>
      <input
        value={v}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) on(clamp(n, min, max));
        }}
      />
      {suffix && (
        <span className="caption" style={{ marginRight: 8 }}>
          {suffix}
        </span>
      )}
      <button onClick={() => on(clamp(+(v + step).toFixed(2), min, max))}>
        <Ic n="Plus" s={14} w="bold" />
      </button>
    </div>
  );
}

export function Field({
  label,
  children,
  err,
}: {
  label: string;
  children: ReactNode;
  err?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {err && (
        <div className="err-msg">
          <Ic n="Warning" w="fill" s={14} />
          {err}
        </div>
      )}
    </div>
  );
}

export function Sel<K extends string>({
  v,
  on,
  opts,
  cls = "",
}: {
  v: K;
  on: (k: K) => void;
  opts: { k: K; l: string }[];
  cls?: string;
}) {
  return (
    <div className={cx("sel-wrap", cls)}>
      <select className="input" value={v} onChange={(e) => on(e.target.value as K)}>
        {opts.map((o) => (
          <option key={o.k} value={o.k}>
            {o.l}
          </option>
        ))}
      </select>
      <Ic n="CaretRight" s={14} w="bold" style={{ transform: "translateY(-50%) rotate(90deg)" }} />
    </div>
  );
}

/* ---------- moisture slider ---------- */

export function MoistureSlider({
  v,
  on,
  disabled,
}: {
  v: number;
  on: (k: number) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState(false);

  const setFrom = (e: React.PointerEvent) => {
    const tr = ref.current?.querySelector(".mtrack")?.getBoundingClientRect();
    if (!tr) return;
    const f = clamp((e.clientX - tr.left) / tr.width, 0, 1);
    const k = Math.round(f * 4) + 1;
    if (k !== v) {
      haptic();
      on(k);
    }
  };

  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      on(Math.min(5, v + 1));
      haptic();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      on(Math.max(1, v - 1));
      haptic();
    }
  };

  const pos = (k: number) => `calc(14px + (100% - 28px) * ${(k - 1) / 4})`;
  const lbl = t("m" + v);
  const cur = MOIST[v - 1];

  return (
    <div className="moist-wrap">
      <div className="col" style={{ alignItems: "center", gap: 6, marginBottom: 22 }}>
        <Ic
          n={cur.i}
          w="duotone"
          s={56}
          c="var(--water)"
          style={{ transition: "transform .4s var(--spring)", transform: `scale(${0.9 + v * 0.04})` }}
        />
        <div className="display-md morph" key={v}>
          <span>{lbl}</span>
        </div>
        <div className="caption">
          {v} of 5 · {MOIST_DESC[v - 1]}
        </div>
      </div>
      <div
        className={cx("mslider", drag && "drag")}
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={v}
        aria-valuetext={`Moisture, ${lbl}, ${v} of 5`}
        onKeyDown={key}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag(true);
          setFrom(e);
        }}
        onPointerMove={(e) => {
          if (drag) setFrom(e);
        }}
        onPointerUp={() => setDrag(false)}
      >
        <div className="mtrack">
          <div className="mfill" style={{ width: `${((v - 1) / 4) * 100}%` }} />
        </div>
        {MOIST.map((m) => (
          <span key={m.k} className={cx("mstop", m.k <= v && "f")} style={{ left: pos(m.k) }} />
        ))}
        <div className="mthumb" style={{ left: pos(v) }}>
          <Ic n={cur.i} w="fill" s={18} />
        </div>
      </div>
      <div className="row between" style={{ padding: "0 4px" }}>
        {MOIST.map((m) => (
          <span
            key={m.k}
            className="caption tc"
            style={{
              width: "20%",
              color: m.k === v ? "var(--foreground)" : "",
              fontWeight: m.k === v ? 700 : 500,
            }}
          >
            {t("m" + m.k)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- logo ---------- */

export function Logo({ s = 30 }: { s?: number }) {
  return (
    <svg className="logo-mark" width={s} height={s} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="10" fill="var(--primary)" />
      <path d="M16 26V14" stroke="var(--primary-fg)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 15c-4.5 0-7-2.6-7-6.5 4.5 0 7 2.6 7 6.5z" fill="var(--primary-fg)" />
      <path
        d="M16 19.5c4.2 0 6.8-2.3 6.8-6-4.2 0-6.8 2.3-6.8 6z"
        fill="var(--primary-fg)"
        opacity=".62"
      />
    </svg>
  );
}

/* ---------- popover + pagination ---------- */

/* Popover menu. Ported from the mockup's Pop: a trigger render prop plus a
   menu that closes on outside click or on any item click. */
export function Pop({
  btn,
  children,
  align = "right",
  up,
  cls = "",
}: {
  btn: (toggle: () => void, open: boolean) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  up?: boolean;
  cls?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  useClickOut(ref, () => setOpen(false), open);
  return (
    <span className="rel" ref={ref} style={{ display: "inline-flex" }}>
      {btn(() => setOpen((o) => !o), open)}
      {open && (
        <div
          className={"menu " + cls}
          style={{ [align]: 0, [up ? "bottom" : "top"]: "calc(100% + 6px)" } as CSSProperties}
          onClick={() => setOpen(false)}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </span>
  );
}

export function Paginate({
  page,
  pages,
  on,
}: {
  page: number;
  pages: number;
  on: (p: number) => void;
}) {
  return (
    <div className="row g2 end mt3">
      <span className="caption" style={{ marginRight: 6 }}>
        Page {page + 1} of {pages}
      </span>
      <button
        className="iconbtn sm bordered"
        disabled={page <= 0}
        onClick={() => on(page - 1)}
        aria-label="Previous page"
      >
        <Ic n="CaretLeft" s={16} />
      </button>
      <button
        className="iconbtn sm bordered"
        disabled={page >= pages - 1}
        onClick={() => on(page + 1)}
        aria-label="Next page"
      >
        <Ic n="CaretRight" s={16} />
      </button>
    </div>
  );
}

export type { IconWeight };

