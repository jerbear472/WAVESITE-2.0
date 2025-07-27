-- Trend Folders Schema
-- This creates a system for organizing trends into folders/collections

-- Create folder colors enum
CREATE TYPE folder_color AS ENUM (
    'gray', 'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'
);

-- Create folders table
CREATE TABLE IF NOT EXISTS public.trend_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color folder_color DEFAULT 'blue',
    icon TEXT DEFAULT 'folder',
    is_public BOOLEAN DEFAULT FALSE,
    is_collaborative BOOLEAN DEFAULT FALSE,
    parent_folder_id UUID REFERENCES public.trend_folders(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_folder_name UNIQUE(user_id, name, parent_folder_id)
);

-- Create folder trends junction table
CREATE TABLE IF NOT EXISTS public.folder_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES public.trend_folders(id) ON DELETE CASCADE,
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    added_by UUID REFERENCES public.user_profiles(id),
    position INTEGER DEFAULT 0,
    notes TEXT,
    tags TEXT[],
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(folder_id, trend_id)
);

-- Create folder collaborators table
CREATE TABLE IF NOT EXISTS public.folder_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES public.trend_folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('viewer', 'contributor', 'admin')) DEFAULT 'viewer',
    invited_by UUID REFERENCES public.user_profiles(id),
    accepted BOOLEAN DEFAULT FALSE,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(folder_id, user_id)
);

-- Create folder activity log
CREATE TABLE IF NOT EXISTS public.folder_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES public.trend_folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id),
    action TEXT NOT NULL CHECK (action IN ('created', 'renamed', 'moved', 'shared', 'unshared', 'added_trend', 'removed_trend', 'reordered')),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create smart collections (auto-organized folders based on rules)
CREATE TABLE IF NOT EXISTS public.smart_folders (
    id UUID PRIMARY KEY REFERENCES public.trend_folders(id) ON DELETE CASCADE,
    rules JSONB NOT NULL, -- e.g., {"category": ["tech"], "min_wave_score": 80, "status": ["trending"]}
    auto_update BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trend_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trend_folders
CREATE POLICY "Users can view their own folders" ON public.trend_folders
    FOR SELECT USING (
        auth.uid() = user_id OR
        is_public = TRUE OR
        EXISTS (
            SELECT 1 FROM public.folder_collaborators
            WHERE folder_collaborators.folder_id = trend_folders.id
            AND folder_collaborators.user_id = auth.uid()
            AND folder_collaborators.accepted = TRUE
        )
    );

CREATE POLICY "Users can create their own folders" ON public.trend_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON public.trend_folders
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.folder_collaborators
            WHERE folder_collaborators.folder_id = trend_folders.id
            AND folder_collaborators.user_id = auth.uid()
            AND folder_collaborators.role = 'admin'
            AND folder_collaborators.accepted = TRUE
        )
    );

CREATE POLICY "Users can delete their own folders" ON public.trend_folders
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for folder_trends
CREATE POLICY "Users can view trends in accessible folders" ON public.folder_trends
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.trend_folders
            WHERE trend_folders.id = folder_trends.folder_id
            AND (
                trend_folders.user_id = auth.uid() OR
                trend_folders.is_public = TRUE OR
                EXISTS (
                    SELECT 1 FROM public.folder_collaborators
                    WHERE folder_collaborators.folder_id = trend_folders.id
                    AND folder_collaborators.user_id = auth.uid()
                    AND folder_collaborators.accepted = TRUE
                )
            )
        )
    );

CREATE POLICY "Users can add trends to their folders" ON public.folder_trends
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trend_folders
            WHERE trend_folders.id = folder_trends.folder_id
            AND (
                trend_folders.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.folder_collaborators
                    WHERE folder_collaborators.folder_id = trend_folders.id
                    AND folder_collaborators.user_id = auth.uid()
                    AND folder_collaborators.role IN ('contributor', 'admin')
                    AND folder_collaborators.accepted = TRUE
                )
            )
        )
    );

CREATE POLICY "Users can update trends in their folders" ON public.folder_trends
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.trend_folders
            WHERE trend_folders.id = folder_trends.folder_id
            AND (
                trend_folders.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.folder_collaborators
                    WHERE folder_collaborators.folder_id = trend_folders.id
                    AND folder_collaborators.user_id = auth.uid()
                    AND folder_collaborators.role IN ('contributor', 'admin')
                    AND folder_collaborators.accepted = TRUE
                )
            )
        )
    );

CREATE POLICY "Users can remove trends from their folders" ON public.folder_trends
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.trend_folders
            WHERE trend_folders.id = folder_trends.folder_id
            AND (
                trend_folders.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.folder_collaborators
                    WHERE folder_collaborators.folder_id = trend_folders.id
                    AND folder_collaborators.user_id = auth.uid()
                    AND folder_collaborators.role IN ('contributor', 'admin')
                    AND folder_collaborators.accepted = TRUE
                )
            )
        )
    );

-- Create functions for folder operations
CREATE OR REPLACE FUNCTION public.create_trend_folder(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_color folder_color DEFAULT 'blue',
    p_icon TEXT DEFAULT 'folder',
    p_parent_folder_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_folder_id UUID;
BEGIN
    INSERT INTO public.trend_folders (
        user_id, name, description, color, icon, parent_folder_id
    ) VALUES (
        auth.uid(), p_name, p_description, p_color, p_icon, p_parent_folder_id
    ) RETURNING id INTO v_folder_id;
    
    -- Log activity
    INSERT INTO public.folder_activity (folder_id, user_id, action, details)
    VALUES (v_folder_id, auth.uid(), 'created', jsonb_build_object('name', p_name));
    
    RETURN v_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add trend to folder
CREATE OR REPLACE FUNCTION public.add_trend_to_folder(
    p_folder_id UUID,
    p_trend_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.folder_trends (folder_id, trend_id, added_by, notes, tags)
    VALUES (p_folder_id, p_trend_id, auth.uid(), p_notes, p_tags)
    ON CONFLICT (folder_id, trend_id) DO UPDATE
    SET notes = COALESCE(p_notes, folder_trends.notes),
        tags = COALESCE(p_tags, folder_trends.tags);
    
    -- Log activity
    INSERT INTO public.folder_activity (folder_id, user_id, action, details)
    VALUES (p_folder_id, auth.uid(), 'added_trend', jsonb_build_object('trend_id', p_trend_id));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get folder statistics
CREATE OR REPLACE FUNCTION public.get_folder_stats(p_folder_id UUID)
RETURNS TABLE (
    trend_count INTEGER,
    total_earnings DECIMAL(10,2),
    avg_wave_score DECIMAL(5,2),
    category_breakdown JSONB,
    status_breakdown JSONB,
    collaborator_count INTEGER,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT ft.trend_id)::INTEGER as trend_count,
        COALESCE(SUM(ts.bounty_amount), 0)::DECIMAL(10,2) as total_earnings,
        COALESCE(AVG(ts.quality_score * 10), 0)::DECIMAL(5,2) as avg_wave_score,
        jsonb_object_agg(DISTINCT ts.category, category_counts.count) as category_breakdown,
        jsonb_object_agg(DISTINCT ts.status, status_counts.count) as status_breakdown,
        (SELECT COUNT(*) FROM public.folder_collaborators WHERE folder_id = p_folder_id AND accepted = TRUE)::INTEGER as collaborator_count,
        MAX(fa.created_at) as last_activity
    FROM public.folder_trends ft
    LEFT JOIN public.trend_submissions ts ON ft.trend_id = ts.id
    LEFT JOIN public.folder_activity fa ON fa.folder_id = p_folder_id
    LEFT JOIN LATERAL (
        SELECT ts2.category, COUNT(*) as count
        FROM public.folder_trends ft2
        JOIN public.trend_submissions ts2 ON ft2.trend_id = ts2.id
        WHERE ft2.folder_id = p_folder_id
        GROUP BY ts2.category
    ) category_counts ON category_counts.category = ts.category
    LEFT JOIN LATERAL (
        SELECT ts3.status, COUNT(*) as count
        FROM public.folder_trends ft3
        JOIN public.trend_submissions ts3 ON ft3.trend_id = ts3.id
        WHERE ft3.folder_id = p_folder_id
        GROUP BY ts3.status
    ) status_counts ON status_counts.status = ts.status
    WHERE ft.folder_id = p_folder_id
    GROUP BY fa.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's folder hierarchy
CREATE OR REPLACE FUNCTION public.get_user_folders_hierarchy(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    color folder_color,
    icon TEXT,
    is_public BOOLEAN,
    is_collaborative BOOLEAN,
    parent_folder_id UUID,
    trend_count BIGINT,
    total_earnings DECIMAL(10,2),
    path TEXT[],
    level INTEGER,
    created_at TIMESTAMPTZ
) AS $$
WITH RECURSIVE folder_tree AS (
    -- Base case: root folders
    SELECT 
        tf.id,
        tf.name,
        tf.description,
        tf.color,
        tf.icon,
        tf.is_public,
        tf.is_collaborative,
        tf.parent_folder_id,
        tf.created_at,
        ARRAY[tf.name] as path,
        0 as level
    FROM public.trend_folders tf
    WHERE tf.parent_folder_id IS NULL
    AND (tf.user_id = COALESCE(p_user_id, auth.uid()) OR 
         tf.is_public = TRUE OR
         EXISTS (
            SELECT 1 FROM public.folder_collaborators fc
            WHERE fc.folder_id = tf.id
            AND fc.user_id = auth.uid()
            AND fc.accepted = TRUE
         ))
    
    UNION ALL
    
    -- Recursive case: child folders
    SELECT 
        tf.id,
        tf.name,
        tf.description,
        tf.color,
        tf.icon,
        tf.is_public,
        tf.is_collaborative,
        tf.parent_folder_id,
        tf.created_at,
        ft.path || tf.name,
        ft.level + 1
    FROM public.trend_folders tf
    JOIN folder_tree ft ON tf.parent_folder_id = ft.id
)
SELECT 
    ft.*,
    COUNT(ftr.trend_id) as trend_count,
    COALESCE(SUM(ts.bounty_amount), 0)::DECIMAL(10,2) as total_earnings
FROM folder_tree ft
LEFT JOIN public.folder_trends ftr ON ft.id = ftr.folder_id
LEFT JOIN public.trend_submissions ts ON ftr.trend_id = ts.id
GROUP BY ft.id, ft.name, ft.description, ft.color, ft.icon, ft.is_public, 
         ft.is_collaborative, ft.parent_folder_id, ft.path, ft.level, ft.created_at
ORDER BY ft.level, ft.name;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_trend_folders_user_id ON public.trend_folders(user_id);
CREATE INDEX idx_trend_folders_parent ON public.trend_folders(parent_folder_id);
CREATE INDEX idx_folder_trends_folder ON public.folder_trends(folder_id);
CREATE INDEX idx_folder_trends_trend ON public.folder_trends(trend_id);
CREATE INDEX idx_folder_collaborators_folder ON public.folder_collaborators(folder_id);
CREATE INDEX idx_folder_collaborators_user ON public.folder_collaborators(user_id);
CREATE INDEX idx_folder_activity_folder ON public.folder_activity(folder_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trend_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folder_trends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folder_collaborators TO authenticated;
GRANT SELECT, INSERT ON public.folder_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_folders TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_trend_folder TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_trend_to_folder TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_folder_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_folders_hierarchy TO authenticated;

-- Create default folders for new users
CREATE OR REPLACE FUNCTION public.create_default_folders_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default folders
    INSERT INTO public.trend_folders (user_id, name, description, color, icon)
    VALUES 
        (NEW.id, 'Favorites', 'Your favorite trends', 'yellow', 'star'),
        (NEW.id, 'Research', 'Trends for research and analysis', 'blue', 'search'),
        (NEW.id, 'Archive', 'Archived trends', 'gray', 'archive');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default folders
CREATE TRIGGER create_default_folders
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_folders_for_user();