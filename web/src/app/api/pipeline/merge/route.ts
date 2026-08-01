import { NextResponse } from "next/server";
import { mergeTrendLinks } from "@/lib/pipeline/store";

// POST /api/pipeline/merge — the manual entity-resolution override.
// Moves every item link from one trend onto another (surface variants of the
// same concept that fuzzy matching and the model kept apart).

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let from: string | undefined;
  let to: string | undefined;
  try {
    const body = await req.json();
    from = body?.from_trend_id;
    to = body?.to_trend_id;
  } catch {
    // handled below
  }
  if (!from || !to || from === to) {
    return NextResponse.json(
      { error: "Body must be { from_trend_id, to_trend_id } with distinct ids." },
      { status: 400 }
    );
  }
  try {
    const moved = await mergeTrendLinks(from, to);
    return NextResponse.json({ moved, from_trend_id: from, to_trend_id: to });
  } catch (err) {
    console.error("[api/pipeline/merge] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "merge failed" },
      { status: 500 }
    );
  }
}
