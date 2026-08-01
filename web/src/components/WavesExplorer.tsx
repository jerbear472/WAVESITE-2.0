"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Waves } from "lucide-react";
import type { Trend } from "@/types";
import { TrendCard } from "@/components/TrendCard";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { sentimentBucket } from "@/lib/scores";

interface Props {
  trends: Trend[];
  categories: string[];
  platforms: string[];
}

const LIFECYCLES = [
  "emerging",
  "accelerating",
  "peaking",
  "saturated",
  "declining",
  "resurfacing",
];
const RISKS = ["low", "medium", "high"];
const SENTIMENTS = [
  { value: "positive", label: "Positive" },
  { value: "mixed", label: "Mixed" },
  { value: "cautious", label: "Cautious" },
];

const EMPTY = {
  search: "",
  category: "",
  platform: "",
  audience: "",
  lifecycle: "",
  risk: "",
  sentiment: "",
};

export function WavesExplorer({ trends, categories, platforms }: Props) {
  const [f, setF] = useState({ ...EMPTY });

  const audiences = useMemo(() => {
    const set = new Set<string>();
    trends.forEach((t) =>
      t.audience.split(/,|;/).forEach((a) => {
        const v = a.trim();
        if (v) set.add(v);
      })
    );
    return Array.from(set).sort();
  }, [trends]);

  const filtered = useMemo(() => {
    return trends.filter((t) => {
      if (
        f.search &&
        !`${t.name} ${t.one_line_summary} ${t.category} ${t.audience}`
          .toLowerCase()
          .includes(f.search.toLowerCase())
      )
        return false;
      if (f.category && t.category !== f.category) return false;
      if (
        f.platform &&
        !t.best_platforms.some((p) =>
          p.toLowerCase().includes(f.platform.toLowerCase())
        )
      )
        return false;
      if (
        f.audience &&
        !t.audience.toLowerCase().includes(f.audience.toLowerCase())
      )
        return false;
      if (f.lifecycle && t.lifecycle_stage !== f.lifecycle) return false;
      if (f.risk && t.risk_level !== f.risk) return false;
      if (f.sentiment && sentimentBucket(t.sentiment_score) !== f.sentiment)
        return false;
      return true;
    });
  }, [trends, f]);

  const activeCount = Object.entries(f).filter(
    ([k, v]) => k !== "search" && v
  ).length;

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-border bg-card/70 p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input
              value={f.search}
              onChange={(e) => setF({ ...f, search: e.target.value })}
              placeholder="Search trends, categories, audiences…"
              className="pl-9"
            />
          </div>
          {activeCount > 0 || f.search ? (
            <Button variant="ghost" size="sm" onClick={() => setF({ ...EMPTY })}>
              Clear
            </Button>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={f.platform}
            onChange={(e) => setF({ ...f, platform: e.target.value })}
            aria-label="Platform"
          >
            <option value="">All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Select
            value={f.audience}
            onChange={(e) => setF({ ...f, audience: e.target.value })}
            aria-label="Audience"
          >
            <option value="">All audiences</option>
            {audiences.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Select
            value={f.lifecycle}
            onChange={(e) => setF({ ...f, lifecycle: e.target.value })}
            aria-label="Lifecycle"
          >
            <option value="">Any lifecycle</option>
            {LIFECYCLES.map((l) => (
              <option key={l} value={l}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </Select>
          <Select
            value={f.risk}
            onChange={(e) => setF({ ...f, risk: e.target.value })}
            aria-label="Risk level"
          >
            <option value="">Any risk</option>
            {RISKS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)} risk
              </option>
            ))}
          </Select>
          <Select
            value={f.sentiment}
            onChange={(e) => setF({ ...f, sentiment: e.target.value })}
            aria-label="Sentiment"
          >
            <option value="">Any sentiment</option>
            {SENTIMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <SlidersHorizontal className="size-3.5" />
          {filtered.length} of {trends.length} trends
          {activeCount > 0 ? ` · ${activeCount} filter${activeCount > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border-strong bg-card/40 px-6 py-16 text-center">
          <Waves className="size-8 text-faint" />
          <h3 className="mt-3 font-medium">No trends match these filters</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try clearing a filter or widening your search to see more of the
            board.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setF({ ...EMPTY })}
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TrendCard key={t.id} trend={t} />
          ))}
        </div>
      )}
    </div>
  );
}
