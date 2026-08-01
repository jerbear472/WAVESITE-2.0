import { TimelineBoard } from "@/components/TimelineBoard";

export const dynamic = "force-dynamic";

export default function TimelinePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
          Rise &amp; Fall
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Trend Timeline
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every trend as a wave over real time — measured daily volume from
          Reddit and YouTube, sentiment along the curve, and our peak calls
          pinned where they resolve. Sorted by measured velocity.
        </p>
      </header>
      <TimelineBoard />
    </div>
  );
}
