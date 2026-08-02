import type { AdapterFetchResult, SourceAdapter, TermRow } from "@/lib/terms/types";
import { getLatestObservationBefore } from "@/lib/terms/store";
import { hashtagCandidates } from "@/lib/terms/hashtag";
import { fetchHashtagStats } from "@/lib/tiktok-stats";

// tiktok — hashtag view velocity, the platform where challenge/sound/format
// trends actually live. Sits at the "breaking" rung of the cascade alongside
// youtube: a hashtag accelerating here has already crossed into mass reach.
//
// UNOFFICIAL ACCESS. TikTok's own web APIs are request-signed (msToken /
// X-Bogus) and the Creative Center API needs a generated user-sign, so this
// speaks to tikwm.com, a public mirror of the hashtag (challenge) endpoints.
// Same contract as the google_trends adapter: it WILL break occasionally,
// every failure is a normal skipped-source day, and it must never block a run.
//
// MEASUREMENT SHAPE. The platform only exposes LIFETIME totals per hashtag
// (view_count, user_count) — not per-day series. We persist the lifetime
// total in meta.cumulative and report raw_count as the per-day view delta
// against the previous observation (divided across the gap if days were
// missed). The first observation of a term has no prior to diff against, so
// it reports 0 with approximate=true — one seed value the volume floor
// suppresses from scoring while it anchors the next day's delta.

const DAY_MS = 86_400_000;

export const tiktokAdapter: SourceAdapter = {
  source: "tiktok",
  displayName: "TikTok",
  enabled: () => process.env.TIKTOK_ENABLED !== "false",
  disabledReason: () =>
    process.env.TIKTOK_ENABLED === "false" ? "TIKTOK_ENABLED=false" : null,
  // Third-party mirror with no published quota — stay politely slow.
  rateLimit: { minIntervalMs: 1500 },

  async countForDate(term: TermRow, date: string): Promise<AdapterFetchResult> {
    // Canonical first, then variants — editorial names rarely exist as
    // hashtags verbatim, so a hashtag-shaped variant is the escape hatch.
    let hashtag: string | null = null;
    let info: Awaited<ReturnType<typeof fetchHashtagStats>> = null;
    for (const candidate of hashtagCandidates(term.canonical, term.variants)) {
      const found = await fetchHashtagStats(candidate);
      if (found && found.views > 0) {
        hashtag = candidate;
        info = found;
        break;
      }
    }
    if (!hashtag || !info) return { raw_count: null };

    const link = `https://www.tiktok.com/tag/${hashtag}`;
    const prior = await getLatestObservationBefore(term.term_id, "tiktok", date);
    const priorCumulative = prior?.meta?.cumulative;

    if (prior === null || typeof priorCumulative !== "number") {
      // First sighting: nothing to diff against. Seed the cumulative so
      // tomorrow's run measures a real delta.
      return {
        raw_count: 0,
        approximate: true,
        meta: { link, cumulative: info.views },
        context_texts: info.desc ? [info.desc] : undefined,
      };
    }

    const gapDays = Math.max(
      1,
      Math.round(
        (Date.parse(`${date}T00:00:00Z`) -
          Date.parse(`${prior.obs_date}T00:00:00Z`)) /
          DAY_MS
      )
    );
    // Counter resets/corrections upstream can go backwards — clamp at zero
    // rather than record negative views.
    const delta = Math.max(0, info.views - priorCumulative);
    return {
      raw_count: Math.round(delta / gapDays),
      approximate: true,
      meta: { link, cumulative: info.views },
      context_texts: info.desc ? [info.desc] : undefined,
    };
  },
};
