// Prediction market aggregator — pulls live markets from the public Kalshi and
// Polymarket APIs (no auth required for read-only market data). The scan
// matches these against discovered trends and compares market-implied odds to
// public sentiment.

export interface LiveMarket {
  venue: "kalshi" | "polymarket";
  title: string;
  url: string;
  /** Implied probability of YES, 0-100. */
  impliedProbability: number;
  /** 24h volume in USD (approximate; venues report differently). */
  volume24h: number;
}

const FETCH_TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export async function fetchKalshiMarkets(): Promise<LiveMarket[]> {
  const data = (await fetchJson(
    "https://api.elections.kalshi.com/trade-api/v2/markets?limit=200&status=open"
  )) as { markets?: Array<Record<string, unknown>> };

  return (data.markets ?? [])
    .map((m): LiveMarket | null => {
      const title = [m.title, m.yes_sub_title || m.subtitle]
        .filter(Boolean)
        .join(" — ");
      const lastPrice = Number(m.last_price); // cents
      const eventTicker = String(m.event_ticker ?? "");
      if (!title || !eventTicker || !Number.isFinite(lastPrice)) return null;
      return {
        venue: "kalshi",
        title,
        url: `https://kalshi.com/events/${eventTicker}`,
        impliedProbability: Math.round(lastPrice),
        volume24h: Number(m.volume_24h) || 0,
      };
    })
    .filter((m): m is LiveMarket => m !== null && m.impliedProbability > 0);
}

export async function fetchPolymarketMarkets(): Promise<LiveMarket[]> {
  const data = (await fetchJson(
    "https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=200&order=volume24hr&ascending=false"
  )) as Array<Record<string, unknown>>;

  return (Array.isArray(data) ? data : [])
    .map((m): LiveMarket | null => {
      const title = String(m.question ?? "");
      const slug = String(m.slug ?? "");
      if (!title || !slug) return null;
      let yes = NaN;
      try {
        const prices = JSON.parse(String(m.outcomePrices ?? "[]"));
        yes = Number(prices?.[0]);
      } catch {
        return null;
      }
      if (!Number.isFinite(yes)) return null;
      return {
        venue: "polymarket",
        title,
        url: `https://polymarket.com/market/${slug}`,
        impliedProbability: Math.round(yes * 100),
        volume24h: Number(m.volume24hr) || 0,
      };
    })
    .filter((m): m is LiveMarket => m !== null);
}

/** Fetch both venues in parallel; a venue failing never sinks the scan. */
export async function fetchAllMarkets(): Promise<{
  markets: LiveMarket[];
  venuesReached: string[];
}> {
  const [kalshi, polymarket] = await Promise.allSettled([
    fetchKalshiMarkets(),
    fetchPolymarketMarkets(),
  ]);
  const markets: LiveMarket[] = [];
  const venuesReached: string[] = [];
  if (kalshi.status === "fulfilled") {
    markets.push(...kalshi.value);
    venuesReached.push("Kalshi");
  } else console.error("[markets] kalshi fetch failed:", kalshi.reason);
  if (polymarket.status === "fulfilled") {
    markets.push(...polymarket.value);
    venuesReached.push("Polymarket");
  } else console.error("[markets] polymarket fetch failed:", polymarket.reason);
  return { markets, venuesReached };
}

/**
 * Narrow the venue firehose to markets plausibly related to the scanned field:
 * keyword matches against trend names/categories/niche first, topped up with
 * the highest-volume culture-adjacent markets so the analyst always has a
 * baseline read.
 */
export function filterRelevantMarkets(
  markets: LiveMarket[],
  keywords: string[],
  cap = 40
): LiveMarket[] {
  const terms = Array.from(
    new Set(
      keywords
        .flatMap((k) => k.toLowerCase().split(/[^a-z0-9]+/))
        .filter((w) => w.length >= 4)
    )
  );
  const matched: LiveMarket[] = [];
  const rest: LiveMarket[] = [];
  for (const m of markets) {
    const hay = m.title.toLowerCase();
    (terms.some((t) => hay.includes(t)) ? matched : rest).push(m);
  }
  const byVolume = (a: LiveMarket, b: LiveMarket) => b.volume24h - a.volume24h;
  matched.sort(byVolume);
  rest.sort(byVolume);
  return [...matched, ...rest.slice(0, Math.max(0, 20 - matched.length))].slice(
    0,
    cap
  );
}
