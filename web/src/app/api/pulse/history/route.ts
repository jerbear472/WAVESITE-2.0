import { NextResponse } from "next/server";
import { getPulseHistory } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Full pulse timeline: runs (oldest first) + per-trend score series. */
export async function GET() {
  const history = await getPulseHistory();
  return NextResponse.json(history);
}
