import { NextResponse } from "next/server";
import { attachSignalToTrend, getTrendById } from "@/lib/data";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { signalId, trendId, relevance } = body ?? {};
    if (!signalId || !trendId) {
      return NextResponse.json(
        { error: "signalId and trendId are required." },
        { status: 400 }
      );
    }
    const trend = await getTrendById(String(trendId));
    if (!trend) {
      return NextResponse.json({ error: "Trend not found." }, { status: 404 });
    }
    await attachSignalToTrend(
      String(signalId),
      String(trendId),
      typeof relevance === "number" ? relevance : 80
    );
    return NextResponse.json({ ok: true, trend: { name: trend.name, slug: trend.slug } });
  } catch (err) {
    console.error("/api/trend-signals error:", err);
    return NextResponse.json({ error: "Failed to attach signal." }, { status: 500 });
  }
}
