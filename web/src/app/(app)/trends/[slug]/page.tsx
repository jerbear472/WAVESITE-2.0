import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Sparkles,
  TrendingUp,
  Users,
  UserX,
  Lightbulb,
  Quote,
  Radio,
  Info,
  Camera,
} from "lucide-react";
import { getTrendBySlug } from "@/lib/data";
import { TrendVisual } from "@/components/TrendVisual";
import type { Trend } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WaveScore } from "@/components/WaveScore";
import { ScoreBar } from "@/components/ScoreBar";
import { SignalCard } from "@/components/SignalCard";
import { SaveTrendButton } from "@/components/SaveTrendButton";
import { TrendHistoryChart } from "@/components/TrendHistoryChart";
import { LifecyclePosition } from "@/components/LifecyclePosition";
import {
  lifecycleBadge,
  riskBadge,
  sentimentBadge,
  VIRALITY_LABELS,
  difficultyLabel,
} from "@/lib/trend-format";

export const dynamic = "force-dynamic";

/** One plain-English line explaining the score profile. */
function scoreReadout(trend: Trend): string {
  const momentum =
    trend.momentum_score >= 80
      ? "Strong momentum"
      : trend.momentum_score >= 60
        ? "Promising momentum"
        : "Modest momentum";
  const saturation =
    trend.saturation_score <= 35
      ? "plenty of room to lead"
      : trend.saturation_score <= 60
        ? "manageable saturation"
        : "crowding worth watching";
  return `${momentum} with ${saturation}.`;
}

export default async function TrendDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trend = await getTrendBySlug(slug);
  if (!trend) notFound();

  const lifecycle = lifecycleBadge(trend.lifecycle_stage);
  const risk = riskBadge(trend.risk_level);
  const sentiment = sentimentBadge(trend.sentiment_score);

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/market" className="hover:text-foreground">
          Trend Library
        </Link>
        <ChevronRight className="size-4 text-faint" />
        <span className="truncate text-foreground">{trend.name}</span>
      </nav>

      {/* Editorial header */}
      <header className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-primary-strong">{trend.category}</p>
          <h1 className="mt-3 font-display text-[2.75rem] leading-[1.0] tracking-tight sm:text-[3.25rem] xl:text-[3.5rem]">
            {trend.name}
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg leading-[1.55] text-muted-foreground">
            {trend.one_line_summary}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant={lifecycle.variant}>{lifecycle.label}</Badge>
            <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
            <Badge variant={risk.variant}>{risk.label}</Badge>
            <Badge variant="default">
              {VIRALITY_LABELS[trend.virality_type] ?? trend.virality_type}
            </Badge>
            <Badge variant="default">
              {difficultyLabel(trend.participation_difficulty)} to join
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <SaveTrendButton trendId={trend.id} />
          <Link
            href={`/brief?trend=${trend.slug}`}
            className={buttonVariants({ variant: "primary" })}
          >
            <Sparkles /> Generate Brief
          </Link>
        </div>
      </header>

      {/* Visual read — real source media, or the honest waveform */}
      <div className="group relative mt-10 h-64 overflow-hidden rounded-2xl bg-surface-2 sm:h-80">
        <TrendVisual
          trend={trend}
          sizes="(max-width: 1200px) 100vw, 1200px"
        />
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-faint">
        <Camera className="size-3.5" />
        {trend.hero_image_url
          ? "Media from a real source behind this trend."
          : "No real media captured yet — the visual appears when the measurement layer finds actual posts."}
      </p>

      {/* Measured history — the arc with its receipts */}
      <div className="mt-10">
        <TrendHistoryChart slug={trend.slug} />
      </div>

      {/* Where the trend sits on the wave, with the evidence behind the call */}
      <div className="mt-6">
        <LifecyclePosition trend={trend} />
      </div>

      {/* Analytical body — 68 / 32 */}
      <div className="mt-12 grid items-start gap-6 lg:grid-cols-[68fr_32fr]">
        {/* Left: insight column */}
        <div className="space-y-6">
          <Card className="p-7 sm:p-8">
            <p className="max-w-[62ch] text-base leading-[1.65] text-foreground">
              {trend.detailed_summary}
            </p>

            <div className="mt-8 border-t border-border pt-7">
              <Section icon={TrendingUp} title="Why it's spreading" tone="primary">
                {trend.why_spreading}
              </Section>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border-l-2 border-success bg-success-tint/50 p-5">
                <Section icon={Users} title="Who should join" tone="success">
                  {trend.who_should_join}
                </Section>
              </div>
              <div className="rounded-xl border-l-2 border-danger bg-danger-tint/50 p-5">
                <Section icon={UserX} title="Who should avoid" tone="danger">
                  {trend.who_should_avoid}
                </Section>
              </div>
            </div>
          </Card>

          {trend.creative_angles && trend.creative_angles.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <Lightbulb className="size-[18px] text-primary" /> Creative
                  angles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {trend.creative_angles.map((a, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-[15px] leading-relaxed text-foreground"
                    >
                      <span className="pt-0.5 text-xs font-semibold tabular-nums text-faint">
                        0{i + 1}
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {trend.sample_hooks && trend.sample_hooks.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <Quote className="size-[18px] text-primary" /> In the wild —
                  example content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trend.sample_hooks.slice(0, 3).map((h, i) => (
                    <figure
                      key={i}
                      className="flex flex-col justify-between rounded-xl border-l-2 border-primary bg-primary-tint/40 px-4 py-4"
                    >
                      <figcaption className="text-[15px] font-medium leading-snug text-foreground">
                        “{h}”
                      </figcaption>
                      {trend.best_platforms[i % trend.best_platforms.length] ? (
                        <span className="mt-3 w-fit rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {trend.best_platforms[i % trend.best_platforms.length]}
                        </span>
                      ) : null}
                    </figure>
                  ))}
                </div>
                <p className="mt-3 text-xs text-faint">
                  Example hooks — the kind of line this trend rewards.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Radio className="size-[18px] text-primary" /> Signals behind
                this trend
                <span className="font-normal text-muted-foreground">
                  ({trend.signals.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trend.signals.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {trend.signals.map((s) => (
                    <SignalCard key={s.id} signal={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No signals attached yet. Add some on the{" "}
                  <Link href="/internal/import" className="text-primary-strong underline">
                    import page
                  </Link>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: signal readout */}
        <div className="space-y-6">
          <Card className="p-7">
            <p className="eyebrow text-faint">Signal readout</p>
            <h2 className="mt-1 text-[15px] font-semibold">WaveScore</h2>

            <div className="mt-6 flex flex-col items-center">
              <WaveScore score={trend.wavescore} size={132} strokeWidth={9} />
              <p className="mt-5 max-w-[26ch] text-center text-sm leading-relaxed text-muted-foreground">
                {scoreReadout(trend)}
              </p>
            </div>

            <div className="mt-7 divide-y divide-border border-t border-border">
              <div className="py-4">
                <ScoreBar label="Momentum" value={trend.momentum_score} tone="blue" />
              </div>
              <div className="py-4">
                <ScoreBar label="Sentiment" value={trend.sentiment_score} tone="blue" />
              </div>
              <div className="py-4">
                <ScoreBar
                  label="Brand safety"
                  value={trend.brand_safety_score}
                  tone="blue"
                />
              </div>
              <div className="py-4">
                <ScoreBar
                  label="Saturation"
                  value={trend.saturation_score}
                  tone="amber"
                />
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-snug text-faint">
                  <Info className="size-3.5 shrink-0" /> Lower is better — more
                  room to lead.
                </p>
              </div>
              <div className="py-4">
                <ScoreBar
                  label="Commercial relevance"
                  value={trend.commercial_relevance_score}
                  tone="blue"
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">Trend profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <Meta label="Emotional tone" value={trend.emotional_tone} />
              <Meta label="Audience" value={trend.audience} />
              <Meta
                label="Virality"
                value={VIRALITY_LABELS[trend.virality_type] ?? trend.virality_type}
              />
              <Meta
                label="Participation"
                value={`${difficultyLabel(trend.participation_difficulty)} · ${trend.risk_level} risk`}
              />
              <div className="pt-1">
                <p className="eyebrow text-faint">Best platforms</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {trend.best_platforms.map((p) => (
                    <Badge key={p} variant="primary">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  tone = "primary",
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  tone?: "primary" | "success" | "danger";
  children: React.ReactNode;
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-primary-strong";
  return (
    <div>
      <h3 className={`eyebrow mb-2.5 flex items-center gap-2 ${color}`}>
        <Icon className="size-[18px]" strokeWidth={1.75} />
        {title}
      </h3>
      <p className="text-[15px] leading-[1.65] text-foreground">{children}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="eyebrow text-faint">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
