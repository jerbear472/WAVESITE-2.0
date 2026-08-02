import Image from "next/image";
import type { Trend } from "@/types";
import { TrendTrajectory } from "@/components/TrendTrajectory";

// ---------------------------------------------------------------------------
// TrendVisual — the honest imagery policy, one component everywhere.
//   1. Real media (corpus post / harvested source image) → photo + badge.
//   2. Otherwise the trend's REAL measured 12-month trajectory, or an
//      explicit "no verified history yet" state with the backfill button.
//      Nothing decorative that could be mistaken for data.
// Renders inside a `relative` container with a set height (fills it).
// ---------------------------------------------------------------------------

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
  /** Show the category label on the trajectory fallback. */
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

  return (
    <TrendTrajectory
      slug={trend.slug}
      category={trend.category}
      showLabel={showLabel}
    />
  );
}
