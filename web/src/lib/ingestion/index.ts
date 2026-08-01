import type { Signal, SignalSource } from "@/types";

// ---------------------------------------------------------------------------
// Ingestion seam. The MVP ingests signals manually (admin page) and via pasted
// text/links analyzed by the AI service. This interface is the contract real
// connectors (YouTube Data API, Reddit, TikTok, Google Trends) will implement
// later — each becomes a SignalSourceAdapter and plugs into the same pipeline
// without touching the rest of the app.
// ---------------------------------------------------------------------------

export interface IngestQuery {
  /** Free-text query, hashtag, subreddit, or channel id depending on source. */
  query: string;
  limit?: number;
  since?: string; // ISO date
}

export interface SignalSourceAdapter {
  source: SignalSource;
  /** Whether the adapter has the credentials/config it needs to run. */
  isConfigured(): boolean;
  /** Fetch raw signals from the platform. Not implemented for MVP sources. */
  fetch(query: IngestQuery): Promise<Partial<Signal>[]>;
}

/** Placeholder adapter used until a real connector is implemented. */
function placeholder(source: SignalSource): SignalSourceAdapter {
  return {
    source,
    isConfigured: () => false,
    async fetch() {
      throw new Error(
        `${source} ingestion is not enabled yet. Add signals via the admin import page, or implement a SignalSourceAdapter for ${source}.`
      );
    },
  };
}

export const adapters: Record<string, SignalSourceAdapter> = {
  youtube: placeholder("youtube"),
  reddit: placeholder("reddit"),
  tiktok: placeholder("tiktok"),
  google_trends: placeholder("google_trends"),
};

export function getAdapter(source: SignalSource): SignalSourceAdapter | null {
  return adapters[source] ?? null;
}
