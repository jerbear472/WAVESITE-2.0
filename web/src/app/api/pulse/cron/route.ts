import { NextResponse } from "next/server";
import { runPulse } from "@/lib/pulse";

// Vercel cron entry point for the discovery pulse (crons issue GETs). The
// pulse is scheduler-driven only — there is no user-facing run button — so
// the app always opens on a field that has already been scanned. When
// CRON_SECRET is set, only requests carrying it may trigger a run; without
// it (local dev) GET is open. Daily cadence is the Hobby-plan ceiling —
// raise the schedule in vercel.json on Pro for a livelier field.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runPulse({});
    return NextResponse.json({
      ok: true,
      trends: result.trends.length,
      run_id: result.run?.id ?? null,
    });
  } catch (err) {
    console.error("[api/pulse/cron] pulse run failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "pulse run failed" },
      { status: 500 }
    );
  }
}
