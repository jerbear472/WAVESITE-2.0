import { cn } from "@/lib/utils";

interface WaveScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: boolean;
  onDark?: boolean;
}

/**
 * Circular WaveScore gauge — light gray track, blue-to-cyan analytical
 * stroke, dark navy numeral. Use onDark inside a .panel module.
 */
export function WaveScore({
  score,
  size = 72,
  strokeWidth = 6,
  className,
  label = true,
  onDark = false,
}: WaveScoreProps) {
  // Deterministic id keeps this usable from server components (no hooks);
  // identical duplicates on a page share an identical gradient def, harmless.
  const gradId = `wsgrad-${size}-${score}-${onDark ? "d" : "l"}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const track = onDark ? "rgba(255,255,255,0.12)" : "var(--ws-fill)";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ws-accent)" />
            <stop offset="100%" stopColor="var(--ws-accent-bright)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold tabular-nums leading-none"
          style={{
            fontSize: size * 0.3,
            color: onDark ? "#fff" : "var(--ws-ink)",
          }}
        >
          {score}
        </span>
        {label ? (
          <span
            className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: onDark ? "var(--ws-panel-muted)" : "var(--ws-faint)" }}
          >
            Wave
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Compact WaveScore for trend cards — the same blue→cyan gauge as the trend
 *  page's Signal Readout, scaled down. One score, one look, everywhere. */
export function WaveScoreChip({ score }: { score: number }) {
  return <WaveScore score={score} size={54} strokeWidth={5} />;
}
