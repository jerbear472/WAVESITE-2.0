
# WaveSight AI Integration Spec (Claude-Ready)
**Version:** 1.0  
**Date:** 2025-08-08 03:49 UTC  
**Owner:** Jeremy Uys  
**Purpose:** End-to-end implementation guide for wiring AI into WaveSight’s existing Supabase schema — without breaking current data — plus background jobs and dashboard data APIs.

---

## 0) Quick Start (Give this to Claude)
1. **Pull current schema** (do not create new tables blindly).
2. **Map my fields to existing tables** (extend with new columns where needed).
3. Implement **three background jobs**: clustering, scoring, prediction.
4. Implement **dashboard data APIs** below (role-gated for Core/Pro/Apex).
5. Ship to staging, validate with real data, then promote.

---

## 1) Schema Mapping Guide (Extend, Don’t Replace)
> Goal: Use existing tables. Only add missing columns / small helper tables as needed. Keep all historical data.

### 1.1 Inspect Current Schema
Run:
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```
Export to file and annotate which tables already store:
- Raw submissions
- Personas / user profiles
- Trend-level (deduped) records
- Any scoring / prediction fields

### 1.2 Raw Submissions
- **My spec name:** `trends_raw`
- **Your table:** *Use existing*, e.g. `trend_submissions`
- **Likely existing fields:** `id`, `trend_text`, `media_url`, `persona_id`, `geo_location`, `timestamp`, `category_guess`
- **Add (if missing):**
```sql
ALTER TABLE trend_submissions
  ADD COLUMN IF NOT EXISTS classification JSONB,
  ADD COLUMN IF NOT EXISTS entities JSONB,
  ADD COLUMN IF NOT EXISTS vector VECTOR(1536),
  ADD COLUMN IF NOT EXISTS clustered BOOLEAN DEFAULT false;
```

### 1.3 Deduplicated Trends
- **My spec name:** `trend_tiles`
- **Your table:** Use existing trend-level table (e.g., `trends` or `trend_clusters`).
- **Add (if missing):**
```sql
ALTER TABLE trends
  ADD COLUMN IF NOT EXISTS representative_text TEXT,
  ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP,
  ADD COLUMN IF NOT EXISTS submission_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS persona_diversity FLOAT,
  ADD COLUMN IF NOT EXISTS geo_spread FLOAT,
  ADD COLUMN IF NOT EXISTS vector VECTOR(1536);
```
> Only create a new `trend_tiles` table **if no deduped trend table exists**.

### 1.4 Trend Scores (helper table if needed)
```sql
CREATE TABLE IF NOT EXISTS trend_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_tile_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  virality_index FLOAT NOT NULL,
  early_adoption_bonus FLOAT NOT NULL,
  total_score FLOAT NOT NULL,
  calculated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trend_scores_tile_time ON trend_scores (trend_tile_id, calculated_at);
```

### 1.5 Trend Predictions (helper table if needed)
```sql
CREATE TABLE IF NOT EXISTS trend_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_tile_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  days_to_mainstream INT NOT NULL,
  prediction_confidence FLOAT NOT NULL,
  predicted_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trend_predictions_tile_time ON trend_predictions (trend_tile_id, predicted_at);
```

---

## 2) AI Calls at Ingestion (Modify Existing Submit Endpoint)
**Endpoint:** `POST /trends/submit` (reuse your current route; extend logic)

### 2.1 Real-time steps on submit
1. **Classification (LLM) →** store JSON in `classification`
2. **Entity extraction (LLM/NLP) →** store JSON in `entities`
3. **Embedding (Embeddings API) →** store in `vector`
4. Insert submission row; set `clustered = false`
5. Enqueue background job: `cluster_trends`

**Implementation notes**
- Cache LLM/embedding results to avoid duplicate calls on retries.
- Respect rate limits; exponential backoff on provider errors.

---

## 3) Background Jobs (Core Intelligence)

### 3.1 Job: `cluster_trends`
**Runs:** Every 5–15 minutes  
**Purpose:** Merge new raw submissions into existing trend records.
**Pseudo:**
```python
def cluster_trends():
    new = db.query("""
      SELECT id, trend_text, vector, persona_id, geo_location, timestamp
      FROM trend_submissions
      WHERE clustered = false
    """)
    for sub in new:
        match = vector_search(sub.vector, table='trends', threshold=0.85)
        if match:
            db.exec("""
              UPDATE trends
                 SET last_seen = GREATEST(last_seen, %s),
                     submission_count = submission_count + 1
               WHERE id = %s
            """, (sub.timestamp, match.id))
            link_submission_to_trend(sub.id, match.id)
            refresh_persona_diversity(match.id)
            refresh_geo_spread(match.id)
        else:
            trend_id = db.exec_returning_id("""
              INSERT INTO trends (representative_text, first_seen, last_seen, submission_count, persona_diversity, geo_spread, vector)
              VALUES (%s, %s, %s, 1, 1.0, 1.0, %s)
              RETURNING id
            """, (sub.trend_text, sub.timestamp, sub.timestamp, sub.vector))
            link_submission_to_trend(sub.id, trend_id)
        db.exec("UPDATE trend_submissions SET clustered = true WHERE id = %s", (sub.id,))
```

**Helpers to implement:**
- `vector_search(vector, table, threshold)` using pgvector or Pinecone
- `link_submission_to_trend(sub_id, trend_id)` (join table or FK)
- `refresh_persona_diversity(trend_id)`
- `refresh_geo_spread(trend_id)`

### 3.2 Job: `score_trends`
**Runs:** Hourly  
**Purpose:** Compute a virality score per trend.
**Pseudo:**
```python
def score_trends():
    rows = db.query("""
      SELECT id, submission_count, persona_diversity, geo_spread, first_seen, last_seen
      FROM trends
    """)
    for t in rows:
        days_active = max(1, (t.last_seen - t.first_seen).days)
        velocity = t.submission_count / days_active
        virality = velocity * coalesce(t.persona_diversity, 1.0) * coalesce(t.geo_spread, 1.0)
        bonus = 1.5 if is_niche(t.id) else 1.0
        total = virality * bonus
        db.exec("""
          INSERT INTO trend_scores (trend_tile_id, virality_index, early_adoption_bonus, total_score)
          VALUES (%s, %s, %s, %s)
        """, (t.id, virality, bonus, total))
```

**Implement:** `is_niche(trend_id)` → e.g., niche if <20% of submissions come from mainstream persona clusters.

### 3.3 Job: `predict_trends`
**Runs:** Daily  
**Purpose:** Predict days-to-mainstream per trend.
**Pseudo:**
```python
def predict_trends():
    tiles = db.query("SELECT id FROM trends")
    for tile in tiles:
        hist = db.query("""
          SELECT calculated_at, total_score
          FROM trend_scores
          WHERE trend_tile_id = %s
          ORDER BY calculated_at
        """, (tile.id,))
        X, y = make_timeseries_features(hist)  # rolling means, deltas, etc.
        days, conf = ml_model.predict(X)       # XGBoost/LightGBM or simple heuristic initially
        db.exec("""
          INSERT INTO trend_predictions (trend_tile_id, days_to_mainstream, prediction_confidence)
          VALUES (%s, %s, %s)
        """, (tile.id, days, conf))
```

**Initial baseline (no ML):**
- If last 7-day average `total_score` > threshold and slope > threshold → 7–21 days
- Else if growing slowly → 30–60 days
- Else → >60 days  
Store `prediction_confidence` based on how clean the slope is.

---

## 4) Dashboard Data API (Role-Gated)

### 4.1 Auth & Roles
- **Core** (small firms): limited data, weekly cadence
- **Pro** (mid agencies): realtime feed, more filters
- **Apex** (enterprise): full history, diffusion maps, API export
- All endpoints require Bearer token; attach role claims in JWT.

### 4.2 Endpoints

#### GET `/dashboard/overview`
**Purpose:** Summary tiles for current period.  
**Query:** `period=7d|30d`, `category?`, `region?`  
**Returns:**
```json
{
  "top_categories": [{"name":"Fashion","trend_count":128}],
  "fastest_risers": [{"trend_id":"...","name":"Mushroom Coffee","delta":0.62}],
  "hot_geo": [{"region":"NYC","active_trends":45}]
}
```
**Role differences:**
- Core: last 30d only, top-10 lists
- Pro: any period, top-50
- Apex: unlimited + historical compare

#### GET `/dashboard/trends/top`
**Purpose:** Ranked list by `total_score` and recency.  
**Query:** `category?`, `region?`, `persona_cluster?`, `limit`, `offset`  
**Returns:** array of trend cards incl. `first_seen`, `last_seen`, `total_score`, `days_to_mainstream` (if available).

#### GET `/dashboard/trends/{id}`
**Purpose:** Detail page for a single trend.  
**Returns:**
```json
{
  "trend": {
    "id": "...",
    "representative_text": "...",
    "entities": {},
    "first_seen": "...",
    "last_seen": "...",
    "submission_count": 234,
    "persona_diversity": 0.71,
    "geo_spread": 0.54
  },
  "history": [
    {"t":"2025-07-01","total_score":1.1}
  ],
  "prediction": {"days_to_mainstream": 14, "confidence": 0.82}
}
```

#### GET `/dashboard/diffusion`
**Purpose:** Cultural diffusion view.  
**Query:** `trend_id` (required)  
**Returns:** graph-friendly nodes/edges:
```json
{
  "personas":[{"id":"p1","label":"Gen Z Skaters"}],
  "edges":[{"source":"p1","target":"p7","weight":0.42,"lag_days":12}],
  "geo_path":[{"region":"NYC","t":"2025-07-02"},{"region":"LA","t":"2025-07-14"}]
}
```
**Role:** Pro (limited depth), Apex (full depth + export)

#### GET `/dashboard/alerts`
**Purpose:** Predictions and actionables.  
**Query:** `category?`, `client_icp?`  
**Returns:** predicted crosses-to-mainstream and “act-now” candidates.

#### POST `/dashboard/reports/export`
**Purpose:** Generate PDF/CSV report for current filters.  
**Body:** filters + format  
**Returns:** `report_id` and download URL when ready.
**Role:** Core (monthly), Pro (weekly), Apex (on-demand)

#### GET `/dashboard/search`
**Purpose:** Semantic search across trends by text or entity.  
**Query:** `q=string`, `category?`, `region?`  
**Returns:** ranked results from vector search.

### 4.3 Performance
- Add indexes on `trends(first_seen, last_seen)`, `trend_scores(trend_tile_id, calculated_at)`
- Cache `/overview` for 5–10 minutes (Pro/Apex); 1 hour (Core)
- Paginate all list endpoints; default `limit=20`

---

## 5) LLM/Embedding Templates (Provider-Agnostic)

**Classification (system):**
```
Classify the cultural trend into {{category}} and {{subcategory}}. Return compact JSON.
```

**Entity Extraction (system):**
```
Extract brands, people, places, hashtags, and products. Return JSON with keys: brands, people, places, hashtags, products.
```

**Narrative Summary (system):**
```
Write a 2-3 sentence executive insight about the trend’s spread across personas and regions. Avoid hype.
```

**Embedding:**
- Use a single model (e.g., `text-embedding-3-large`); 1536 dims assumed above.

---

## 6) Safety & Migrations
- Only **ALTER** existing tables; avoid destructive changes.
- Make migrations **idempotent** and include `IF NOT EXISTS`.
- Run everything on **staging** first with a recent data snapshot.
- Keep a rollback script for added columns and helper tables.

---

## 7) Staging Acceptance Checklist
- [ ] Submissions store `classification`, `entities`, `vector`
- [ ] New rows get clustered within 15 minutes
- [ ] Scores update hourly and appear in `/dashboard/trends/top`
- [ ] Predictions update daily and appear in trend detail
- [ ] Role gating returns correct data volumes
- [ ] Exports generate and download successfully

---

## 8) Appendix: Example SQL Helpers

**Persona diversity (example idea):**
```sql
WITH c AS (
  SELECT COUNT(DISTINCT persona_cluster_id) AS clusters,
         (SELECT COUNT(*) FROM persona_clusters) AS total
  FROM submissions_to_trends st
  JOIN personas p ON p.id = st.persona_id
  WHERE st.trend_id = $1
)
SELECT (c.clusters::float / NULLIF(c.total,0)) FROM c;
```

**Geo spread (example idea):**
```sql
WITH g AS (
  SELECT COUNT(DISTINCT region) AS regions,
         (SELECT COUNT(*) FROM regions) AS total
  FROM submissions_to_trends
  WHERE trend_id = $1
)
SELECT (g.regions::float / NULLIF(g.total,0)) FROM g;
```

---

## 9) Contact & Handoff Notes
- Build in small PRs: schema → ingestion → clustering → scoring → prediction → APIs.
- Log every background job run with counts and durations.
- Keep raw data forever for future model training.
