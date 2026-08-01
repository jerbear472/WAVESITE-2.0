import type { Trend } from "@/types";

// ---------------------------------------------------------------------------
// Trend imagery — curated Unsplash photography matched by theme keywords.
// Every URL below is verified-stable Unsplash CDN (hotlinking is permitted).
// Pulse trends have no owned media yet, so tiles and detail pages pull the
// closest visual theme; matching is deterministic per trend (slug-hashed) so
// a trend keeps the same imagery across renders.
// ---------------------------------------------------------------------------

const U = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

interface ImageTheme {
  keywords: string[];
  photos: string[];
}

/** Order matters — first matching theme wins; specific themes go first. */
const THEMES: ImageTheme[] = [
  {
    keywords: ["yellow", "butter", "color", "colour"],
    photos: [
      U("1503342217505-b0a15ec3261c"),
      U("1513475382585-d06e58bcb0e0"),
      U("1490730141103-6cac27aaab94"),
    ],
  },
  {
    keywords: ["workspace", "desk", "office", "productivity", "wfh", "remote"],
    photos: [
      U("1497366216548-37526070297c"),
      U("1533090161767-e6ffed986c88"),
      U("1524758631624-e2822e304c36"),
      U("1516321318423-f06f85e504b3"),
    ],
  },
  {
    keywords: ["luxury", "quiet", "premium", "minimal"],
    photos: [
      U("1533090161767-e6ffed986c88"),
      U("1469334031218-e382a71b716b"),
      U("1616486338812-3dadae4b4ace"),
    ],
  },
  {
    keywords: [
      "fashion",
      "style",
      "outfit",
      "aesthetic",
      "boho",
      "wardrobe",
      "wear",
      "look",
    ],
    photos: [
      U("1515886657613-9f3515b0c78f"),
      U("1529139574466-a303027c1d8b"),
      U("1483985988355-763728e1935b"),
      U("1490481651871-ab68de25d43d"),
      U("1445205170230-053b83016050"),
    ],
  },
  {
    keywords: ["beauty", "makeup", "skincare", "glow"],
    photos: [
      U("1487412720507-e7ab37603c6f"),
      U("1596462502278-27bfdc403348"),
    ],
  },
  {
    keywords: [
      "wellness",
      "reset",
      "self-care",
      "calm",
      "mindful",
      "detox",
      "sunday",
      "rest",
    ],
    photos: [
      U("1544367567-0f2fcb009e0b"),
      U("1506126613408-eca07ce68773"),
      U("1545205597-3d9d02c29597"),
    ],
  },
  {
    keywords: ["food", "cafe", "coffee", "recipe", "snack"],
    photos: [
      U("1504674900247-0877df9cc836"),
      U("1495474472287-4d71bcdd2085"),
    ],
  },
  {
    keywords: ["music", "sound", "concert", "artist", "song", "dj"],
    photos: [
      U("1493225457124-a3eb161ffa5f"),
      U("1470225620780-dba8ba36b745"),
    ],
  },
  {
    keywords: ["home", "interior", "design", "apartment", "decor", "room"],
    photos: [
      U("1586023492125-27b2c045efd7"),
      U("1616486338812-3dadae4b4ace"),
      U("1522708323590-d24dbb6b0267"),
    ],
  },
  {
    keywords: ["shopping", "retail", "haul", "consumer", "brand", "store"],
    photos: [
      U("1441986300917-64674bd600d8"),
      U("1441984904996-e0b6ba687e04"),
      U("1521572163474-6864f9cf17ab"),
    ],
  },
  {
    keywords: [
      "meme",
      "algorithm",
      "pov",
      "internet",
      "phone",
      "social",
      "content",
      "creator",
      "delulu",
      "online",
    ],
    photos: [
      U("1611162617213-7d7a39e9b1d7"),
      U("1611162616475-46b635cb6868"),
      U("1498050108023-c5249f4df085"),
    ],
  },
];

/** Everything-else fallback — editorial neutrals. */
const FALLBACK = [
  U("1529139574466-a303027c1d8b"),
  U("1533090161767-e6ffed986c88"),
  U("1611162616475-46b635cb6868"),
];

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Deterministic imagery for a trend: up to `count` photos from the first
 * theme whose keywords appear in the trend's name/category/summary, rotated
 * by slug hash so trends sharing a theme don't share a lead photo.
 */
export function imagesForTrend(
  trend: Pick<Trend, "name" | "category" | "slug" | "one_line_summary">,
  count = 3
): string[] {
  const hay =
    `${trend.name} ${trend.category} ${trend.one_line_summary}`.toLowerCase();
  const theme =
    THEMES.find((t) => t.keywords.some((k) => hay.includes(k))) ?? {
      photos: FALLBACK,
    };
  const start = hashSlug(trend.slug) % theme.photos.length;
  const rotated = [
    ...theme.photos.slice(start),
    ...theme.photos.slice(0, start),
  ];
  return rotated.slice(0, count);
}

/** Lead photo for cards and tiles. */
export function heroImageForTrend(
  trend: Pick<Trend, "name" | "category" | "slug" | "one_line_summary">
): string {
  return imagesForTrend(trend, 1)[0];
}
