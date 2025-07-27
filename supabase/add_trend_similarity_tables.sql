-- Create trend_clusters table
CREATE TABLE IF NOT EXISTS trend_clusters (
    id VARCHAR(255) PRIMARY KEY,
    label VARCHAR(255) NOT NULL DEFAULT 'Pending Label',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    trend_count INTEGER DEFAULT 0
);

-- Create trend_vectors table with pgvector support
-- Note: You need to enable the pgvector extension first:
-- CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS trend_vectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cluster_id VARCHAR(255) REFERENCES trend_clusters(id) ON DELETE CASCADE,
    embedding FLOAT[] NOT NULL, -- For standard PostgreSQL, use vector(384) if pgvector is installed
    text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_vectors_cluster_id ON trend_vectors(cluster_id);
CREATE INDEX IF NOT EXISTS idx_trend_vectors_created_at ON trend_vectors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_vectors_user_id ON trend_vectors(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_created_at ON trend_clusters(created_at DESC);

-- Create function to get trending clusters
CREATE OR REPLACE FUNCTION get_trending_clusters(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    cluster_id VARCHAR(255),
    label VARCHAR(255),
    trend_count BIGINT,
    latest_activity TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.id AS cluster_id,
        tc.label,
        COUNT(tv.id) AS trend_count,
        MAX(tv.created_at) AS latest_activity,
        tc.metadata
    FROM trend_clusters tc
    LEFT JOIN trend_vectors tv ON tc.id = tv.cluster_id
    WHERE tc.is_active = TRUE
    GROUP BY tc.id, tc.label, tc.metadata
    ORDER BY MAX(tv.created_at) DESC NULLS LAST, COUNT(tv.id) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update trend_count in clusters
CREATE OR REPLACE FUNCTION update_cluster_trend_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE trend_clusters 
        SET trend_count = trend_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.cluster_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE trend_clusters 
        SET trend_count = GREATEST(trend_count - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.cluster_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cluster_count_trigger
AFTER INSERT OR DELETE ON trend_vectors
FOR EACH ROW
EXECUTE FUNCTION update_cluster_trend_count();

-- Enable Row Level Security
ALTER TABLE trend_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_vectors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trend_clusters
CREATE POLICY "Enable read access for all users" ON trend_clusters
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON trend_clusters
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON trend_clusters
    FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for trend_vectors
CREATE POLICY "Enable read access for all users" ON trend_vectors
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON trend_vectors
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for own vectors" ON trend_vectors
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for own vectors" ON trend_vectors
    FOR DELETE USING (auth.uid() = user_id);

-- Sample data for testing (optional)
-- INSERT INTO trend_clusters (id, label) VALUES 
-- ('cluster_mob_wife', 'Mob Wife Aesthetic'),
-- ('cluster_clean_girl', 'Clean Girl Aesthetic'),
-- ('cluster_office_siren', 'Office Siren Style');