import { NextResponse } from "next/server";
import {
  attachSignalToTrend,
  createTrend,
  getAllSignals,
} from "@/lib/data";
import { clusterSignalsIntoTrend, scoreTrend } from "@/lib/ai/service";
import { makeId, slugify } from "@/lib/utils";
import type { Trend } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const signalIds: string[] = Array.isArray(body?.signalIds)
      ? body.signalIds.map(String)
      : [];

    if (signalIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one signal to cluster into a trend." },
        { status: 400 }
      );
    }

    const all = await getAllSignals();
    const signals = all.filter((s) => signalIds.includes(s.id));
    if (signals.length === 0) {
      return NextResponse.json(
        { error: "None of the selected signals were found." },
        { status: 404 }
      );
    }

    const cluster = await clusterSignalsIntoTrend(signals);
    const scores = await scoreTrend(
      {
        name: cluster.trend_name,
        one_line_summary: cluster.summary,
        category: cluster.category,
        audience: cluster.audience,
        lifecycle_stage: cluster.lifecycle_stage,
      },
      signals
    );

    const now = new Date().toISOString();
    const trend: Trend = {
      id: makeId("trend"),
      name: cluster.trend_name,
      slug: slugify(cluster.trend_name) || makeId("trend"),
      one_line_summary: cluster.summary,
      detailed_summary: cluster.detailed_summary ?? cluster.summary,
      category: cluster.category,
      emotional_tone: cluster.emotional_tone,
      audience: cluster.audience,
      lifecycle_stage: cluster.lifecycle_stage,
      virality_type: cluster.virality_type,
      wavescore: scores.wavescore,
      momentum_score: scores.momentum_score,
      sentiment_score: scores.sentiment_score,
      brand_safety_score: scores.brand_safety_score,
      saturation_score: scores.saturation_score,
      commercial_relevance_score: scores.commercial_relevance_score,
      participation_difficulty: scores.participation_difficulty,
      risk_level: scores.risk_level,
      why_spreading: cluster.why_spreading,
      who_should_join: cluster.who_should_join,
      who_should_avoid: cluster.who_should_avoid,
      best_platforms: cluster.best_platforms,
      created_at: now,
      updated_at: now,
    };

    await createTrend(trend);
    for (const s of signals) {
      await attachSignalToTrend(s.id, trend.id, 85);
    }

    return NextResponse.json({
      trend,
      mock: cluster._mock || scores._mock,
    });
  } catch (err) {
    console.error("/api/ai/cluster error:", err);
    return NextResponse.json(
      { error: "Failed to create trend from signals." },
      { status: 500 }
    );
  }
}
