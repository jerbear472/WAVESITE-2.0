import type { SourceAdapter } from "@/lib/terms/types";
import { blueskyAdapter } from "@/lib/terms/adapters/bluesky";
import { redditAdapter } from "@/lib/terms/adapters/reddit";
import { googleTrendsAdapter } from "@/lib/terms/adapters/google-trends";
import { tiktokAdapter } from "@/lib/terms/adapters/tiktok";
import { youtubeAdapter } from "@/lib/terms/adapters/youtube";
import { wikipediaAdapter } from "@/lib/terms/adapters/wikipedia";

// All adapters, in cascade lifecycle order (earliest signal first). Every
// one is independently disableable via env; the run loops over whatever is
// enabled and no single source is required for a run to succeed.

export const ADAPTERS: SourceAdapter[] = [
  blueskyAdapter,
  redditAdapter,
  googleTrendsAdapter,
  tiktokAdapter,
  youtubeAdapter,
  wikipediaAdapter,
];

export function enabledAdapters(): SourceAdapter[] {
  return ADAPTERS.filter((a) => a.enabled());
}
