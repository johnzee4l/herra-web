import { CROP_SVG, FAM_COLOR } from "@/lib/spec/crop-svg";
import { CROPS } from "@/lib/spec/crops";

/* Crop illustration. The custom crop set (R5), drawn at 58% of the tile
   when framed, full size when bare. */

export function CropIcon({
  id,
  s = 40,
  bare,
}: {
  id: string;
  s?: number;
  bare?: boolean;
}) {
  const c = CROPS[id];
  if (!c) return null;
  const col = FAM_COLOR[c.family];
  const size = bare ? s : Math.round(s * 0.58);

  const ico = (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: CROP_SVG[id] || "" }}
    />
  );

  if (bare) {
    return <span style={{ color: col, display: "inline-flex" }}>{ico}</span>;
  }

  return (
    <span
      className="cropico"
      style={{
        width: s + "px",
        height: s + "px",
        color: col,
        background: `color-mix(in oklab,${col} 18%,transparent)`,
        borderRadius: Math.round(s * 0.3) + "px",
      }}
    >
      {ico}
    </span>
  );
}
