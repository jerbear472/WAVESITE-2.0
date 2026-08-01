import type { Metadata } from "next";
import Link from "next/link";
import {
  getLatestDailyReport,
  getTrendById,
  getPulseHistory,
} from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendCard } from "@/components/TrendCard";
import { Delta } from "@/components/HarmonyBoard";
import { formatDate } from "@/lib/utils";
import type { Trend } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today — WaveSight",
  description:
    "The daily read: what moved since the last pulse, and today's report on where culture is heading.",
};

export default async function TodayPage() {
  const [report, history] = await Promise.all([
    getLatestDailyReport(),
    getPulseHistory(),
  ]);

  const movers = topMovers(history);
  const lastRun = history.runs.at(-1) ?? null;

  const topTrends = report
    ? (
        await Promise.all(report.top_trend_ids.map((id) => getTrendById(id)))
      ).filter((t): t is Trend => Boolean(t))
    : [];

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <Badge variant="primary">
            <span className="live-dot inline-block size-1.5 rounded-full bg-primary" />
            WaveSight Daily
          </Badge>
          <span className="text-sm text-muted-foreground">
            {report ? formatDate(report.report_date) : formatDate(new Date().toISOString())}
            {lastRun
              ? ` · last pulse ${new Date(lastRun.ran_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : null}
          </span>
        </div>
        {report ? (
          <>
            <h1 className="mt-3 font-display text-4xl tracking-tight text-balance">
              {report.title}
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground text-balance">
              {report.summary}
            </p>
          </>
        ) : (
          <h1 className="mt-3 font-display text-4xl tracking-tight text-balance">
            No report yet today
          </h1>
        )}
      </header>

      {movers.length ? (
        <section>
          <h2 className="mb-3 font-display text-xl">Since the last pulse</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {movers.map((m) => (
                <Link
                  key={m.slug}
                  href={`/trends/${m.slug}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                      {m.category}
                    </p>
                    <p className="truncate font-display text-base leading-tight">
                      {m.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm tnum text-muted-foreground">
                      {m.harmony}% in sync
                    </span>
                    <Delta value={m.delta} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {topTrends.length ? (
        <section>
          <h2 className="mb-4 font-display text-xl">Top trends today</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {topTrends.map((t) => (
              <TrendCard key={t.id} trend={t} />
            ))}
          </div>
        </section>
      ) : null}

      {report ? (
        <Card>
          <CardContent className="p-6 sm:p-8">
            <article className="max-w-none">
              <Markdown text={report.generated_report} />
            </article>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex items-center justify-center border-dashed">
          <div className="px-6 py-16 text-center text-muted-foreground">
            No daily report has been generated yet. The pulse keeps running on
            schedule — check back after the next run, or{" "}
            <Link href="/radar" className="text-primary-strong underline">
              explore the radar
            </Link>{" "}
            in the meantime.
          </div>
        </Card>
      )}
    </div>
  );
}

interface Mover {
  slug: string;
  name: string;
  category: string;
  harmony: number;
  delta: number;
}

/** Biggest harmony moves between the last two pulse runs. */
function topMovers(
  history: Awaited<ReturnType<typeof getPulseHistory>>,
  limit = 5
): Mover[] {
  const runs = history.runs;
  if (runs.length < 2) return [];
  const lastId = runs[runs.length - 1].id;
  const prevId = runs[runs.length - 2].id;

  const movers: Mover[] = [];
  for (const s of history.series) {
    const last = s.points.find((p) => p.run_id === lastId);
    const prev = s.points.find((p) => p.run_id === prevId);
    if (!last || !prev) continue;
    const delta = last.harmony - prev.harmony;
    if (delta === 0) continue;
    movers.push({
      slug: s.trend.slug,
      name: s.trend.name,
      category: s.trend.category,
      harmony: last.harmony,
      delta,
    });
  }
  return movers
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit);
}

/** Minimal markdown renderer for the report body (headings + paragraphs). */
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("### ")) {
      out.push(
        <h3 key={i} className="mt-6 font-display text-lg text-foreground">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      out.push(
        <h2 key={i} className="mt-6 font-display text-xl text-foreground">
          {trimmed.slice(3)}
        </h2>
      );
    } else {
      out.push(
        <p
          key={i}
          className="mt-3 leading-relaxed text-foreground/90"
          dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }}
        />
      );
    }
  });

  return <>{out}</>;
}

/** Bold (**text**) only — content is fully trusted (seeded/AI report). */
function renderInline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
