import type { RawItem } from "./types.ts";
import { authorKey, normalizeText } from "./dedup.ts";

// The detector — bottom-up trend discovery, pure arithmetic until the very
// last step. Phrases spiking in the sweep corpus (vs the prior window and the
// baseline) become clusters of real items; only then does the model do its
// one legitimate job here: look at the actual posts and christen the trend.
// Model rejection or failure NEVER invents a trend — noise dies in the queue.

/** Detection thresholds — a phrase must clear ALL of these. */
export const MIN_ITEMS = 5;
export const MIN_AUTHORS = 4;
export const MIN_CONTAINERS = 2;
export const MIN_NOVELTY = 3;
/** A phrase's items may not concentrate above this share in one venue. */
export const MAX_CONTAINER_SHARE = 0.6;
export const MAX_CLUSTERS_PER_RUN = 12;

/** Generic web/reddit vocabulary that can never seed a trend by itself. */
const DETECT_STOP = new Set([
  "the","and","for","with","this","that","was","are","you","your","just",
  "like","have","has","had","not","but","what","when","how","why","who",
  "all","any","can","cant","dont","its","out","get","got","one","two",
  "new","best","first","time","day","week","year","today","yesterday",
  "anyone","else","people","thing","things","really","think","know","need",
  "help","question","post","thread","daily","discussion","weekly","official",
  "advice","looking","recommend","recommendation","favorite","thoughts",
  "https","http","www","com","amp","oc","psa","update","finally","made",
  "love","great","good","bad","much","many","some","from","about","after",
  "before","been","being","them","they","their","there","here","over","into",
  "would","could","should","still","only","also","very","more","most","than",
]);

export interface PhraseSpike {
  phrase: string;
  itemIds: string[];
  authors: number;
  containers: number;
  novelty: number;
  score: number;
}

/** 1-3 gram phrases of an item (title + text head), stopword-filtered. */
export function phrasesOf(item: RawItem): Set<string> {
  const text = normalizeText(
    `${item.title ?? ""} ${(item.text ?? "").slice(0, 200)}`
  );
  const tokens = text
    .split(" ")
    .filter((t) => t.length > 2 && !DETECT_STOP.has(t) && !/^\d+$/.test(t))
    .slice(0, 40);
  const grams = new Set<string>();
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const g = tokens.slice(i, i + n).join(" ");
      if (n === 1 && g.length < 4) continue;
      grams.add(g);
    }
  }
  return grams;
}

export interface DetectInputs {
  /** Sweep items in the current window (e.g. trailing 48h by posted_at). */
  current: RawItem[];
  /** Sweep items in the window before that — the "expected rate". */
  prior: RawItem[];
  /** Baseline corpus items — the culture-at-large expected rate. */
  baseline: RawItem[];
  /** Names of trends we already track (their phrases are not discoveries). */
  knownNames: string[];
}

/**
 * Find phrases spiking in the current window. Novelty is the current
 * document-rate over a blend of prior-window and baseline rates — a phrase
 * common everywhere (or last week) has novelty ~1 and dies here.
 */
export function findSpikes(inputs: DetectInputs): PhraseSpike[] {
  const known = inputs.knownNames.map(normalizeText);

  const docFreq = (items: RawItem[]): Map<string, number> => {
    const map = new Map<string, number>();
    for (const item of items) {
      for (const p of phrasesOf(item)) map.set(p, (map.get(p) ?? 0) + 1);
    }
    return map;
  };
  const priorFreq = docFreq(inputs.prior);
  const baseFreq = docFreq(inputs.baseline);
  const priorN = Math.max(1, inputs.prior.length);
  const baseN = Math.max(1, inputs.baseline.length);
  const curN = Math.max(1, inputs.current.length);

  const stats = new Map<
    string,
    { itemIds: string[]; authors: Set<string>; containers: Map<string, number> }
  >();
  for (const item of inputs.current) {
    for (const p of phrasesOf(item)) {
      const s = stats.get(p) ?? {
        itemIds: [],
        authors: new Set<string>(),
        containers: new Map<string, number>(),
      };
      s.itemIds.push(item.id);
      const a = authorKey(item);
      if (a) s.authors.add(a);
      if (item.container) {
        const key = `${item.source}:${item.container}`;
        s.containers.set(key, (s.containers.get(key) ?? 0) + 1);
      }
      stats.set(p, s);
    }
  }

  // Phrases of trends we already track are measurements, not discoveries.
  // A phrase is "known" when it substring-overlaps a tracked name in either
  // direction OR shares any word-bigram with one ("spotted barn jacket" is
  // still about Barn Jacket Renaissance).
  const knownBigrams = new Set<string>();
  for (const k of known) {
    const toks = k.split(" ").filter((t) => t.length > 2);
    for (let i = 0; i + 2 <= toks.length; i++) {
      knownBigrams.add(`${toks[i]} ${toks[i + 1]}`);
    }
  }
  const isKnownPhrase = (phrase: string): boolean => {
    if (known.some((k) => k.includes(phrase) || phrase.includes(k))) return true;
    const toks = phrase.split(" ");
    for (let i = 0; i + 2 <= toks.length; i++) {
      if (knownBigrams.has(`${toks[i]} ${toks[i + 1]}`)) return true;
    }
    return false;
  };

  const spikes: PhraseSpike[] = [];
  for (const [phrase, s] of stats) {
    // Single words are venue vocabulary ("look", "product", "fresh") — a
    // trend needs a multi-word name to seed a cluster.
    if (!phrase.includes(" ")) continue;
    if (s.itemIds.length < MIN_ITEMS) continue;
    if (s.authors.size < MIN_AUTHORS) continue;
    if (s.containers.size < MIN_CONTAINERS) continue;
    if (isKnownPhrase(phrase)) continue;

    // Venue-vocabulary gate: a phrase living mostly inside ONE venue is that
    // venue's dialect ("cast iron" in r/castiron), not a cultural motion.
    const topContainerShare =
      Math.max(...s.containers.values(), 0) / s.itemIds.length;
    if (topContainerShare > MAX_CONTAINER_SHARE) continue;

    // Conservative novelty: expected rate is the WORST CASE of the prior
    // window and the baseline corpus, with a floor so a tiny denominator
    // cannot mint infinite novelty on a cold start.
    const curRate = s.itemIds.length / curN;
    const expected = Math.max(
      (priorFreq.get(phrase) ?? 0) / priorN,
      (baseFreq.get(phrase) ?? 0) / baseN,
      1.5 / curN
    );
    const novelty = curRate / expected;
    if (novelty < MIN_NOVELTY) continue;

    spikes.push({
      phrase,
      itemIds: s.itemIds,
      authors: s.authors.size,
      containers: s.containers.size,
      novelty: round2(novelty),
      score: round2(s.itemIds.length * Math.log2(novelty + 1)),
    });
  }
  return spikes.sort((a, b) => b.score - a.score);
}

export interface ClusterDraft {
  phrases: string[];
  itemIds: string[];
  authors: number;
  containers: number;
  novelty: number;
  score: number;
}

/**
 * Merge spiking phrases that ride the same items (Jaccard >= 0.5) — "barn
 * jacket" and "barn jacket renaissance" are one cluster, not two trends.
 */
export function clusterSpikes(spikes: PhraseSpike[]): ClusterDraft[] {
  const clusters: (ClusterDraft & { itemSet: Set<string> })[] = [];
  for (const spike of spikes) {
    const set = new Set(spike.itemIds);
    let home: (typeof clusters)[number] | null = null;
    for (const c of clusters) {
      let inter = 0;
      for (const id of set) if (c.itemSet.has(id)) inter++;
      const union = c.itemSet.size + set.size - inter;
      if (union > 0 && inter / union >= 0.5) {
        home = c;
        break;
      }
    }
    if (home) {
      home.phrases.push(spike.phrase);
      for (const id of set) home.itemSet.add(id);
      home.itemIds = [...home.itemSet];
      home.novelty = Math.max(home.novelty, spike.novelty);
      home.authors = Math.max(home.authors, spike.authors);
      home.containers = Math.max(home.containers, spike.containers);
    } else {
      clusters.push({
        phrases: [spike.phrase],
        itemIds: spike.itemIds,
        itemSet: set,
        authors: spike.authors,
        containers: spike.containers,
        novelty: spike.novelty,
        score: spike.score,
      });
    }
  }
  return clusters
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CLUSTERS_PER_RUN)
    .map(({ itemSet: _itemSet, ...rest }) => rest);
}


function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
