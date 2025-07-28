const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPersonaSchema() {
  try {
    console.log('Applying persona schema...');
    
    // Check if table exists
    const { data: tables, error: tableError } = await supabase
      .rpc('get_tables')
      .eq('table_name', 'user_personas');
    
    if (tableError && tableError.code !== 'PGRST202') {
      console.log('Table check error:', tableError);
    }
    
    // Create the table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        -- User personas table
        CREATE TABLE IF NOT EXISTS user_personas (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            
            -- Location data
            location_country TEXT,
            location_city TEXT,
            location_urban_type TEXT CHECK (location_urban_type IN ('urban', 'suburban', 'rural')),
            
            -- Demographics
            age_range TEXT,
            gender TEXT,
            education_level TEXT,
            relationship_status TEXT,
            has_children BOOLEAN DEFAULT false,
            
            -- Professional
            employment_status TEXT,
            industry TEXT,
            income_range TEXT,
            work_style TEXT CHECK (work_style IN ('office', 'remote', 'hybrid')),
            
            -- Interests (stored as JSONB array)
            interests JSONB DEFAULT '[]'::jsonb,
            
            -- Lifestyle
            shopping_habits JSONB DEFAULT '[]'::jsonb,
            media_consumption JSONB DEFAULT '[]'::jsonb,
            values JSONB DEFAULT '[]'::jsonb,
            
            -- Tech preferences
            tech_proficiency TEXT CHECK (tech_proficiency IN ('basic', 'intermediate', 'advanced', 'expert')),
            primary_devices JSONB DEFAULT '[]'::jsonb,
            social_platforms JSONB DEFAULT '[]'::jsonb,
            
            -- Metadata
            is_complete BOOLEAN DEFAULT false,
            completion_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Ensure one persona per user
            UNIQUE(user_id)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_user_personas_user_id ON user_personas(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_personas_is_complete ON user_personas(is_complete);

        -- Create updated_at trigger
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_user_personas_updated_at BEFORE UPDATE
            ON user_personas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        -- Enable RLS
        ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;

        -- RLS Policies
        -- Users can view their own persona
        CREATE POLICY "Users can view own persona" ON user_personas
            FOR SELECT USING (auth.uid() = user_id);

        -- Users can insert their own persona
        CREATE POLICY "Users can insert own persona" ON user_personas
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Users can update their own persona
        CREATE POLICY "Users can update own persona" ON user_personas
            FOR UPDATE USING (auth.uid() = user_id);

        -- Users can delete their own persona
        CREATE POLICY "Users can delete own persona" ON user_personas
            FOR DELETE USING (auth.uid() = user_id);

        -- Service role bypass RLS
        CREATE POLICY "Service role bypass" ON user_personas
            USING (auth.jwt()->>'role' = 'service_role');
      `
    });

    if (createError) {
      console.error('Error creating table:', createError);
      return;
    }

    console.log('✅ Persona schema applied successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyPersonaSchema();