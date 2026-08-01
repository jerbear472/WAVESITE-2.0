# WaveSight IA v3 — the four-screen terminal

**Identity:** a trend radar that keeps score. WaveSight makes a small number of
opinionated, falsifiable calls about what's rising — each with a confidence
level and a deadline — resolves them against observed data, and shows its
batting average. A personalization layer ("which waves fit me") turns calls
into action. The track record is the moat: anyone can publish trend vibes;
only a scored forecaster can be trusted.

**Test for every future feature:** does it *make* a call, *sharpen* a call, or
*prove* a call? If none, it doesn't ship.

## Navigation (was 9 items, now 4)

| Screen | Route | Job | Absorbed |
|---|---|---|---|
| Today | `/today` | The daily read: report, pulse freshness, biggest harmony moves since the last pulse | `/daily` |
| Radar | `/radar` | The whole market: live badge, aggregate stats, field notes, top-of-pulse harmony board, tabs for Library / Timeline / Channels | `/pulse`, `/waves`, `/timeline` |
| Your Board | `/board` | Everything personal: latest scan matches + saved watchlist with notes | `/dashboard`, `/saved` |
| Track record | `/track-record` | Forecast log, hit rate, Brier, calibration deciles — the proof layer | unchanged |

Old routes redirect (see `next.config.ts`). Internal links updated.

## Demoted, not deleted

- **Brief** (`/brief`) — out of the nav; reached as an action from a trend
  detail page ("Generate Brief"). Context is what makes it non-commodity.
- **Scan** (`/scan`) — an action, not a place. Reached from the header button
  and Your Board. Functions as onboarding: profile in, personal board out.
- **Import** — moved to `/internal/import` beside `/internal/metrics`.
  Operator tooling, not product surface.
- **3D CultureField** — removed from the workspace, now the landing page's
  wow moment (`LandingField`). Working surfaces are tiles, timeline, matrix.

## Removed

- **"Run pulse" button and loop selector.** The pulse is scheduler-driven only
  (`/api/pulse/cron`, Vercel cron, `CRON_SECRET`-guarded). If the user has to
  press the button, we didn't detect anything early — the app must open on a
  field that has already been scanned.
- **PulseConsole / PulseTimeline components** (time-travel scrubber). The
  harmony history still exists in data; a rewind view can return later if a
  real use case shows up.

## Honesty rules

- When Supabase isn't connected, every app screen carries a visible
  **Demo data** banner. Fabricated trends must never pass as observed ones.
- The existing "Provisional — under 30 days history" gating on timeline and
  track record stays and is the template for all future metrics.

## Later (in order of leverage)

1. Real ingestion depth → richer pulse → more forecasts resolving.
2. Daily report as email digest — the retention channel, and the moment auth
   becomes worth it to the user (accounts arrive *with* the digest).
3. Self-serve tier for creators/marketers; enterprise sold on the track
   record once it has months of resolved calls.
