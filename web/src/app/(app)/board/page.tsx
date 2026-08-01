import type { Metadata } from "next";
import Link from "next/link";
import { Radar } from "lucide-react";
import { getTrends } from "@/lib/data";
import { YourBoard } from "@/components/YourBoard";
import { SavedTrends } from "@/components/SavedTrends";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Board — WaveSight",
  description:
    "The waves that fit you: your scan results, plus the watchlist you're tracking with private notes.",
};

export default async function BoardPage() {
  const trends = await getTrends();

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
            Personal
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">
            Your Board
          </h1>
          <p className="mt-1 text-muted-foreground">
            The waves that fit you — scan matches and your watchlist, in one
            place.
          </p>
        </div>
        <Link
          href="/scan"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          <Radar className="size-3.5" /> Run a Scan
        </Link>
      </header>

      {/* Latest scan matches (or the first-scan invite) */}
      <YourBoard trends={trends} />

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl">Watchlist</h2>
          <p className="text-sm text-muted-foreground">
            Trends you&apos;ve saved, with your private notes.
          </p>
        </div>
        <SavedTrends trends={trends} />
      </section>
    </div>
  );
}
