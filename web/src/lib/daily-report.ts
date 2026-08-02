import { z } from "zod";
import type { DailyReport, Trend } from "@/types";
import {
  getLatestDailyReport,
  getPulseHistory,
  getTrends,
  upsertDailyReport,
} from "@/lib/data";
import { buildTape } from "@/lib/daily-digest";
import {
  AINotConfiguredError,
  generateStructured,
  isAIConfigured,
} from "@/lib/ai/provider";

// The desk that writes the WaveSight Daily. Once a day it looks at the live
// board — scores, movers, arrivals — and files the issue: a titled lede plus
// a markdown body in the house structure. Claude writes it when configured;
// the deterministic fallback keeps the paper publishing regardless. Either
// way the issue is grounded in the day's measured numbers, never invented.

const DAY_MS = 86_400_000;

const dailyReportSchema = z.object({
  /** Issue title WITHOUT any "WaveSight Daily" prefix, e.g. "Calm Is the New Flex". */
  title: z.string().min(3),
  /** The standfirst: 3-5 sentences summarizing the day's read. */
  summary: z.string().min(40),
  /** Slugs of the 2-3 trends the issue leads with, best first. */
  top_trend_slugs: z.array(z.string()).min(1).max(3),
  /** Markdown body following the house structure exactly. */
  report_markdown: z.string().min(100),
});

export interface GenerateReportResult {
  report: DailyReport;
  created: boolean;
  mock: boolean;
}

function trendLine(t: Trend): string {
  return `- ${t.name} (slug: ${t.slug}) — WaveScore ${t.wavescore} · ${t.lifecycle_stage} · momentum ${t.momentum_score} · sentiment ${t.sentiment_score} · saturation ${t.saturation_score} · ${t.category}: ${t.one_line_summary}`;
}

/**
 * Generate (or return) today's issue. Idempotent per calendar day unless
 * `force` — the cron can fire repeatedly without churning the archive.
 */
export async function generateDailyReport(
  opts: { force?: boolean } = {}
): Promise<GenerateReportResult> {
  const today = new Date().toISOString().slice(0, 10);
  const latest = await getLatestDailyReport();
  if (!opts.force && latest?.report_date === today) {
    return { report: latest, created: false, mock: false };
  }

  const [trends, history] = await Promise.all([getTrends(), getPulseHistory()]);
  const tape = buildTape(history);
  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const arrivals = trends.filter((t) => t.created_at >= weekAgo).slice(0, 6);
  const top = trends.slice(0, 10);

  let output: z.infer<typeof dailyReportSchema> | null = null;
  let mock = true;
  if (isAIConfigured()) {
    try {
      output = await generateStructured({
        system: [
          "You are the editor of the WaveSight Daily — a sharp, trusted morning briefing on the culture market for brand and creator strategists.",
          "Voice: Bloomberg meets a culture desk. Declarative, specific, zero hype. Every claim must trace to the numbers provided; never invent data.",
          "Return a JSON object with EXACTLY these keys:",
          '- "title": string — the issue title WITHOUT any "WaveSight Daily" prefix, e.g. "Calm Is the New Flex"',
          '- "summary": string — the standfirst: 3-5 sentences summarizing the day\'s read',
          '- "top_trend_slugs": array of 2-3 strings — the slugs (given in the data) of the trends the issue leads with, best first',
          '- "report_markdown": string — the issue body in markdown',
          "The report_markdown MUST follow this exact house structure:",
          "## The big picture",
          "(2-3 short paragraphs on the day's dominant undercurrent, grounded in the scores and movers)",
          "### 1. <Exact Trend Name> — WaveScore <n> · <lifecycle>",
          "(one tight paragraph: why it leads today and the concrete move for a brand/creator)",
          "### 2. ... and ### 3. ... in the same shape",
          "### Watchlist",
          "(one paragraph; bold 2-3 **Trend Names** worth watching, with the number that earns each its spot)",
          "### How to act today",
          "(one paragraph of if/then guidance: one move, budget, or a specific asset)",
          "Use the EXACT trend names from the data so the app can link them.",
        ].join("\n"),
        prompt: [
          `Date: ${today}`,
          "",
          "Top of the board (by WaveScore):",
          ...top.map(trendLine),
          "",
          tape.entries.length
            ? `${tape.kind === "movers" ? "Movers since yesterday" : "Current standings"} (harmony = alignment of momentum & sentiment):\n` +
              tape.entries
                .map(
                  (m) =>
                    `- ${m.name}: ${m.harmony}% in sync${m.delta ? ` (${m.delta > 0 ? "+" : ""}${m.delta})` : ""}`
                )
                .join("\n")
            : "No tape data today.",
          "",
          arrivals.length
            ? "New in the library this week:\n" +
              arrivals.map((t) => `- ${t.name} (${t.category})`).join("\n")
            : "No new arrivals this week.",
          "",
          "Write today's issue.",
        ].join("\n"),
        schema: dailyReportSchema,
        maxTokens: 3000,
      });
      mock = false;
    } catch (err) {
      if (!(err instanceof AINotConfiguredError)) {
        console.error("[daily-report] AI generation failed, using mock:", err);
      }
    }
  }
  if (!output) output = mockReport(today, top);

  const bySlug = new Map(trends.map((t) => [t.slug, t]));
  const topIds = output.top_trend_slugs
    .map((s) => bySlug.get(s)?.id)
    .filter((id): id is string => Boolean(id));

  const report: DailyReport = {
    id: `report-${today}`,
    report_date: today,
    title: `WaveSight Daily — ${output.title}`,
    summary: output.summary,
    top_trend_ids: topIds.length ? topIds : top.slice(0, 3).map((t) => t.id),
    generated_report: output.report_markdown,
    created_at: new Date().toISOString(),
  };
  await upsertDailyReport(report);
  return { report, created: true, mock };
}

/** Deterministic issue from the day's numbers — no model, still true. */
function mockReport(
  today: string,
  top: Trend[]
): z.infer<typeof dailyReportSchema> {
  const [a, b, c] = top;
  const leaders = [a, b, c].filter(Boolean) as Trend[];
  const body = [
    "## The big picture",
    `The board opens ${today} with ${leaders.map((t) => `**${t.name}**`).join(", ")} setting the pace. ${a ? `${a.name} leads at WaveScore ${a.wavescore} (${a.lifecycle_stage}).` : ""}`,
    "",
    ...leaders.flatMap((t, i) => [
      `### ${i + 1}. ${t.name} — WaveScore ${t.wavescore} · ${t.lifecycle_stage}`,
      `${t.one_line_summary} Momentum ${t.momentum_score}, sentiment ${t.sentiment_score}, saturation ${t.saturation_score}${t.saturation_score <= 40 ? " — room to lead" : ""}.`,
      "",
    ]),
    "### How to act today",
    `Start with ${a ? `**${a.name}**` : "the top of the board"} while saturation allows; check the radar for the full field.`,
  ].join("\n");
  return {
    title: leaders.length
      ? `${leaders[0].name} Sets the Pace`
      : "The Field, Measured",
    summary: leaders.length
      ? `${leaders.map((t) => t.name).join(", ")} top today's board. ${leaders[0].one_line_summary}`
      : "The pulse is still gathering — today's issue reflects the current library standings.",
    top_trend_slugs: leaders.map((t) => t.slug),
    report_markdown: body,
  };
}
