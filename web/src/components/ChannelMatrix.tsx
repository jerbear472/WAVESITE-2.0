"use client";

import Link from "next/link";
import type { HarmonizedTrend } from "@/lib/harmony";
import { HARMONY_TIERS } from "@/lib/harmony";

// Cross-channel pattern read: which trends are echoing across which platforms.
// A trend lighting up 3+ columns is spreading culture-wide, not app-deep.

const CHANNELS: { key: string; label: string; match: string[] }[] = [
  { key: "tiktok", label: "TikTok", match: ["tiktok"] },
  { key: "instagram", label: "Instagram", match: ["instagram", "ig", "reels"] },
  { key: "youtube", label: "YouTube", match: ["youtube", "shorts"] },
  { key: "x", label: "X", match: ["x", "twitter"] },
  { key: "reddit", label: "Reddit", match: ["reddit"] },
  { key: "pinterest", label: "Pinterest", match: ["pinterest"] },
  { key: "threads", label: "Threads", match: ["threads"] },
];

function onChannel(trend: HarmonizedTrend, match: string[]): boolean {
  return trend.best_platforms.some((p) => {
    const norm = p.toLowerCase();
    return match.some((m) => (m === "x" ? norm === "x" : norm.includes(m)));
  });
}

export function ChannelMatrix({ trends }: { trends: HarmonizedTrend[] }) {
  const rows = trends.slice(0, 12);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="panel-divide border-b">
            <th className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-panel-muted">
              Trend
            </th>
            {CHANNELS.map((c) => (
              <th
                key={c.key}
                className="px-2 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-panel-muted"
              >
                {c.label}
              </th>
            ))}
            <th className="py-2.5 pl-2 text-right text-[11px] font-medium uppercase tracking-[0.12em] text-panel-muted">
              Spread
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const spec = HARMONY_TIERS[t.tier];
            const hits = CHANNELS.filter((c) => onChannel(t, c.match));
            return (
              <tr key={t.id} className="panel-divide border-b last:border-0">
                <td className="max-w-[220px] truncate py-2.5 pr-4">
                  <Link
                    href={`/trends/${t.slug}`}
                    className="hover:text-white"
                    style={{ color: t.tier === "fading" ? "#7d7a70" : undefined }}
                  >
                    {t.name}
                  </Link>
                </td>
                {CHANNELS.map((c) => (
                  <td key={c.key} className="px-2 py-2.5 text-center">
                    {onChannel(t, c.match) ? (
                      <span
                        className="mx-auto block size-2.5 rounded-full"
                        style={{
                          background: spec.bright,
                          boxShadow:
                            t.tier === "in_sync"
                              ? `0 0 8px ${spec.glow}`
                              : undefined,
                        }}
                      />
                    ) : (
                      <span className="mx-auto block size-1 rounded-full bg-white/10" />
                    )}
                  </td>
                ))}
                <td
                  className="py-2.5 pl-2 text-right font-mono text-xs"
                  style={{ color: spec.bright }}
                >
                  {hits.length}/{CHANNELS.length}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
