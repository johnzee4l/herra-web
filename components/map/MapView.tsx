"use client";

/* MapView (blueprint section 8). Leaflet + Geoman, loaded through a dynamic
   import so Leaflet is not in the initial bundle.

   Three tile styles behind one switcher, attribution always visible. Drawing
   rules come from lib/geo/validate. The keyboard alternative (an editable
   vertex list) lives in the capture screen, not here. */

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Polygon as LPolygon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { Ic } from "@/components/ui/Ic";
import { cx } from "@/lib/utils";
import { useApp } from "@/lib/state";
import {
  TILES,
  mapColors,
  validatePoly,
  type MapStyle,
  type Measure,
  type Pt,
} from "@/lib/geo/validate";
import type { Field, Space } from "@/lib/types";

export interface MapApi {
  startDraw: () => void;
  sketch: () => void;
  undo: () => void;
  clear: () => void;
  setPoly: (pts: Pt[]) => void;
  map: LeafletMap | null;
}

export interface MapViewProps {
  center?: Pt;
  zoom?: number;
  spaces?: Space[];
  fields?: Field[];
  bound?: Pt[];
  boundName?: string;
  drawKind?: "field" | "space";
  apiRef?: React.MutableRefObject<MapApi | null>;
  onMeasure?: (m: Measure) => void;
  onFieldClick?: (f: Field) => void;
  selected?: string;
  height?: number;
  fit?: Pt[];
  hideLabels?: boolean;
  noCtl?: boolean;
  bleed?: boolean;
  cls?: string;
}

export default function MapView({
  center = [13.1765, 121.276],
  zoom = 15,
  spaces = [],
  fields = [],
  bound,
  boundName,
  drawKind = "field",
  apiRef,
  onMeasure,
  onFieldClick,
  selected,
  height,
  fit,
  hideLabels,
  noCtl,
  bleed,
  cls = "",
}: MapViewProps) {
  const { settings } = useApp();
  const resolvedTheme =
    settings.theme === "system"
      ? typeof window !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : settings.theme;
  /* Auto-switch follows the interface theme; otherwise the saved default
     style is the starting point. Every tile source is keyless. */
  const preferredStyle: MapStyle = settings.autoMap ? resolvedTheme : settings.mapStyle;
  const showLabels = settings.labels && !hideLabels;
  const el = useRef<HTMLDivElement | null>(null);
  const M = useRef<{
    map: LeafletMap | null;
    vec: import("leaflet").LayerGroup | null;
    draw: { layer: LPolygon | null; hist: Pt[][]; active: boolean };
    style: MapStyle;
  }>({ map: null, vec: null, draw: { layer: null, hist: [], active: false }, style: preferredStyle });

  const [style, setStyle] = useState<MapStyle>(preferredStyle);
  const [ready, setReady] = useState(false);
  const tile = useRef<import("leaflet").TileLayer | null>(null);
  const P = useRef({ onMeasure, bound, boundName, drawKind, onFieldClick });
  P.current = { onMeasure, bound, boundName, drawKind, onFieldClick };

  useEffect(() => {
    setStyle(preferredStyle);
  }, [preferredStyle]);

  /* mount */
  useEffect(() => {
    let dead = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("@geoman-io/leaflet-geoman-free");
      if (dead || !el.current) return;

      const map = L.map(el.current, {
        zoomControl: false,
        attributionControl: false,
        center: center as LatLngExpression,
        zoom,
        minZoom: 5,
        maxZoom: 19,
        zoomSnap: 0.5,
        doubleClickZoom: false,
        boxZoom: false,
      });
      M.current.map = map;
      M.current.vec = L.layerGroup().addTo(map);

      L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);
      L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(el.current);
      const t0 = setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          /* the map was removed before it settled */
        }
      }, 80);

      const D = M.current.draw;

      const measure = () => {
        if (!D.layer) return;
        const pts = (D.layer.getLatLngs()[0] as { lat: number; lng: number }[]).map(
          (p) => [p.lat, p.lng] as Pt
        );
        const v = validatePoly(pts, P.current.bound, P.current.drawKind, P.current.boundName);
        const col = mapColors(M.current.style);
        D.layer.setStyle({
          color: v.ok ? col.fld : "#F0617B",
          fillColor: v.ok ? col.pri : "#F0617B",
          fillOpacity: v.ok ? 0.2 : 0.16,
          weight: 2.5,
        });
        D.layer.unbindTooltip();
        D.layer.bindTooltip(v.ok ? `${v.areaHa.toFixed(2)} ha` : v.reason, {
          permanent: true,
          direction: "center",
          className: "poly-chip" + (v.ok ? "" : " risk"),
        });
        P.current.onMeasure?.(v);
      };

      const adopt = (layer: LPolygon) => {
        D.layer = layer;
        D.hist = [
          (layer.getLatLngs()[0] as { lat: number; lng: number }[]).map(
            (p) => [p.lat, p.lng] as Pt
          ),
        ];
        layer.addTo(map);
        try {
          layer.pm.enable({ allowSelfIntersection: true, snappable: true, snapDistance: 14 });
        } catch {
          /* geoman refused to enable editing on this layer */
        }
        const h = () => {
          if (!D.layer) return;
          const pts = (D.layer.getLatLngs()[0] as { lat: number; lng: number }[]).map(
            (p) => [p.lat, p.lng] as Pt
          );
          const last = D.hist[D.hist.length - 1];
          if (!last || JSON.stringify(last) !== JSON.stringify(pts)) D.hist.push(pts);
          measure();
        };
        ["pm:edit", "pm:markerdragend", "pm:vertexadded", "pm:vertexremoved"].forEach((ev) =>
          layer.on(ev, h)
        );
        measure();
      };

      map.on("pm:create", (e: { layer: LPolygon }) => {
        map.pm.disableDraw();
        if (D.layer) map.removeLayer(D.layer);
        adopt(e.layer);
      });

      const live = (e: { workingLayer?: { getLatLngs?: () => unknown } }) => {
        const wl = e.workingLayer;
        if (!wl?.getLatLngs) return;
        const pts = (wl.getLatLngs() as { lat: number; lng: number }[][])
          .flat()
          .map((p) => [p.lat, p.lng] as Pt);
        if (pts.length >= 3) {
          const v = validatePoly(pts, P.current.bound, P.current.drawKind, P.current.boundName);
          P.current.onMeasure?.({ ...v, live: true });
        } else {
          P.current.onMeasure?.({
            ok: false,
            live: true,
            areaHa: 0,
            perim: 0,
            pts,
            centroid: null,
            reason: "Keep tapping corners — close the shape on the first point",
          });
        }
      };
      map.on("pm:vertexadded", live as unknown as (e: unknown) => void);

      /* api for the capture screen */
      if (apiRef) {
        apiRef.current = {
          map,
          startDraw() {
            if (D.layer) {
              map.removeLayer(D.layer);
              D.layer = null;
            }
            const col = mapColors(M.current.style);
            map.pm.disableDraw();
            map.pm.enableDraw("Polygon", {
              snappable: true,
              snapDistance: 16,
              allowSelfIntersection: true,
              finishOn: "dblclick",
              templineStyle: { color: col.pri, weight: 2, dashArray: "6 6" },
              hintlineStyle: { color: col.pri, weight: 2, dashArray: "6 6" },
              pathOptions: { color: col.fld, weight: 2.5, fillColor: col.pri, fillOpacity: 0.2 },
            } as Parameters<typeof map.pm.enableDraw>[1]);
            P.current.onMeasure?.({
              ok: false,
              live: true,
              areaHa: 0,
              perim: 0,
              pts: [],
              centroid: null,
              reason: "Tap the map to place the first corner",
            });
          },
          sketch() {
            if (D.layer) {
              map.removeLayer(D.layer);
              D.layer = null;
            }
            const c = map.getCenter();
            const dLat = 0.0006;
            const dLng = 0.0006;
            const pts: Pt[] = [
              [c.lat - dLat, c.lng - dLng],
              [c.lat - dLat, c.lng + dLng],
              [c.lat + dLat, c.lng + dLng],
              [c.lat + dLat, c.lng - dLng],
            ];
            adopt(
              L.polygon(pts as LatLngExpression[], {
                color: mapColors(M.current.style).fld,
                weight: 2.5,
              })
            );
          },
          undo() {
            if (!D.layer || D.hist.length < 2) return;
            D.hist.pop();
            const prev = D.hist[D.hist.length - 1];
            D.layer.setLatLngs(prev as LatLngExpression[]);
            measure();
          },
          clear() {
            if (D.layer) {
              map.removeLayer(D.layer);
              D.layer = null;
            }
            D.hist = [];
            map.pm.disableDraw();
            P.current.onMeasure?.({
              ok: false,
              live: false,
              areaHa: 0,
              perim: 0,
              pts: [],
              centroid: null,
              reason: "Draw a boundary to continue",
            });
          },
          setPoly(pts: Pt[]) {
            if (D.layer) map.removeLayer(D.layer);
            adopt(
              L.polygon(pts as LatLngExpression[], {
                color: mapColors(M.current.style).fld,
                weight: 2.5,
              })
            );
          },
        };
      }

      setReady(true);
      cleanup = () => {
        clearTimeout(t0);
        ro.disconnect();
        map.remove();
      };
    })();

    return () => {
      dead = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* tiles */
  useEffect(() => {
    const map = M.current.map;
    if (!map || !ready) return;
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead) return;
      M.current.style = style;
      /* One base layer at a time. A style change swaps the source; without this
         the previous tiles stayed on the map underneath the new ones. */
      tile.current?.remove();
      tile.current = null;
      const [url, attrib] = TILES[style];
      tile.current = L.tileLayer(url, {
        maxZoom: 19,
        subdomains: "abcd",
        crossOrigin: false,
        updateWhenZooming: false,
        keepBuffer: 1,
        attribution: attrib,
      }).addTo(map);
    })();
    return () => {
      dead = true;
    };
  }, [style, ready]);

  /* vectors */
  useEffect(() => {
    const map = M.current.map;
    const g = M.current.vec;
    if (!map || !g || !ready) return;
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead) return;
      const col = mapColors(style);
      g.clearLayers();

      spaces.forEach((sp) => {
        const tone = sp.status === "attention" ? "#F5BC4B" : col.pri;
        const pg = L.polygon(sp.boundary as LatLngExpression[], {
          color: tone,
          weight: 2,
          dashArray: "8 4",
          fillColor: tone,
          fillOpacity: style === "light" ? 0.08 : 0.06,
          interactive: false,
        }).addTo(g);
        if (showLabels) {
          pg.bindTooltip(sp.name, { permanent: true, direction: "center", className: "map-lbl" });
        }
      });

      if (bound && !spaces.length) {
        L.polygon(bound as LatLngExpression[], {
          color: col.pri,
          weight: 2,
          dashArray: "8 4",
          fillColor: col.pri,
          fillOpacity: style === "light" ? 0.08 : 0.06,
          interactive: false,
        }).addTo(g);
      }

      fields.forEach((f) => {
        const sel = f.id === selected;
        const pg = L.polygon(f.geom as LatLngExpression[], {
          color: sel ? col.pri : col.fld,
          weight: sel ? 3 : 2,
          fillColor: col.pri,
          fillOpacity: 0.18,
        }).addTo(g);
        pg.on("click", () => P.current.onFieldClick?.(f));
        if (showLabels) {
          pg.bindTooltip(f.name, { permanent: true, direction: "center", className: "map-lbl" });
        }
      });
    })();
    return () => {
      dead = true;
    };
  }, [style, spaces, fields, selected, showLabels, bound, ready]);

  /* fit */
  useEffect(() => {
    const map = M.current.map;
    if (!map || !fit || !fit.length || !ready) return;
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead) return;
      map.fitBounds(L.latLngBounds(fit as LatLngExpression[]), {
        padding: [40, 40],
        maxZoom: 17,
        animate: false,
      });
    })();
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(fit?.slice(0, 2)), fit?.length, ready]);

  return (
    <div
      className={cx("mapwrap", bleed && "bleed", cls)}
      style={height ? { height } : undefined}
    >
      <div ref={el} className="leaflet-host" style={{ position: "absolute", inset: 0 }} />
      {!noCtl && (
        <div className="mapstyle">
          <div className="seg">
            {(["sat", "dark", "light"] as MapStyle[]).map((s) => (
              <button
                key={s}
                className={cx("segbtn", style === s && "on")}
                onClick={() => setStyle(s)}
                aria-label={s === "sat" ? "Satellite" : s === "dark" ? "Dark" : "Light"}
              >
                <Ic n={s === "sat" ? "Globe" : s === "dark" ? "Moon" : "Sun"} s={16} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


