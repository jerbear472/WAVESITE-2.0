import { NextResponse } from "next/server";
import { runMeasuredSync } from "@/lib/measured-sync";

// /api/trends/sync — the daily bridge from the measurement layer into the
// trend library. Scheduled after /api/terms/run and /api/pipeline/run (see
// vercel.json): refreshes lifecycle/momentum from the measured cascade,
// promotes multi-source accelerating terms into new trends, snapshots the
// whole field, and runs forecast emission + resolution.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel cron entry point (crons issue GETs). Same auth posture as the other
// measurement routes: with CRON_SECRET set only bearers may trigger; without
// it (local dev) GET is open.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return run();
}

// Manual trigger for repair/testing.
export async function POST() {
  return run();
}

async function run() {
  try {
    const report = await runMeasuredSync();
    return NextResponse.json(report);
  } catch (err) {
    console.error("[api/trends/sync] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "measured sync failed" },
      { status: 500 }
    );
  }
}
