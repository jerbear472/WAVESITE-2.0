import { buildDailyDigest, renderNewsletterHtml } from "@/lib/daily-digest";

// GET /api/daily/newsletter — today's issue as one self-contained, email-safe
// HTML document (inline styles, table layout, absolute links). Open it to
// preview, view-source/copy to paste into any ESP as a custom-HTML campaign,
// or fetch it server-side when a send pipeline (Resend etc.) is wired up.
// The {{unsubscribe_url}} placeholder is a standard ESP merge tag.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const digest = await buildDailyDigest();
    return new Response(renderNewsletterHtml(digest), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/daily/newsletter] failed:", err);
    return new Response("Newsletter render failed.", { status: 500 });
  }
}
