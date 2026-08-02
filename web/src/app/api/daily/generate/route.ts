import { NextResponse } from "next/server";
import { generateDailyReport } from "@/lib/daily-report";

// GET /api/daily/generate — cron entry point that files today's WaveSight
// Daily (runs after /api/trends/sync so the issue reads the fresh board).
// Idempotent per day; ?force=1 rewrites today's issue. Same CRON_SECRET
// posture as the other crons: enforced when set, open in local dev.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const force = new URL(req.url).searchParams.get("force") === "1";
    const { report, created, mock } = await generateDailyReport({ force });
    return NextResponse.json({
      ok: true,
      created,
      mock,
      report_date: report.report_date,
      title: report.title,
    });
  } catch (err) {
    console.error("[api/daily/generate] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "report generation failed" },
      { status: 500 }
    );
  }
}
