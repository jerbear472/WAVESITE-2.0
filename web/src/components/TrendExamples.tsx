import { ExternalLink, Quote, Radio } from "lucide-react";
import type { Trend } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrendExamples, type TrendExample } from "@/lib/trend-examples";

// "In the wild" — real posts only. Live TikTok pulls and stored evidence
// receipts, every card an actual link with actual numbers. AI-suggested
// hooks only appear when there are zero real examples, and say so.

function ExampleCard({ ex }: { ex: TrendExample }) {
  return (
    <a
      href={ex.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/ex flex flex-col justify-between rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-border-strong hover:shadow-sm"
    >
      <p className="line-clamp-3 text-sm font-medium leading-snug text-foreground">
        {ex.title}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-medium">
          {ex.live ? (
            <span className="size-1.5 rounded-full bg-[#159a78]" />
          ) : null}
          {ex.platform}
        </span>
        {ex.author ? <span className="truncate">{ex.author}</span> : null}
        {ex.engagement ? (
          <span className="font-semibold tabular-nums text-foreground">
            {ex.engagement}
          </span>
        ) : null}
        {ex.postedAt ? <span>{ex.postedAt}</span> : null}
        <ExternalLink className="ml-auto size-3 opacity-50 group-hover/ex:opacity-100" />
      </div>
    </a>
  );
}

export async function TrendExamples({ trend }: { trend: Trend }) {
  const { live, receipts } = await getTrendExamples(trend);
  const total = live.length + receipts.length;

  if (total === 0) {
    if (!trend.sample_hooks?.length) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Quote className="size-[18px] text-primary" /> Suggested hooks
            <span className="font-normal text-muted-foreground">
              (AI-drafted — no verified posts captured yet)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trend.sample_hooks.slice(0, 3).map((h, i) => (
              <figure
                key={i}
                className="rounded-xl border-l-2 border-primary bg-primary-tint/40 px-4 py-4 text-[15px] font-medium leading-snug text-foreground"
              >
                “{h}”
              </figure>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Radio className="size-[18px] text-primary" /> In the wild — real
          posts
          <span className="font-normal text-muted-foreground">({total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {live.length ? (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live on TikTok right now
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((ex) => (
                <ExampleCard key={ex.url} ex={ex} />
              ))}
            </div>
          </>
        ) : null}
        {receipts.length ? (
          <>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Captured evidence
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {receipts.map((ex) => (
                <ExampleCard key={ex.url} ex={ex} />
              ))}
            </div>
          </>
        ) : null}
        <p className="mt-3 text-xs text-faint">
          Every card links to an actual post with its real numbers — nothing
          here is generated.
        </p>
      </CardContent>
    </Card>
  );
}
