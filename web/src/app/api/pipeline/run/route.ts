import { NextResponse } from "next/server";
import { runMeasuredPulse } from "@/lib/pipeline/run";

// POST /api/pipeline/run — the measured pipeline (collection -> metrics ->
// percentiles). Separate from /api/pulse, which still runs the legacy
// model-scored path, so old and new outputs can be compared on the same day.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel cron entry point (crons issue GETs). When CRON_SECRET is set, only
// requests carrying it may trigger a run; without it (local dev) GET is open.
// Daily cadence is the Hobby-plan ceiling — raise the schedule in vercel.json
// on Pro for a livelier timeline.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await runMeasuredPulse({});
    return NextResponse.json(report);
  } catch (err) {
    console.error("[api/pipeline/run] cron run failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "pipeline run failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let windowDays: number | undefined;
  try {
    const body = await req.json();
    if (typeof body?.windowDays === "number") windowDays = body.windowDays;
  } catch {
    // empty body is fine — defaults apply
  }
  try {
    const report = await runMeasuredPulse({ windowDays });
    return NextResponse.json(report);
  } catch (err) {
    console.error("[api/pipeline/run] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "pipeline run failed" },
      { status: 500 }
    );
  }
}
