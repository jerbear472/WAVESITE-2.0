import { getTrends } from "@/lib/data";
import { BriefGenerator } from "@/components/BriefGenerator";

export const dynamic = "force-dynamic";

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ trend?: string }>;
}) {
  const [{ trend }, trends] = await Promise.all([searchParams, getTrends()]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
          AI Studio
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Creative Brief Generator
        </h1>
        <p className="mt-1 text-muted-foreground">
          Turn a trend into a ready-to-shoot brief, tuned to who you are and how
          you want to show up.
        </p>
      </header>

      <BriefGenerator trends={trends} initialTrend={trend} />
    </div>
  );
}
