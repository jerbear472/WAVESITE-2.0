import { getTrends } from "@/lib/data";
import { rankAndNarrow, type ScanProfile } from "@/lib/fit";
import { isAIConfigured } from "@/lib/ai/provider";
import { runDeepScan, type ScanEmit } from "@/lib/deep-scan";
import { getFunnelSnapshot } from "@/lib/terms/funnel";

// Streams a live scan as newline-delimited JSON. With ANTHROPIC_API_KEY set
// this is a real deep scan: Claude researches the live web (server-side web
// search), returns a variable number of source-linked trends appraised against
// the brief, then matches live Kalshi/Polymarket odds against public
// sentiment. Without a key it falls back to ranking the local library.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let profile: ScanProfile;
  try {
    const body = await req.json();
    profile = body?.profile;
    if (!profile) throw new Error("missing profile");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid scan profile." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send: ScanEmit = (obj) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        // Real funnel numbers from the measurement layer, sent before the
        // research starts so the console shows measured data, not a mock
        // counter. Best-effort: a missing store just omits the funnel.
        try {
          const funnel = await getFunnelSnapshot();
          if (funnel) {
            send({ type: "funnel", funnel, scanned: funnel.signals_collected });
          }
        } catch (err) {
          console.error("/api/scan funnel snapshot failed:", err);
        }

        if (isAIConfigured()) {
          try {
            await runDeepScan(profile, send);
          } catch (err) {
            console.error("/api/scan deep scan failed, falling back:", err);
            send({
              type: "status",
              phase: "analyze",
              message:
                "Live web research hit an error — falling back to the local intelligence set.",
              progress: 40,
            });
            await libraryScan(profile, send);
          }
        } else {
          send({
            type: "status",
            phase: "connect",
            message:
              "No ANTHROPIC_API_KEY — scanning the local intelligence set only.",
            progress: 5,
            scanned: 0,
          });
          await libraryScan(profile, send);
        }
      } catch (err) {
        console.error("/api/scan error:", err);
        send({ type: "error", message: "Scan failed. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}

/** Fallback: rank the in-library trends against the brief (no web research). */
async function libraryScan(profile: ScanProfile, send: ScanEmit) {
  const trends = await getTrends();
  const { hits, exploratory } = rankAndNarrow(trends, profile);

  send({
    type: "status",
    phase: "score",
    message: `Scoring ${trends.length} library trends against your brief…`,
    progress: 60,
    scanned: trends.length,
  });

  send({
    type: "narrow",
    message: exploratory
      ? "Few strong matches — surfacing the closest plays."
      : `Narrowed to ${hits.length} trend${hits.length === 1 ? "" : "s"} worth your time.`,
    exploratory,
    total: hits.length,
    scanned: trends.length,
  });

  hits.forEach((h, i) => {
    send({
      type: "hit",
      index: i,
      trend: h.trend,
      fit: h.fit,
      reasons: h.reasons,
      progress: 70 + Math.round(((i + 1) / hits.length) * 28),
    });
  });

  send({
    type: "done",
    total: hits.length,
    scanned: trends.length,
    exploratory,
  });
}
