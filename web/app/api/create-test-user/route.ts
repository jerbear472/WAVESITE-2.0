import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for user management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST() {
  try {
    const testEmail = `test${Date.now()}@wavesight.com`;
    const testPassword = 'TestPassword123!';
    const testUsername = `testuser${Date.now()}`;

    console.log('Creating test user:', testEmail);

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: testUsername
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      
      // If admin API fails, try regular signup
      const { data: signupData, error: signupError } = await supabaseAdmin.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            username: testUsername
          }
        }
      });

      if (signupError) {
        return NextResponse.json({ 
          error: 'Failed to create user', 
          details: signupError.message 
        }, { status: 400 });
      }

      // For regular signup, we need to manually confirm the email
      // This would normally be done via email link
      console.log('User created via signup, needs email confirmation');
      
      return NextResponse.json({
        success: true,
        email: testEmail,
        password: testPassword,
        username: testUsername,
        note: 'User created but needs email confirmation. Check email or use admin panel to confirm.',
        userId: signupData.user?.id
      });
    }

    // Create profile entry
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: testEmail,
        username: testUsername,
        role: 'participant',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.warn('Profile creation warning:', profileError);
    }

    // Create user_profiles entry for XP tracking
    const { error: userProfileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        username: testUsername,
        email: testEmail,
        role: 'participant',
        total_earned: 0,
        pending_xp: 0,
        trends_spotted: 0,
        performance_tier: 'lxp',
        current_streak: 0,
        session_streak: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (userProfileError) {
      console.warn('User profile creation warning:', userProfileError);
    }

    return NextResponse.json({
      success: true,
      email: testEmail,
      password: testPassword,
      username: testUsername,
      userId: authData.user.id,
      note: 'Test user created successfully. Email is auto-confirmed.'
    });

  } catch (error: any) {
    console.error('Test user creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create test user', 
      details: error.message 
    }, { status: 500 });
  }
}