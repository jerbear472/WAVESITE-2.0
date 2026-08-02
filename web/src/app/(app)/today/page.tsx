import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Flame,
  Mail,
  Radio,
  Sparkles,
  Target,
} from "lucide-react";
import { buildDailyDigest, type DigestStory } from "@/lib/daily-digest";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TrendCard } from "@/components/TrendCard";
import { Delta } from "@/components/HarmonyBoard";
import { RunSyncButton } from "@/components/RunSyncButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today — WaveSight",
  description:
    "The WaveSight Daily: what moved since the last pulse, and today's read on where culture is heading.",
};

// The daily issue, designed like the newsletter it becomes: masthead, lede,
// the tape, ranked stories, sign-off. The email version is the same digest
// rendered email-safe — /api/daily/newsletter.

function issueDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function TodayPage() {
  const digest = await buildDailyDigest();

  return (
    <div className="mx-auto max-w-[860px]">
      {/* Masthead — the paper's nameplate */}
      <header>
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <p className="text-[15px] font-extrabold tracking-[0.22em] text-foreground">
            WAVE<span className="text-primary">SIGHT</span> DAILY
          </p>
          <div className="flex items-center gap-2">
            <a
              href="/api/daily/newsletter"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Mail /> Email version
            </a>
            <RunSyncButton />
          </div>
        </div>
        {/* Double rule — newspaper nameplate underline */}
        <div className="border-t-2 border-foreground" />
        <div className="mt-[3px] border-t border-border" />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">
            {issueDateLabel(digest.date)}
          </p>
          {digest.lastPulseAt ? (
            <p className="text-xs text-faint">
              Last pulse{" "}
              {new Date(digest.lastPulseAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : null}
        </div>
      </header>

      {/* Lede */}
      <section className="mt-8">
        <h1 className="font-display text-[2.5rem] leading-[1.08] tracking-tight text-balance sm:text-[3rem]">
          {digest.title}
        </h1>
        <p className="mt-4 max-w-[62ch] text-lg leading-[1.6] text-muted-foreground text-balance">
          {digest.summary}
        </p>
      </section>

      {/* The tape — movers when the board moved, standings when it's flat */}
      {digest.tape.entries.length ? (
        <section className="mt-10">
          <SectionRule
            label={
              digest.tape.kind === "movers"
                ? "The tape — since yesterday"
                : "The tape — today's standings"
            }
          />
          <Card className="mt-4">
            <CardContent className="divide-y divide-border p-0">
              {digest.tape.entries.map((m) => (
                <Link
                  key={m.slug}
                  href={`/trends/${m.slug}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-baseline gap-2.5">
                    <span className="truncate font-display text-[15px] leading-tight">
                      {m.name}
                    </span>
                    <span className="hidden text-[11px] font-medium uppercase tracking-[0.1em] text-faint sm:inline">
                      {m.category}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-[13px] tnum text-muted-foreground">
                      Wave {m.wavescore}
                    </span>
                    <Delta value={m.delta} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* The issue body — ranked stories in a reading column */}
      {digest.stories.length ? (
        <section className="mt-10">
          <Card>
            <CardContent className="p-7 sm:p-10">
              <article className="mx-auto max-w-[66ch]">
                {digest.stories.map((story, i) => (
                  <Story key={i} story={story} first={i === 0} />
                ))}
              </article>
            </CardContent>
          </Card>
        </section>
      ) : (
        <Card className="mt-10 flex items-center justify-center border-dashed">
          <div className="px-6 py-16 text-center text-muted-foreground">
            No report has been generated yet today. The pulse keeps running on
            schedule — check back after the next run, or{" "}
            <Link href="/market" className="text-primary-strong underline">
              explore the market
            </Link>{" "}
            in the meantime.
          </div>
        </Card>
      )}

      {/* Top trends */}
      {digest.topTrends.length ? (
        <section className="mt-10">
          <SectionRule label="Top trends today" />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {digest.topTrends.map((t) => (
              <TrendCard key={t.id} trend={t} />
            ))}
          </div>
        </section>
      ) : null}

      {/* New arrivals — compact, the issue's classifieds */}
      {digest.newArrivals.length ? (
        <section className="mt-10">
          <SectionRule label="New in the library — last 7 days" icon={Sparkles} />
          <Card className="mt-4">
            <CardContent className="divide-y divide-border p-0">
              {digest.newArrivals.map((t) => (
                <Link
                  key={t.id}
                  href={`/trends/${t.slug}`}
                  className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                      {t.category} · {t.lifecycle_stage}
                    </p>
                    <p className="truncate font-display text-base leading-tight group-hover:text-primary-strong">
                      {t.name}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-faint group-hover:text-primary-strong" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* The machine today — slim colophon strip */}
      <section className="mt-10">
        <SectionRule label="The machine today" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MachineStat
            icon={Radio}
            label="Terms watched"
            value={digest.machine.watched}
            href="/signals"
          />
          <MachineStat
            icon={Flame}
            label="Firing now"
            value={digest.machine.firing}
            href="/signals"
          />
          <MachineStat
            icon={Activity}
            label="Forecasts opened · 24h"
            value={digest.machine.opened}
            href="/track-record"
          />
          <MachineStat
            icon={Target}
            label={`Resolved · 24h (${digest.machine.pending} open)`}
            value={digest.machine.resolved}
            href="/track-record"
          />
        </div>
        <p className="mt-3 text-xs text-faint">
          Daily loop: measure five platforms → refresh lifecycles → promote
          what accelerates → open falsifiable forecasts.
        </p>
      </section>

      {/* Sign-off */}
      <footer className="mt-12 border-t border-border pb-4 pt-6 text-center">
        <p className="text-sm text-muted-foreground">— The WaveSight desk</p>
        <p className="mt-2 text-xs text-faint">
          This issue is send-ready:{" "}
          <a
            href="/api/daily/newsletter"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-strong underline underline-offset-2"
          >
            open the email version
          </a>{" "}
          and paste it into your ESP, or wire it to a send API.
        </p>
      </footer>
    </div>
  );
}

/** Hairline section rule with an uppercase label — the paper's furniture. */
function SectionRule({
  label,
  icon: Icon,
}: {
  label: string;
  icon?: typeof Sparkles;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-strong">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/** One parsed report story. Ranked entries get a hung numeral; headings that
 *  name a library trend link through to it. */
function Story({ story, first }: { story: DigestStory; first: boolean }) {
  const ranked = story.heading.match(/^(\d+)[.)]\s*(.+)$/);
  const headingText = ranked ? ranked[2] : story.heading;

  const heading = story.heading ? (
    story.level === 2 ? (
      <h2
        className={`${first ? "" : "mt-9"} text-[11px] font-bold uppercase tracking-[0.16em] text-primary-strong`}
      >
        {headingText}
      </h2>
    ) : (
      <h3 className="mt-8 flex items-baseline gap-3 font-display text-xl leading-snug">
        {ranked ? (
          <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-faint">
            {ranked[1].padStart(2, "0")}
          </span>
        ) : null}
        {story.slug ? (
          <Link
            href={`/trends/${story.slug}`}
            className="hover:text-primary-strong"
          >
            {headingText}
          </Link>
        ) : (
          headingText
        )}
      </h3>
    )
  ) : null;

  return (
    <>
      {heading}
      {story.paragraphs.map((p, i) => (
        <p
          key={i}
          className={`${first && !story.heading && i === 0 ? "text-[17px]" : "text-[15px]"} mt-3 leading-[1.7] text-foreground/90`}
          dangerouslySetInnerHTML={{ __html: renderInline(p) }}
        />
      ))}
    </>
  );
}

function MachineStat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-surface-2/50 px-4 py-3 transition-colors hover:border-border-strong hover:bg-muted/50"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground group-hover:text-primary-strong">
        {value}
      </p>
    </Link>
  );
}

/** Bold (**text**) only — content is fully trusted (seeded/AI report). */
function renderInline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
