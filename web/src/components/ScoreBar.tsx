import { scoreColor, scoreColorDark } from "@/lib/trend-format";

type ScoreTone = "auto" | "blue" | "amber" | "green" | "red";

const TONES: Record<Exclude<ScoreTone, "auto">, string> = {
  blue: "#3478f6",
  amber: "#b77900",
  green: "#159a78",
  red: "#d64d57",
};

const TONES_DARK: Record<Exclude<ScoreTone, "auto">, string> = {
  blue: "#7cc0ff",
  amber: "#fbbf24",
  green: "#34d399",
  red: "#f87171",
};

interface ScoreBarProps {
  label: string;
  value: number;
  /** When true, a higher value is worse (e.g. saturation) — flips auto color. */
  inverse?: boolean;
  hint?: string;
  /** Render for a dark .panel context. */
  onDark?: boolean;
  /**
   * Semantic fill: blue for analytical/positive metrics, amber for caution.
   * "auto" (default) grades by value.
   */
  tone?: ScoreTone;
}

export function ScoreBar({
  label,
  value,
  inverse,
  hint,
  onDark,
  tone = "auto",
}: ScoreBarProps) {
  const colorValue = inverse ? 100 - value : value;
  const color =
    tone === "auto"
      ? onDark
        ? scoreColorDark(colorValue)
        : scoreColor(colorValue)
      : (onDark ? TONES_DARK : TONES)[tone];

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span
          className={
            onDark ? "text-xs text-panel-muted" : "text-xs text-muted-foreground"
          }
        >
          {label}
        </span>
        <span
          className={
            onDark
              ? "text-sm font-semibold tabular-nums text-white"
              : "text-sm font-semibold tabular-nums text-foreground"
          }
        >
          {value}
        </span>
      </div>
      <div
        className={
          onDark
            ? "panel-track h-1.5 w-full overflow-hidden rounded-full"
            : "h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
        }
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(2, Math.min(100, value))}%`,
            background: color,
          }}
        />
      </div>
      {hint ? (
        <p
          className={
            onDark
              ? "mt-1.5 text-[11px] leading-snug text-panel-muted"
              : "mt-1.5 text-[11px] leading-snug text-faint"
          }
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
