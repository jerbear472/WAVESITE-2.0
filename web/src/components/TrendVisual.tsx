import Image from "next/image";
import type { Trend } from "@/types";

// ---------------------------------------------------------------------------
// TrendVisual — the honest imagery policy, one component everywhere.
//   1. Real media (corpus post / harvested source image) → photo + badge.
//   2. Otherwise NO stock photo — a deterministic waveform card in a
//      category-keyed duotone. Every card differs because the data differs,
//      and nothing pretends to be a photograph of the trend.
// Renders inside a `relative` container with a set height (fills it).
// ---------------------------------------------------------------------------

const PALETTES = [
  { stroke: "#3478f6", soft: "#a8c7ff", bg: "#eaf2ff" }, // blue
  { stroke: "#35bdf2", soft: "#a5e2fb", bg: "#e6f7fe" }, // cyan
  { stroke: "#6d5bd0", soft: "#c3b9ef", bg: "#efedfb" }, // violet
  { stroke: "#159a78", soft: "#9fd8c9", bg: "#e7f5f1" }, // green
  { stroke: "#b77900", soft: "#e8c98a", bg: "#fbf3e3" }, // amber
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** One smooth pseudo-random wave across the 400×200 canvas. */
function wavePath(seed: number, baseY: number, amp: number): string {
  const pts: number[] = [];
  for (let i = 0; i <= 8; i++) {
    // Deterministic "noise" from the seed — no Math.random, stable per slug.
    const n = Math.sin(seed * 0.13 + i * (1.1 + (seed % 7) * 0.13));
    pts.push(baseY + n * amp);
  }
  let d = `M0,${pts[0].toFixed(1)}`;
  for (let i = 1; i <= 8; i++) {
    const x = i * 50;
    const cx = x - 25;
    d += ` C${cx},${pts[i - 1].toFixed(1)} ${cx},${pts[i].toFixed(1)} ${x},${pts[i].toFixed(1)}`;
  }
  return d;
}

export function TrendVisual({
  trend,
  sizes = "(max-width: 640px) 100vw, 33vw",
  showBadge = true,
  showLabel = true,
}: {
  trend: Pick<Trend, "name" | "slug" | "category" | "hero_image_url">;
  sizes?: string;
  /** Show the "source media" badge on real imagery. */
  showBadge?: boolean;
  /** Show the category label on the waveform fallback. */
  showLabel?: boolean;
}) {
  if (trend.hero_image_url) {
    return (
      <>
        <Image
          src={trend.hero_image_url}
          alt={`${trend.name} — real source media`}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {showBadge ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            source media
          </span>
        ) : null}
      </>
    );
  }

  const h = hash(trend.slug);
  const p = PALETTES[hash(trend.category || trend.slug) % PALETTES.length];

  return (
    <div className="absolute inset-0" style={{ background: p.bg }}>
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden
      >
        <path
          d={wavePath(h, 128, 34) + " L400,200 L0,200 Z"}
          fill={p.soft}
          opacity="0.35"
        />
        <path
          d={wavePath(h + 7, 118, 26)}
          fill="none"
          stroke={p.soft}
          strokeWidth="2.5"
        />
        <path
          d={wavePath(h + 13, 104, 30)}
          fill="none"
          stroke={p.stroke}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {showLabel ? (
        <span
          className="absolute bottom-2.5 left-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: p.stroke }}
        >
          {trend.category}
        </span>
      ) : null}
    </div>
  );
}
