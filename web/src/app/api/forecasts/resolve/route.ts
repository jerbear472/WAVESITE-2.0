import { NextResponse } from "next/server";
import { resolveDueForecasts } from "@/lib/forecasts";

export const dynamic = "force-dynamic";

/**
 * Run the resolution job. Idempotent — safe to trigger from a schedule (e.g.
 * a Vercel cron after the daily loop) or by hand; it only ever touches
 * pending forecasts whose resolves_at has passed.
 */
export async function POST() {
  try {
    const summary = await resolveDueForecasts();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resolution failed" },
      { status: 500 }
    );
  }
}
