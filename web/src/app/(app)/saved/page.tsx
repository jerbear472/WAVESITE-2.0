import { getTrends } from "@/lib/data";
import { SavedTrends } from "@/components/SavedTrends";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const trends = await getTrends();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
          Watchlist
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Saved Trends
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your private watchlist of trends worth acting on, with notes.
        </p>
      </header>

      <SavedTrends trends={trends} />
    </div>
  );
}
