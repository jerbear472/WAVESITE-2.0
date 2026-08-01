import { NextResponse } from "next/server";
import { analyzeSignal } from "@/lib/ai/service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, title, url, source } = body ?? {};

    if (!text || String(text).trim().length < 3) {
      return NextResponse.json(
        { error: "Provide some signal text or a caption to analyze." },
        { status: 400 }
      );
    }

    const analysis = await analyzeSignal({
      text: String(text),
      title: title ? String(title) : null,
      url: url ? String(url) : null,
      source: source ? String(source) : null,
    });

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("/api/ai/analyze-signal error:", err);
    return NextResponse.json(
      { error: "Failed to analyze signal." },
      { status: 500 }
    );
  }
}
