import type { RawItem } from "@/lib/pipeline/types";
import {
  isRedditConfigured,
  sweepSubreddit,
} from "@/lib/pipeline/connectors/reddit";
import {
  isYouTubeConfigured,
  sweepYouTubeCategory,
} from "@/lib/pipeline/connectors/youtube";
import { getConfig } from "@/lib/pipeline/store";

// The sweep — broad, unqueried collection from a roster of culture venues.
// This is where trends come FROM: the detector reads this corpus and names
// what is spiking. The roster lives in pipeline_config ('sweep_sources') so
// coverage can be tuned without a deploy; these defaults are the fallback.

export interface SweepSources {
  subreddits: string[];
  /** YouTube trending category ids: 10 music, 22 people&blogs, 23 comedy,
   *  24 entertainment, 26 howto&style (fashion/beauty lives here). */
  youtube_categories: string[];
}

export const DEFAULT_SWEEP_SOURCES: SweepSources = {
  subreddits: [
    // fashion / style
    "fashion", "streetwear", "femalefashionadvice", "malefashionadvice",
    "sneakers", "ThriftStoreHauls", "OUTFITS",
    // beauty / self
    "beauty", "MakeupAddiction", "SkincareAddiction", "malegrooming",
    // internet culture / discourse
    "OutOfTheLoop", "popculturechat", "Fauxmoi", "InternetDrama",
    "memes", "TikTokCringe", "GenZ",
    // music
    "popheads", "hiphopheads", "listentothis",
    // food / home / life
    "food", "castiron", "mealprep", "interiordecorating", "houseplants",
    // movement / wellness
    "running", "yoga", "Meditation",
  ],
  youtube_categories: ["10", "22", "23", "24", "26"],
};

export interface SweepResult {
  items: RawItem[];
  reddit_venues: number;
  youtube_categories: number;
  failures: string[];
}

export async function runSweep(capturedAt: string): Promise<SweepResult> {
  const sources =
    (await getConfig<SweepSources>("sweep_sources")) ?? DEFAULT_SWEEP_SOURCES;
  const items: RawItem[] = [];
  const failures: string[] = [];
  let redditVenues = 0;
  let youtubeCategories = 0;

  if (isRedditConfigured()) {
    for (const sub of sources.subreddits) {
      try {
        items.push(...(await sweepSubreddit(sub, capturedAt)));
        redditVenues++;
      } catch (err) {
        // A dead/private subreddit must never sink the sweep.
        failures.push(`r/${sub}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (isYouTubeConfigured()) {
    for (const cat of sources.youtube_categories) {
      try {
        items.push(...(await sweepYouTubeCategory(cat, capturedAt)));
        youtubeCategories++;
      } catch (err) {
        failures.push(`yt-cat-${cat}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (failures.length > 0) {
    console.warn(`[sweep] ${failures.length} venue(s) failed:`, failures.join(" | "));
  }
  return {
    items,
    reddit_venues: redditVenues,
    youtube_categories: youtubeCategories,
    failures,
  };
}
