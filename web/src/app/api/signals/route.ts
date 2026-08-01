import { NextResponse } from "next/server";
import { createSignal, getAllSignals } from "@/lib/data";
import type { Signal, SignalSource } from "@/types";

const VALID_SOURCES: SignalSource[] = [
  "youtube",
  "tiktok",
  "reddit",
  "instagram",
  "article",
  "manual",
  "google_trends",
  "other",
];

export async function GET() {
  const signals = await getAllSignals();
  return NextResponse.json({ signals });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      source,
      url,
      title,
      text,
      creator_name,
      engagement,
      detected_phrases,
      detected_entities,
      detected_emotions,
    } = body ?? {};

    if (!text && !url && !title) {
      return NextResponse.json(
        { error: "Provide at least a title, URL, or text for the signal." },
        { status: 400 }
      );
    }

    let engagementJson: Record<string, unknown> | null = null;
    if (engagement) {
      if (typeof engagement === "string" && engagement.trim()) {
        try {
          engagementJson = JSON.parse(engagement);
        } catch {
          return NextResponse.json(
            { error: "Engagement must be valid JSON." },
            { status: 400 }
          );
        }
      } else if (typeof engagement === "object") {
        engagementJson = engagement;
      }
    }

    const src: SignalSource = VALID_SOURCES.includes(source)
      ? source
      : "manual";

    const signal = await createSignal({
      source: src,
      url: url ?? null,
      title: title ?? null,
      text: text ?? null,
      creator_name: creator_name ?? null,
      platform_engagement_json: engagementJson,
      detected_phrases: toArray(detected_phrases),
      detected_entities: toArray(detected_entities),
      detected_emotions: toArray(detected_emotions),
    } as Partial<Signal>);

    return NextResponse.json({ signal });
  } catch (err) {
    console.error("/api/signals error:", err);
    return NextResponse.json(
      { error: "Failed to create signal." },
      { status: 500 }
    );
  }
}

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.trim())
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}
