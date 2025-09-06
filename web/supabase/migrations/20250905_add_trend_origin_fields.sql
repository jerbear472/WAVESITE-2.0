-- Add trend_origin and driving_generation columns to trend_submissions table

-- Add trend_origin column (who/what started the trend)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_origin TEXT;

-- Add driving_generation column (which generation is driving the trend)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS driving_generation TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN trend_submissions.trend_origin IS 'Origin of the trend: organic, influencer, brand, ai_generated';
COMMENT ON COLUMN trend_submissions.driving_generation IS 'Generation driving the trend: gen_alpha, gen_z, millennials, gen_x, boomers';