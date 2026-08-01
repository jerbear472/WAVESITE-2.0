import { NextResponse } from "next/server";
import { getPulseState, runPulse } from "@/lib/pulse";
import { isAIConfigured } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

/** Current field state: harmonized trends, run history, live/mock capability. */
export async function GET() {
  const state = await getPulseState();
  return NextResponse.json({ ...state, live: isAIConfigured() });
}

/** Execute one discovery run. Body: { count?, focus? }. */
export async function POST(request: Request) {
  let body: { count?: number; focus?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — run with defaults.
  }
  try {
    const result = await runPulse(body);
    return NextResponse.json({ ...result, live: isAIConfigured() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pulse run failed" },
      { status: 500 }
    );
  }
}
