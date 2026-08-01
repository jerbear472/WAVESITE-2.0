import Link from "next/link";
import { getTrends, getFilterOptions } from "@/lib/data";
import { WavesExplorer } from "@/components/WavesExplorer";

export const dynamic = "force-dynamic";

export default async function WavesPage() {
  const [trends, options] = await Promise.all([
    getTrends(),
    getFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
          The Full Board
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Trend Library
        </h1>
        <p className="mt-1 text-muted-foreground">
          Every trend we&apos;re tracking, ranked by WaveScore. Browse the whole
          board — or{" "}
          <Link href="/scan" className="text-primary-strong underline">
            run a scan
          </Link>{" "}
          to narrow it to you.
        </p>
      </header>

      <WavesExplorer
        trends={trends}
        categories={options.categories}
        platforms={options.platforms}
      />
    </div>
  );
}
