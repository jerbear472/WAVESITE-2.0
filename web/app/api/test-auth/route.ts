import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (testError) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Database connection failed',
        error: testError.message 
      }, { status: 500 });
    }

    // Test auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    return NextResponse.json({
      status: 'success',
      database: 'connected',
      session: session ? 'active' : 'none',
      sessionError: sessionError?.message || null,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Clear any existing session
    await supabase.auth.signOut();
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ 
        status: 'error',
        message: error.message,
        code: error.status 
      }, { status: 400 });
    }

    // Check if session was created
    const { data: { session } } = await supabase.auth.getSession();

    return NextResponse.json({
      status: 'success',
      session: session ? 'created' : 'failed',
      user: data.user?.email,
      userId: data.user?.id,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message 
    }, { status: 500 });
  }
}