import { NextResponse } from "next/server";
import { isBackfillableName, runTrendBackfill } from "@/lib/pipeline/backfill";
import { getTrends } from "@/lib/data";

// POST /api/trends/backfill { slug } — the history bot for one trend: walks
// back ~12 months of Reddit + YouTube, persists items with true publish
// dates + engagement, links the ones that genuinely match.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let slug: string | undefined;
  try {
    const body = await req.json();
    slug = body?.slug;
  } catch {
    // handled below
  }
  if (!slug) {
    return NextResponse.json({ error: "Body must be { slug }." }, { status: 400 });
  }
  try {
    const trend = (await getTrends()).find((t) => t.slug === slug);
    if (!trend) {
      return NextResponse.json({ error: `Unknown trend "${slug}".` }, { status: 404 });
    }
    if (!isBackfillableName(trend.name)) {
      return NextResponse.json(
        { error: "Trend name too generic to backfill safely." },
        { status: 422 }
      );
    }
    const report = await runTrendBackfill(slug);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[api/trends/backfill] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backfill failed" },
      { status: 500 }
    );
  }
}
