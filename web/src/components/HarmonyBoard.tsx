import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { HARMONY_TIERS, type HarmonizedTrend } from "@/lib/harmony";
import { WaveScore } from "@/components/WaveScore";
import { TrendVisual } from "@/components/TrendVisual";
import { cn } from "@/lib/utils";

export function HarmonyBoard({
  trends,
  limit = 6,
}: {
  trends: HarmonizedTrend[];
  limit?: number;
}) {
  // Ranked by WaveScore — the number the tiles lead with. Harmony still
  // drives each tile's tier color; it just no longer competes as a number.
  const ranked = [...trends].sort((a, b) => b.wavescore - a.wavescore);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ranked.slice(0, limit).map((t) => (
        <HarmonyTile key={t.id} trend={t} />
      ))}
    </div>
  );
}

export function HarmonyTile({ trend }: { trend: HarmonizedTrend }) {
  const spec = HARMONY_TIERS[trend.tier];
  const inSync = trend.tier === "in_sync";
  return (
    <Link
      href={`/trends/${trend.slug}`}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5",
        inSync
          ? "harmony-glow border-transparent"
          : "border-border hover:border-border-strong"
      )}
      style={{ borderTopColor: spec.color, borderTopWidth: 3 }}
    >
      <div className="relative h-28 overflow-hidden bg-surface-2">
        <TrendVisual trend={trend} showLabel={false} />
      </div>
      <div className="p-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              {trend.category}
            </p>
            <h3 className="mt-1 truncate font-display text-lg leading-tight group-hover:text-primary-strong">
              {trend.name}
            </h3>
          </div>
          <Delta value={trend.delta} />
        </div>

        {/* WaveScore is the number; the tier is the cultural read. */}
        <div className="mt-4 flex items-center justify-between">
          <WaveScore score={trend.wavescore} size={58} strokeWidth={5} />
          <div className="flex flex-col items-end gap-1">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: `${spec.color}1a`, color: spec.color }}
            >
              {spec.label}
            </span>
            <span className="max-w-[16ch] text-right text-[11px] leading-snug text-faint">
              {spec.description}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function Delta({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-success">
        <ArrowUpRight className="size-3.5" /> +{value}
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-danger">
        <ArrowDownRight className="size-3.5" /> {value}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs text-faint">
      <Minus className="size-3.5" />
    </span>
  );
}
