import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { heroImageForTrend } from "@/lib/trend-images";
import { HARMONY_TIERS, type HarmonizedTrend } from "@/lib/harmony";
import { cn } from "@/lib/utils";

export function HarmonyBoard({
  trends,
  limit = 6,
}: {
  trends: HarmonizedTrend[];
  limit?: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trends.slice(0, limit).map((t) => (
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
        <Image
          src={heroImageForTrend(trend)}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
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

        <div className="mt-4 flex items-end justify-between">
          <div>
            <span
              className="font-mono text-3xl font-semibold tnum"
              style={{ color: spec.color }}
            >
              {trend.harmony}
              <span className="text-base font-normal">%</span>
            </span>
            <span className="ml-2 text-xs text-muted-foreground">in sync</span>
          </div>
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: `${spec.color}1a`, color: spec.color }}
          >
            {spec.label}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${trend.harmony}%`,
              background: inSync
                ? `linear-gradient(90deg, ${spec.color}, ${spec.glow})`
                : spec.color,
            }}
          />
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
