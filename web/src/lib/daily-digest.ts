import type { DailyReport, Trend } from "@/types";
import {
  getForecasts,
  getLatestDailyReport,
  getPulseHistory,
  getTrendById,
  getTrends,
} from "@/lib/data";

// The WaveSight Daily as a content model. One builder assembles the issue
// from live data; two renderers consume it — the /today page and the
// email-safe newsletter HTML. Keeping the model shared means the page IS the
// newsletter: what you read in the app is exactly what subscribers get.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://wavesight.vercel.app";

export interface DigestStory {
  /** 2 = section ("The big picture"), 3 = ranked entry. */
  level: 2 | 3;
  heading: string;
  /** Slug of the trend this story is about, when the heading names one. */
  slug: string | null;
  paragraphs: string[];
}

export interface DigestMover {
  slug: string;
  name: string;
  category: string;
  harmony: number;
  delta: number;
}

/**
 * The tape never runs empty: when the board actually moved it shows movers;
 * on a flat day (e.g. a sync run rewrites identical scores) it falls back to
 * the current standings so every issue still opens with the market.
 */
export interface DigestTape {
  kind: "movers" | "standings";
  entries: DigestMover[];
}

export interface MachineStats {
  watched: number;
  firing: number;
  opened: number;
  resolved: number;
  pending: number;
}

export interface DailyDigest {
  /** ISO date the issue covers. */
  date: string;
  /** Display title with the "WaveSight Daily —" prefix stripped. */
  title: string;
  summary: string;
  stories: DigestStory[];
  topTrends: Trend[];
  tape: DigestTape;
  newArrivals: Trend[];
  machine: MachineStats;
  lastPulseAt: string | null;
  hasReport: boolean;
}

const DAY_MS = 86_400_000;

/** "WaveSight Daily — Calm Is the New Flex" -> "Calm Is the New Flex" */
function displayTitle(report: DailyReport): string {
  const m = report.title.match(/^\s*wavesight daily\s*[—–:-]\s*(.+)$/i);
  return m ? m[1] : report.title;
}

/**
 * The tape. Movers are measured against the most recent run at least 12h
 * older than the latest one — back-to-back runs minutes apart rarely differ,
 * and a daily issue should read day-over-day. When nothing moved at all,
 * fall back to the current standings.
 */
export function buildTape(
  history: Awaited<ReturnType<typeof getPulseHistory>>,
  limit = 6
): DigestTape {
  const runs = history.runs;
  const last = runs[runs.length - 1];

  const standings = (): DigestTape => ({
    kind: "standings",
    entries: history.series
      .map((s) => ({ series: s, point: s.points.at(-1) }))
      .filter((x) => x.point)
      .sort((a, b) => b.point!.harmony - a.point!.harmony)
      .slice(0, limit)
      .map(({ series, point }) => ({
        slug: series.trend.slug,
        name: series.trend.name,
        category: series.trend.category,
        harmony: point!.harmony,
        delta: 0,
      })),
  });

  if (!last || runs.length < 2) return standings();

  const cutoff = Date.parse(last.ran_at) - 12 * 3_600_000;
  const baseline =
    [...runs]
      .reverse()
      .find((r) => r.id !== last.id && Date.parse(r.ran_at) <= cutoff) ??
    runs[runs.length - 2];

  const movers: DigestMover[] = [];
  for (const s of history.series) {
    const now = s.points.find((p) => p.run_id === last.id);
    const then = s.points.find((p) => p.run_id === baseline.id);
    if (!now || !then) continue;
    const delta = now.harmony - then.harmony;
    if (delta === 0) continue;
    movers.push({
      slug: s.trend.slug,
      name: s.trend.name,
      category: s.trend.category,
      harmony: now.harmony,
      delta,
    });
  }
  if (movers.length === 0) return standings();
  return {
    kind: "movers",
    entries: movers
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, limit),
  };
}

/** What the measurement loop did in the last 24h. */
async function loadMachineStats(): Promise<MachineStats> {
  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const forecasts = await getForecasts().catch(() => []);
  const opened = forecasts.filter((f) => f.created_at >= dayAgo).length;
  const resolved = forecasts.filter(
    (f) => f.resolved_at && f.resolved_at >= dayAgo
  ).length;
  const pending = forecasts.filter((f) => f.status === "pending").length;

  let firing = 0;
  let watched = 0;
  try {
    const { getActiveTerms, getLatestComposites } = await import(
      "@/lib/terms/store"
    );
    const sinceDate = new Date(Date.now() - 3 * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const [terms, composites] = await Promise.all([
      getActiveTerms(),
      getLatestComposites(sinceDate),
    ]);
    watched = terms.length;
    firing = [...composites.values()].filter(
      (c) => c.sources_flagged.length > 0
    ).length;
  } catch {
    // measurement layer offline — tiles show library-only numbers
  }
  return { watched, firing, opened, resolved, pending };
}

/**
 * Parse the report's markdown body into structured stories. Headings open a
 * story; plain lines join the open story's paragraphs. When a ### heading
 * names a library trend ("1. Quiet Luxury Workspace — WaveScore 87 · …"),
 * the story links to it.
 */
function parseStories(markdown: string, trends: Trend[]): DigestStory[] {
  const stories: DigestStory[] = [];
  let open: DigestStory | null = null;

  const slugFor = (heading: string): string | null => {
    const h = heading.toLowerCase();
    const hit = trends.find((t) => h.includes(t.name.toLowerCase()));
    return hit?.slug ?? null;
  };

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    if (h3 || h2) {
      const heading = (h3?.[1] ?? h2?.[1] ?? "").trim();
      open = {
        level: h3 ? 3 : 2,
        heading,
        slug: slugFor(heading),
        paragraphs: [],
      };
      stories.push(open);
    } else {
      if (!open) {
        open = { level: 2, heading: "", slug: null, paragraphs: [] };
        stories.push(open);
      }
      open.paragraphs.push(line);
    }
  }
  return stories;
}

export async function buildDailyDigest(): Promise<DailyDigest> {
  const [report, history, machine, trends] = await Promise.all([
    getLatestDailyReport(),
    getPulseHistory(),
    loadMachineStats(),
    getTrends(),
  ]);

  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const newArrivals = trends
    .filter((t) => t.created_at >= weekAgo)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  const topTrends = report
    ? (
        await Promise.all(report.top_trend_ids.map((id) => getTrendById(id)))
      ).filter((t): t is Trend => Boolean(t))
    : [];

  return {
    date: report?.report_date ?? new Date().toISOString().slice(0, 10),
    title: report ? displayTitle(report) : "The pulse is still gathering",
    summary:
      report?.summary ??
      "No report has been generated yet today. The pulse keeps running on schedule — the next issue assembles itself from what it measures.",
    stories: report ? parseStories(report.generated_report, trends) : [],
    topTrends,
    tape: buildTape(history),
    newArrivals,
    machine,
    lastPulseAt: history.runs.at(-1)?.ran_at ?? null,
    hasReport: Boolean(report),
  };
}

// ---------------------------------------------------------------------------
// Email renderer — one self-contained HTML document, safe for Gmail/Outlook/
// Apple Mail: table layout, fully inline styles, no JS, no external CSS,
// absolute links only. Paste the output into any ESP as a custom-HTML
// campaign, or pipe it straight to an email API later.
// ---------------------------------------------------------------------------

const INK = "#152033";
const MUTED = "#667085";
const FAINT = "#8a94a6";
const LINE = "#dce2ea";
const PAPER = "#f5f7fa";
const CARD = "#ffffff";
const BLUE = "#3478f6";
const BLUE_STRONG = "#2865d8";
const GREEN = "#159a78";
const RED = "#d64d57";

const FONT =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Bold (**text**) only — report content is trusted, still escaped. */
function inline(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function issueDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function trendUrl(slug: string): string {
  return `${SITE_URL}/trends/${slug}`;
}

function deltaCell(delta: number): string {
  if (delta === 0)
    return `<span style="font-family:${FONT};font-size:13px;color:${FAINT};">—</span>`;
  const up = delta > 0;
  return `<span style="font-family:${FONT};font-size:13px;font-weight:600;color:${up ? GREEN : RED};white-space:nowrap;">${up ? "▲" : "▼"} ${up ? "+" : ""}${delta}</span>`;
}

function storyHtml(story: DigestStory): string {
  const paragraphs = story.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">${inline(p)}</p>`
    )
    .join("");
  if (!story.heading) return paragraphs;

  const headingInner = story.slug
    ? `<a href="${trendUrl(story.slug)}" style="color:${INK};text-decoration:none;">${inline(story.heading)}</a>`
    : inline(story.heading);

  const heading =
    story.level === 2
      ? `<h2 style="margin:28px 0 12px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BLUE_STRONG};">${headingInner}</h2>`
      : `<h3 style="margin:24px 0 10px;font-family:${FONT};font-size:17px;font-weight:650;letter-spacing:-0.01em;color:${INK};">${headingInner}${
          story.slug
            ? ` <a href="${trendUrl(story.slug)}" style="font-size:12px;font-weight:600;color:${BLUE_STRONG};text-decoration:none;">&nbsp;View&nbsp;→</a>`
            : ""
        }</h3>`;
  return heading + paragraphs;
}

function tapeHtml(tape: DigestTape): string {
  if (!tape.entries.length) return "";
  const label =
    tape.kind === "movers"
      ? "The tape — since yesterday"
      : "The tape — today's standings";
  const rows = tape.entries
    .map(
      (m, i) => `
      <tr>
        <td style="padding:9px 0;border-top:${i === 0 ? "none" : `1px solid ${LINE}`};">
          <a href="${trendUrl(m.slug)}" style="font-family:${FONT};font-size:14px;font-weight:600;color:${INK};text-decoration:none;">${esc(m.name)}</a>
          <span style="font-family:${FONT};font-size:11px;color:${FAINT};text-transform:uppercase;letter-spacing:0.1em;">&nbsp; ${esc(m.category)}</span>
        </td>
        <td align="right" style="padding:9px 0;border-top:${i === 0 ? "none" : `1px solid ${LINE}`};white-space:nowrap;">
          <span style="font-family:${FONT};font-size:13px;color:${MUTED};">${m.harmony}%&nbsp;in&nbsp;sync&nbsp;&nbsp;</span>${deltaCell(m.delta)}
        </td>
      </tr>`
    )
    .join("");
  return `
    <h2 style="margin:30px 0 6px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BLUE_STRONG};">${label}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

function topTrendsHtml(trends: Trend[]): string {
  if (!trends.length) return "";
  const rows = trends
    .map(
      (t, i) => `
      <tr>
        <td style="padding:12px 0;border-top:${i === 0 ? "none" : `1px solid ${LINE}`};">
          <p style="margin:0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${FAINT};">${esc(t.category)} · ${esc(t.lifecycle_stage)}</p>
          <a href="${trendUrl(t.slug)}" style="font-family:${FONT};font-size:16px;font-weight:650;color:${INK};text-decoration:none;">${esc(t.name)}</a>
          <p style="margin:4px 0 0;font-family:${FONT};font-size:13px;line-height:1.55;color:${MUTED};">${esc(t.one_line_summary)}</p>
        </td>
        <td align="right" valign="top" style="padding:14px 0 0 14px;border-top:${i === 0 ? "none" : `1px solid ${LINE}`};">
          <span style="display:inline-block;background:${BLUE};color:#ffffff;border-radius:999px;padding:4px 10px;font-family:${FONT};font-size:13px;font-weight:700;">${t.wavescore}</span>
        </td>
      </tr>`
    )
    .join("");
  return `
    <h2 style="margin:30px 0 6px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BLUE_STRONG};">Top trends today</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

export function renderNewsletterHtml(digest: DailyDigest): string {
  const dateLabel = issueDateLabel(digest.date);
  const body = digest.stories.map(storyHtml).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>WaveSight Daily — ${esc(digest.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
  <!-- preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(digest.summary.slice(0, 140))}…</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;">

        <!-- masthead -->
        <tr><td style="padding:0 6px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:${FONT};font-size:15px;font-weight:800;letter-spacing:0.22em;color:${INK};">WAVE<span style="color:${BLUE};">SIGHT</span> DAILY</td>
              <td align="right" style="font-family:${FONT};font-size:12px;color:${FAINT};">${esc(dateLabel)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="border-top:2px solid ${INK};border-bottom:1px solid ${LINE};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- issue card -->
        <tr><td style="padding:26px 6px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARD};border:1px solid ${LINE};border-radius:16px;">
            <tr><td style="padding:34px 36px 30px;">

              <h1 style="margin:0;font-family:${FONT};font-size:30px;line-height:1.12;letter-spacing:-0.02em;font-weight:650;color:${INK};">${esc(digest.title)}</h1>
              <p style="margin:16px 0 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${MUTED};">${esc(digest.summary)}</p>

              ${tapeHtml(digest.tape)}
              ${body ? `<div style="border-top:1px solid ${LINE};margin-top:28px;padding-top:4px;">${body}</div>` : ""}
              ${topTrendsHtml(digest.topTrends)}

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:30px auto 4px;">
                <tr><td align="center" style="background:${BLUE};border-radius:999px;">
                  <a href="${SITE_URL}/radar" style="display:inline-block;padding:11px 26px;font-family:${FONT};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Open today&rsquo;s radar &rarr;</a>
                </td></tr>
              </table>

            </td></tr>
          </table>
        </td></tr>

        <!-- machine line -->
        <tr><td align="center" style="padding:18px 6px 0;font-family:${FONT};font-size:12px;color:${FAINT};">
          The machine today: ${digest.machine.watched} terms watched · ${digest.machine.firing} firing · ${digest.machine.opened} forecasts opened · ${digest.machine.resolved} resolved (${digest.machine.pending} open)
        </td></tr>

        <!-- footer -->
        <tr><td align="center" style="padding:22px 6px 8px;border-top:1px solid ${LINE};margin-top:18px;">
          <p style="margin:14px 0 4px;font-family:${FONT};font-size:12px;color:${FAINT};">You&rsquo;re reading the WaveSight Daily — the culture market, measured every morning.</p>
          <p style="margin:0;font-family:${FONT};font-size:12px;color:${FAINT};">
            <a href="${SITE_URL}/today" style="color:${BLUE_STRONG};text-decoration:none;">View in browser</a>
            &nbsp;·&nbsp;
            <a href="${SITE_URL}" style="color:${BLUE_STRONG};text-decoration:none;">wavesight.vercel.app</a>
            &nbsp;·&nbsp;
            <a href="{{unsubscribe_url}}" style="color:${FAINT};text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
