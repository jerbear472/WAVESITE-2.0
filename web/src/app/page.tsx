import Link from "next/link";
import Image from "next/image";
import {
  Radar,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { WaveScore } from "@/components/WaveScore";
import { ScoreBar } from "@/components/ScoreBar";
import { LandingField } from "@/components/LandingField";

const FEATURES = [
  {
    icon: Radar,
    title: "Detect emerging trends",
    body: "Surface fast-growing cultural movements — sounds, aesthetics, phrases, behaviors — while there's still room to lead.",
  },
  {
    icon: HeartPulse,
    title: "Measure sentiment",
    body: "Know whether the crowd is sincere, ironic, or turning. Every trend is scored for sentiment, not just volume.",
  },
  {
    icon: ShieldAlert,
    title: "Avoid the cringe",
    body: "Brand-safety and saturation scores tell you when to move, when to wait, and when to stay out entirely.",
  },
  {
    icon: Sparkles,
    title: "Generate briefs",
    body: "Turn any trend into a ready-to-shoot brief — hooks, formats, do's and don'ts — tailored to who you are.",
  },
];

const AUDIENCES = ["Creators", "Agencies", "Artists", "Marketers", "Brands"];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          {/* The crisp mark carries enough saturation to sit directly on the
              light shell — no navy chip, one less dark block on the page. */}
          <Image
            src="/wavesight-mark-crisp.png"
            alt="WaveSight"
            width={26}
            height={26}
            className="size-[26px]"
            priority
          />
          <span className="font-display wordmark text-lg">
            Wave<span className="text-gradient">Sight</span>
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/today"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Daily
          </Link>
          <Link
            href="/board"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Dashboard
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary-strong">
              <span className="live-dot inline-block size-1.5 rounded-full bg-primary" />
              Cultural intelligence, daily
            </p>
            <h1 className="mt-5 font-display text-[2.6rem] leading-[1.04] tracking-tight text-balance sm:text-6xl">
              Know which trends are worth joining{" "}
              <span className="text-gradient">
                before everyone else does.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              WaveSight scans cultural signals, measures sentiment, and turns
              emerging trends into creative briefs for creators, artists, and
              brands.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/scan"
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                <Radar className="size-4" /> Run a Live Scan
              </Link>
              <Link
                href="/board"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Explore the terminal <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-faint">
              <span className="uppercase tracking-[0.14em]">Built for</span>
              {AUDIENCES.map((a) => (
                <span key={a} className="text-muted-foreground">
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* The terminal read — one trend, one glance. Calm sells the
              product better than glow: the mark stays small, the numbers
              carry the panel. */}
          <div className="relative">
            <div className="panel p-7">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-panel-muted">
                  <Image
                    src="/wavesight-mark-open.png"
                    alt=""
                    width={18}
                    height={18}
                    className="size-[18px]"
                    priority
                  />
                  Live read
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#35bdf2]">
                  <span className="live-dot inline-block size-1.5 rounded-full bg-[#35bdf2]" />
                  Tracking
                </span>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-panel-muted">
                    Quiet Luxury Workspace
                  </p>
                  <p className="mt-1.5 font-display text-2xl text-white">
                    Accelerating · low risk
                  </p>
                </div>
                <WaveScore score={87} size={76} onDark />
              </div>
              <div className="mt-8 space-y-4">
                <ScoreBar label="Momentum" value={88} onDark />
                <ScoreBar label="Sentiment" value={82} onDark />
                <ScoreBar label="Brand safety" value={91} onDark />
                <ScoreBar label="Saturation" value={42} inverse onDark />
              </div>
              <p className="mt-7 border-t border-[var(--ws-panel-line)] pt-5 text-sm leading-relaxed text-panel-muted">
                “The flex is no longer the gear count — it&apos;s the calm.”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The 3D field — the wow moment lives here now, not in the workspace */}
      <LandingField />

      {/* Features */}
      <section className="mx-auto max-w-6xl border-t border-border px-6 py-16">
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title}>
                <Icon className="size-5 text-primary-strong" />
                <h3 className="mt-4 font-display text-lg">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-border pt-12 sm:flex-row sm:items-end">
          <h2 className="max-w-xl font-display text-3xl leading-tight tracking-tight">
            The Bloomberg terminal for culture — minus the noise.
          </h2>
          <Link
            href="/scan"
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            <Radar className="size-4" /> Run a Live Scan
          </Link>
        </div>
        <p className="mt-10 text-xs text-faint">
          WaveSight Daily · MVP. Seeded with sample cultural intelligence.
        </p>
      </section>
    </div>
  );
}
