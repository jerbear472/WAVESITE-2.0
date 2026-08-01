"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  X,
  Copy,
  ArrowUpRight,
  Clapperboard,
  Music2,
} from "lucide-react";
import { heroImageForTrend } from "@/lib/trend-images";
import type { Trend, UserType } from "@/types";
import type { CreativeBriefResult } from "@/lib/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Props {
  trends: Trend[];
  initialTrend?: string;
}

const USER_TYPES: UserType[] = [
  "creator",
  "marketer",
  "agency",
  "artist",
  "brand",
];
const GOALS = [
  { value: "awareness", label: "Awareness" },
  { value: "engagement", label: "Engagement" },
  { value: "sales", label: "Sales" },
  { value: "music_promotion", label: "Music promotion" },
  { value: "community_growth", label: "Community growth" },
  { value: "campaign_idea", label: "Campaign idea" },
];
const TONES = [
  "funny",
  "premium",
  "wholesome",
  "edgy",
  "educational",
  "aspirational",
];

type BriefResponse = CreativeBriefResult & { _mock: boolean };

export function BriefGenerator({ trends, initialTrend }: Props) {
  const [userType, setUserType] = useState<UserType>("creator");
  const [niche, setNiche] = useState("");
  const [goal, setGoal] = useState("awareness");
  const [tone, setTone] = useState("premium");
  const [trendSlug, setTrendSlug] = useState(
    initialTrend && trends.some((t) => t.slug === initialTrend)
      ? initialTrend
      : "auto"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [usedTrend, setUsedTrend] = useState<{ name: string; slug: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  // Auto-recommend: best trend for this user type (highest WaveScore, and for
  // brands/agencies bias toward brand-safe, low-risk picks).
  const autoTrend = useMemo(() => {
    const safetyBias = userType === "brand" || userType === "agency";
    const ranked = [...trends].sort((a, b) => {
      const sa = a.wavescore + (safetyBias ? a.brand_safety_score / 4 : 0);
      const sb = b.wavescore + (safetyBias ? b.brand_safety_score / 4 : 0);
      return sb - sa;
    });
    return ranked[0];
  }, [trends, userType]);

  async function generate() {
    setLoading(true);
    setError(null);
    setBrief(null);
    setUsedTrend(null);
    const slug = trendSlug === "auto" ? autoTrend?.slug : trendSlug;
    try {
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trend: slug, userType, niche, goal, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setBrief(data.brief);
      setUsedTrend(data.trend);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate brief.");
    } finally {
      setLoading(false);
    }
  }

  function copyCaption() {
    if (!brief?.suggested_caption) return;
    navigator.clipboard.writeText(brief.suggested_caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Form */}
      <Card className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
        <CardHeader>
          <CardTitle>Brief inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="userType">I am a</Label>
            <Select
              id="userType"
              value={userType}
              onChange={(e) => setUserType(e.target.value as UserType)}
            >
              {USER_TYPES.map((u) => (
                <option key={u} value={u}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="niche">My niche / brand / audience</Label>
            <Input
              id="niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. indie coffee brand for remote workers"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal">Goal</Label>
              <Select
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              >
                {GOALS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tone">Tone</Label>
              <Select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trend">Trend</Label>
            <Select
              id="trend"
              value={trendSlug}
              onChange={(e) => setTrendSlug(e.target.value)}
            >
              <option value="auto">
                ✨ Auto-recommend{autoTrend ? ` (${autoTrend.name})` : ""}
              </option>
              {trends.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} · {t.wavescore}
                </option>
              ))}
            </Select>
          </div>

          <Button
            onClick={generate}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Generating brief…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Generate Creative Brief
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      <div className="lg:col-span-3">
        {error ? (
          <Card className="border-danger/40">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
              <div>
                <p className="font-medium text-danger">
                  Couldn&apos;t generate the brief
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={generate}
                >
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : loading ? (
          <BriefSkeleton />
        ) : brief ? (
          <BriefOutput
            brief={brief}
            usedTrend={usedTrend}
            trendData={trends.find((t) => t.slug === usedTrend?.slug)}
            onCopy={copyCaption}
            copied={copied}
          />
        ) : (
          <EmptyBrief />
        )}
      </div>
    </div>
  );
}

function BriefOutput({
  brief,
  usedTrend,
  trendData,
  onCopy,
  copied,
}: {
  brief: BriefResponse;
  usedTrend: { name: string; slug: string } | null;
  trendData?: Trend;
  onCopy: () => void;
  copied: boolean;
}) {
  const frameBg = trendData ? heroImageForTrend(trendData) : null;
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
              Your portal to going viral
            </p>
            {brief._mock ? (
              <Badge variant="warning">Mock AI</Badge>
            ) : (
              <Badge variant="success">Claude</Badge>
            )}
          </div>
          {usedTrend ? (
            <div className="mt-1 flex items-center gap-2">
              <h2 className="font-display text-2xl">
                How to hop on {usedTrend.name}
              </h2>
              <Link
                href={`/trends/${usedTrend.slug}`}
                className="text-muted-foreground hover:text-primary-strong"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          ) : null}
          <p className="mt-3 leading-relaxed text-foreground/90">
            {brief.recommendation}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-primary/20 bg-primary-tint/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-primary-strong">
                The format (sacred — don&apos;t break it)
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                {brief.trend_mechanics}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Why it fits you
              </p>
              <p className="mt-1 text-sm text-foreground/90">{brief.why_it_fits}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The visual: shot-by-shot storyboard in vertical-video frames */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center gap-2">
          <Clapperboard className="size-4 text-primary-strong" />
          <CardTitle>Storyboard — shoot exactly this</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {brief.storyboard.map((f, i) => (
              <div key={i} className="w-44 shrink-0">
                <div className="panel relative aspect-[9/16] overflow-hidden rounded-xl">
                  {frameBg ? (
                    <Image
                      src={frameBg}
                      alt=""
                      fill
                      sizes="176px"
                      className="object-cover opacity-25"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />
                  <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white">
                    {f.timestamp}
                  </span>
                  <span className="absolute right-2 top-2 font-mono text-[10px] text-white/60">
                    {i + 1}/{brief.storyboard.length}
                  </span>
                  {f.on_screen_text ? (
                    <p className="absolute inset-x-2 top-1/2 -translate-y-1/2 text-center font-display text-[15px] leading-snug text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
                      {f.on_screen_text}
                    </p>
                  ) : null}
                  <p className="absolute inset-x-2.5 bottom-2.5 text-[11px] leading-snug text-white/85">
                    {f.shot}
                  </p>
                </div>
                <p className="mt-1.5 font-mono text-[11px] leading-snug text-muted-foreground">
                  {f.direction}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground/90">
              <Music2 className="size-4 text-primary-strong" />
              {brief.sound}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brief.hashtags.map((h) => (
              <Badge key={h} variant="default" className="font-mono text-xs">
                #{h.replace(/^#/, "")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* The how-to: hop-in checklist */}
      <Card>
        <CardHeader>
          <CardTitle>How to hop in</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {brief.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="bg-gradient-brand flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {s.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creative strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-foreground/90">
            {brief.creative_strategy}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5 hooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {brief.hooks.map((h, i) => (
            <p
              key={i}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground/90"
            >
              <span className="mr-2 font-mono text-xs text-primary-strong">
                0{i + 1}
              </span>
              {h}
            </p>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-success">Do this</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.do_this.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-danger">Avoid this</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.avoid_this.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <X className="mt-0.5 size-4 shrink-0 text-danger" />
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {brief.post_formats.map((p, i) => (
              <Badge key={i} variant="default" className="px-3 py-1">
                {p}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90">{brief.risk_notes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Best platform</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="primary" className="px-3 py-1 text-sm">
              {brief.best_platform}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Suggested caption</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            {copied ? (
              <>
                <Check className="size-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" /> Copy
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm italic text-foreground/90">
            {brief.suggested_caption}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyBrief() {
  return (
    <Card className="flex h-full min-h-[400px] items-center justify-center border-dashed">
      <div className="max-w-sm px-6 py-12 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Sparkles className="size-6 text-primary-strong" />
        </span>
        <h3 className="mt-4 font-display text-lg">
          Your creative brief appears here
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pick a trend and WaveSight builds your portal to going viral — the
          trend&apos;s exact format, a shot-by-shot storyboard, and a
          step-by-step plan to hop in.
        </p>
      </div>
    </Card>
  );
}

function BriefSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-6">
            <div className="shimmer h-3 w-28 rounded bg-surface-2" />
            <div className="shimmer h-6 w-2/3 rounded bg-surface-2" />
            <div className="shimmer h-4 w-full rounded bg-surface-2" />
            <div className="shimmer h-4 w-5/6 rounded bg-surface-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
