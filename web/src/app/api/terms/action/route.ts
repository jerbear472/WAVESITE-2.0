import { NextResponse } from "next/server";
import { setTermStatus } from "@/lib/terms/store";
import { promoteTermToLibrary } from "@/lib/measured-sync";

// /api/terms/action — the Signals Desk's write path. Three verbs:
//   track   — candidate → tracked (keep measuring; human vouched for it)
//   dismiss — → retired (logged, same as the automatic 21-day retirement)
//   promote — create/refresh a library trend from this term right now
//             (measured fields pinned, editorial via one Claude call)

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { term_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const termId = body.term_id;
  const action = body.action;
  if (!termId || !action) {
    return NextResponse.json(
      { error: "term_id and action are required" },
      { status: 400 }
    );
  }

  try {
    if (action === "track") {
      await setTermStatus(termId, "tracked", "promoted", {
        via: "signals_desk",
        to: "tracked",
        reason: "manually tracked from the Signals Desk",
      });
      return NextResponse.json({ ok: true, status: "tracked" });
    }
    if (action === "dismiss") {
      await setTermStatus(termId, "retired", "retired", {
        via: "signals_desk",
        reason: "manually dismissed from the Signals Desk",
      });
      return NextResponse.json({ ok: true, status: "retired" });
    }
    if (action === "promote") {
      const { trend, created } = await promoteTermToLibrary(termId);
      await setTermStatus(termId, "promoted", "promoted", {
        via: "signals_desk",
        to: "promoted",
        trend_id: trend.id,
      });
      return NextResponse.json({
        ok: true,
        status: "promoted",
        trend: { id: trend.id, slug: trend.slug, name: trend.name },
        created,
      });
    }
    return NextResponse.json(
      { error: `unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/terms/action] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "action failed" },
      { status: 500 }
    );
  }
}
