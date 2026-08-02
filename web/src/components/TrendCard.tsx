import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink, Target } from "lucide-react";
import type { Trend } from "@/types";
import { Card } from "@/components/ui/card";
import { WaveScoreChip } from "@/components/WaveScore";
import { TrendSparkline } from "@/components/TrendSparkline";
import { computeHarmony, harmonyTier, HARMONY_TIERS } from "@/lib/harmony";
import { heroImageForTrend } from "@/lib/trend-images";
import { cn } from "@/lib/utils";
import {
  lifecycleBadge,
  riskBadge,
  sentimentBadge,
} from "@/lib/trend-format";

const DOT: Record<string, string> = {
  success: "#159a78",
  warning: "#b77900",
  danger: "#d64d57",
  primary: "#3478f6",
  violet: "#6d5bd0",
  default: "#8a94a6",
  outline: "#8a94a6",
};

function Meta({ variant, children }: { variant: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="size-1.5 rounded-full"
        style={{ background: DOT[variant] ?? DOT.default }}
      />
      {children}
    </span>
  );
}

export function TrendCard({
  trend,
  fit,
  reason,
}: {
  trend: Trend;
  fit?: number;
  reason?: string;
}) {
  const lifecycle = lifecycleBadge(trend.lifecycle_stage);
  const risk = riskBadge(trend.risk_level);
  const sentiment = sentimentBadge(trend.sentiment_score);
  const harmony = computeHarmony(trend);
  const tier = harmonyTier(harmony, trend);
  const inSync = tier.tier === "in_sync";

  return (
    <Card
      className={cn(
        "group flex flex-col overflow-hidden transition-all hover:border-border-strong hover:shadow-[0_8px_28px_rgba(20,32,51,0.09)]",
        inSync && "harmony-glow"
      )}
      style={{ borderTopColor: tier.color, borderTopWidth: 3 }}
    >
      {fit !== undefined ? (
        <div className="flex items-center gap-2 border-b border-primary/15 bg-gradient-to-r from-[#35bdf2]/15 via-[#3478f6]/10 to-transparent px-5 py-2">
          <Target className="size-3.5 text-primary-strong" />
          <span className="text-xs font-semibold tabular-nums text-primary-strong">
            {fit}% fit
          </span>
          {reason ? (
            <span className="truncate text-xs text-muted-foreground">
              · {reason}
            </span>
          ) : null}
        </div>
      ) : null}

      <Link
        href={`/trends/${trend.slug}`}
        className="relative block h-40 overflow-hidden bg-surface-2"
      >
        <Image
          src={trend.hero_image_url || heroImageForTrend(trend)}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {trend.hero_image_url ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            real post
          </span>
        ) : null}
      </Link>

      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
            {trend.category}
          </p>
          <Link href={`/trends/${trend.slug}`} className="mt-1.5 block">
            <h3 className="font-display text-xl leading-tight text-foreground group-hover:text-primary-strong">
              {trend.name}
            </h3>
          </Link>
        </div>
        <WaveScoreChip score={trend.wavescore} />
      </div>

      <p className="line-clamp-2 px-5 text-sm leading-relaxed text-muted-foreground">
        {trend.one_line_summary}
      </p>

      {/* Measured 12-month arc — real posts, real engagement, real dates. */}
      <TrendSparkline slug={trend.slug} />

      {trend.sources?.length ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-5 pt-2">
          {trend.sources.slice(0, 2).map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground underline-offset-2 hover:text-primary-strong hover:underline"
              title={s.title}
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">{s.outlet || s.title}</span>
            </a>
          ))}
          {trend.sources.length > 2 ? (
            <span className="text-xs text-faint">
              +{trend.sources.length - 2} more
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pb-4 pt-3">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: tier.color }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{
              background: tier.color,
              boxShadow: inSync ? `0 0 6px ${HARMONY_TIERS.in_sync.glow}` : undefined,
            }}
          />
          {harmony}% {tier.label.toLowerCase()}
        </span>
        <Meta variant={lifecycle.variant}>{lifecycle.label}</Meta>
        <Meta variant={sentiment.variant}>{sentiment.label}</Meta>
        <Meta variant={risk.variant}>{risk.label}</Meta>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border px-5 py-3 text-sm">
        <Link
          href={`/trends/${trend.slug}`}
          className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary-strong"
        >
          View trend <ArrowRight className="size-3.5" />
        </Link>
        <Link
          href={`/brief?trend=${trend.slug}`}
          className="text-muted-foreground hover:text-primary-strong"
        >
          Generate brief
        </Link>
      </div>
    </Card>
  );
}
