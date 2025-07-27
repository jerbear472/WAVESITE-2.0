-- Create trend umbrellas/tiles table
CREATE TABLE IF NOT EXISTS trend_tiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    wave_score INTEGER DEFAULT 0 CHECK (wave_score >= 0 AND wave_score <= 100),
    category TEXT NOT NULL,
    status TEXT DEFAULT 'emerging' CHECK (status IN ('emerging', 'trending', 'peak', 'declining')),
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    content_count INTEGER DEFAULT 0,
    thumbnail_urls TEXT[], -- Array of preview thumbnails
    platform_distribution JSONB DEFAULT '{}', -- {"tiktok": 10, "instagram": 5, etc}
    is_collaborative BOOLEAN DEFAULT FALSE,
    collaborators UUID[] DEFAULT '{}', -- Array of user IDs
    auto_cluster_id TEXT, -- For AI clustering
    parent_tile_id UUID REFERENCES trend_tiles(id), -- For merged trends
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    first_content_date TIMESTAMP WITH TIME ZONE,
    last_content_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Create trend content associations table
CREATE TABLE IF NOT EXISTS trend_content_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trend_tile_id UUID REFERENCES trend_tiles(id) ON DELETE CASCADE,
    content_id UUID NOT NULL, -- Reference to captured_trends or captured_posts
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'post', 'story', 'reel')),
    platform TEXT NOT NULL,
    performance_score INTEGER DEFAULT 0,
    earnings DECIMAL(10, 2) DEFAULT 0.00,
    is_top_performer BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    added_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Create trend merge history table
CREATE TABLE IF NOT EXISTS trend_merge_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_tile_id UUID REFERENCES trend_tiles(id),
    target_tile_id UUID REFERENCES trend_tiles(id),
    merged_by UUID REFERENCES auth.users(id),
    merged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    merge_reason TEXT
);

-- Create AI clustering suggestions table
CREATE TABLE IF NOT EXISTS trend_clustering_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID NOT NULL,
    suggested_tile_id UUID REFERENCES trend_tiles(id),
    confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    suggestion_reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_trend_tiles_user_id ON trend_tiles(user_id);
CREATE INDEX idx_trend_tiles_status ON trend_tiles(status);
CREATE INDEX idx_trend_tiles_category ON trend_tiles(category);
CREATE INDEX idx_trend_content_items_trend_tile_id ON trend_content_items(trend_tile_id);
CREATE INDEX idx_trend_content_items_content_id ON trend_content_items(content_id);
CREATE INDEX idx_trend_clustering_suggestions_content_id ON trend_clustering_suggestions(content_id);
CREATE INDEX idx_trend_clustering_suggestions_status ON trend_clustering_suggestions(status);

-- Create function to update trend tile stats
CREATE OR REPLACE FUNCTION update_trend_tile_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update content count and earnings
    UPDATE trend_tiles
    SET 
        content_count = (
            SELECT COUNT(*) 
            FROM trend_content_items 
            WHERE trend_tile_id = COALESCE(NEW.trend_tile_id, OLD.trend_tile_id)
        ),
        total_earnings = (
            SELECT COALESCE(SUM(earnings), 0)
            FROM trend_content_items 
            WHERE trend_tile_id = COALESCE(NEW.trend_tile_id, OLD.trend_tile_id)
        ),
        updated_at = timezone('utc', now())
    WHERE id = COALESCE(NEW.trend_tile_id, OLD.trend_tile_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_trend_stats_on_content_change
AFTER INSERT OR UPDATE OR DELETE ON trend_content_items
FOR EACH ROW
EXECUTE FUNCTION update_trend_tile_stats();

-- Create function to calculate wave score
CREATE OR REPLACE FUNCTION calculate_wave_score(tile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER;
    content_velocity DECIMAL;
    platform_diversity INTEGER;
    total_performance INTEGER;
BEGIN
    -- Calculate content velocity (content added in last 7 days)
    SELECT COUNT(*) INTO content_velocity
    FROM trend_content_items
    WHERE trend_tile_id = tile_id
    AND added_at > timezone('utc', now()) - INTERVAL '7 days';
    
    -- Calculate platform diversity
    SELECT COUNT(DISTINCT platform) INTO platform_diversity
    FROM trend_content_items
    WHERE trend_tile_id = tile_id;
    
    -- Calculate total performance
    SELECT COALESCE(AVG(performance_score), 0) INTO total_performance
    FROM trend_content_items
    WHERE trend_tile_id = tile_id;
    
    -- Wave Score formula (customize as needed)
    score := LEAST(100, 
        (content_velocity * 10) + 
        (platform_diversity * 15) + 
        (total_performance * 0.75)
    );
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE trend_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_merge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_clustering_suggestions ENABLE ROW LEVEL SECURITY;

-- Trend tiles policies
CREATE POLICY "Users can view their own trend tiles" ON trend_tiles
    FOR SELECT USING (auth.uid() = user_id OR is_collaborative = TRUE);

CREATE POLICY "Users can create trend tiles" ON trend_tiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trend tiles" ON trend_tiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trend tiles" ON trend_tiles
    FOR DELETE USING (auth.uid() = user_id);

-- Content items policies
CREATE POLICY "Users can view content in their trends" ON trend_content_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trend_tiles 
            WHERE id = trend_content_items.trend_tile_id 
            AND (user_id = auth.uid() OR is_collaborative = TRUE)
        )
    );

CREATE POLICY "Users can add content to their trends" ON trend_content_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trend_tiles 
            WHERE id = trend_content_items.trend_tile_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update content in their trends" ON trend_content_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM trend_tiles 
            WHERE id = trend_content_items.trend_tile_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove content from their trends" ON trend_content_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM trend_tiles 
            WHERE id = trend_content_items.trend_tile_id 
            AND user_id = auth.uid()
        )
    );