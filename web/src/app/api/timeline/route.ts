import { NextResponse } from "next/server";
import { buildTimelines } from "@/lib/pipeline/timeline";

// GET /api/timeline?window=30 — per-trend daily volume + sentiment series
// from the measured corpus, with forecast markers. Backs the Timeline page.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const window = Number(url.searchParams.get("window") ?? 30);
  const windowDays = Number.isFinite(window)
    ? Math.min(Math.max(Math.round(window), 7), 90)
    : 30;
  try {
    const timelines = await buildTimelines(windowDays);
    return NextResponse.json(timelines);
  } catch (err) {
    console.error("[api/timeline] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "timeline failed" },
      { status: 500 }
    );
  }
}
