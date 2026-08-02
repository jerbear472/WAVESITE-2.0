import { NextResponse } from "next/server";
import { buildTrendHistories } from "@/lib/pipeline/backfill";

// GET /api/trends/history — monthly volume + engagement series (with
// peak/trough evidence markers) for every trend with corpus evidence. One
// bulk response; trend cards share it. ?slug=x narrows to one trend for the
// detail page.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const slug = new URL(req.url).searchParams.get("slug");
    const histories = await buildTrendHistories(12);
    if (slug) {
      return NextResponse.json({
        histories: histories.filter((h) => h.slug === slug),
      });
    }
    return NextResponse.json({ histories });
  } catch (err) {
    console.error("[api/trends/history] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "history failed" },
      { status: 500 }
    );
  }
}
