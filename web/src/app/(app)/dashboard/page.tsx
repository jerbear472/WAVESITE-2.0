import Link from "next/link";
import { TrendingUp, Smile, ShieldCheck, Flame, Radar } from "lucide-react";
import { getDashboardStats, getTrends, getLatestDailyReport } from "@/lib/data";
import { StatCard } from "@/components/StatCard";
import { YourBoard } from "@/components/YourBoard";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, trends, report] = await Promise.all([
    getDashboardStats(),
    getTrends(),
    getLatestDailyReport(),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
            Cultural Intelligence · {formatDate(new Date().toISOString())}
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">
            Command Center
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your scanned board, plus a live read on the wider culture market.
          </p>
        </div>
        <Link
          href="/scan"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          <Radar className="size-3.5" /> Run a Scan
        </Link>
      </header>

      {/* Market overview — small, aggregate signal, not a content dump */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Rising Waves"
          value={stats.risingWaves}
          hint="Emerging & accelerating"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Positive Sentiment"
          value={stats.positiveSentiment}
          hint="Sentiment ≥ 78"
          icon={Smile}
          tone="success"
        />
        <StatCard
          label="Brand-Safe Opportunities"
          value={stats.brandSafe}
          hint="Safe & low risk"
          icon={ShieldCheck}
          tone="violet"
        />
        <StatCard
          label="Backlash Forming"
          value={stats.backlashForming}
          hint="Watch closely"
          icon={Flame}
          tone="danger"
        />
      </section>

      {report ? (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
              WaveSight Daily · {formatDate(report.report_date)}
            </p>
            <h2 className="mt-1 font-display text-xl">
              {report.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {report.summary}
            </p>
          </div>
          <Link
            href="/daily"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Read report
          </Link>
        </Card>
      ) : null}

      {/* The user's narrowed scan board (or an invite to run one) */}
      <YourBoard trends={trends} />
    </div>
  );
}
