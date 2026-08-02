import { NextResponse } from "next/server";
import { runTermIngestion } from "@/lib/terms/run";

// /api/terms/run — the multi-source term ingestion run (counts -> baselines
// -> z-scores -> composite/cascade). One daily cron run plus manual POST.
// The run is idempotent per observation date: re-running refreshes rows in
// place and never double-counts.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel cron entry point (crons issue GETs). Same auth posture as the
// measured pipeline: with CRON_SECRET set only bearers may trigger; without
// it (local dev) GET is open.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await runTermIngestion({});
    return NextResponse.json(report);
  } catch (err) {
    console.error("[api/terms/run] cron run failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "term run failed" },
      { status: 500 }
    );
  }
}

// Manual trigger; body may pin a date ({"date": "2026-07-31"}) to re-run or
// repair a specific day.
export async function POST(req: Request) {
  let date: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      date = body.date;
    }
  } catch {
    // empty body is fine — defaults apply
  }
  try {
    const report = await runTermIngestion({ date });
    return NextResponse.json(report);
  } catch (err) {
    console.error("[api/terms/run] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "term run failed" },
      { status: 500 }
    );
  }
}
