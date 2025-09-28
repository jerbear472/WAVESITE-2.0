import { createClient } from '@supabase/supabase-js';
import { getSafeCategory, getSafeStatus } from './safeCategory';

// Get environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

// Create a wrapped Supabase client that ensures safe values
export const supabaseSafe = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Wrap the insert method to ensure safe values
const originalFrom = supabaseSafe.from.bind(supabaseSafe);

supabaseSafe.from = function(table: string) {
  const result = originalFrom(table);
  
  if (table === 'trend_submissions') {
    const originalInsert = result.insert.bind(result);
    
    result.insert = function(values: any) {
      // Ensure safe values for single or array inserts
      const safeValues = Array.isArray(values) 
        ? values.map(v => ({
            ...v,
            category: v.category ? getSafeCategory(v.category) : 'meme_format',
            status: v.status ? getSafeStatus(v.status) : 'submitted'
          }))
        : {
            ...values,
            category: values.category ? getSafeCategory(values.category) : 'meme_format',
            status: values.status ? getSafeStatus(values.status) : 'submitted'
          };
      
      console.log('[supabaseSafe] Inserting with safe values:', safeValues);
      return originalInsert(safeValues);
    };
  }
  
  return result;
};

export { supabaseSafe as supabase };