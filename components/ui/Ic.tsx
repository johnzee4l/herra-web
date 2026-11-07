"use client";

/* Icon wrapper. The mockup bundled Phosphor glyph paths in an ICONS map;
   the product uses @phosphor-icons/react 2.1.1 (R5, section 11).
   Call contract is unchanged: <Ic n="Bell" w="fill" s={22} c="var(--risk)" /> */

import * as Phosphor from "@phosphor-icons/react";
import type { CSSProperties } from "react";

export type IconWeight = "regular" | "fill" | "bold" | "duotone";

type PhosphorComponent = React.ComponentType<{
  size?: number | string;
  weight?: IconWeight;
  color?: string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}>;

const REGISTRY = Phosphor as unknown as Record<string, PhosphorComponent>;

export interface IcProps {
  n: string;
  w?: IconWeight;
  s?: number;
  c?: string;
  style?: CSSProperties;
  cls?: string;
}

export function Ic({ n, w = "regular", s = 20, c, style, cls }: IcProps) {
  const Glyph = REGISTRY[n];
  if (!Glyph) {
    if (process.env.NODE_ENV !== "production") {
      // Mirrors the mockup's missing-glyph warning so a typo is visible.
      console.warn(`[Ic] unknown icon "${n}"`);
    }
    return null;
  }
  return (
    <Glyph
      size={s}
      weight={w}
      color={c}
      className={cls}
      style={style}
      aria-hidden
    />
  );
}
