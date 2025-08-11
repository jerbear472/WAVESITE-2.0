import { NextResponse } from 'next/server';

export async function GET() {
  // Check for both naming conventions
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV || 'not-on-vercel',
    required_vars: {
      SUPABASE_URL: {
        set: !!supabaseUrl,
        value: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
        found_as: supabaseUrl ? 
          (process.env.NEXT_PUBLIC_SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 'SUPABASE_URL') : 
          'neither'
      },
      SUPABASE_ANON_KEY: {
        set: !!supabaseKey,
        value: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET',
        found_as: supabaseKey ? 
          (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : 'SUPABASE_ANON_KEY') : 
          'neither'
      }
    },
    optional_vars: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not set',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'not set'
    },
    status: (!supabaseUrl || !supabaseKey) ? 
      'ERROR: Missing required environment variables' : 
      'OK: All required variables are set'
  };

  return NextResponse.json(envCheck, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}