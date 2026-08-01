import { getLatestDailyReport, getTrendById } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendCard } from "@/components/TrendCard";
import { formatDate } from "@/lib/utils";
import type { Trend } from "@/types";

export const dynamic = "force-dynamic";

export default async function DailyReportPage() {
  const report = await getLatestDailyReport();

  if (!report) {
    return (
      <Card className="flex items-center justify-center border-dashed">
        <div className="px-6 py-16 text-center text-muted-foreground">
          No daily report has been generated yet.
        </div>
      </Card>
    );
  }

  const topTrends = (
    await Promise.all(report.top_trend_ids.map((id) => getTrendById(id)))
  ).filter((t): t is Trend => Boolean(t));

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <Badge variant="primary">
            <span className="live-dot inline-block size-1.5 rounded-full bg-primary" />
            WaveSight Daily
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(report.report_date)}
          </span>
        </div>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-balance">
          {report.title}
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground text-balance">
          {report.summary}
        </p>
      </header>

      {topTrends.length ? (
        <section>
          <h2 className="mb-4 font-display text-xl">
            Top trends today
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {topTrends.map((t) => (
              <TrendCard key={t.id} trend={t} />
            ))}
          </div>
        </section>
      ) : null}

      <Card>
        <CardContent className="p-6 sm:p-8">
          <article className="max-w-none">
            <Markdown text={report.generated_report} />
          </article>
        </CardContent>
      </Card>
    </div>
  );
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
        <h3
          key={i}
          className="mt-6 font-display text-lg text-foreground"
        >
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      out.push(
        <h2
          key={i}
          className="mt-6 font-display text-xl text-foreground"
        >
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
