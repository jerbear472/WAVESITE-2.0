import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { getSafeCategory, getSafeStatus } from './safeCategory';

// Create a wrapped Supabase client that ensures safe values
export const supabaseSafe = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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