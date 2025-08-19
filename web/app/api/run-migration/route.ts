import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json({ error: 'No SQL provided' }, { status: 400 });
    }

    // Execute the SQL
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the RPC function doesn't exist, try direct approach
      // Note: This requires the SQL to be simple ALTER TABLE statements
      const statements = sql.split(';').filter((s: string) => s.trim());
      const results = [];
      
      for (const statement of statements) {
        if (statement.trim().startsWith('ALTER TABLE')) {
          // Extract table and operation
          const match = statement.match(/ALTER TABLE\s+public\.(\w+)\s+ADD COLUMN\s+(\w+)\s+(.+)/i);
          if (match) {
            const [, table, column, type] = match;
            
            // Check if column exists first
            const { data: columns } = await supabaseAdmin
              .from('information_schema.columns' as any)
              .select('column_name')
              .eq('table_name', table)
              .eq('column_name', column);
            
            if (!columns || columns.length === 0) {
              results.push(`Column ${column} would be added to ${table}`);
            } else {
              results.push(`Column ${column} already exists in ${table}`);
            }
          }
        }
      }
      
      return NextResponse.json({ 
        message: 'Migration analysis complete',
        results,
        note: 'Please run the SQL directly in Supabase dashboard SQL editor'
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Check current schema
  try {
    const { data, error } = await supabaseAdmin
      .from('trend_submissions')
      .select('*')
      .limit(0); // Just get schema, no data
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get column information
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
      }
    });
    
    const tables = await response.json();
    
    return NextResponse.json({ 
      message: 'Schema check',
      tables: tables.definitions?.trend_submissions || 'Unable to fetch schema',
      note: 'Check if predicted_peak_date column exists'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}