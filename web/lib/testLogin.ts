import { supabase } from './supabase';

export async function testDirectLogin(email: string, password: string) {
  console.log('[TEST LOGIN] Starting direct login test for:', email);
  
  try {
    // First, test if Supabase is connected
    console.log('[TEST LOGIN] Testing Supabase connection...');
    const { data: pingData, error: pingError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (pingError) {
      console.error('[TEST LOGIN] Database connection failed:', pingError);
      throw new Error(`Database connection failed: ${pingError.message}`);
    }
    console.log('[TEST LOGIN] Database connected successfully');
    
    // Clear any existing session
    console.log('[TEST LOGIN] Clearing existing session...');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn('[TEST LOGIN] Sign out warning:', signOutError);
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Try to sign in
    console.log('[TEST LOGIN] Attempting sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });
    
    if (error) {
      console.error('[TEST LOGIN] Sign in error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        details: error
      });
      
      // More specific error messages
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address. Check your inbox for the confirmation link.');
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      if (error.message.includes('User not found')) {
        throw new Error('No account found with this email address.');
      }
      
      throw new Error(`Login failed: ${error.message}`);
    }
    
    console.log('[TEST LOGIN] Sign in response:', {
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      userEmail: data?.user?.email,
      emailConfirmed: data?.user?.email_confirmed_at
    });
    
    if (!data?.session) {
      throw new Error('Login appeared successful but no session was created');
    }
    
    if (!data?.user) {
      throw new Error('Login appeared successful but no user data was returned');
    }
    
    // Verify the session was actually set
    console.log('[TEST LOGIN] Verifying session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[TEST LOGIN] Session verification error:', sessionError);
      throw new Error(`Session verification failed: ${sessionError.message}`);
    }
    
    if (!session) {
      console.error('[TEST LOGIN] No session found after login');
      throw new Error('Session was not properly established after login');
    }
    
    console.log('[TEST LOGIN] Session verified successfully:', {
      userId: session.user.id,
      userEmail: session.user.email,
      expiresAt: session.expires_at
    });
    
    // Try to fetch user profile
    console.log('[TEST LOGIN] Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.warn('[TEST LOGIN] Profile fetch warning:', profileError);
    } else {
      console.log('[TEST LOGIN] Profile fetched:', {
        username: profile?.username,
        email: profile?.email,
        isAdmin: profile?.is_admin
      });
    }
    
    console.log('[TEST LOGIN] ✅ Login test completed successfully');
    return {
      success: true,
      user: data.user,
      session: data.session,
      profile: profile || null
    };
    
  } catch (error: any) {
    console.error('[TEST LOGIN] ❌ Login test failed:', error.message);
    throw error;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testLogin = testDirectLogin;
}