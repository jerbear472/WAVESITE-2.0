# WaveSight — Cultural Intelligence for Trends Worth Joining

WaveSight finds fast-growing internet trends with positive consumer sentiment and
tells creators, marketers, agencies, artists, and brands **which trends are worth
participating in — before they become saturated.** It reads like a Bloomberg
terminal for culture, not a social feed.

This repo is **WaveSight Daily**, the MVP: a cultural-intelligence dashboard plus
an AI-generated daily report of the top trends worth joining.

## Highlights

- **Landing page** — the pitch and entry to Today's Waves.
- **Dashboard** — command center with stat cards (Rising Waves, Positive
  Sentiment, Brand-Safe Opportunities, Backlash Forming) and Today's Waves.
- **Today's Waves** — the full trend feed with filters (category, platform,
  audience, lifecycle, risk, sentiment).
- **Trend detail** — large WaveScore, score breakdown bars, why it's spreading,
  who should join / avoid, creative angles, sample hooks, and the signals behind it.
- **Creative Brief Generator** — turn any trend into a ready-to-shoot brief
  (hooks, formats, do's/don'ts, caption), tuned to who you are.
- **Saved Trends** — a private watchlist with notes.
- **Daily Report** — the AI-written WaveSight Daily.
- **Import Signals** — manually add signals, analyze them with AI, and cluster
  them into trends or attach them to existing ones.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with shadcn-style UI primitives (`src/components/ui`)
- **Supabase** for database/auth (optional — mock-first)
- **Anthropic Claude** via an AI abstraction layer (optional — mock-first)
- **Zod** for validating all structured AI output
- **recharts**, **lucide-react**, **date-fns** available
- Vercel-ready

## Getting started

```bash
cd web
npm install
cp .env.example .env.local   # optional — the app runs with zero config
npm run dev
```

Open http://localhost:3000.

**Mock-first by design.** With no environment variables, WaveSight serves a
seeded dataset of five fully-realized trends and runs deterministic "mock AI" so
every flow — analysis, clustering, scoring, brief generation — works offline.

### Going live

1. **AI:** set `ANTHROPIC_API_KEY` in `.env.local`. The AI service then calls
   Claude (`claude-opus-4-8` by default; override with `AI_MODEL`) and validates
   every response against a Zod schema, falling back to mock on any error.
2. **Database:** set the three `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` vars and run
   `supabase/schema.sql` in the Supabase SQL editor. The data layer
   (`src/lib/data.ts`) reads from Supabase when configured and falls back to the
   seed otherwise.

## Architecture

```
src/
  app/
    page.tsx                  Landing page
    (app)/                    App shell (sidebar nav) wrapping the product pages
      dashboard/              Command center
      waves/                  Today's Waves feed + filters
      trends/[slug]/          Trend detail
      brief/                  Creative brief generator
      saved/                  Saved trends
      daily/                  Daily report
      admin/                  Signal import + clustering
    api/
      ai/analyze-signal/      POST → analyzeSignal
      ai/brief/               POST → generateCreativeBrief
      ai/cluster/             POST → clusterSignalsIntoTrend + scoreTrend → trend
      signals/                GET/POST signals
      trend-signals/          POST attach signal → trend
  components/                 UI primitives + domain components
  lib/
    ai/
      schemas.ts              Zod schemas for all AI outputs
      provider.ts             Claude client + mock toggle
      service.ts              analyzeSignal / clusterSignalsIntoTrend / scoreTrend / generateCreativeBrief
    data.ts                   Data-access layer (mock-first, Supabase-aware)
    seed-data.ts              Seeded trends, signals, daily report
    wavescore.ts              WaveScore formula
    ingestion/                Adapter seam for future YouTube/Reddit/TikTok
    supabase.ts               Supabase clients
  types/                      Domain model (mirrors the schema)
supabase/schema.sql           Database schema + RLS
```

### Core concepts

- **Trend** — a cultural movement (meme, aesthetic, sound, phrase, behavior…).
- **Signal** — a single source item (video, post, article, submission).
- **WaveScore** — the master ranking score (see `lib/wavescore.ts`):

  ```
  wavescore =
      25% momentum + 20% sentiment
    + 15% cross_platform_spread (else commercial_relevance)
    + 15% creator_adoption     (else momentum)
    + 10% audience_clarity     (else commercial_relevance)
    + 10% commercial_relevance
    -  5% saturation penalty
  ```

  Optional sub-scores are approximated from available data for the MVP.

### AI service

All four functions live in `src/lib/ai/service.ts`, return Zod-validated JSON,
and degrade gracefully to mock output:

- `analyzeSignal(text, metadata)` — phrases, entities, emotions, sentiment,
  audience, category, risk, why it matters.
- `clusterSignalsIntoTrend(signals)` — a named trend with summary, tone,
  audience, lifecycle, virality type, who should join / avoid.
- `scoreTrend(trend, signals)` — the five component scores + WaveScore +
  difficulty + risk.
- `generateCreativeBrief(trend, profile)` — recommendation, strategy, hooks,
  formats, do's/don'ts, risk notes, caption.

## Future ingestion

Live scraping is intentionally out of scope for the MVP. `src/lib/ingestion`
defines a `SignalSourceAdapter` interface; implement one per platform (YouTube
Data API, Reddit, TikTok, Google Trends) and it plugs into the same pipeline that
manual import already uses.

## Build

```bash
npm run build
```
