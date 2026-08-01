import { NextResponse } from "next/server";
import { getForecasts, getTrends } from "@/lib/data";
import { getCalibration } from "@/lib/forecasts";

export const dynamic = "force-dynamic";

/**
 * Track-record read model: calibration report over a window (?window=90,
 * days) plus the forecast list with trend names attached for display.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const windowDays = clampWindow(Number(searchParams.get("window")) || 90);
  const [calibration, forecasts, trends] = await Promise.all([
    getCalibration(windowDays),
    getForecasts(),
    getTrends(),
  ]);
  const nameById = new Map(trends.map((t) => [t.id, { name: t.name, slug: t.slug }]));
  return NextResponse.json({
    calibration,
    forecasts: forecasts.slice(0, 200).map((f) => ({
      ...f,
      trend_name: nameById.get(f.trend_id)?.name ?? f.trend_id,
      trend_slug: nameById.get(f.trend_id)?.slug ?? null,
    })),
  });
}

function clampWindow(n: number): number {
  return Math.min(365, Math.max(7, Math.round(n)));
}
