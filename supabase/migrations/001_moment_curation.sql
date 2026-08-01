-- ============================================
-- WAVESIGHT 2.0 - HUMAN CURATION LAYER
-- Adds analyst-applied "Tuning Console" fields to cultural_moments.
-- AI fills the moment; analyst refines it; True Popularity = raw × weight.
-- ============================================

ALTER TABLE public.cultural_moments
  -- Sentiment dimensions (analyst slider positions)
  ADD COLUMN IF NOT EXISTS curation_valence REAL,        -- -1.0 .. 1.0  (negative .. positive)
  ADD COLUMN IF NOT EXISTS curation_intensity REAL,      --  0.0 .. 1.0  (quiet .. loud)
  ADD COLUMN IF NOT EXISTS curation_irony REAL,          --  0.0 .. 1.0  (sincere .. ironic)
  ADD COLUMN IF NOT EXISTS curation_longevity REAL,      --  0.0 .. 1.0  (flash .. enduring)

  -- Taxonomy + read
  ADD COLUMN IF NOT EXISTS curation_sub_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS curation_audience TEXT,
  ADD COLUMN IF NOT EXISTS curation_notable_flags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS curation_confidence SMALLINT, -- 0..5 (dots filled)
  ADD COLUMN IF NOT EXISTS curation_note TEXT,

  -- Popularity multiplier — drives True Popularity
  ADD COLUMN IF NOT EXISTS curation_quality_weight REAL DEFAULT 1.0,

  -- Signature
  ADD COLUMN IF NOT EXISTS curated_by TEXT,
  ADD COLUMN IF NOT EXISTS curated_at TIMESTAMPTZ;

-- Range constraints — keep curation values sane.
ALTER TABLE public.cultural_moments
  DROP CONSTRAINT IF EXISTS cultural_moments_curation_ranges_chk;

ALTER TABLE public.cultural_moments
  ADD CONSTRAINT cultural_moments_curation_ranges_chk CHECK (
    (curation_valence    IS NULL OR (curation_valence    BETWEEN -1.0 AND 1.0)) AND
    (curation_intensity  IS NULL OR (curation_intensity  BETWEEN  0.0 AND 1.0)) AND
    (curation_irony      IS NULL OR (curation_irony      BETWEEN  0.0 AND 1.0)) AND
    (curation_longevity  IS NULL OR (curation_longevity  BETWEEN  0.0 AND 1.0)) AND
    (curation_confidence IS NULL OR (curation_confidence BETWEEN  0   AND 5  )) AND
    (curation_quality_weight IS NULL OR (curation_quality_weight BETWEEN 0.1 AND 3.0))
  );

CREATE INDEX IF NOT EXISTS idx_cultural_moments_curated_at
  ON public.cultural_moments(curated_at DESC NULLS LAST);
