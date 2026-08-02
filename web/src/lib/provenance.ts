import type { Trend } from "@/types";

// ---------------------------------------------------------------------------
// Provenance — how a trend earned its place, computed from the trend record
// alone so any card can show it without extra queries. This is the Market's
// trust hierarchy: measured beats scanned beats imported beats "the model
// said so". Unverified trends are demoted to the shelf, never mixed in.
// ---------------------------------------------------------------------------

export type ProvenanceTone = "measured" | "scan" | "import" | "unverified";

export interface Provenance {
  verified: boolean;
  tone: ProvenanceTone;
  /** Short chip text. */
  label: string;
  /** One-line receipts, used for tooltips/subtext. */
  detail: string;
}

const TONE_COLORS: Record<ProvenanceTone, { color: string; bg: string }> = {
  measured: { color: "#159a78", bg: "rgba(21,154,120,.1)" },
  scan: { color: "#2865d8", bg: "rgba(52,120,246,.1)" },
  import: { color: "#6d5bd0", bg: "rgba(109,91,208,.1)" },
  unverified: { color: "#8a94a6", bg: "rgba(138,148,166,.12)" },
};

export function provenanceColors(tone: ProvenanceTone) {
  return TONE_COLORS[tone];
}

export function provenanceForTrend(trend: Trend): Provenance {
  if (trend.origin === "detected") {
    return {
      verified: true,
      tone: "measured",
      label: "Measured",
      detail:
        "Born from cross-platform measurement — real daily counts accelerated on independent platforms.",
    };
  }
  if (trend.origin === "scan") {
    const n = trend.sources?.length ?? 0;
    return {
      verified: true,
      tone: "scan",
      label: n > 0 ? `Web-scanned · ${n} sources` : "Web-scanned",
      detail:
        "Found by live web research; every claim cites real URLs recorded as evidence.",
    };
  }
  if (trend.origin === "import") {
    return {
      verified: true,
      tone: "import",
      label: "Imported",
      detail: "Added by a human via the import desk.",
    };
  }
  if (trend.hero_image_url) {
    // Pulse/seed-era record that the measured pipeline later matched to real
    // corpus posts — the media is the receipt.
    return {
      verified: true,
      tone: "measured",
      label: "Corpus-matched",
      detail:
        "Matched to real posts by the measured pipeline — the media shown is from an actual post.",
    };
  }
  return {
    verified: false,
    tone: "unverified",
    label: "Unverified",
    detail:
      "Model-suggested and not yet seen in the wild. It graduates the moment the measurement layer finds it.",
  };
}
