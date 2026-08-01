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
          <Image
            src="/wavesight-mark-open.png"
            alt="WaveSight"
            width={32}
            height={32}
            className="size-8"
            priority
          />
          <span className="font-display wordmark text-lg">
            Wave<span className="text-gradient">Sight</span>
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/daily"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Daily
          </Link>
          <Link
            href="/dashboard"
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
                href="/dashboard"
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

          {/* The mark glowing inside its terminal — the brand moment. */}
          <div className="relative">
            <div className="panel overflow-hidden">
              <div className="relative -mx-px -mt-px h-48 sm:h-56">
                <Image
                  src="/wavesight-hero-3d.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="pointer-events-none select-none object-cover"
                  priority
                />
                {/* vignette the render into the panel so it reads as one surface */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(115% 100% at 50% 34%, transparent 46%, #111a2c 94%)",
                  }}
                />
              </div>
              <div className="p-6 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-panel-muted">
                  Quiet Luxury Workspace
                </p>
                <p className="mt-1 font-display text-xl text-white">
                  Accelerating · low risk
                </p>
              </div>
              <WaveScore score={87} size={72} onDark />
            </div>
            <div className="mt-6 space-y-3.5">
              <ScoreBar label="Momentum" value={88} onDark />
              <ScoreBar label="Sentiment" value={82} onDark />
              <ScoreBar label="Brand safety" value={91} onDark />
              <ScoreBar label="Saturation" value={42} inverse onDark />
            </div>
                <p className="mt-6 border-t border-[var(--ws-panel-line)] pt-4 text-sm text-panel-muted">
                  “The flex is no longer the gear count — it&apos;s the calm.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
