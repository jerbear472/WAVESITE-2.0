"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Eye,
  Flame,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The Signals Desk client layer — search, sectioned rows, and the three
// actions (track / dismiss / promote) wired to /api/terms/action. Optimistic:
// a dismissed row leaves immediately; promote swaps in a "view trend" link.

export interface SignalRowData {
  term_id: string;
  canonical: string;
  status: "candidate" | "tracked" | "promoted" | "retired";
  category: string | null;
  source_of_discovery: string;
  first_seen_at: string;
  cascade_state:
    | "dormant"
    | "embryonic"
    | "emerging"
    | "breaking"
    | "mainstream"
    | "decaying"
    | null;
  breadth: number;
  composite_score: number;
  sources_flagged: string[];
  sources_available: string[];
  lead_estimate_days: number | null;
  trend_slug: string | null;
}

const SOURCES = [
  { id: "bluesky", label: "Bluesky" },
  { id: "reddit", label: "Reddit" },
  { id: "google_trends", label: "Google Trends" },
  { id: "youtube", label: "YouTube" },
  { id: "wikipedia", label: "Wikipedia" },
];

const CASCADE_CHIP: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  embryonic: { label: "Embryonic", color: "#6d5bd0", bg: "rgba(109,91,208,.1)" },
  emerging: { label: "Emerging", color: "#2865d8", bg: "rgba(52,120,246,.1)" },
  breaking: { label: "Breaking", color: "#b77900", bg: "rgba(183,121,0,.1)" },
  mainstream: { label: "Mainstream", color: "#159a78", bg: "rgba(21,154,120,.1)" },
  decaying: { label: "Decaying", color: "#8a94a6", bg: "rgba(138,148,166,.12)" },
  dormant: { label: "Quiet", color: "#8a94a6", bg: "rgba(138,148,166,.12)" },
};

const DISCOVERY_LABEL: Record<string, string> = {
  trend_library: "library seed",
  scan: "deep scan",
  bluesky: "Bluesky frontier",
  reddit: "Reddit frontier",
  youtube: "YouTube frontier",
  google_trends: "Google Trends frontier",
  wikipedia: "Wikipedia frontier",
};

export function SignalsDesk({
  rows,
  lastIngest,
}: {
  rows: SignalRowData[];
  lastIngest: { date: string; sourcesOk: number; sourcesTotal: number } | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [promotedSlugs, setPromotedSlugs] = useState<Map<string, string>>(
    new Map()
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !gone.has(r.term_id))
      .filter((r) => !q || r.canonical.toLowerCase().includes(q));
  }, [rows, gone, query]);

  const firing = visible
    .filter((r) => r.sources_flagged.length > 0)
    .sort((a, b) => b.composite_score - a.composite_score);
  const candidates = visible
    .filter((r) => r.status === "candidate" && r.sources_flagged.length === 0)
    .sort((a, b) => b.first_seen_at.localeCompare(a.first_seen_at));
  const watchlist = visible
    .filter(
      (r) => r.status !== "candidate" && r.sources_flagged.length === 0
    )
    .sort((a, b) => a.canonical.localeCompare(b.canonical));

  async function act(row: SignalRowData, action: "track" | "dismiss" | "promote") {
    setBusy(`${row.term_id}:${action}`);
    setNotice(null);
    try {
      const res = await fetch("/api/terms/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term_id: row.term_id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "action failed");
      if (action === "dismiss") {
        setGone((s) => new Set(s).add(row.term_id));
        setNotice(`Dismissed “${row.canonical}” — logged and retired.`);
      } else if (action === "promote") {
        if (data.trend?.slug) {
          setPromotedSlugs((m) => new Map(m).set(row.term_id, data.trend.slug));
        }
        setNotice(
          `Promoted “${row.canonical}” to the library${data.trend?.name ? ` as “${data.trend.name}”` : ""}.`
        );
      } else {
        setNotice(`Tracking “${row.canonical}” — measured daily from here on.`);
      }
      router.refresh();
    } catch (err) {
      setNotice(
        `Action failed: ${err instanceof Error ? err.message : "unknown error"}`
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Glance strip + search */}
      <div className="flex flex-wrap items-center gap-3">
        <Stat label="Firing now" value={firing.length} tone="#b77900" />
        <Stat label="Candidates in review" value={candidates.length} tone="#6d5bd0" />
        <Stat label="On the watchlist" value={watchlist.length} tone="#3478f6" />
        {lastIngest ? (
          <span className="text-xs text-muted-foreground">
            Last ingestion {lastIngest.date} · {lastIngest.sourcesOk}/
            {lastIngest.sourcesTotal} sources ok
          </span>
        ) : null}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms…"
            className="h-9 w-56 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-faint focus:border-primary"
          />
        </div>
      </div>

      {notice ? (
        <div className="rounded-lg border border-border bg-primary-tint/60 px-4 py-2.5 text-sm text-foreground">
          {notice}
        </div>
      ) : null}

      <Section
        icon={Flame}
        title="Firing now"
        hint="Accelerating against their own baseline on at least one platform — the cascade names the stage."
        empty="Nothing is persistently firing right now. Baselines are still filling — acceleration flags need about a week of daily counts."
        rows={firing}
        busy={busy}
        promotedSlugs={promotedSlugs}
        onAct={act}
      />

      <Section
        icon={Sparkles}
        title="Candidates in review"
        hint="Fresh language pulled from real posts by the frontier extractor. 21 days to show acceleration — or your call, right now."
        empty="No candidates waiting. The next ingestion run extracts new phrases from live platform chatter."
        rows={candidates}
        busy={busy}
        promotedSlugs={promotedSlugs}
        onAct={act}
      />

      <Section
        icon={Eye}
        title="Watchlist"
        hint="Tracked and promoted terms currently quiet — measured daily, ready to flag the moment they move."
        empty="Watchlist is empty."
        rows={watchlist}
        busy={busy}
        promotedSlugs={promotedSlugs}
        onAct={act}
        collapsedCount={12}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
      <span className="size-1.5 rounded-full" style={{ background: tone }} />
      <span className="font-mono font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  empty,
  rows,
  busy,
  promotedSlugs,
  onAct,
  collapsedCount,
}: {
  icon: typeof Flame;
  title: string;
  hint: string;
  empty: string;
  rows: SignalRowData[];
  busy: string | null;
  promotedSlugs: Map<string, string>;
  onAct: (row: SignalRowData, action: "track" | "dismiss" | "promote") => void;
  collapsedCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown =
    collapsedCount && !expanded ? rows.slice(0, collapsedCount) : rows;

  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Icon className="size-[18px] text-primary" /> {title}
          <span className="font-mono text-sm font-normal text-muted-foreground">
            {rows.length}
          </span>
        </h2>
        <p className="hidden text-xs text-muted-foreground sm:block">{hint}</p>
      </div>
      <Card>
        {rows.length === 0 ? (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {empty}
          </CardContent>
        ) : (
          <CardContent className="divide-y divide-border p-0">
            {shown.map((row) => (
              <TermRow
                key={row.term_id}
                row={row}
                busy={busy}
                promotedSlug={promotedSlugs.get(row.term_id) ?? row.trend_slug}
                onAct={onAct}
              />
            ))}
            {collapsedCount && rows.length > collapsedCount ? (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full px-5 py-3 text-center text-sm font-medium text-primary-strong hover:bg-muted/50"
              >
                {expanded
                  ? "Show fewer"
                  : `Show all ${rows.length} terms`}
              </button>
            ) : null}
          </CardContent>
        )}
      </Card>
    </section>
  );
}

function TermRow({
  row,
  busy,
  promotedSlug,
  onAct,
}: {
  row: SignalRowData;
  busy: string | null;
  promotedSlug: string | null;
  onAct: (row: SignalRowData, action: "track" | "dismiss" | "promote") => void;
}) {
  const chip = CASCADE_CHIP[row.cascade_state ?? "dormant"];
  const isBusy = (a: string) => busy === `${row.term_id}:${a}`;
  const anyBusy = busy?.startsWith(`${row.term_id}:`) ?? false;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      {/* Name + provenance */}
      <div className="min-w-0 flex-1 basis-52">
        <p className="truncate font-medium text-foreground">{row.canonical}</p>
        <p className="mt-0.5 text-xs text-faint">
          via {DISCOVERY_LABEL[row.source_of_discovery] ?? row.source_of_discovery}
          {row.category ? ` · ${row.category}` : ""}
          {" · since "}
          {new Date(row.first_seen_at).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Cascade chip */}
      <span
        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ color: chip.color, background: chip.bg }}
      >
        {chip.label}
      </span>

      {/* Breadth dots — one per platform, lit when persistently firing */}
      <span className="flex items-center gap-1" aria-label="platform breadth">
        {SOURCES.map((s) => {
          const flagged = row.sources_flagged.includes(s.id);
          const available = row.sources_available.includes(s.id);
          return (
            <span
              key={s.id}
              title={`${s.label}: ${flagged ? "firing" : available ? "measured, quiet" : "no data"}`}
              className={cn(
                "size-2 rounded-full",
                flagged
                  ? "bg-primary"
                  : available
                    ? "bg-border-strong"
                    : "border border-border bg-transparent"
              )}
            />
          );
        })}
      </span>

      {/* Composite */}
      <span
        className="w-14 text-right font-mono text-sm tabular-nums text-muted-foreground"
        title="Composite score — breadth × 10 + acceleration magnitude"
      >
        {row.composite_score > 0 ? row.composite_score.toFixed(0) : "—"}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {promotedSlug ? (
          <Link
            href={`/trends/${promotedSlug}`}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-strong hover:bg-primary-tint"
          >
            View trend <ArrowUpRight className="size-3.5" />
          </Link>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={anyBusy}
            onClick={() => onAct(row, "promote")}
            title="Create a library trend from this term now"
          >
            {isBusy("promote") ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Promote
          </Button>
        )}
        {row.status === "candidate" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={anyBusy}
            onClick={() => onAct(row, "track")}
            title="Keep measuring past the 21-day candidate window"
          >
            {isBusy("track") ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Track
          </Button>
        ) : null}
        {!promotedSlug ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={anyBusy}
            onClick={() => onAct(row, "dismiss")}
            title="Retire this term (logged)"
          >
            {isBusy("dismiss") ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
