import { NextResponse } from "next/server";
import {
  getDetectedClusters,
  updateClusterStatus,
} from "@/lib/pipeline/store";
import { getTrends } from "@/lib/data";

// GET  /api/pipeline/clusters — the detection queue (what the sweep found).
// POST /api/pipeline/clusters { id, action: "dismiss" | "restore" } — human
// override on a cluster the model kept or killed.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [clusters, trends] = await Promise.all([
      getDetectedClusters(50),
      getTrends(),
    ]);
    const nameById = new Map(trends.map((t) => [t.id, t.name]));
    return NextResponse.json({
      clusters: clusters.map((c) => ({
        ...c,
        trend_name: c.trend_id ? (nameById.get(c.trend_id) ?? null) : null,
      })),
    });
  } catch (err) {
    console.error("[api/pipeline/clusters] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "clusters read failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let id: string | undefined;
  let action: string | undefined;
  try {
    const body = await req.json();
    id = body?.id;
    action = body?.action;
  } catch {
    // handled below
  }
  if (!id || (action !== "dismiss" && action !== "restore")) {
    return NextResponse.json(
      { error: 'Body must be { id, action: "dismiss" | "restore" }.' },
      { status: 400 }
    );
  }
  try {
    await updateClusterStatus(id, action === "dismiss" ? "dismissed" : "new");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "update failed" },
      { status: 500 }
    );
  }
}
