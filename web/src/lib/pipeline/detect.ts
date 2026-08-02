import { z } from "zod";
import type { Trend, ViralityType } from "@/types";
import type { RawItem } from "@/lib/pipeline/types";
import { generateStructured, isAIConfigured } from "@/lib/ai/provider";
import { upsertTrendBySlug } from "@/lib/data";
import * as store from "@/lib/pipeline/store";
import { clusterSpikes, findSpikes } from "@/lib/pipeline/detect-engine";

// Orchestration half of the detector — see detect-engine.ts for the pure
// arithmetic (kept dependency-free so the bare node test runner can load it).

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Naming — the model's one job here. Given real posts, decide whether the
// cluster is a coherent cultural trend (not a news event, a product launch,
// or subreddit housekeeping) and christen it.
// ---------------------------------------------------------------------------

const VIRALITY_TYPES: ViralityType[] = [
  "meme","aesthetic","challenge","phrase","product_behavior","sound",
  "format","backlash","recommendation_loop","identity_signal","other",
];

const namingSchema = z.object({
  clusters: z.array(
    z.object({
      index: z.number(),
      is_trend: z.boolean(),
      name: z.string(),
      slug: z.string(),
      one_line_summary: z.string(),
      category: z.string(),
      audience: z.string(),
      emotional_tone: z.string(),
      virality_type: z.string(),
      why_spreading: z.string(),
    })
  ),
});

export interface DetectionReport {
  clusters_found: number;
  trends_created: { id: string; name: string }[];
  dismissed: number;
}

export async function detectAndName(opts: {
  runId: string;
  windowEndIso: string;
  knownTrends: Pick<Trend, "id" | "name">[];
}): Promise<DetectionReport> {
  const end = Date.parse(opts.windowEndIso);
  const curStart = new Date(end - 2 * DAY_MS).toISOString();
  const priorStart = new Date(end - 4 * DAY_MS).toISOString();
  const baseStart = new Date(end - 14 * DAY_MS).toISOString();

  const [current, prior, baseline] = await Promise.all([
    store.getItemsInWindow("sweep", curStart, opts.windowEndIso),
    store.getItemsInWindow("sweep", priorStart, curStart),
    store.getItemsInWindow("baseline", baseStart, opts.windowEndIso),
  ]);

  const spikes = findSpikes({
    current,
    prior,
    baseline,
    knownNames: opts.knownTrends.map((t) => t.name),
  });
  const clusters = clusterSpikes(spikes);
  if (clusters.length === 0) {
    return { clusters_found: 0, trends_created: [], dismissed: 0 };
  }

  const itemsById = new Map(current.map((i) => [i.id, i]));
  const report: DetectionReport = {
    clusters_found: clusters.length,
    trends_created: [],
    dismissed: 0,
  };

  // Naming pass — one call for the whole batch.
  let named: z.infer<typeof namingSchema> = { clusters: [] };
  if (isAIConfigured()) {
    const list = clusters
      .map((c, i) => {
        const samples = c.itemIds
          .slice(0, 6)
          .map((id) => itemsById.get(id))
          .filter((it): it is RawItem => Boolean(it))
          .map((it) => `    [${it.query}] ${(it.title ?? "").slice(0, 110)}`)
          .join("\n");
        return `${i}. phrases: ${c.phrases.slice(0, 5).join(" / ")} (${c.itemIds.length} items, ${c.authors} authors, ${c.containers} venues, novelty ${c.novelty}x)\n${samples}`;
      })
      .join("\n\n");
    try {
      named = await generateStructured({
        system:
          "You are WaveSight's trend christener. Each cluster below is a set of REAL posts sharing spiking phrases, detected arithmetically. Decide for each: is this a coherent cultural trend, format, aesthetic, or behavior (is_trend=true) — or a single news event, sports result, product release, celebrity story, or platform housekeeping (is_trend=false)? For true trends: give a memorable name culture would actually use, a kebab-case slug, a sharp one-line summary, category, audience, emotional_tone, virality_type (one of: meme, aesthetic, challenge, phrase, product_behavior, sound, format, backlash, recommendation_loop, identity_signal, other), and why it's spreading. Name what the posts show — never invent beyond the evidence.",
        prompt: `Clusters detected in the last 48h of the sweep:\n\n${list}\n\nReturn JSON: { "clusters": [{ "index": int, "is_trend": bool, "name": string, "slug": string, "one_line_summary": string, "category": string, "audience": string, "emotional_tone": string, "virality_type": string, "why_spreading": string }] } — one entry per cluster.`,
        schema: namingSchema,
        maxTokens: 4000,
      });
    } catch (err) {
      console.error("[detect] naming call failed — clusters stay in queue:", err);
    }
  }
  const decisionByIndex = new Map(named.clusters.map((c) => [c.index, c]));

  for (const [i, cluster] of clusters.entries()) {
    const clusterId = `dc-${opts.runId}-${i}`;
    const decision = decisionByIndex.get(i);
    let status: "new" | "named" | "dismissed" = "new";
    let trendId: string | null = null;

    if (decision && !decision.is_trend) {
      status = "dismissed";
      report.dismissed++;
    } else if (decision && decision.is_trend) {
      const slug = (decision.slug || decision.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      trendId = `trend-${slug}`;
      const now = new Date().toISOString();
      const virality = VIRALITY_TYPES.includes(
        decision.virality_type as ViralityType
      )
        ? (decision.virality_type as ViralityType)
        : "other";
      await upsertTrendBySlug({
        id: trendId,
        name: decision.name,
        slug,
        one_line_summary: decision.one_line_summary,
        detailed_summary: `Detected bottom-up from ${cluster.itemIds.length} posts across ${cluster.containers} venues (${cluster.novelty}x above expected rate). Phrases: ${cluster.phrases.slice(0, 5).join(", ")}.`,
        category: decision.category,
        emotional_tone: decision.emotional_tone,
        audience: decision.audience,
        lifecycle_stage: "emerging",
        virality_type: virality,
        // Scores are MEASURED by the pipeline, never asserted at birth.
        wavescore: 0,
        momentum_score: 0,
        sentiment_score: 0,
        brand_safety_score: 0,
        saturation_score: 0,
        commercial_relevance_score: 0,
        participation_difficulty: "medium",
        risk_level: "low",
        why_spreading: decision.why_spreading,
        who_should_join: "",
        who_should_avoid: "",
        best_platforms: [
          ...new Set(
            cluster.itemIds
              .map((id) => itemsById.get(id)?.platform)
              .filter((p): p is string => Boolean(p))
          ),
        ],
        creative_angles: [],
        sample_hooks: [],
        origin: "detected",
        created_at: now,
        updated_at: now,
      });
      await store.upsertLinks(
        cluster.itemIds.map((item_id) => ({
          item_id,
          trend_id: trendId!,
          matched_by: "model" as const,
          confidence: 0.6,
        }))
      );
      status = "named";
      report.trends_created.push({ id: trendId, name: decision.name });
      // A newborn trend arrives with its history already gathered — reddit
      // only (cheap); the card's look-back button adds the youtube leg.
      try {
        const { runTrendBackfill } = await import("@/lib/pipeline/backfill");
        await runTrendBackfill(slug, { includeYouTube: false });
      } catch (err) {
        console.error(`[detect] auto-backfill for ${slug} failed:`, err);
      }
    }

    await store.insertDetectedClusters([
      {
        id: clusterId,
        run_id: opts.runId,
        phrases: cluster.phrases.slice(0, 10),
        item_ids: cluster.itemIds,
        item_count: cluster.itemIds.length,
        author_count: cluster.authors,
        container_count: cluster.containers,
        novelty: cluster.novelty,
        score: cluster.score,
        status,
        trend_id: trendId,
      },
    ]);
  }

  return report;
}
