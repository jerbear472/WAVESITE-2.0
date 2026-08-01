import { NextResponse } from "next/server";
import { getTrendBySlug, getTrendById } from "@/lib/data";
import { generateCreativeBrief } from "@/lib/ai/service";
import type { UserType } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trend: trendKey, userType, niche, goal, tone } = body ?? {};

    if (!trendKey) {
      return NextResponse.json(
        { error: "A trend slug or id is required." },
        { status: 400 }
      );
    }

    const trend =
      (await getTrendBySlug(String(trendKey))) ??
      (await getTrendById(String(trendKey)));
    if (!trend) {
      return NextResponse.json({ error: "Trend not found." }, { status: 404 });
    }

    const brief = await generateCreativeBrief({
      trend,
      userType: (userType as UserType) ?? "creator",
      niche: niche ? String(niche) : undefined,
      goal: goal ? String(goal) : undefined,
      tone: tone ? String(tone) : undefined,
    });

    return NextResponse.json({ brief, trend: { name: trend.name, slug: trend.slug } });
  } catch (err) {
    console.error("/api/ai/brief error:", err);
    return NextResponse.json(
      { error: "Failed to generate brief." },
      { status: 500 }
    );
  }
}
